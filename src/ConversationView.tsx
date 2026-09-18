import { useEffect, useRef } from "preact/hooks";
import { Message } from "./Message";
import type { DisplayMessage } from "./useConversation";

type ConversationViewProps = {
    messages: DisplayMessage[];
    turn: number;
};

export function ConversationView({ messages, turn }: ConversationViewProps) {
    const listRef = useRef<HTMLOListElement>(null);

    useEffect(() => {
        const list = listRef.current;
        if (list) {
            list.scrollTop = list.scrollHeight;
        }
    }, [messages]);

    return (
        <section className="conversation-shell" aria-label="AI conversation">
            <span className="turn-counter">{turn} turns</span>
            <ol className="conversation" ref={listRef}>
                {messages.map((message) => (
                    <Message key={message.id} message={message} />
                ))}
            </ol>
        </section>
    );
}
