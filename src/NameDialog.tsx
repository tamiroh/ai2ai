import { css } from "../styled-system/css";
import { token } from "../styled-system/tokens";

type NameDialogProps = {
    title: string;
    submitLabel: string;
    onSubmit: (name: string) => void;
};

const dialogStyles = css({
    margin: "auto",
    border: "none",
    borderRadius: "16px",
    padding: "24px",
    width: "min(360px, calc(100% - 24px))",
    background: "panel",
    color: "ink",
    "&::backdrop": {
        background: `color-mix(in srgb, ${token("colors.ink")} 45%, transparent)`,
    },
});

const formStyles = css({
    display: "flex",
    flexDirection: "column",
    gap: "16px",
});

const titleStyles = css({
    margin: 0,
    fontSize: "16px",
    fontWeight: 800,
});

const inputStyles = css({
    borderRadius: "22px",
    border: "1px solid",
    borderColor: "muted",
    padding: "9px 18px",
    lineHeight: "24px",
    outline: "none",
    _focus: {
        boxShadow: `0 0 0 3px ${token("colors.focusRing")}`,
    },
});

const submitStyles = css({
    minHeight: "44px",
    border: "none",
    borderRadius: "22px",
    boxShadow: "none",
    background: "accent",
    color: "panel",
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

export function NameDialog({ title, submitLabel, onSubmit }: NameDialogProps) {
    return (
        <dialog
            className={dialogStyles}
            ref={(dialog) => {
                if (dialog && !dialog.open) {
                    dialog.showModal();
                }
            }}
            onCancel={(event) => event.preventDefault()}
        >
            <form
                className={formStyles}
                onSubmit={(event) => {
                    event.preventDefault();
                    const name = new FormData(event.currentTarget).get("name")?.toString().trim();
                    if (name) {
                        onSubmit(name);
                    }
                }}
            >
                <label className={titleStyles} htmlFor="name">
                    {title}
                </label>
                <input className={inputStyles} id="name" name="name" autoComplete="off" required />
                <button className={submitStyles} type="submit">
                    {submitLabel}
                </button>
            </form>
        </dialog>
    );
}
