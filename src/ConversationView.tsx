import { useEffect, useRef } from "preact/hooks";
import { css } from "../styled-system/css";
import { token } from "../styled-system/tokens";
import { Message } from "./Message";
import type { DisplayMessage } from "./useConversation";

type ConversationViewProps = {
    messages: DisplayMessage[];
    turn: number;
};

const shellStyles = css({
    minHeight: 0,
    background: "panel",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "line",
    boxShadow: "panel",
    position: "relative",
    display: "grid",
    gridTemplateRows: "minmax(0, 1fr)",
    minWidth: 0,
    borderRadius: "8px",
    overflow: "hidden",
});

const turnCounterStyles = css({
    position: "absolute",
    top: "16px",
    right: "24px",
    zIndex: 1,
    whiteSpace: "nowrap",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "line",
    borderRadius: "999px",
    padding: "8px 12px",
    background: "panel",
    color: "muted",
    fontSize: "13px",
    fontWeight: 800,
});

const listStyles = css({
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    minHeight: 0,
    margin: 0,
    padding: "64px 24px 24px",
    overflow: "auto",
    listStyle: "none",
    maskImage: `linear-gradient(to bottom, transparent 16px, ${token("colors.panel")} 112px)`,
});

export function ConversationView({ messages, turn }: ConversationViewProps) {
    const listRef = useRef<HTMLOListElement>(null);

    useEffect(() => {
        const list = listRef.current;
        if (list) {
            list.scrollTop = list.scrollHeight;
        }
    }, [messages]);

    return (
        <section className={shellStyles} aria-label="AI conversation">
            <span className={turnCounterStyles}>{turn} turns</span>
            <ol className={listStyles} ref={listRef}>
                {messages.map((message) => (
                    <Message key={message.id} message={message} />
                ))}
            </ol>
        </section>
    );
}
