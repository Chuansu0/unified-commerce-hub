/**
 * Umio Chat Hook - HTTP 版本
 * 使用 openclaw-http-bridge 直接與 OpenClaw 通訊
 * 同步回覆，無需訂閱
 */

import { useState, useCallback, useEffect, useRef } from "react";
import {
    sendToUmio,
    subscribeToUmioReplies,
    getUmioConversation,
    chatWithUmio,
    type UmioMessage
} from "@/services/umioChat";

export interface ChatMessage {
    id: string;
    sender: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export function useUmioChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 使用 ref 儲存 sessionId 和 unsubscribe 函數
    const sessionIdRef = useRef<string>(generateSessionId());
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // 產生唯一的 session ID
    function generateSessionId(): string {
        return `umio-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // 載入歷史訊息
    const loadHistory = useCallback(async () => {
        try {
            const history = await getUmioConversation(sessionIdRef.current);
            if (history.length > 0) {
                const formattedMessages = history.map((msg) => ({
                    id: msg.id,
                    sender: msg.sender,
                    content: msg.content,
                    timestamp: new Date(msg.created)
                }));
                setMessages(formattedMessages);
            }
        } catch (err) {
            console.error("[useUmioChat] Error loading history:", err);
        }
    }, []);

    // 初始載入
    useEffect(() => {
        loadHistory();

        // 清理函數
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [loadHistory]);

    // 訂閱 Umio 回覆（備用方案：非同步接收）
    const startSubscription = useCallback(() => {
        // 如果已經有訂閱，先取消
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
        }

        // 啟動新訂閱
        const unsubscribe = subscribeToUmioReplies(
            sessionIdRef.current,
            (message: UmioMessage) => {
                setMessages((prev) => {
                    // 檢查是否已經存在相同的訊息（避免重複）
                    const exists = prev.some((m) => m.id === message.id);
                    if (exists) return prev;

                    return [
                        ...prev,
                        {
                            id: message.id,
                            sender: "assistant",
                            content: message.content,
                            timestamp: new Date(message.created)
                        }
                    ];
                });
                setIsLoading(false);
            }
        );

        unsubscribeRef.current = unsubscribe;
    }, []);

    // 發送訊息（同步版本 - 推薦使用）
    const sendMessageSync = useCallback(
        async (content: string): Promise<boolean> => {
            if (!content.trim()) return false;

            setIsLoading(true);
            setError(null);

            try {
                // 先添加用戶訊息到本地狀態
                const userMessage: ChatMessage = {
                    id: `user-${Date.now()}`,
                    sender: "user",
                    content: content.trim(),
                    timestamp: new Date()
                };
                setMessages((prev) => [...prev, userMessage]);

                // 同步發送並等待回覆
                const response = await chatWithUmio(
                    content.trim(),
                    sessionIdRef.current
                );

                // 添加 AI 回覆到本地狀態
                const assistantMessage: ChatMessage = {
                    id: `assistant-${Date.now()}`,
                    sender: "assistant",
                    content: response,
                    timestamp: new Date()
                };
                setMessages((prev) => [...prev, assistantMessage]);

                return true;
            } catch (err) {
                const errorMsg =
                    err instanceof Error ? err.message : "發送訊息失敗";
                console.error("[useUmioChat] Error:", err);
                setError(errorMsg);

                // 添加錯誤訊息
                const errorMessage: ChatMessage = {
                    id: `error-${Date.now()}`,
                    sender: "assistant",
                    content: `抱歉，發生錯誤：${errorMsg}`,
                    timestamp: new Date()
                };
                setMessages((prev) => [...prev, errorMessage]);

                return false;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    // 發送訊息（非同步版本 - 使用訂閱）
    const sendMessageAsync = useCallback(
        async (content: string): Promise<boolean> => {
            if (!content.trim()) return false;

            setIsLoading(true);
            setError(null);

            try {
                // 啟動訂閱
                startSubscription();

                // 發送訊息
                const result = await sendToUmio(
                    content.trim(),
                    sessionIdRef.current
                );

                if (!result.success) {
                    throw new Error(result.message);
                }

                // 添加用戶訊息到本地狀態
                const userMessage: ChatMessage = {
                    id: `user-${Date.now()}`,
                    sender: "user",
                    content: content.trim(),
                    timestamp: new Date()
                };
                setMessages((prev) => [...prev, userMessage]);

                // AI 回覆會透過訂閱自動添加
                return true;
            } catch (err) {
                const errorMsg =
                    err instanceof Error ? err.message : "發送訊息失敗";
                console.error("[useUmioChat] Error:", err);
                setError(errorMsg);
                setIsLoading(false);
                return false;
            }
        },
        [startSubscription]
    );

    // 預設使用同步版本
    const sendMessage = sendMessageSync;

    // 清除訊息
    const clearMessages = useCallback(() => {
        setMessages([]);
        // 產生新的 session ID
        sessionIdRef.current = generateSessionId();
    }, []);

    // 重新開始對話
    const restartChat = useCallback(() => {
        clearMessages();
        loadHistory();
    }, [clearMessages, loadHistory]);

    return {
        messages,
        isLoading,
        error,
        sendMessage,
        sendMessageSync,
        sendMessageAsync,
        clearMessages,
        restartChat,
        sessionId: sessionIdRef.current
    };
}
