import { NextRequest, NextResponse } from 'next/server';
import { getTomorrowEvents } from '@/lib/api/telegram-events';
import { sendTelegramMessage, formatEventMessage } from '@/lib/utils/telegram';
import { validateCronAuth } from '@/lib/utils/cron-auth';
import { calculateAndSaveDailyRecommendation } from '@/lib/api/calculate-daily-recommendation';

export async function GET(request: NextRequest) {
  // Validate authorization
  const authError = validateCronAuth(request);
  if (authError) return authError;

  const results = {
    events: { success: false, eventsCount: 0, skipped: false, error: null as string | null },
    recommendation: { success: false, type: null as string | null, error: null as string | null },
  };

  // Handle events (existing functionality)
  try {
    const events = await getTomorrowEvents();
    if (events.length === 0) {
      results.events.success = true;
      results.events.skipped = true;
    } else {
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

      results.events.success = true;
      results.events.eventsCount = events.length;
    }
  } catch (error) {
    console.error('Daily events cron job failed:', error);
    results.events.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Handle daily recommendation (new functionality)
  try {
    const today = new Date();
    const recommendationResult = await calculateAndSaveDailyRecommendation(today);
    results.recommendation.success = recommendationResult.success;
    results.recommendation.type = recommendationResult.type || null;
    results.recommendation.error = recommendationResult.error || null;
  } catch (error) {
    console.error('Daily recommendation cron job failed:', error);
    results.recommendation.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Return combined results
  const allSuccess = results.events.success && results.recommendation.success;
  return NextResponse.json(
    {
      success: allSuccess,
      events: results.events,
      recommendation: results.recommendation,
    },
    { status: allSuccess ? 200 : 500 }
  );
}
