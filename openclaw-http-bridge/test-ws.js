import WebSocket from 'ws';

const OPENCLAW_WS = process.env.OPENCLAW_WS_URL || 'ws://openclaw.zeabur.internal:18789';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'FCo0g2jyi864v9VxEqQw753GSbkdWnIX';

console.log('Testing OpenClaw WebSocket connection...');
console.log('URL:', OPENCLAW_WS);
console.log('Token:', OPENCLAW_TOKEN ? '***' + OPENCLAW_TOKEN.slice(-4) : 'NOT SET');

const ws = new WebSocket(`${OPENCLAW_WS}?token=${OPENCLAW_TOKEN}`);

ws.on('open', () => {
    console.log('✅ WebSocket connected!');
    console.log('Sending test message...');

    // Try different message formats
    const testMessage = {
        type: 'ping'
    };

    ws.send(JSON.stringify(testMessage));
    console.log('Sent:', JSON.stringify(testMessage));
});

ws.on('message', (data) => {
    console.log('📨 Received:', data.toString());
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log(`🔌 Connection closed: ${code} - ${reason || 'No reason'}`);
    process.exit(code === 1000 ? 0 : 1);
});

setTimeout(() => {
    console.log('⏱️  Timeout - closing connection');
    ws.close();
}, 5000);