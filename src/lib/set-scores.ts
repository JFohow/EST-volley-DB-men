export type SetScoreRow = {
  estonia_points: number | null;
  opponent_points: number | null;
};

export const UNKNOWN_SET_SCORE = "–:–";

export function bySetNumber(a: { set_number: number }, b: { set_number: number }): number {
  return a.set_number - b.set_number;
}

export function isKnownSetScore<T extends SetScoreRow>(
  set: T,
): set is T & { estonia_points: number; opponent_points: number } {
  return set.estonia_points != null && set.opponent_points != null;
}

export function formatSetScore(set: SetScoreRow): string {
  if (!isKnownSetScore(set)) return UNKNOWN_SET_SCORE;
  return `${set.estonia_points}:${set.opponent_points}`;
}
