export type AgentName = "A" | "B";
export type StatusKind = "ready" | "busy" | "error";

export type ConversationSettings = {
    topic: string;
    agentA: string;
    agentB: string;
    delayMs: number;
    maxLength: number;
};

type UiElements = {
    statusCard: HTMLElement;
    statusTitle: HTMLElement;
    statusDetail: HTMLElement;
    topicInput: HTMLTextAreaElement;
    agentAInput: HTMLInputElement;
    agentBInput: HTMLInputElement;
    delayInput: HTMLInputElement;
    delayOutput: HTMLOutputElement;
    lengthInput: HTMLInputElement;
    startButton: HTMLButtonElement;
    stopButton: HTMLButtonElement;
    clearButton: HTMLButtonElement;
    conversation: HTMLOListElement;
    turnCounter: HTMLElement;
};

export type Ui = {
    setStatus(kind: StatusKind, title: string, detail: string): void;
    setControls(isRunning: boolean): void;
    updateDelayLabel(): void;
    appendMessage(agent: AgentName, text: string, turn: number, pending?: boolean): HTMLLIElement;
    updatePendingMessage(item: HTMLLIElement, text: string): void;
    finalizeMessage(item: HTMLLIElement, text: string, turn: number): void;
    markMessageStopped(item: HTMLLIElement): void;
    appendSystemMessage(text: string): void;
    updateTurnCounter(turn: number): void;
    clearConversation(): void;
    getSettings(): ConversationSettings;
    onStart(listener: () => void): void;
    onStop(listener: () => void): void;
    onClear(listener: () => void): void;
    onDelayChange(listener: () => void): void;
};

export function createUi(): Ui {
    document.body.insertAdjacentHTML("beforeend", `
        <main class="app">
            <section class="control-panel" aria-label="Conversation controls">
                <div class="status-card" id="statusCard">
                    <span class="status-dot" id="statusDot"></span>
                    <div>
                        <p class="status-title" id="statusTitle">未接続</p>
                        <p class="status-detail" id="statusDetail">Chrome の Prompt API を確認しています。</p>
                    </div>
                </div>

                <label class="field">
                    <span>会話テーマ</span>
                    <textarea id="topicInput" rows="4">ふたりが、最近ちょっと楽しかったことや気になることを、ゆるく話し続ける。</textarea>
                </label>

                <div class="agent-grid">
                    <label class="field">
                        <span>Agent A</span>
                        <input id="agentAInput" value="穏やかで聞き上手。相手の話に乗りながら、日常の小さな発見を楽しむ。" />
                    </label>
                    <label class="field">
                        <span>Agent B</span>
                        <input id="agentBInput" value="明るく好奇心旺盛。少し冗談を交えつつ、会話をあたたかく広げる。" />
                    </label>
                </div>

                <div class="settings-grid">
                    <label class="field">
                        <span>間隔 <output id="delayOutput">1.2s</output></span>
                        <input id="delayInput" type="range" min="300" max="5000" step="100" value="1200" />
                    </label>
                    <label class="field">
                        <span>1発言の上限</span>
                        <input id="lengthInput" type="number" min="80" max="800" step="20" value="220" />
                    </label>
                </div>

                <div class="actions">
                    <button class="primary" id="startButton" type="button">開始</button>
                    <button id="stopButton" type="button" disabled>停止</button>
                    <button id="clearButton" type="button">消去</button>
                </div>
            </section>

            <section class="conversation-shell" aria-label="AI conversation">
                <span class="turn-counter" id="turnCounter">0 turns</span>
                <ol class="conversation" id="conversation"></ol>
            </section>
        </main>
    `);

    const dom: UiElements = {
        statusCard: query("#statusCard", HTMLElement),
        statusTitle: query("#statusTitle", HTMLElement),
        statusDetail: query("#statusDetail", HTMLElement),
        topicInput: query("#topicInput", HTMLTextAreaElement),
        agentAInput: query("#agentAInput", HTMLInputElement),
        agentBInput: query("#agentBInput", HTMLInputElement),
        delayInput: query("#delayInput", HTMLInputElement),
        delayOutput: query("#delayOutput", HTMLOutputElement),
        lengthInput: query("#lengthInput", HTMLInputElement),
        startButton: query("#startButton", HTMLButtonElement),
        stopButton: query("#stopButton", HTMLButtonElement),
        clearButton: query("#clearButton", HTMLButtonElement),
        conversation: query("#conversation", HTMLOListElement),
        turnCounter: query("#turnCounter", HTMLElement),
    };

    return {
        setStatus(kind, title, detail) {
            dom.statusCard.className = `status-card ${kind}`;
            dom.statusTitle.textContent = title;
            dom.statusDetail.textContent = detail;
        },

        setControls(isRunning) {
            dom.startButton.disabled = isRunning;
            dom.stopButton.disabled = !isRunning;
        },

        updateDelayLabel() {
            dom.delayOutput.textContent = `${(Number(dom.delayInput.value) / 1000).toFixed(1)}s`;
        },

        appendMessage(agent, text, turn, pending = false) {
            const item = document.createElement("li");
            item.className = `message ${agent === "A" ? "agent-a" : "agent-b"}`;
            item.innerHTML = `
                <div class="message-meta">
                    <span>Agent ${agent}</span>
                    <span>${pending ? "生成中" : `Turn ${turn}`}</span>
                </div>
                <p class="message-text"></p>
            `;
            item.querySelector(".message-text")!.textContent = text;
            dom.conversation.append(item);
            scrollConversationToBottom(dom);
            return item;
        },

        updatePendingMessage(item, text) {
            item.querySelector(".message-text")!.textContent = text;
            scrollConversationToBottom(dom);
        },

        finalizeMessage(item, text, turn) {
            item.querySelector(".message-text")!.textContent = text;
            item.querySelector(".message-meta span:last-child")!.textContent = `Turn ${turn}`;
            scrollConversationToBottom(dom);
        },

        markMessageStopped(item) {
            item.querySelector(".message-text")!.textContent = "停止しました。";
        },

        appendSystemMessage(text) {
            const item = document.createElement("li");
            item.className = "message system-message";
            item.innerHTML = `
                <div class="message-meta">
                    <span>System</span>
                    <span>Pause</span>
                </div>
                <p class="message-text"></p>
            `;
            item.querySelector(".message-text")!.textContent = text;
            dom.conversation.append(item);
            scrollConversationToBottom(dom);
        },

        updateTurnCounter(turn) {
            dom.turnCounter.textContent = `${turn} turns`;
        },

        clearConversation() {
            dom.conversation.innerHTML = "";
        },

        getSettings() {
            return {
                topic: dom.topicInput.value.trim(),
                agentA: dom.agentAInput.value.trim(),
                agentB: dom.agentBInput.value.trim(),
                delayMs: Number(dom.delayInput.value),
                maxLength: Number(dom.lengthInput.value),
            };
        },

        onStart(listener) {
            dom.startButton.addEventListener("click", listener);
        },

        onStop(listener) {
            dom.stopButton.addEventListener("click", listener);
        },

        onClear(listener) {
            dom.clearButton.addEventListener("click", listener);
        },

        onDelayChange(listener) {
            dom.delayInput.addEventListener("input", listener);
        },
    };
}

function query<T extends HTMLElement>(selector: string, constructor: new () => T): T {
    const element = document.querySelector(selector);
    if (!(element instanceof constructor)) {
        throw new Error(`Missing element: ${selector}`);
    }
    return element;
}

function scrollConversationToBottom(dom: UiElements): void {
    dom.conversation.scrollTop = dom.conversation.scrollHeight;
}
