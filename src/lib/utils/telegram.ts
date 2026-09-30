import { env } from '@/env';
import type { Event } from '@generated/prisma/client';

export async function sendTelegramMessage(message: string) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    throw error;
  }
}

export function formatEventMessage(events: Event[], title: string): string {
  if (events.length === 0) {
    return `📅 <b>${title}</b>\n\nNo hay eventos programados.`;
  }

  const eventList = events
    .map((event) => {
      const time = event.time
        ? new Date(event.time).toLocaleTimeString('es', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : '';

      const icon = getEventIcon(event.type);
      const timeText = time ? ` ⏰ ${time}` : '';

      return `${icon} <b>${event.title}</b>${timeText}\n${
        event.description || ''
      }`;
    })
    .join('\n\n');

  return `📅 <b>${title}</b>\n\n${eventList}`;
}

function getEventIcon(type: Event['type']): string {
  const icons: Record<Event['type'], string> = {
    BIRTHDAY: '🎂',
    ANNIVERSARY: '💕',
    DISCORD: '💬',
    IN_PERSON: '👥',
    OTHER: '📌',
  };
  return icons[type] || '📌';
}
