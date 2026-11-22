import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../../lib/utils';
import { Avatar } from '../display/Avatar';
import { Card } from './Card';

export type ProfileCardProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  username: string;
  avatarSrc?: string;
  bio?: string;
  action?: ReactNode;
};

export function ProfileCard({
  action,
  avatarSrc,
  bio,
  className,
  name,
  username,
  ...props
}: ProfileCardProps) {
  return (
    <Card
      className={cn(
        'flex flex-col items-center gap-3 p-5 text-center',
        className,
      )}
      {...props}
    >
      <Avatar alt={name} name={name} size="lg" src={avatarSrc} />
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-foreground">{name}</h3>
        <p className="truncate text-sm text-muted">@{username}</p>
        {bio && <p className="mt-2 line-clamp-3 text-sm text-muted">{bio}</p>}
      </div>
      {action}
    </Card>
  );
}
