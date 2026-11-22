import { Avatar } from '../../../components/ui/display/Avatar';
import type { NotificationActor } from '../types';

type NotificationAvatarProps = {
  actor: NotificationActor | null;
};

export function NotificationAvatar({ actor }: NotificationAvatarProps) {
  return (
    <Avatar
      alt={actor?.displayName ?? 'Connectly'}
      className="h-11 w-11"
      name={actor?.displayName ?? 'Connectly'}
      size="md"
      src={actor?.avatarUrl}
    />
  );
}
