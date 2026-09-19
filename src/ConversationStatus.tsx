import { css } from "../styled-system/css";
import type { Status } from "./useConversation";

type ConversationStatusProps = {
    status: Status;
};

const statusStyles = css({
    minHeight: "44px",
    margin: 0,
    padding: "12px 24px",
    color: "muted",
    fontSize: "13px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
});

const statusErrorStyles = css({ color: "danger" });

export function ConversationStatus({ status }: ConversationStatusProps) {
    const { kind, title, detail } = describeStatus(status);

    return (
        <p className={`${statusStyles} ${kind === "error" ? statusErrorStyles : ""}`} role={kind === "error" ? "alert" : undefined}>
            {kind !== "ready" && `${title}：${detail}`}
        </p>
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
