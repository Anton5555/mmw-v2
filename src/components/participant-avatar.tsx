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
    sm: 'h-6 w-6 text-[11px] leading-none tracking-tight',
    md: 'h-8 w-8 text-xs leading-none tracking-tight',
    lg: 'h-10 w-10 text-sm leading-none tracking-tight',
  };

  const getInitials = (name: string) => {
    // Remove extra whitespace and split into words
    const words = name.trim().split(/\s+/).filter(word => word.length > 0);
    
    if (words.length === 0) return '??';
    
    // Get first letter of first word
    const firstLetter = words[0]?.[0]?.toUpperCase() || '?';
    
    if (words.length === 1) {
      // Single word: take first 2 letters, but ensure we only get 2
      const secondLetter = words[0]?.[1]?.toUpperCase() || firstLetter;
      return (firstLetter + secondLetter).slice(0, 2);
    }
    
    // Multiple words: first letter of first word + first letter of last word
    const lastLetter = words[words.length - 1]?.[0]?.toUpperCase() || firstLetter;
    return (firstLetter + lastLetter).slice(0, 2);
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
        className={cn(
          getColorFromName(displayName),
          'text-white font-bold select-none'
        )}
      >
        {getInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}
