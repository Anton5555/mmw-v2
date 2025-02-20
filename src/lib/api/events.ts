import { prisma } from '@/lib/db';
import { GetMonthEventsSchema } from '../validations/events';

export async function getMonthEvents({ month, year }: GetMonthEventsSchema) {
  console.log(month, year);
  return await prisma.event.findMany({
    where: {
      month,
      OR: [{ year: year }, { year: null }],
    },
    orderBy: [{ day: 'asc' }, { month: 'asc' }, { year: 'asc' }],
  });
}
