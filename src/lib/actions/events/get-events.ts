'use server';

import { getMonthEvents } from '@/lib/api/events';

export const getEventsAction = async ({
  month,
  year,
}: {
  month: number;
  year: number;
}) => await getMonthEvents({ month, year });
