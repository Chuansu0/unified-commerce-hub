// Andrea Chat Service - Send messages to Andrea via n8n and wait for reply

import { pollForReply } from './andreaReply';

const N8N_WEBHOOK_URL = 'https://n8n.neovega.cc/webhook/webchat-to-andrea';

export async function sendToAndrea(message: string, sessionId: string): Promise<string> {
    try {
        // Send message to n8n webhook
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                sessionId,
                platform: 'webchat',
                timestamp: new Date().toISOString()
            })
        });

        if (!response.ok) {
            throw new Error(`n8n webhook failed: ${response.status}`);
        }

        // Wait for Andrea's reply (with 30 second timeout)
        const reply = await pollForReply(sessionId, 30000);

        if (!reply) {
            return '抱歉，Andrea 目前無法回應，請稍後再試。';
        }

        return reply.message;

    } catch (error) {
        console.error('Error sending to Andrea:', error);
        return '發生錯誤，無法連接到 Andrea。';
    }
}