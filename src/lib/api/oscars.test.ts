import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  oscarBallot: { findMany: vi.fn() },
}));

vi.mock("@/lib/db", () => ({ prisma: db }));

import { getOscarLeaderboard } from "./oscars";

function ballot(id: string, score: number | null) {
  return {
    score,
    submittedAt: new Date("2026-01-01"),
    user: { id, name: id, image: null },
  };
}

describe("getOscarLeaderboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flags nobody as winner while every score is 0", async () => {
    db.oscarBallot.findMany.mockResolvedValue([ballot("a", 0), ballot("b", 0)]);
    const board = await getOscarLeaderboard(1);
    expect(board.map((e) => e.isWinner)).toEqual([false, false]);
  });

  it("flags nobody as winner when scores are not computed yet", async () => {
    db.oscarBallot.findMany.mockResolvedValue([
      ballot("a", null),
      ballot("b", null),
    ]);
    const board = await getOscarLeaderboard(1);
    expect(board.map((e) => e.isWinner)).toEqual([false, false]);
  });

  it("flags every participant tied at the top score", async () => {
    db.oscarBallot.findMany.mockResolvedValue([
      ballot("a", 3),
      ballot("b", 3),
      ballot("c", 1),
    ]);
    const board = await getOscarLeaderboard(1);
    expect(board.map((e) => e.isWinner)).toEqual([true, true, false]);
    expect(board.map((e) => e.rank)).toEqual([1, 1, 3]);
  });
});
