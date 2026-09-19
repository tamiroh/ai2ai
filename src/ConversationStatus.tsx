import { css } from "../styled-system/css";
import type { Status } from "./useConversation";

type ConversationStatusProps = {
    status: Status;
};

const statusStyles = css({
    minHeight: "44px",
    margin: 0,
    padding: "12px 24px",
    color: "danger",
    fontSize: "13px",
    lineHeight: 1.5,
    overflowWrap: "anywhere",
});

export function ConversationStatus({ status }: ConversationStatusProps) {
    return (
        <p className={statusStyles} role="alert">
            {describeError(status)}
        </p>
    );
}

function describeError(status: Status): string | null {
    switch (status.kind) {
        case "error":
            return `実行エラー：${errorMessage(status.error)}`;
        case "availability":
            switch (status.value.kind) {
                case "unavailable":
                    return "利用不可：この端末またはブラウザの設定では AI モデルを使えません。";
                case "unsupported":
                    return "このブラウザは非対応です：AI モデルを使える最新の Chrome で開いてください。";
                case "error":
                    return `確認失敗：${errorMessage(status.value.error)}`;
                default:
                    return null;
            }
        default:
            return null;
    }
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
