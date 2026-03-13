{
  meta: {
    lastTouchedVersion: '2026.3.2',
    lastTouchedAt: '2026-03-13T00:51:40.012Z',
  },
  wizard: {
    lastRunAt: '2026-03-05T00:39:17.138Z',
    lastRunVersion: '2026.3.2',
    lastRunCommand: 'doctor',
    lastRunMode: 'local',
  },
  models: {
    providers: {
      anthropic: {
        baseUrl: 'https://api.whatai.cc',
        apiKey: '__OPENCLAW_REDACTED__',
        api: 'anthropic-messages',
        models: [
          {
            id: 'claude-sonnet-4-6',
            name: 'Claude Sonnet 4.6',
            api: 'anthropic-messages',
            reasoning: false,
            input: [
              'text',
            ],
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
            },
            contextWindow: 200000,
            maxTokens: 8192,
          },
        ],
      },
      'opencode-go': {
        baseUrl: 'https://opencode.ai/zen/go/v1',
        apiKey: '__OPENCLAW_REDACTED__',
        api: 'openai-completions',
        models: [
          {
            id: 'kimi-k2.5',
            name: 'Kimi K2.5 (OpenCode Go)',
            api: 'openai-completions',
            reasoning: false,
            input: [
              'text',
            ],
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
            },
            contextWindow: 256000,
            maxTokens: 8192,
          },
          {
            id: 'glm-5',
            name: 'GLM-5 (OpenCode Go)',
            api: 'openai-completions',
            reasoning: false,
            input: [
              'text',
            ],
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
            },
            contextWindow: 128000,
            maxTokens: 8192,
          },
          {
            id: 'minimax-m2.5',
            name: 'MiniMax M2.5 (OpenCode Go)',
            api: 'openai-completions',
            reasoning: false,
            input: [
              'text',
            ],
            cost: {
              input: 0,
              output: 0,
              cacheRead: 0,
              cacheWrite: 0,
            },
            contextWindow: 256000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: {
        primary: 'opencode-go/kimi-k2.5',
      },
      models: {
        'opencode-go/glm-5': {
          alias: 'glm5',
        },
        'opencode-go/kimi-k2.5': {
          alias: 'kimi',
        },
      },
    },
    list: [
      {
        id: 'main',
        default: true,
        name: 'Main (Default)',
        model: 'opencode-go/kimi-k2.5',
      },
      {
        id: 'linus',
        name: 'Linus (Infra Engineer)',
        workspace: '~/.openclaw/workspace-linus',
        model: 'opencode-go/glm-5',
      },
      {
        id: 'andrea',
        name: 'Andrea (Executive Assistant)',
        workspace: '~/.openclaw/workspace-andrea',
        model: 'opencode-go/kimi-k2.5',
      },
      {
        id: 'umio',
        name: 'Umio (Digital Content Clerk)',
        workspace: '~/.openclaw/workspace-umio',
        model: 'opencode-go/kimi-k2.5',
      },
    ],
  },
  bindings: [
    {
      agentId: 'linus',
      match: {
        channel: 'telegram',
        accountId: 'linus',
      },
    },
    {
      agentId: 'andrea',
      match: {
        channel: 'telegram',
        accountId: 'andrea',
      },
    },
    {
      agentId: 'main',
      match: {
        channel: 'web',
      },
    },
    {
      agentId: 'umio',
      match: {
        channel: 'telegram',
        accountId: 'umio',
      },
    },
  ],
  commands: {
    native: 'auto',
    nativeSkills: 'auto',
    restart: true,
    ownerDisplay: 'raw',
  },
  channels: {
    telegram: {
      enabled: true,
      dmPolicy: 'pairing',
      groups: {
        '*': {
          requireMention: false,
        },
        '-1003806455231': {
          requireMention: false,
        },
      },
      groupPolicy: 'open',
      streaming: 'partial',
      accounts: {
        linus: {
          dmPolicy: 'open',
          botToken: '__OPENCLAW_REDACTED__',
          allowFrom: [
            '*',
          ],
          groupAllowFrom: [
            '*',
          ],
          groupPolicy: 'open',
          streaming: 'partial',
        },
        andrea: {
          dmPolicy: 'open',
          botToken: '__OPENCLAW_REDACTED__',
          allowFrom: [
            '*',
          ],
          groupAllowFrom: [
            '*',
          ],
          groupPolicy: 'open',
          streaming: 'partial',
        },
        default: {
          dmPolicy: 'open',
          allowFrom: [
            '*',
          ],
          groupAllowFrom: [
            '*',
          ],
          groupPolicy: 'open',
          streaming: 'partial',
        },
        umio: {
          dmPolicy: 'open',
          botToken: '__OPENCLAW_REDACTED__',
          allowFrom: [
            '*',
          ],
          groupAllowFrom: [
            '*',
          ],
          groupPolicy: 'open',
          streaming: 'partial',
        },
      },
    },
  },
  gateway: {
    mode: 'local',
    controlUi: {
      dangerouslyAllowHostHeaderOriginFallback: true,
      allowInsecureAuth: true,
      dangerouslyDisableDeviceAuth: true,
    },
    trustedProxies: [
      '10.0.0.0/8',
      '172.16.0.0/12',
    ],
  },
  plugins: {
    entries: {
      telegram: {
        enabled: true,
      },
    },
  },
}