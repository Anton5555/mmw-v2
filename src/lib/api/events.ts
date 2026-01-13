import { connection } from 'next/server';
import { prisma } from '@/lib/db';
import { GetMonthEventsSchema } from '../validations/events';

export async function getMonthEvents({ month, year }: GetMonthEventsSchema) {
  "use cache";
  return await prisma.event.findMany({
    where: {
      month,
      OR: [{ year: year }, { year: null }],
    },
    orderBy: [{ day: 'asc' }, { month: 'asc' }, { year: 'asc' }],
  });
}

export async function getNextEvents() {
  "use cache";
  // Access connection() first to allow new Date() in Cache Components
  await connection();
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  const events = await prisma.event.findMany({
    where: {
      OR: [
        // Events later this year
        {
          year: currentYear,
          OR: [
            { month: { gt: currentMonth } },
            {
              month: currentMonth,
              day: { gte: currentDay },
            },
          ],
        },
        // Recurring annual events (no year) that are upcoming
        {
          year: null,
          OR: [
            { month: { gt: currentMonth } },
            {
              month: currentMonth,
              day: { gte: currentDay },
            },
          ],
        },
        // Events next year
        {
          year: { gt: currentYear },
        },
      ],
    },
    orderBy: [
      { month: 'asc' },
      { day: 'asc' },
      { year: 'asc' },
      { time: 'asc' },
    ],
    take: 5,
  });

  // Sort events chronologically by their actual dates
  const sortedEvents = events.sort((a, b) => {
    // For recurring events (year is null), use current year for comparison
    const yearA = a.year || currentYear;
    const yearB = b.year || currentYear;

    // Create dates for comparison
    const dateA = new Date(yearA, a.month - 1, a.day);
    const dateB = new Date(yearB, b.month - 1, b.day);

    return dateA.getTime() - dateB.getTime();
  });

  return sortedEvents;
}
