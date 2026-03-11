import { useState, useEffect, useCallback } from 'react';
import { sendToOpenClaw, subscribeToReplies } from '../services/telegram';
import pb from '../services/pocketbase';

interface Message {
    id: string;
    content: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
}

export function useTelegramChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const user = pb.authStore.model;
        if (!user) return;

        let unsubscribe: (() => void) | undefined;

        subscribeToReplies(user.id, (content) => {
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    content,
                    sender: 'assistant',
                    timestamp: new Date(),
                },
            ]);
            setIsLoading(false);
        }).then((unsub) => {
            unsubscribe = unsub;
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        const user = pb.authStore.model;
        if (!user) throw new Error('請先登入');

        const userMessage: Message = {
            id: Date.now().toString(),
            content,
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            await sendToOpenClaw({
                message: content,
                userId: user.id,
                sessionId: user.id,
            });
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    }, []);

    return { messages, sendMessage, isLoading };
}
