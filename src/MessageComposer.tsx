import { useState } from "preact/hooks";
import { css } from "../styled-system/css";
import { token } from "../styled-system/tokens";

type MessageComposerProps = {
    onSend: (text: string) => void;
};

const formStyles = css({
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "12px",
    alignItems: "end",
    padding: "0 24px 24px",
});

const textareaStyles = css({
    width: "100%",
    minHeight: "44px",
    maxHeight: "160px",
    borderRadius: "22px",
    background: "panel",
    color: "ink",
    padding: "9px 18px",
    lineHeight: "24px",
    resize: "none",
    outline: "none",
    _focus: {
        boxShadow: `0 0 0 3px ${token("colors.focusRing")}`,
    },
});

const sendButtonStyles = css({
    minHeight: "44px",
    minWidth: "88px",
    border: "none",
    borderRadius: "22px",
    boxShadow: "none",
    background: "accent",
    color: "panel",
    padding: "0 20px",
    fontWeight: 800,
    cursor: "pointer",
    "&:hover:not(:disabled)": {
        background: "accentStrong",
    },
    _disabled: {
        cursor: "not-allowed",
        opacity: 0.48,
    },
});

export function MessageComposer({ onSend }: MessageComposerProps) {
    const [text, setText] = useState("");
    const trimmed = text.trim();

    return (
        <form
            className={formStyles}
            onSubmit={(event) => {
                event.preventDefault();
                if (trimmed) {
                    onSend(trimmed);
                    setText("");
                }
            }}
        >
            <textarea
                className={textareaStyles}
                rows={1}
                placeholder="会話に参加する"
                aria-label="メッセージ"
                value={text}
                onInput={(event) => setText(event.currentTarget.value)}
            />
            <button className={sendButtonStyles} type="submit" disabled={!trimmed}>
                送信
            </button>
        </form>
    );
}
