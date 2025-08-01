import { NextRequest, NextResponse } from 'next/server';
import { getTomorrowEvents } from '@/lib/api/telegram-events';
import { sendTelegramMessage, formatEventMessage } from '@/lib/utils/telegram';
import { validateCronAuth } from '@/lib/utils/cron-auth';

export async function GET(request: NextRequest) {
  // Validate authorization
  const authError = validateCronAuth(request);
  if (authError) return authError;

  try {
    const events = await getTomorrowEvents();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tomorrowFormatted = tomorrow.toLocaleDateString('es', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const message = formatEventMessage(
      events,
      `Eventos de mañana - ${tomorrowFormatted}`
    );
    await sendTelegramMessage(message);

    return NextResponse.json({ success: true, eventsCount: events.length });
  } catch (error) {
    console.error('Daily events cron job failed:', error);
    return NextResponse.json(
      { error: 'Failed to send daily events' },
      { status: 500 }
    );
  }
}
