import { Avatar, type AvatarSize } from './Avatar';

export type AvatarGroupMember = {
  id: string;
  name: string;
  src?: string | null;
};

export type AvatarGroupProps = {
  members: AvatarGroupMember[];
  max?: number;
  size?: AvatarSize;
  label?: string;
};

export function AvatarGroup({
  label = 'Group members',
  max = 4,
  members,
  size = 'md',
}: AvatarGroupProps) {
  const visibleMembers = members.slice(0, Math.max(0, max));
  const remainingCount = Math.max(0, members.length - visibleMembers.length);

  return (
    <div
      aria-label={label}
      className="flex items-center -space-x-2"
      role="group"
    >
      {visibleMembers.map((member) => (
        <Avatar
          alt={member.name}
          className="ring-2 ring-canvas"
          key={member.id}
          name={member.name}
          size={size}
          src={member.src}
        />
      ))}
      {remainingCount > 0 && (
        <span
          aria-label={`${remainingCount} more ${remainingCount === 1 ? 'person' : 'people'}`}
          className="grid h-10 w-10 place-items-center rounded-full border-2 border-canvas bg-surface-raised text-xs font-semibold text-muted"
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
}
