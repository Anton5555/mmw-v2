import { NextRequest, NextResponse } from 'next/server';
import { getHourlyEvents } from '@/lib/api/telegram-events';
import { sendTelegramMessage, formatEventMessage } from '@/lib/utils/telegram';
import { validateCronAuth } from '@/lib/utils/cron-auth';

export async function GET(request: NextRequest) {
  const authError = validateCronAuth(request);
  if (authError) return authError;
  try {
    const events = await getHourlyEvents();

    if (events.length === 0) {
      return NextResponse.json({ success: true, eventsCount: 0 });
    }

    const now = new Date();
    const hour = now.getHours();
    const message = formatEventMessage(events, `Eventos de las ${hour}:00`);

    await sendTelegramMessage(message);

    return NextResponse.json({ success: true, eventsCount: events.length });
  } catch (error) {
    console.error('Hourly events cron job failed:', error);
    return NextResponse.json(
      { error: 'Failed to send hourly events' },
      { status: 500 }
    );
  }
}
