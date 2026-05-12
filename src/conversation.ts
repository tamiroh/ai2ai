import type { AgentName, ConversationSettings, Ui } from "./ui";

type Message = {
    agent: AgentName;
    text: string;
};

const modelOptions: LanguageModelCreateCoreOptions = {
    expectedInputs: [{ type: "text", languages: ["ja", "en"] }],
    expectedOutputs: [{ type: "text", languages: ["ja"] }],
};

const maxRecentMessages = 8;
const maxTurnsBeforeModelReset = 16;
const maxContextUsageRatio = 0.65;

export class ConversationController {
    private models: Record<AgentName, LanguageModel> | null = null;
    private running = false;
    private turn = 0;
    private generationAbortController: AbortController | null = null;
    private messages: Message[] = [];

    public constructor(private readonly ui: Ui) {}

    public async checkAvailability(): Promise<Availability> {
        if (!("LanguageModel" in globalThis)) {
            this.ui.setStatus(
                "error",
                "Prompt API なし",
                "Chrome Prompt API に対応した Chrome で localhost から開いてください。",
            );
            return "unavailable";
        }

        try {
            const availability = await LanguageModel.availability(modelOptions);
            if (availability === "available") {
                this.ui.setStatus("ready", "利用可能", "Gemini Nano のローカルモデルで会話できます。");
            } else if (availability === "downloadable") {
                this.ui.setStatus("busy", "ダウンロード可能", "開始ボタンでモデルの初回ダウンロードを始めます。");
            } else if (availability === "downloading") {
                this.ui.setStatus("busy", "ダウンロード中", "モデルの準備が完了するまで待ってください。");
            } else {
                this.ui.setStatus("error", "利用不可", "この端末または Chrome 設定では Prompt API を使えません。");
            }
            return availability;
        } catch (error) {
            this.ui.setStatus("error", "確認失敗", error instanceof Error ? error.message : String(error));
            return "unavailable";
        }
    }

    public async start(): Promise<void> {
        try {
            const initialSettings = this.ui.getSettings();
            await this.ensureModels(initialSettings);
            this.running = true;
            this.ui.setControls(true);

            while (this.running) {
                const settings = this.ui.getSettings();
                const agent: AgentName = this.turn % 2 === 0 ? "A" : "B";
                this.turn += 1;
                this.ui.updateTurnCounter(this.turn);
                const completed = await this.generateTurn(agent, settings);
                if (!completed || !this.running) {
                    break;
                }
                await this.resetModelsIfNeeded(settings);
                await sleep(settings.delayMs);
            }
        } catch (error) {
            this.ui.setStatus("error", "実行エラー", error instanceof Error ? error.message : String(error));
        } finally {
            this.generationAbortController = null;
            this.running = false;
            this.ui.setControls(false);
        }
    }

    public stop(): void {
        this.running = false;
        this.ui.setControls(false);
        if (this.generationAbortController) {
            this.generationAbortController.abort();
        }
    }

    public clear(): void {
        this.stop();
        this.messages = [];
        this.turn = 0;
        this.ui.clearConversation();
        this.ui.updateTurnCounter(this.turn);
        this.destroyModels();
        this.models = null;
    }

    private async createModel(agentName: AgentName, persona: string): Promise<LanguageModel> {
        return LanguageModel.create({
            ...modelOptions,
            initialPrompts: [
                {
                    role: "system",
                    content: [
                        "あなたは継続対話に参加する会話相手です。",
                        `あなたの名前は Agent ${agentName} です。`,
                        `人格: ${persona}`,
                        "返答は日本語で、短めの自然なおしゃべりにしてください。",
                        "相手の直前の発言をやさしく拾い、感想や小さな質問を添えて会話を続けてください。",
                        "討論や結論づけより、和気あいあいとした雑談の流れを優先してください。",
                        "相手から質問されたら、次の返答ではまず短く答えてください。",
                        "質問で終えるのは2回に1回までにしてください。",
                        "相手が明示的に話題にしない限り、AI、データ、解析、生成モデル、技術ニュースの話は避けてください。",
                        "日常の出来事、食べ物、散歩、音楽、読書、天気、家事、趣味のような身近な話題を中心にしてください。",
                        "絵文字は使わないでください。",
                        "直前の会話と同じ表現や比喩を繰り返さないでください。",
                    ].join("\n"),
                },
            ],
            monitor: (monitor: CreateMonitor) => {
                monitor.addEventListener("downloadprogress", (event) => {
                    const percent = Math.round((event as ProgressEvent).loaded * 100);
                    this.ui.setStatus("busy", "モデルをダウンロード中", `${percent}% 完了`);
                });
            },
        });
    }

    private async ensureModels(settings: ConversationSettings): Promise<Record<AgentName, LanguageModel>> {
        if (this.models) {
            return this.models;
        }

        const availability = await this.checkAvailability();
        if (availability === "unavailable") {
            throw new Error("Prompt API が利用できません。");
        }

        this.ui.setStatus("busy", "モデル準備中", "2つの AI モデルを準備しています。");
        const [agentA, agentB] = await Promise.all([
            this.createModel("A", settings.agentA),
            this.createModel("B", settings.agentB),
        ]);
        this.models = { A: agentA, B: agentB };
        this.ui.setStatus("ready", "会話準備完了", "停止するまで交互に発言し続けます。");
        return this.models;
    }

    private buildPrompt(agent: AgentName, otherAgent: AgentName, settings: ConversationSettings): string {
        const recentMessages = this.messages
            .slice(-maxRecentMessages)
            .map((message) => `Agent ${message.agent}: ${message.text}`)
            .join("\n");

        return [
            `テーマ: ${settings.topic}`,
            `あなたは Agent ${agent} です。次は Agent ${otherAgent} に返答してください。`,
            `最大 ${settings.maxLength} 文字。`,
            "自然な雑談として、気軽で親しみやすい口調を保ってください。",
            "2〜4文で、相手の質問に答えることを優先してください。",
            "相手が出していない技術・AI・データ分析の話題を新しく始めないでください。",
            "直近の会話に未完了の話題がある場合は、その話題を続けてください。",
            "急に新しい近況を始めず、相手の最後の発言に直接返してください。",
            "直近の会話:",
            recentMessages || "まだ会話は始まっていません。",
        ].join("\n\n");
    }

    private async generateTurn(agent: AgentName, settings: ConversationSettings): Promise<boolean> {
        const otherAgent: AgentName = agent === "A" ? "B" : "A";
        const model = this.models![agent];
        this.generationAbortController = new AbortController();
        const pending = this.ui.appendMessage(agent, "", this.turn, true);
        let output = "";

        try {
            const prompt = this.buildPrompt(agent, otherAgent, settings);
            this.logPrompt(agent, prompt);
            const stream = model.promptStreaming(prompt, {
                signal: this.generationAbortController.signal,
            });
            const reader = stream.getReader();

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                output += value;
                this.ui.updatePendingMessage(pending, output);
            }
        } catch (error) {
            if (this.generationAbortController.signal.aborted) {
                this.ui.markMessageStopped(pending);
                return false;
            }
            throw error;
        }

        const cleanOutput = output.trim();
        this.ui.finalizeMessage(pending, cleanOutput || "（空の応答）", this.turn);
        this.messages.push({ agent, text: cleanOutput });
        this.trimMessages();
        return true;
    }

    private async resetModelsIfNeeded(settings: ConversationSettings): Promise<void> {
        if (!this.models) {
            return;
        }

        if (!this.shouldResetModels()) {
            return;
        }

        this.ui.setStatus("busy", "文脈整理中", "会話が重くならないよう AI モデルを作り直しています。");
        this.destroyModels();
        this.ui.appendSystemMessage(`Turn ${this.turn}。ふたりは少し深呼吸して、直近の話の余韻から会話を続けます。`);
        this.models = null;
        await this.ensureModels(settings);
    }

    private shouldResetModels(): boolean {
        if (!this.models) {
            return false;
        }

        if (this.turn > 0 && this.turn % maxTurnsBeforeModelReset === 0) {
            return true;
        }

        return Object.values(this.models).some((model) => {
            if (model.contextWindow <= 0) {
                return false;
            }
            return model.contextUsage / model.contextWindow >= maxContextUsageRatio;
        });
    }

    private destroyModels(): void {
        if (!this.models) {
            return;
        }

        for (const model of Object.values(this.models)) {
            model.destroy();
        }
    }

    private trimMessages(): void {
        if (this.messages.length > maxRecentMessages) {
            this.messages = this.messages.slice(-maxRecentMessages);
        }
    }

    private logPrompt(agent: AgentName, prompt: string): void {
        console.groupCollapsed(`[AI2AI] prompt turn=${this.turn} agent=${agent}`);
        console.log(prompt);
        console.groupEnd();
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}
