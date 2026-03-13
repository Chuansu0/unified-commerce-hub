import express from 'express';
import WebSocket from 'ws';

const app = express();
app.use(express.json());

const OPENCLAW_WS = process.env.OPENCLAW_WS_URL || 'ws://openclaw.zeabur.internal:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;
const N8N_REPLY_WEBHOOK = process.env.N8N_REPLY_WEBHOOK || 'https://n8n.neovega.cc/webhook/openclaw-reply';

app.post('/api/chat', async (req, res) => {
    const { message, sessionId, agentId = 'andrea' } = req.body;

    if (!message || !sessionId) {
        return res.status(400).json({ error: 'message and sessionId required' });
    }

    try {
        const ws = new WebSocket(`${OPENCLAW_WS}?token=${OPENCLAW_TOKEN}`);
        let responseText = '';
        const timeout = setTimeout(() => {
            ws.close();
            if (!responseText) {
                res.status(504).json({ error: 'OpenClaw timeout' });
            }
        }, 30000);

        ws.on('open', () => {
            ws.send(JSON.stringify({
                jsonrpc: '2.0',
                id: sessionId,
                method: 'agent.chat',
                params: {
                    agentId,
                    message,
                    context: { sessionId, platform: 'webchat' }
                }
            }));
        });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                if (msg.result && msg.result.content) {
                    responseText = msg.result.content;
                    clearTimeout(timeout);
                    ws.close();

                    // Send response back to n8n
                    fetch(N8N_REPLY_WEBHOOK, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sessionId, message: responseText, timestamp: new Date().toISOString() })
                    }).catch(err => console.error('Failed to send to n8n:', err));

                    res.json({ success: true, response: responseText, sessionId });
                }
            } catch (e) {
                console.error('Parse error:', e);
            }
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.error('WebSocket error:', error);
            res.status(500).json({ error: error.message });
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Umio dedicated endpoint - direct HTTP response without n8n callback
app.post('/api/umio/chat', async (req, res) => {
    const { message, sessionId } = req.body;

    if (!message || !sessionId) {
        return res.status(400).json({
            error: 'message and sessionId required',
            example: { message: 'Hello Umio', sessionId: 'user-123' }
        });
    }

    try {
        const ws = new WebSocket(`${OPENCLAW_WS}?token=${OPENCLAW_TOKEN}`);
        let responseText = '';
        let responseReceived = false;

        const timeout = setTimeout(() => {
            if (!responseReceived) {
                ws.close();
                res.status(504).json({
                    error: 'Umio response timeout',
                    sessionId,
                    timeout: '30 seconds'
                });
            }
        }, 30000);

        ws.on('open', () => {
            ws.send(JSON.stringify({
                jsonrpc: '2.0',
                id: sessionId,
                method: 'agent.chat',
                params: {
                    agentId: 'umio',
                    message,
                    context: {
                        sessionId,
                        platform: 'webchat',
                        agent: 'umio',
                        role: 'digital_content_clerk'
                    }
                }
            }));
        });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());

                // Handle streaming partial responses
                if (msg.result) {
                    if (msg.result.content) {
                        responseText = msg.result.content;
                    }
                    if (msg.result.done) {
                        responseReceived = true;
                        clearTimeout(timeout);
                        ws.close();

                        res.json({
                            success: true,
                            response: responseText,
                            sessionId,
                            agent: 'umio',
                            timestamp: new Date().toISOString()
                        });
                    }
                }

                // Handle complete response (non-streaming)
                if (msg.result && msg.result.content && !msg.result.done) {
                    // Wait a bit for potential streaming to complete
                    setTimeout(() => {
                        if (!responseReceived) {
                            responseReceived = true;
                            clearTimeout(timeout);
                            ws.close();

                            res.json({
                                success: true,
                                response: msg.result.content,
                                sessionId,
                                agent: 'umio',
                                timestamp: new Date().toISOString()
                            });
                        }
                    }, 1000);
                }
            } catch (e) {
                console.error('[Umio] Parse error:', e);
            }
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            console.error('[Umio] WebSocket error:', error);
            if (!responseReceived) {
                res.status(500).json({
                    error: 'WebSocket connection failed',
                    details: error.message,
                    sessionId
                });
            }
        });

        ws.on('close', () => {
            clearTimeout(timeout);
        });

    } catch (error) {
        console.error('[Umio] Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message,
            sessionId
        });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        endpoints: ['/api/chat', '/api/umio/chat', '/health']
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`OpenClaw HTTP Bridge running on port ${PORT}`);
});