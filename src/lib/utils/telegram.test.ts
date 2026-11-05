import { describe, expect, it, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

vi.mock('@/env', () => ({
  env: {
    TELEGRAM_BOT_TOKEN: 'test-bot-token',
    TELEGRAM_CHAT_ID: 'chat-main',
    TELEGRAM_LTA_CHAT_ID: 'chat-lta',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}));

import {
  escapeHtml,
  getLtaTelegramChatId,
  sendTelegramAlbum,
  sendTelegramMessage,
  toTelegramPosterUrl,
} from './telegram';

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true }),
  });
});

describe('telegram helpers', () => {
  it('escapes HTML for Telegram parse_mode', () => {
    expect(escapeHtml('A & B <C> "D"')).toBe('A &amp; B &lt;C&gt; &quot;D&quot;');
  });

  it('prefers TELEGRAM_LTA_CHAT_ID when set', () => {
    expect(getLtaTelegramChatId()).toBe('chat-lta');
  });

  it('builds TMDB poster URLs', () => {
    expect(toTelegramPosterUrl('/abc.jpg')).toBe(
      'https://image.tmdb.org/t/p/w500/abc.jpg'
    );
    expect(toTelegramPosterUrl('https://cdn.example/p.jpg')).toBe(
      'https://cdn.example/p.jpg'
    );
    expect(toTelegramPosterUrl('')).toBeNull();
  });

  it('sendTelegramMessage posts to sendMessage with optional markup', async () => {
    await sendTelegramMessage('hola', {
      chatId: 'chat-lta',
      replyMarkup: {
        inline_keyboard: [[{ text: 'Votar', url: 'https://example.com' }]],
      },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/sendMessage');
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      chat_id: 'chat-lta',
      text: 'hola',
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[{ text: 'Votar', url: 'https://example.com' }]],
      },
    });
  });

  it('sendTelegramAlbum posts a media group with caption on the first photo', async () => {
    await sendTelegramAlbum([
      { url: 'https://img/1.jpg', caption: 'Lote' },
      { url: 'https://img/2.jpg' },
    ]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/sendMediaGroup');
    const body = JSON.parse(init.body as string);
    expect(body.chat_id).toBe('chat-lta');
    expect(body.media).toEqual([
      {
        type: 'photo',
        media: 'https://img/1.jpg',
        caption: 'Lote',
        parse_mode: 'HTML',
      },
      { type: 'photo', media: 'https://img/2.jpg' },
    ]);
  });
});
