import { useState, useEffect, useCallback } from 'react';
import { sendToOpenClaw, subscribeToReplies } from '../services/telegram';
import pb from '../services/pocketbase';

interface Message {
    id: string;
    content: string;
    sender: 'user' | 'assistant';
    timestamp: Date;
}

// 獲取或創建訪客 sessionId
function getOrCreateGuestSessionId(): string {
    const storedId = localStorage.getItem('guest_session_id');
    if (storedId) return storedId;

    const newId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('guest_session_id', newId);
    return newId;
}

export function useTelegramChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const user = pb.authStore.model;
        // 支援訪客模式：使用用戶 ID 或訪客 sessionId
        const sessionId = user?.id || getOrCreateGuestSessionId();

        let unsubscribe: (() => void) | undefined;

        subscribeToReplies(sessionId, (content) => {
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
        }).catch((err) => {
            console.error('Failed to subscribe to replies:', err);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        const user = pb.authStore.model;
        // 支援訪客模式：不再強制要求登入
        const sessionId = user?.id || getOrCreateGuestSessionId();

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
                userId: user?.id || sessionId,  // 訪客使用 sessionId 作為 userId
                sessionId: sessionId,
            });
        } catch (error) {
            setIsLoading(false);
            console.error('Failed to send message:', error);
            throw error;
        }
    }, []);

    return { messages, sendMessage, isLoading };
}