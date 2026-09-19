import { css } from "../styled-system/css";
import { token } from "../styled-system/tokens";

export type AvatarColor = "teal" | "amber";

type AvatarProps = {
    color: AvatarColor;
    initial: string;
};

const avatarColors: Record<AvatarColor, string> = {
    teal: token("colors.teal"),
    amber: token("colors.amber"),
};

const avatarStyles = css({
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    color: "panel",
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
