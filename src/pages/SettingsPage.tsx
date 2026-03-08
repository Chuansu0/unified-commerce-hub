import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, Bot, Sparkles, Eye, EyeOff, RotateCcw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "insforge-ai-settings";

interface OpenClawConfig {
  agentUrl: string;
  apiKey: string;
  enabled: boolean;
  systemPrompt: string;
  timeout: string;
}

interface LLMConfig {
  baseUrl: string;
  apiToken: string;
  model: string;
  temperature: string;
  maxTokens: string;
  enabled: boolean;
}

interface AISettings {
  openclaw: OpenClawConfig;
  llm: LLMConfig;
  priority: "openclaw" | "llm";
}

const defaultSettings: AISettings = {
  openclaw: {
    agentUrl: "",
    apiKey: "",
    enabled: true,
    systemPrompt: "",
    timeout: "30",
  },
  llm: {
    baseUrl: "",
    apiToken: "",
    model: "gpt-4o",
    temperature: "0.7",
    maxTokens: "2048",
    enabled: false,
  },
  priority: "openclaw",
};

const SettingsPage = () => {
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [showOpenClawKey, setShowOpenClawKey] = useState(false);
  const [showLLMToken, setShowLLMToken] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  const updateOpenClaw = (patch: Partial<OpenClawConfig>) => {
    setSettings((prev) => ({ ...prev, openclaw: { ...prev.openclaw, ...patch } }));
    setSaved(false);
  };

  const updateLLM = (patch: Partial<LLMConfig>) => {
    setSettings((prev) => ({ ...prev, llm: { ...prev.llm, ...patch } }));
    setSaved(false);
  };

  const handleSave = () => {
    // Validate
    if (settings.openclaw.enabled && !settings.openclaw.agentUrl.trim()) {
      toast.error("請填入 OpenClaw Agent URL");
      return;
    }
    if (settings.llm.enabled && !settings.llm.baseUrl.trim()) {
      toast.error("請填入大模型 Base URL");
      return;
    }
    if (settings.llm.enabled && !settings.llm.apiToken.trim()) {
      toast.error("請填入大模型 API Token");
      return;
    }
    const temp = Number(settings.llm.temperature);
    if (settings.llm.enabled && (isNaN(temp) || temp < 0 || temp > 2)) {
      toast.error("Temperature 須介於 0 ~ 2");
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    toast.success("AI 設定已儲存");
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
    setSaved(false);
    toast.info("已還原為預設設定");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">AI 對話協助設定與整合管理</p>
      </div>

      {/* Priority */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI 對話優先順序
          </CardTitle>
          <CardDescription className="text-xs">
            設定對話中 AI 回覆的優先來源
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <Label className="text-sm">優先使用</Label>
              <Select value={settings.priority} onValueChange={(v) => { setSettings((p) => ({ ...p, priority: v as "openclaw" | "llm" })); setSaved(false); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openclaw">OpenClaw Agent（第一優先）</SelectItem>
                  <SelectItem value="llm">大模型 API（第一優先）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground pt-5 shrink-0">
              當首選服務無回應時自動切換備援
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OpenClaw */}
      <Card className={settings.openclaw.enabled ? "border-primary/30" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <CardTitle className="font-display text-base">OpenClaw Agent</CardTitle>
              {settings.priority === "openclaw" && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">首選</Badge>
              )}
            </div>
            <Switch
              checked={settings.openclaw.enabled}
              onCheckedChange={(v) => updateOpenClaw({ enabled: v })}
            />
          </div>
          <CardDescription className="text-xs">
            OpenClaw AI Agent Webhook 設定，用於智慧客服對話
          </CardDescription>
        </CardHeader>
        {settings.openclaw.enabled && (
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="oc-url" className="text-sm">Agent URL <span className="text-destructive">*</span></Label>
              <Input
                id="oc-url"
                value={settings.openclaw.agentUrl}
                onChange={(e) => updateOpenClaw({ agentUrl: e.target.value })}
                placeholder="https://your-openclaw-instance.com/api/agent"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">OpenClaw Agent 的 Webhook 端點 URL</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="oc-key" className="text-sm">API Key</Label>
              <div className="relative">
                <Input
                  id="oc-key"
                  type={showOpenClawKey ? "text" : "password"}
                  value={settings.openclaw.apiKey}
                  onChange={(e) => updateOpenClaw({ apiKey: e.target.value })}
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  className="font-mono text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowOpenClawKey(!showOpenClawKey)}
                >
                  {showOpenClawKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">用於驗證請求的 API 金鑰（選填）</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="oc-prompt" className="text-sm">System Prompt</Label>
              <Textarea
                id="oc-prompt"
                value={settings.openclaw.systemPrompt}
                onChange={(e) => updateOpenClaw({ systemPrompt: e.target.value })}
                placeholder="你是 InsForge 的智慧客服助理，擅長回答商品與訂單相關問題…"
                rows={3}
                className="text-sm resize-none"
                maxLength={2000}
              />
              <p className="text-[11px] text-muted-foreground">自訂 AI Agent 的角色設定（選填，最多 2000 字）</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="oc-timeout" className="text-sm">Timeout（秒）</Label>
              <Input
                id="oc-timeout"
                type="number"
                min="5"
                max="120"
                value={settings.openclaw.timeout}
                onChange={(e) => updateOpenClaw({ timeout: e.target.value })}
                className="w-32 font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">請求逾時時間，超過後切換至備援</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* LLM */}
      <Card className={settings.llm.enabled ? "border-primary/30" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="font-display text-base">大模型 API</CardTitle>
              {settings.priority === "llm" && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">首選</Badge>
              )}
            </div>
            <Switch
              checked={settings.llm.enabled}
              onCheckedChange={(v) => updateLLM({ enabled: v })}
            />
          </div>
          <CardDescription className="text-xs">
            相容 OpenAI API 格式的大語言模型設定（備援或獨立使用）
          </CardDescription>
        </CardHeader>
        {settings.llm.enabled && (
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="llm-url" className="text-sm">Base URL <span className="text-destructive">*</span></Label>
              <Input
                id="llm-url"
                value={settings.llm.baseUrl}
                onChange={(e) => updateLLM({ baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">支援 OpenAI 相容 API 端點（如 OpenAI、Azure、本地模型等）</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="llm-token" className="text-sm">API Token <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="llm-token"
                  type={showLLMToken ? "text" : "password"}
                  value={settings.llm.apiToken}
                  onChange={(e) => updateLLM({ apiToken: e.target.value })}
                  placeholder="sk-xxxxxxxxxxxxxxxx"
                  className="font-mono text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowLLMToken(!showLLMToken)}
                >
                  {showLLMToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">用於認證的 API Token</p>
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="llm-model" className="text-sm">Model</Label>
                <Input
                  id="llm-model"
                  value={settings.llm.model}
                  onChange={(e) => updateLLM({ model: e.target.value })}
                  placeholder="gpt-4o"
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="llm-temp" className="text-sm">Temperature</Label>
                <Input
                  id="llm-temp"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.llm.temperature}
                  onChange={(e) => updateLLM({ temperature: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="llm-tokens" className="text-sm">Max Tokens</Label>
                <Input
                  id="llm-tokens"
                  type="number"
                  min="256"
                  max="128000"
                  value={settings.llm.maxTokens}
                  onChange={(e) => updateLLM({ maxTokens: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">整合狀態</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { name: "InsForge", env: "INSFORGE_BASE_URL", desc: "主資料庫" },
            { name: "n8n Chat", env: "N8N_CHAT_WEBHOOK_URL", desc: "聊天工作流" },
            { name: "n8n Order", env: "N8N_ORDER_WEBHOOK_URL", desc: "訂單工作流" },
            { name: "OpenClaw", env: "OPENCLAW_AGENT_URL", desc: "AI Agent" },
          ].map((svc) => (
            <div key={svc.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
              <div>
                <p className="text-sm font-medium">{svc.name}</p>
                <p className="text-xs text-muted-foreground">{svc.desc}</p>
              </div>
              <code className="text-xs text-muted-foreground font-mono">{svc.env}</code>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between pb-8">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          還原預設
        </Button>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-primary flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              已儲存
            </span>
          )}
          <Button size="sm" className="gap-1.5" onClick={handleSave}>
            <Save className="h-3.5 w-3.5" />
            儲存設定
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
