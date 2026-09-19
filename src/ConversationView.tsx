import type { ComponentChildren } from "preact";
import { useRef, useState } from "preact/hooks";
import { css } from "../styled-system/css";
import { token } from "../styled-system/tokens";
import { Message } from "./Message";
import type { DisplayMessage } from "./useConversation";

type ConversationViewProps = {
    messages: DisplayMessage[];
    typingName: string | null;
    toolbar: ComponentChildren;
};

const shellStyles = css({
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr) auto",
    minWidth: 0,
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

const typingStyles = css({
    minHeight: "40px",
    margin: 0,
    padding: "0 24px 14px",
    color: "muted",
    fontSize: "13px",
    fontWeight: 700,
});

const topFadeStyles = css({
    maskImage: `linear-gradient(to bottom, transparent, ${token("colors.panel")} 48px)`,
});

export function ConversationView({ messages, typingName, toolbar }: ConversationViewProps) {
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
            {toolbar}
            <ol className={`${listStyles} ${isScrolled ? topFadeStyles : ""}`} ref={followBottom} onScroll={handleScroll}>
                {messages.map((message) => (
                    <Message key={message.id} message={message} />
                ))}
            </ol>
            <p className={typingStyles} aria-live="polite">
                {typingName && `${typingName} が入力しています…`}
            </p>
        </section>
    );
}
