import type { ConversationSettings, Status } from "./useConversation";

type ControlPanelProps = {
    status: Status;
    running: boolean;
    settings: ConversationSettings;
    onSettingsChange: (patch: Partial<ConversationSettings>) => void;
    onToggle: () => void;
    onClear: () => void;
};

export function ControlPanel({ status, running, settings, onSettingsChange, onToggle, onClear }: ControlPanelProps) {
    const isBusy = status.kind === "busy";
    const buttonLabel = isBusy ? "準備中" : running ? "停止" : "開始";
    const buttonTitle = status.title ? `${status.title}：${status.detail}` : undefined;

    return (
        <section className="control-panel" aria-label="Conversation controls">
            <label className="field">
                <span>会話テーマ</span>
                <textarea
                    rows={4}
                    value={settings.topic}
                    onInput={(event) => onSettingsChange({ topic: event.currentTarget.value })}
                />
            </label>

            <div className="agent-grid">
                <label className="field">
                    <span>Agent A</span>
                    <input
                        value={settings.agentA}
                        onInput={(event) => onSettingsChange({ agentA: event.currentTarget.value })}
                    />
                </label>
                <label className="field">
                    <span>Agent B</span>
                    <input
                        value={settings.agentB}
                        onInput={(event) => onSettingsChange({ agentB: event.currentTarget.value })}
                    />
                </label>
            </div>

            <div className="settings-grid">
                <label className="field">
                    <span>
                        間隔 <output>{(settings.delayMs / 1000).toFixed(1)}s</output>
                    </span>
                    <input
                        type="range"
                        min={300}
                        max={5000}
                        step={100}
                        value={settings.delayMs}
                        onInput={(event) => onSettingsChange({ delayMs: Number(event.currentTarget.value) })}
                    />
                </label>
                <label className="field">
                    <span>1発言の上限</span>
                    <input
                        type="number"
                        min={80}
                        max={800}
                        step={20}
                        value={settings.maxLength}
                        onInput={(event) => onSettingsChange({ maxLength: Number(event.currentTarget.value) })}
                    />
                </label>
            </div>

            <div className="actions">
                <button
                    className={`primary ${isBusy ? "is-busy" : ""}`}
                    type="button"
                    title={buttonTitle}
                    aria-label={running ? "停止" : "開始"}
                    onClick={onToggle}
                >
                    {buttonLabel}
                </button>
                <button type="button" onClick={onClear}>
                    消去
                </button>
            </div>
            {status.kind === "error" && (
                <p className="status-error" role="alert">
                    {status.title}：{status.detail}
                </p>
            )}
        </section>
    );
}
