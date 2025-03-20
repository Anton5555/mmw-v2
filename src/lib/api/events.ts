import { prisma } from '@/lib/db';
import { GetMonthEventsSchema } from '../validations/events';

export async function getMonthEvents({ month, year }: GetMonthEventsSchema) {
  return await prisma.event.findMany({
    where: {
      month,
      OR: [{ year: year }, { year: null }],
    },
    orderBy: [{ day: 'asc' }, { month: 'asc' }, { year: 'asc' }],
  });
}

export async function getNextEvents() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  return await prisma.event.findMany({
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
      { year: 'asc' },
      { month: 'asc' },
      { day: 'asc' },
      { time: 'asc' },
    ],
    take: 5,
  });
}
