import { NextRequest, NextResponse } from 'next/server';
import { getTodayEvents } from '@/lib/api/telegram-events';
import { sendTelegramMessage, formatEventMessage } from '@/lib/utils/telegram';
import { validateCronAuth } from '@/lib/utils/cron-auth';

export async function GET(request: NextRequest) {
  // Validate authorization
  const authError = validateCronAuth(request);
  if (authError) return authError;
  try {
    const events = await getTodayEvents();
    const today = new Date().toLocaleDateString('es', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const message = formatEventMessage(events, `Eventos de hoy - ${today}`);
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
