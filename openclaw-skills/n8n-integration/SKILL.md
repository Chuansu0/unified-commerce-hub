---
name: n8n-integration
description: Integration with n8n workflows for webchat handling
homepage: https://n8n.io
metadata:
  {
    "openclaw": {
      "emoji": "🔗",
      "requires": { "env": ["N8N_WEBHOOK_URL", "N8N_API_KEY"] }
    }
  }
---

# n8n Integration Skill

Allows OpenClaw to send responses back to n8n workflows for webchat delivery.

## Environment Variables

- `N8N_WEBHOOK_URL`: Base URL for n8n webhooks (e.g., https://n8n.neovega.cc)
- `N8N_API_KEY`: Optional API key for n8n authentication

## Usage

```bash
node {baseDir}/scripts/send_to_n8n.mjs \
  --webhook "webchat-reply" \
  --session-id "test-123" \
  --message "Hello from OpenClaw"
```

## Workflow Integration

This skill is designed to work with n8n workflows that:
1. Send webchat messages to OpenClaw
2. Receive OpenClaw responses via webhook
3. Deliver responses back to webchat