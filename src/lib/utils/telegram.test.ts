import type { Event } from '@prisma/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatEventMessage, sendTelegramMessage } from './telegram';

const makeEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    id: 1,
    title: 'Movie night',
    description: 'Bring snacks',
    type: 'DISCORD',
    time: null,
    ...overrides,
  }) as Event;

describe('formatEventMessage', () => {
  it('shows a placeholder when there are no events', () => {
    expect(formatEventMessage([], 'Hoy')).toBe(
      '📅 <b>Hoy</b>\n\nNo hay eventos programados.'
    );
  });

  it('renders icon, title and description per event type', () => {
    const message = formatEventMessage(
      [
        makeEvent({ type: 'BIRTHDAY', title: 'Ana' }),
        makeEvent({ type: 'IN_PERSON', title: 'Cine', description: null }),
      ],
      'Hoy'
    );
    expect(message).toContain('🎂 <b>Ana</b>\nBring snacks');
    expect(message).toContain('👥 <b>Cine</b>\n');
    expect(message.startsWith('📅 <b>Hoy</b>\n\n')).toBe(true);
  });

  it('adds a time marker only when the event has a time', () => {
    const withTime = formatEventMessage(
      [makeEvent({ time: new Date('2026-03-05T20:30:00Z') })],
      'Hoy'
    );
    expect(withTime).toContain('⏰');
    expect(formatEventMessage([makeEvent()], 'Hoy')).not.toContain('⏰');
  });
});

describe('sendTelegramMessage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts to the bot endpoint with chat id and HTML parse mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendTelegramMessage('hi')).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.telegram.org/bottest-bot-token/sendMessage');
    expect(JSON.parse(init.body)).toEqual({
      chat_id: 'test-chat-id',
      text: 'hi',
      parse_mode: 'HTML',
    });
  });

  it('throws on a non-ok response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(sendTelegramMessage('hi')).rejects.toThrow('Telegram API error: 500');
  });
});
