import { css } from "../styled-system/css";
import type { Status } from "./useConversation";

type ConversationToolbarProps = {
    status: Status;
    running: boolean;
    onToggle: () => void;
    onClear: () => void;
};

const toolbarStyles = css({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "12px 24px",
});

const actionsStyles = css({
    display: "flex",
    flexShrink: 0,
    gap: "12px",
    marginLeft: "auto",
});

const buttonBaseStyles = {
    minHeight: "44px",
    minWidth: "96px",
    padding: "0 20px",
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

export function ConversationToolbar({ status, running, onToggle, onClear }: ConversationToolbarProps) {
    const displayStatus = describeStatus(status);
    const isBusy = displayStatus.kind === "busy";
    const buttonLabel = isBusy ? "準備中" : running ? "停止" : "開始";
    const buttonTitle = displayStatus.title ? `${displayStatus.title}：${displayStatus.detail}` : undefined;

    return (
        <div className={toolbarStyles}>
            {displayStatus.kind === "error" && (
                <p className={statusErrorStyles} role="alert">
                    {displayStatus.title}：{displayStatus.detail}
                </p>
            )}
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
        </div>
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
