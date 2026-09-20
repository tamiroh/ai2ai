import { useRef, useState } from "preact/hooks";
import { css } from "@emotion/css";
import { colors } from "./theme";
import { ConversationStatus } from "./ConversationStatus";
import { MessageBySelf } from "./MessageBySelf";
import { MessageByOther } from "./MessageByOther";
import { MessageBySystem } from "./MessageBySystem";
import { MessageComposer } from "./MessageComposer";
import { NameDialog } from "./NameDialog";
import type { AvatarColor } from "./Avatar";
import type { AiParticipant, DisplayMessage, Status, SystemEvent } from "./useConversation";

const participantAvatarColors: Record<AiParticipant, AvatarColor> = {
    A: "teal",
    B: "amber",
};

function describeSystemEvent(event: SystemEvent): string {
    switch (event.type) {
        case "joining":
            return "参加者を待っています…";
        case "joined":
            return `${event.name} が参加しました`;
    }
}

type ConversationViewProps = {
    messages: DisplayMessage[];
    typingName: string | null;
    status: Status;
    humanName: string | null;
    onSetHumanName: (name: string) => void;
    onSend: (text: string) => void;
};

const shellStyles = css({
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr) auto auto",
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
    scrollbarWidth: "none",
    "&::-webkit-scrollbar": {
        display: "none",
    },
});

const typingStyles = css({
    minHeight: "40px",
    margin: 0,
    padding: "0 24px 14px",
    color: colors.muted,
    fontSize: "13px",
    fontWeight: 700,
});

const topFadeStyles = css({
    maskImage: `linear-gradient(to bottom, transparent, ${colors.panel} 48px)`,
});

export function ConversationView({
    messages,
    typingName,
    status,
    humanName,
    onSetHumanName,
    onSend,
}: ConversationViewProps) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [pendingText, setPendingText] = useState<string | null>(null);
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

    const send = (text: string) => {
        isStickyRef.current = true;
        onSend(text);
    };

    return (
        <section className={shellStyles} aria-label="Conversation">
            <ConversationStatus status={status} />
            <ol
                className={`${listStyles} ${isScrolled ? topFadeStyles : ""}`}
                ref={followBottom}
                onScroll={handleScroll}
            >
                {messages.map((message) => {
                    switch (message.kind) {
                        case "system":
                            return <MessageBySystem key={message.id} text={describeSystemEvent(message.event)} />;
                        case "human":
                            return <MessageBySelf key={message.id} text={message.text} />;
                        case "ai":
                            return (
                                <MessageByOther
                                    key={message.id}
                                    name={message.name}
                                    avatarColor={participantAvatarColors[message.participant]}
                                    text={message.text || "(空の応答)"}
                                />
                            );
                    }
                })}
            </ol>
            <p className={typingStyles} aria-live="polite">
                {typingName && `${typingName} が入力しています…`}
            </p>
            <MessageComposer onSend={(text) => (humanName ? send(text) : setPendingText(text))} />
            {pendingText !== null && (
                <NameDialog
                    title="あなたの名前を教えてください"
                    submitLabel="参加する"
                    onSubmit={(name) => {
                        onSetHumanName(name);
                        send(pendingText);
                        setPendingText(null);
                    }}
                />
            )}
        </section>
    );
}
