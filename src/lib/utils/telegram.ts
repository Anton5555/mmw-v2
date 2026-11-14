import { env } from '@/env';
import type { Event } from '@generated/prisma/client';

type TelegramReplyMarkup = {
  inline_keyboard: Array<
    Array<{ text: string; url?: string; callback_data?: string }>
  >;
};

type CallTelegramOptions = {
  chatId?: string;
};

export type TelegramMessageResult = {
  message_id: number;
  chat?: { id: number };
};

type TelegramApiResponse<T = unknown> = {
  ok: boolean;
  description?: string;
  result?: T;
};

async function callTelegram<T = unknown>(
  method: string,
  payload: Record<string, unknown>
): Promise<TelegramApiResponse<T>> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as TelegramApiResponse<T>;

  if (!response.ok || !data.ok) {
    throw new Error(
      `Telegram API error (${method}): ${data.description ?? response.status}`
    );
  }

  return data;
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function getLtaTelegramChatId(): string {
  return env.TELEGRAM_LTA_CHAT_ID ?? env.TELEGRAM_CHAT_ID;
}

export function toTelegramPosterUrl(posterUrl: string): string | null {
  if (!posterUrl) return null;
  if (posterUrl.startsWith('http')) return posterUrl;
  return `https://image.tmdb.org/t/p/w500${posterUrl}`;
}

export async function sendTelegramMessage(
  message: string,
  options: {
    chatId?: string;
    replyMarkup?: TelegramReplyMarkup;
    replyToMessageId?: number;
  } = {}
) {
  try {
    return await callTelegram<TelegramMessageResult>('sendMessage', {
      chat_id: options.chatId ?? env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      ...(options.replyMarkup
        ? { reply_markup: options.replyMarkup }
        : {}),
      ...(options.replyToMessageId != null
        ? {
            reply_parameters: {
              message_id: options.replyToMessageId,
            },
          }
        : {}),
    });
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    throw error;
  }
}

export async function sendTelegramAlbum(
  photos: Array<{ url: string; caption?: string }>,
  options: CallTelegramOptions = {}
) {
  if (photos.length === 0) {
    throw new Error('sendTelegramAlbum requires at least one photo');
  }

  const media = photos.slice(0, 10).map((photo, index) => ({
    type: 'photo' as const,
    media: photo.url,
    ...(index === 0 && photo.caption
      ? { caption: photo.caption, parse_mode: 'HTML' as const }
      : {}),
  }));

  try {
    return await callTelegram('sendMediaGroup', {
      chat_id: options.chatId ?? getLtaTelegramChatId(),
      media,
    });
  } catch (error) {
    console.error('Failed to send Telegram album:', error);
    throw error;
  }
}

/**
 * Upload a local image buffer as a Telegram photo (multipart/form-data).
 */
export async function sendTelegramPhotoUpload(
  buffer: Buffer,
  options: {
    caption?: string;
    chatId?: string;
    replyToMessageId?: number;
    filename?: string;
  } = {}
) {
  const chatId = options.chatId ?? getLtaTelegramChatId();
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append(
    'photo',
    new Blob([new Uint8Array(buffer)], { type: 'image/jpeg' }),
    options.filename ?? 'trivia.jpg'
  );
  if (options.caption) {
    form.append('caption', options.caption);
    form.append('parse_mode', 'HTML');
  }
  if (options.replyToMessageId != null) {
    form.append(
      'reply_parameters',
      JSON.stringify({ message_id: options.replyToMessageId })
    );
  }

  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: form,
    });
    const data = (await response.json()) as TelegramApiResponse<TelegramMessageResult>;

    if (!response.ok || !data.ok) {
      throw new Error(
        `Telegram API error (sendPhoto): ${data.description ?? response.status}`
      );
    }

    return data;
  } catch (error) {
    console.error('Failed to send Telegram photo upload:', error);
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
