import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Participant {
  id: number;
  displayName: string;
  slug: string;
  userId?: string | null;
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

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src="" alt={participant.displayName} />
      <AvatarFallback
        className={cn(
          getColorFromName(participant.displayName),
          'text-white font-medium'
        )}
      >
        {getInitials(participant.displayName)}
      </AvatarFallback>
    </Avatar>
  );
}
