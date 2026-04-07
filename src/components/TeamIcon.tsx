import React from "react";
import * as Icons from "./icons/IconDefs";
import { User } from "lucide-react";

interface TeamIconProps {
    iconName?: string;
    className?: string;
    style?: React.CSSProperties;
}

const TeamIcon: React.FC<TeamIconProps> = ({ iconName, className = "w-6 h-6", style }) => {
    if (!iconName) return <User className={className} style={style} />;

    // Map of allowed icon names to their components in IconDefs
    const iconMap: Record<string, React.FC<any>> = {
        flame: Icons.FlameIcon,
        zap: Icons.ZapIcon,
        star: Icons.StarIcon,
        brain: Icons.BrainIcon,
        rocket: Icons.RocketIcon,
        target: Icons.TargetIcon,
        music: Icons.MusicIcon,
        gamepad: Icons.GamepadIcon,
        trophy: Icons.TrophyIcon,
        crown: Icons.CrownIcon,
    };

    const IconComponent = iconMap[iconName.toLowerCase()];

    if (!IconComponent) {
        // Fallback for any legacy emojis or unknown strings
        return <span className={className} style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{iconName}</span>;
    }

    return <IconComponent className={className} style={style} />;
};

export default TeamIcon;
