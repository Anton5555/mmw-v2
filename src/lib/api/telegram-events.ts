import { prisma } from '@/lib/db';

export async function getTodayEvents() {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();
  const currentYear = today.getFullYear();

  return await prisma.event.findMany({
    where: {
      OR: [
        // Events for today this year
        {
          month: currentMonth,
          day: currentDay,
          year: currentYear,
        },
        // Recurring annual events for today
        {
          month: currentMonth,
          day: currentDay,
          year: null,
        },
      ],
    },
    orderBy: [{ time: 'asc' }],
  });
}

export async function getHourlyEvents() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const currentYear = now.getFullYear();

  return await prisma.event.findMany({
    where: {
      OR: [
        // Events for today this year at current hour
        {
          month: currentMonth,
          day: currentDay,
          year: currentYear,
          time: {
            gte: new Date(
              currentYear,
              currentMonth - 1,
              currentDay,
              currentHour,
              0,
              0
            ),
            lt: new Date(
              currentYear,
              currentMonth - 1,
              currentDay,
              currentHour + 1,
              0,
              0
            ),
          },
        },
        // Recurring annual events for today at current hour
        {
          month: currentMonth,
          day: currentDay,
          year: null,
          time: {
            gte: new Date(
              2000,
              currentMonth - 1,
              currentDay,
              currentHour,
              0,
              0
            ),
            lt: new Date(
              2000,
              currentMonth - 1,
              currentDay,
              currentHour + 1,
              0,
              0
            ),
          },
        },
      ],
    },
    orderBy: [{ time: 'asc' }],
  });
}
