import { prisma } from '@/lib/db';

/**
 * Get tomorrow's date components in UTC-3 timezone
 * This ensures the cron job (which runs at 2:50 AM UTC = 11:50 PM UTC-3)
 * correctly calculates tomorrow based on the user's timezone
 */
function getTomorrowInUTC3(): { year: number; month: number; day: number } {
  // Get current UTC time
  const now = new Date();
  
  // Convert to UTC-3 by subtracting 3 hours (3 * 60 * 60 * 1000 ms)
  const utc3Millis = now.getTime() - 3 * 60 * 60 * 1000;
  const utc3Date = new Date(utc3Millis);
  
  // Get date components from the UTC-3 adjusted time
  // Note: getUTC* methods work on the UTC representation, but we've already
  // adjusted the timestamp, so these represent UTC-3 time
  let year = utc3Date.getUTCFullYear();
  let month = utc3Date.getUTCMonth(); // 0-11
  let day = utc3Date.getUTCDate();
  
  // Add 1 day, handling month/year rollover
  day += 1;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  if (day > daysInMonth) {
    day = 1;
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  
  return {
    year,
    month: month + 1, // Return 1-12 for month
    day,
  };
}

export async function getTomorrowEvents() {
  const { year: tomorrowYear, month: tomorrowMonth, day: tomorrowDay } = getTomorrowInUTC3();

  return await prisma.event.findMany({
    where: {
      OR: [
        // Events for tomorrow this year
        {
          month: tomorrowMonth,
          day: tomorrowDay,
          year: tomorrowYear,
        },
        // Recurring annual events for tomorrow
        {
          month: tomorrowMonth,
          day: tomorrowDay,
          year: null,
        },
      ],
    },
    orderBy: [{ time: 'asc' }],
  });
}
