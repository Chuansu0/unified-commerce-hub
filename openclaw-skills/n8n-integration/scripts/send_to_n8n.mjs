#!/usr/bin/env node
/**
 * Send response from OpenClaw back to n8n workflow
 *
 * Usage:
 *   node send_to_n8n.mjs --webhook "webchat-reply" --session-id "test-123" --message "response text"
 */

import { parseArgs } from "node:util";

const { values } = parseArgs({
    options: {
        webhook: { type: "string", short: "w" },
        "session-id": { type: "string", short: "s" },
        message: { type: "string", short: "m" },
        "api-key": { type: "string", short: "k" },
    },
    strict: true,
});

if (!values.webhook || !values["session-id"] || !values.message) {
    console.error("Usage: node send_to_n8n.mjs --webhook <path> --session-id <id> --message <text>");
    process.exit(1);
}

const baseUrl = process.env.N8N_WEBHOOK_URL || "https://n8n.neovega.cc";
const apiKey = values["api-key"] || process.env.N8N_API_KEY;
const webhookUrl = `${baseUrl}/webhook/${values.webhook}`;

const payload = {
    sessionId: values["session-id"],
    message: values.message, timestamp: new Date().toISOString(),
    source: "openclaw"
};

const headers = {
    "Content-Type": "application/json",
};

if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
}

try {
    const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const body = await response.text();
        console.error(`n8n webhook failed (${response.status}): ${body}`);
        process.exit(1);
    }

    const result = await response.json();
    console.log(`Response sent to n8n: ${JSON.stringify(result)}`);
    console.log(`WEBHOOK_SENT: ${webhookUrl}`);
} catch (error) {
    console.error(`Failed to send to n8n: ${error.message}`);
    process.exit(1);
}