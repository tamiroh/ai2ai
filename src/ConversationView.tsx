import { useEffect, useRef, useState } from "preact/hooks";
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
    const listRef = useRef<HTMLOListElement>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    const isStickyRef = useRef(true);

    useEffect(() => {
        const list = listRef.current;
        if (list && isStickyRef.current) {
            list.scrollTop = list.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        const list = listRef.current;
        if (!list) {
            return;
        }
        let previousScrollTop = list.scrollTop;
        const updateScrolled = () => {
            setIsScrolled(list.scrollTop > 0);
            if (list.scrollHeight - list.scrollTop - list.clientHeight <= 8) {
                isStickyRef.current = true;
            } else if (list.scrollTop < previousScrollTop) {
                isStickyRef.current = false;
            }
            previousScrollTop = list.scrollTop;
        };
        updateScrolled();
        list.addEventListener("scroll", updateScrolled);
        return () => list.removeEventListener("scroll", updateScrolled);
    }, []);

    return (
        <section className={shellStyles} aria-label="AI conversation">
            <ol className={`${listStyles} ${isScrolled ? topFadeStyles : ""}`} ref={listRef}>
                {messages.map((message) => (
                    <Message key={message.id} message={message} />
                ))}
            </ol>
        </section>
    );
}
