// API endpoint to receive Andrea replies from n8n
import { storeReply } from '../services/andreaReply';

export async function handleAndreaReply(req: Request): Promise<Response> {
    try {
        const body = await req.json();
        const { sessionId, message, source } = body;

        if (!sessionId || !message) {
            return new Response(
                JSON.stringify({ error: 'sessionId and message required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        storeReply({ sessionId, message, source: source || 'andrea' });

        return new Response(
            JSON.stringify({ success: true, sessionId }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error handling Andrea reply:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}