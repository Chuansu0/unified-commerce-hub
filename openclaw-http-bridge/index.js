5
import express from 'express';
import WebSocket from 'ws';

const app = express();

// CORS Middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json());

const OPENCLAW_WS = process.env.OPENCLAW_WS_URL || 'ws://openclaw.zeabur.internal:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;
const DEVICE_ID = process.env.DEVICE_ID || 'bridge-device-001';
const N8N_REPLY_WEBHOOK = process.env.N8N_REPLY_WEBHOOK || 'https://n8n.neovega.cc/webhook/openclaw-reply';

app.post('/api/chat', async (req, res) => {
    const { message, sessionId, agentId = 'andrea' } = req.body;

    if (!message || !sessionId) {
        return res.status(400).json({ error: 'message and sessionId required' });
    }

    try {
        const ws = new WebSocket(`${OPENCLAW_WS}?token=${OPENCLAW_TOKEN}&deviceId=${DEVICE_ID}`);
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
    const { message, sessionId, context = {} } = req.body;

    console.log(`[Umio] Received request:`, { message: message?.substring(0, 50), sessionId, context });

    if (!message || !sessionId) {
        return res.status(400).json({
            error: 'message and sessionId required',
            example: { message: 'Hello Umio', sessionId: 'user-123' }
        });
    }

    try {
        const wsUrl = `${OPENCLAW_WS}?token=${OPENCLAW_TOKEN}&deviceId=${DEVICE_ID}`;
        console.log(`[Umio] Connecting to OpenClaw: ${OPENCLAW_WS}`);
        console.log(`[Umio] Token available:`, !!OPENCLAW_TOKEN);
        console.log(`[Umio] Device ID:`, DEVICE_ID);

        const ws = new WebSocket(wsUrl);
        let responseText = '';
        let responseReceived = false;
        let messageSent = false;

        const timeout = setTimeout(() => {
            if (!responseReceived) {
                console.error(`[Umio] Timeout - no response received after 30s`);
                ws.close();
                res.status(504).json({
                    error: 'Umio response timeout',
                    sessionId,
                    timeout: '30 seconds',
                    messageSent
                });
            }
        }, 30000);

        ws.on('open', () => {
            console.log(`[Umio] WebSocket connected, sending message...`);
            messageSent = true;

            const payload = {
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
            };

            console.log(`[Umio] Sending payload:`, JSON.stringify(payload, null, 2));
            ws.send(JSON.stringify(payload));
        });

        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                console.log(`[Umio] Received message:`, JSON.stringify(msg, null, 2).substring(0, 500));

                // Handle connect.challenge - respond to keep connection alive
                if (msg.type === 'event' && msg.event === 'connect.challenge') {
                    console.log(`[Umio] Received challenge, responding...`);
                    ws.send(JSON.stringify({
                        type: 'event',
                        event: 'connect.challenge_response',
                        payload: { nonce: msg.payload.nonce }
                    }));
                    return;
                }

                // Handle streaming partial responses
                if (msg.result) {
                    if (msg.result.content) {
                        responseText = msg.result.content;
                    }
                    if (msg.result.done) {
                        responseReceived = true;
                        clearTimeout(timeout);
                        ws.close();

                        console.log(`[Umio] Complete response received, length:`, responseText.length);
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
            console.log(`[Umio] WebSocket closed`);
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

// Use port 8080 to match Zeabur public domain binding
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`OpenClaw HTTP Bridge running on port ${PORT}`);
});
