// Andrea Reply Service - Handle replies from Andrea via n8n

interface AndreaReply {
    sessionId: string;
    message: string;
    source: string;
    timestamp?: string;
}

// In-memory store for pending replies (in production, use Redis or database)
const pendingReplies = new Map<string, AndreaReply[]>();

export function storeReply(reply: AndreaReply) {
    const { sessionId } = reply;
    if (!pendingReplies.has(sessionId)) {
        pendingReplies.set(sessionId, []);
    }
    pendingReplies.get(sessionId)!.push({
        ...reply,
        timestamp: reply.timestamp || new Date().toISOString()
    });
}

export function getReply(sessionId: string): AndreaReply | null {
    const replies = pendingReplies.get(sessionId);
    if (replies && replies.length > 0) {
        return replies.shift()!; // Get and remove first reply
    }
    return null;
}

export function pollForReply(sessionId: string, timeoutMs: number = 30000): Promise<AndreaReply | null> {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
            const reply = getReply(sessionId);
            if (reply) {
                clearInterval(interval);
                resolve(reply);
            } else if (Date.now() - startTime > timeoutMs) {
                clearInterval(interval);
                resolve(null);
            }
        }, 500);
    });
}