import { prisma } from '@/lib/db';

export async function getTomorrowEvents() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const tomorrowMonth = tomorrow.getMonth() + 1;
  const tomorrowDay = tomorrow.getDate();
  const tomorrowYear = tomorrow.getFullYear();

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
