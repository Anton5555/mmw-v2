import { EventType } from '@prisma/client';
import { Calendar, Gift, Heart, MessageCircle, Users } from 'lucide-react';

export const EVENT_COLORS: Record<EventType, string> = {
  IN_PERSON: 'blue-500',
  DISCORD: 'green-500',
  OTHER: 'amber-500',
  BIRTHDAY: 'red-500',
  ANNIVERSARY: 'fuchsia-500',
} as const;

export const EVENT_ICONS: Record<EventType, typeof Users> = {
  IN_PERSON: Users,
  DISCORD: MessageCircle,
  OTHER: Calendar,
  BIRTHDAY: Gift,
  ANNIVERSARY: Heart,
} as const;
