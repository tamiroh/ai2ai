import { css } from "@emotion/css";
import { colors } from "./theme";

export type AvatarColor = "teal" | "amber";

type AvatarProps = {
    color: AvatarColor;
    initial: string;
};

const avatarColors: Record<AvatarColor, string> = {
    teal: colors.teal,
    amber: colors.amber,
};

const avatarStyles = css({
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    color: colors.panel,
    fontSize: "15px",
    fontWeight: 800,
});

export function Avatar({ color, initial }: AvatarProps) {
    return (
        <div className={avatarStyles} style={{ background: avatarColors[color] }} aria-hidden="true">
            {initial}
        </div>
    );
}
