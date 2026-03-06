"use client";

interface Props {
  name: string;
  color?: string;
  avatar?: string | null;
  className?: string; // controls size + text, e.g. "w-10 h-10 text-sm"
}

export default function UserAvatar({ name, color, avatar, className = "w-8 h-8 text-xs" }: Props) {
  return (
    <span
      className={`${className} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden`}
      style={{ backgroundColor: avatar ? undefined : (color ?? "#7c3aed") }}
    >
      {avatar ? (
        <img src={`/api/uploads/${avatar}`} alt={name} className="w-full h-full object-cover" />
      ) : (
        name[0]?.toUpperCase() ?? "?"
      )}
    </span>
  );
}
