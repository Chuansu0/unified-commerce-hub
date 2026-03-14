/**
 * 直接 Telegram Bot API 服務 - 繞過 OpenClaw
 * 使用個人 Bot Token 直接發送訊息到 Telegram
 */

import { getEnvVar } from './config';

// 從環境變數取得 Telegram Bot Token
const getBotToken = () => {
    const token = getEnvVar('VITE_TELEGRAM_BOT_TOKEN');
    if (!token) {
        throw new Error('Telegram Bot Token 未設定，請檢查 VITE_TELEGRAM_BOT_TOKEN 環境變數');
    }
    return token;
};

// 目標 Telegram 用戶/群組 ID
const getTargetChatId = () => {
    // 優先使用個人 ID，其次是群組 ID
    return (
        getEnvVar('VITE_TELEGRAM_USER_ID') ||
        getEnvVar('VITE_TELEGRAM_GROUP_ID') ||
        ''
    );
};

export interface TelegramMessage {
    message: string;
    sessionId: string;
    userName?: string;
    metadata?: Record<string, string>;
}

export interface TelegramResponse {
    ok: boolean;
    result?: {
        message_id: number;
        date: number;
        chat: {
            id: number;
            type: string;
        };
    };
    description?: string;
}

/**
 * 直接發送訊息到 Telegram（繞過 OpenClaw）
 */
export async function sendMessageDirect(
    params: TelegramMessage
): Promise<TelegramResponse> {
    const { message, sessionId, userName, metadata } = params;

    try {
        const token = getBotToken();
        const chatId = getTargetChatId();

        if (!chatId) {
            throw new Error('未設定目標 Telegram Chat ID');
        }

        // 格式化訊息
        const formattedMessage = formatMessageForTelegram({
            message,
            sessionId,
            userName,
            metadata,
        });

        // 直接呼叫 Telegram Bot API
        const response = await fetch(
            `https://api.telegram.org/bot${token}/sendMessage`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: formattedMessage,
                    parse_mode: 'Markdown',
                }),
            }
        );

        const data = (await response.json()) as TelegramResponse;

        if (!data.ok) {
            console.error('[DirectTelegram] Telegram API 錯誤:', data.description);
        }

        return data;
    } catch (error) {
        console.error('[DirectTelegram] 發送失敗:', error);
        return {
            ok: false,
            description:
                error instanceof Error ? error.message : '未知錯誤',
        };
    }
}

/**
 * 格式化訊息以便在 Telegram 中顯示
 */
function formatMessageForTelegram(params: {
    message: string;
    sessionId: string;
    userName?: string;
    metadata?: Record<string, string>;
}): string {
    const { message, sessionId, userName, metadata } = params;

    let formatted = '📨 *Webchat 新訊息*\n\n';

    if (userName) {
        formatted += `👤 *用戶:* ${userName}\n`;
    }

    formatted += `🆔 *Session:* \`${sessionId}\`\n`;

    if (metadata && Object.keys(metadata).length > 0) {
        formatted += '\n📋 *Metadata:*\n';
        Object.entries(metadata).forEach(([key, value]) => {
            formatted += `• ${key}: ${value}\n`;
        });
    }

    formatted += `\n💬 *訊息:*\n${message}`;

    return formatted;
}

/**
 * 取得 Bot 資訊（測試用）
 */
export async function getBotInfo(): Promise<{
    ok: boolean;
    result?: { username: string; first_name: string };
    description?: string;
}> {
    try {
        const token = getBotToken();

        const response = await fetch(
            `https://api.telegram.org/bot${token}/getMe`
        );

        return await response.json();
    } catch (error) {
        console.error('[DirectTelegram] 取得 Bot 資訊失敗:', error);
        return {
            ok: false,
            description:
                error instanceof Error ? error.message : '未知錯誤',
        };
    }
}

/**
 * 測試 Bot Token 是否有效
 */
export async function testBotConnection(): Promise<boolean> {
    const result = await getBotInfo();
    if (result.ok) {
        console.log(
            '[DirectTelegram] Bot 連線成功:',
            result.result?.username
        );
        return true;
    }
    console.error('[DirectTelegram] Bot 連線失敗:', result.description);
    return false;
}
