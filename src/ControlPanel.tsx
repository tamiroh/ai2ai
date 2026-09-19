import { css } from "../styled-system/css";
import { token } from "../styled-system/tokens";
import type { ConversationSettings, Status } from "./useConversation";

type ControlPanelProps = {
    status: Status;
    running: boolean;
    settings: ConversationSettings;
    onSettingsChange: (patch: Partial<ConversationSettings>) => void;
    onToggle: () => void;
    onClear: () => void;
};

const panelSectionStyles = css({
    minHeight: 0,
    background: "panel",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "line",
    boxShadow: "panel",
    display: "flex",
    flexDirection: "column",
    gap: "28px",
    overflow: "auto",
    borderRadius: "8px",
    padding: "22px",
});

const bottomStyles = css({
    marginTop: "12px",
    display: "grid",
    gap: "12px",
});

const fieldStyles = css({
    display: "grid",
    gap: "8px",
    color: "muted",
    fontSize: "13px",
    fontWeight: 700,
});

const fieldControlBaseStyles = {
    width: "100%",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "line",
    borderRadius: "8px",
    background: "panel",
    color: "ink",
    padding: "11px 12px",
    outline: "none",
    _focus: {
        borderColor: "accent",
        boxShadow: `0 0 0 3px ${token("colors.focusRing")}`,
    },
} as const;

const fieldControlStyles = css(fieldControlBaseStyles);

const textareaStyles = css({
    ...fieldControlBaseStyles,
    resize: "vertical",
    lineHeight: 1.5,
});

const agentGridStyles = css({
    display: "grid",
    gap: "12px",
});

const settingsGridStyles = css({
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "1fr 128px",
    alignItems: "end",
    "@media (max-width: 860px)": {
        gridTemplateColumns: "1fr",
    },
});

const actionsStyles = css({
    display: "grid",
    gap: "12px",
    gridTemplateColumns: "1fr 1fr",
    "@media (max-width: 860px)": {
        gridTemplateColumns: "1fr",
    },
});

const buttonBaseStyles = {
    minHeight: "44px",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "line",
    borderRadius: "8px",
    background: "panel",
    color: "ink",
    fontWeight: 800,
    cursor: "pointer",
    "&:hover:not(:disabled)": {
        borderColor: "accent",
    },
    _disabled: {
        cursor: "not-allowed",
        opacity: 0.48,
    },
} as const;

const clearButtonStyles = css(buttonBaseStyles);

const startButtonStyles = css({
    ...buttonBaseStyles,
    borderColor: "accent",
    background: "accent",
    color: "panel",
    "&:hover:not(:disabled)": {
        background: "accentStrong",
    },
});

const busyButtonStyles = css({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    opacity: 1,
    _before: {
        content: "''",
        width: "14px",
        height: "14px",
        flexShrink: 0,
        border: "2px solid currentcolor",
        borderRightColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        _motionReduce: {
            animationName: "none",
        },
    },
});

const statusErrorStyles = css({
    margin: 0,
    color: "danger",
    fontSize: "13px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
});

export function ControlPanel({ status, running, settings, onSettingsChange, onToggle, onClear }: ControlPanelProps) {
    const displayStatus = describeStatus(status);
    const isBusy = displayStatus.kind === "busy";
    const buttonLabel = isBusy ? "準備中" : running ? "停止" : "開始";
    const buttonTitle = displayStatus.title ? `${displayStatus.title}：${displayStatus.detail}` : undefined;

    return (
        <section className={panelSectionStyles} aria-label="Conversation controls">
            <label className={fieldStyles}>
                <span>会話テーマ</span>
                <textarea
                    className={textareaStyles}
                    rows={4}
                    value={settings.topic}
                    onInput={(event) => onSettingsChange({ topic: event.currentTarget.value })}
                />
            </label>

            <div className={agentGridStyles}>
                <label className={fieldStyles}>
                    <span>Agent A</span>
                    <input
                        className={fieldControlStyles}
                        value={settings.agentA}
                        onInput={(event) => onSettingsChange({ agentA: event.currentTarget.value })}
                    />
                </label>
                <label className={fieldStyles}>
                    <span>Agent B</span>
                    <input
                        className={fieldControlStyles}
                        value={settings.agentB}
                        onInput={(event) => onSettingsChange({ agentB: event.currentTarget.value })}
                    />
                </label>
            </div>

            <div className={settingsGridStyles}>
                <label className={fieldStyles}>
                    <span>
                        間隔 <output>{(settings.delayMs / 1000).toFixed(1)}s</output>
                    </span>
                    <input
                        className={fieldControlStyles}
                        type="range"
                        min={300}
                        max={5000}
                        step={100}
                        value={settings.delayMs}
                        onInput={(event) => onSettingsChange({ delayMs: Number(event.currentTarget.value) })}
                    />
                </label>
                <label className={fieldStyles}>
                    <span>1発言の上限</span>
                    <input
                        className={fieldControlStyles}
                        type="number"
                        min={80}
                        max={800}
                        step={20}
                        value={settings.maxLength}
                        onInput={(event) => onSettingsChange({ maxLength: Number(event.currentTarget.value) })}
                    />
                </label>
            </div>

            <div className={bottomStyles}>
                <div className={actionsStyles}>
                    <button
                        className={`${startButtonStyles} ${isBusy ? busyButtonStyles : ""}`}
                        type="button"
                        title={buttonTitle}
                        aria-label={running ? "停止" : "開始"}
                        onClick={onToggle}
                    >
                        {buttonLabel}
                    </button>
                    <button className={clearButtonStyles} type="button" onClick={onClear}>
                        消去
                    </button>
                </div>
                {displayStatus.kind === "error" && (
                    <p className={statusErrorStyles} role="alert">
                        {displayStatus.title}：{displayStatus.detail}
                    </p>
                )}
            </div>
        </section>
    );
}

type DisplayStatus = {
    kind: "ready" | "busy" | "error";
    title: string;
    detail: string;
};

function describeStatus(status: Status): DisplayStatus {
    switch (status.kind) {
        case "idle":
            return { kind: "ready", title: "", detail: "" };
        case "preparing":
            return { kind: "busy", title: "モデル準備中", detail: "モデルの準備状況を確認しています。" };
        case "resetting":
            return { kind: "busy", title: "文脈整理中", detail: "会話が重くならないよう AI モデルを作り直しています。" };
        case "running":
            return { kind: "ready", title: "会話中", detail: "停止するまで交互に発言し続けます。" };
        case "downloading":
            return { kind: "busy", title: "モデルをダウンロード中", detail: `${Math.round(status.progress * 100)}% 完了` };
        case "error":
            return { kind: "error", title: "実行エラー", detail: errorMessage(status.error) };
        case "availability":
            switch (status.value.kind) {
                case "checking":
                    return { kind: "ready", title: "", detail: "" };
                case "available":
                    return { kind: "ready", title: "利用可能", detail: "Gemini Nano のローカルモデルで会話できます。" };
                case "downloadable":
                    return { kind: "ready", title: "ダウンロード可能", detail: "開始ボタンでモデルの初回ダウンロードを始めます。" };
                case "downloading":
                    return { kind: "busy", title: "ダウンロード中", detail: "モデルの準備が完了するまで待ってください。" };
                case "unavailable":
                    return { kind: "error", title: "利用不可", detail: "この端末または Chrome 設定では Prompt API を使えません。" };
                case "unsupported":
                    return { kind: "error", title: "Prompt API なし", detail: "Chrome Prompt API に対応した Chrome で localhost から開いてください。" };
                case "error":
                    return { kind: "error", title: "確認失敗", detail: errorMessage(status.value.error) };
            }
    }
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
