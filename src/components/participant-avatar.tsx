import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Participant {
  id: number;
  displayName: string;
  slug: string;
  userId?: string | null;
  user?: {
    image: string | null;
    name: string | null;
  } | null;
}

/**
 * Get the display name for a participant.
 * Returns user.name if available, otherwise falls back to displayName.
 */
export function getParticipantDisplayName(participant: Participant): string {
  return participant.user?.name || participant.displayName;
}

interface ParticipantAvatarProps {
  participant: Participant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ParticipantAvatar({
  participant,
  size = 'md',
  className,
}: ParticipantAvatarProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorFromName = (name: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  };

  // Get display name: user.name if available, otherwise fallback to displayName
  const displayName = getParticipantDisplayName(participant);
  const avatarUrl = participant.user?.image || undefined;

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={avatarUrl} alt={displayName} />
      <AvatarFallback
        className={cn(getColorFromName(displayName), 'text-white font-medium')}
      >
        {getInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}
