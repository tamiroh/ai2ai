import { useRef, useState } from "preact/hooks";
import { css } from "../styled-system/css";
import { token } from "../styled-system/tokens";
import { Message } from "./Message";
import type { DisplayMessage } from "./useConversation";

type ConversationViewProps = {
    messages: DisplayMessage[];
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

const listStyles = css({
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    minHeight: 0,
    margin: 0,
    padding: "24px",
    overflow: "auto",
    listStyle: "none",
});

const topFadeStyles = css({
    maskImage: `linear-gradient(to bottom, transparent, ${token("colors.panel")} 48px)`,
});

export function ConversationView({ messages }: ConversationViewProps) {
    const [isScrolled, setIsScrolled] = useState(false);
    const isStickyRef = useRef(true);
    const previousScrollTopRef = useRef(0);

    const handleScroll = (event: Event) => {
        const list = event.currentTarget as HTMLOListElement;
        setIsScrolled(list.scrollTop > 0);
        if (list.scrollHeight - list.scrollTop - list.clientHeight <= 8) {
            isStickyRef.current = true;
        } else if (list.scrollTop < previousScrollTopRef.current) {
            isStickyRef.current = false;
        }
        previousScrollTopRef.current = list.scrollTop;
    };

    // Runs on every commit, so the list follows new content while sticky.
    const followBottom = (list: HTMLOListElement | null) => {
        if (list && isStickyRef.current) {
            list.scrollTop = list.scrollHeight;
        }
    };

    return (
        <section className={shellStyles} aria-label="AI conversation">
            <ol className={`${listStyles} ${isScrolled ? topFadeStyles : ""}`} ref={followBottom} onScroll={handleScroll}>
                {messages.map((message) => (
                    <Message key={message.id} message={message} />
                ))}
            </ol>
        </section>
    );
}
