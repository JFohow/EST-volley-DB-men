export type MatchStatsCoverage = "full" | "partial" | "playersOnly" | "none";

type CoverageStatRow = Record<string, unknown>;

type CoverageAppearance = {
  player_match_stats: CoverageStatRow | CoverageStatRow[] | null;
};

const positionKeys = new Set([
  "set1_position",
  "set2_position",
  "set3_position",
  "set4_position",
  "set5_position",
  "set6_position",
]);

const coreStatKeys = ["points", "serve_total", "reception_total", "attack_total"] as const;

function toRows(value: CoverageStatRow | CoverageStatRow[] | null): CoverageStatRow[] {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

// A match is full when every player with set positions has the core totals filled.
// Matches without any positions are full when at least one player has the core totals.
export function getMatchStatsCoverage(appearances: CoverageAppearance[]): MatchStatsCoverage {
  if (appearances.length === 0) return "none";

  let hasAnyStat = false;
  let hasAnyCore = false;
  let positionedCount = 0;
  let positionedCompleteCount = 0;

  for (const appearance of appearances) {
    const rows = toRows(appearance.player_match_stats);
    const hasPositions = rows.some((row) =>
      Object.entries(row).some(
        ([key, value]) => positionKeys.has(key) && value != null && value !== "",
      ),
    );
    const hasValue = rows.some((row) =>
      Object.entries(row).some(
        ([key, value]) => !positionKeys.has(key) && typeof value === "number",
      ),
    );
    const isCore = rows.some((row) => coreStatKeys.every((key) => typeof row[key] === "number"));

    if (hasValue) hasAnyStat = true;
    if (isCore) hasAnyCore = true;
    if (hasPositions) {
      positionedCount += 1;
      if (isCore) positionedCompleteCount += 1;
    }
  }

  if (!hasAnyStat) return "playersOnly";
  if (!hasAnyCore) return "partial";
  if (positionedCount > 0 && positionedCompleteCount < positionedCount) return "partial";
  return "full";
}
