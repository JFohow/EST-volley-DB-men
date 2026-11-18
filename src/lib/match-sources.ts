export type MatchSource = { number: number; url: string };

const SOURCE_COLUMNS = ["source_1", "source_2", "source_3"] as const;

const cleanUrl = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export function getStatsUrl(match: Record<string, unknown>): string | null {
  return cleanUrl(match.stats_url);
}

// Numbers follow the column slot, so a missing source_2 leaves a gap instead of renumbering.
export function getMatchSources(match: Record<string, unknown>): MatchSource[] {
  return SOURCE_COLUMNS.flatMap((column, index) => {
    const url = cleanUrl(match[column]);
    return url ? [{ number: index + 1, url }] : [];
  });
}
