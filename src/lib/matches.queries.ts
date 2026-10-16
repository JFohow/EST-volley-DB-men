import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MatchListItem = {
  match_id: number;
  match_date: string;
  opponent: string;
  opponent_en: string | null;
  competition: string | null;
  competition_en: string | null;
  city: string | null;
  city_en: string | null;
  notes: string | null;
  estonia_sets: number;
  opponent_sets: number;
  vm: boolean | null;
  am: boolean | null;
  mam: boolean | null;
  has_additional_sets: boolean;
  additional_sets_count: number;
  statsCoverage: "full" | "playersOnly" | "none";
  match_sets: {
    set_number: number;
    estonia_points: number;
    opponent_points: number;
  }[];
};

type MatchCoverageStatRow = {
  points: number | null;
  block_points: number | null;
  plus_minus: number | null;
  serve_total: number | null;
  serve_aces: number | null;
  serve_errors: number | null;
  reception_total: number | null;
  reception_errors: number | null;
  reception_positive_pct: number | null;
  reception_excellent_pct: number | null;
  attack_total: number | null;
  attack_errors: number | null;
  attack_blocked: number | null;
  attack_kills: number | null;
  attack_kill_pct: number | null;
  attack_efficiency: number | null;
  break_points: number | null;
};

type MatchCoverageAppearanceRow = {
  appearance_id: number;
  match_id: number;
  player_match_stats: MatchCoverageStatRow | MatchCoverageStatRow[] | null;
};

function normalizeRelations<T>(value: T | T[] | null): T[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is T => Boolean(item));
  }

  return value ? [value] : [];
}

function hasFullStats(stats: MatchCoverageStatRow): boolean {
  const values: Array<number | null> = [
    stats.points,
    stats.block_points,
    stats.plus_minus,
    stats.serve_total,
    stats.serve_aces,
    stats.serve_errors,
    stats.reception_total,
    stats.reception_errors,
    stats.reception_positive_pct,
    stats.reception_excellent_pct,
    stats.attack_total,
    stats.attack_errors,
    stats.attack_blocked,
    stats.attack_kills,
    stats.attack_kill_pct,
    stats.attack_efficiency,
    stats.break_points,
  ];

  return values.some((value) => typeof value === "number");
}

async function fetchAllMatches(): Promise<MatchListItem[]> {
  const data: Omit<MatchListItem, "statsCoverage">[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await supabase
      .from("matches")
      .select(
        "match_id, match_date, opponent, opponent_en, competition, competition_en, city, city_en, notes, estonia_sets, opponent_sets, vm, am, mam, has_additional_sets, additional_sets_count, match_sets(set_number, estonia_points, opponent_points)",
      )
      .order("match_date", { ascending: false })
      .order("match_id", { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    data.push(...((page ?? []) as unknown as Omit<MatchListItem, "statsCoverage">[]));
    if ((page ?? []).length < 1000) break;
  }

  const coverageByMatch = new Map<number, { hasAppearances: boolean; hasFullStats: boolean }>();
  const pageSize = 1000;
  let lastAppearanceId = 0;

  while (true) {
    const { data: appearancesData, error: appearancesError } = await supabase
      .from("appearances")
      .select(
        "appearance_id, match_id, player_match_stats(points, block_points, plus_minus, serve_total, serve_aces, serve_errors, reception_total, reception_errors, reception_positive_pct, reception_excellent_pct, attack_total, attack_errors, attack_blocked, attack_kills, attack_kill_pct, attack_efficiency, break_points)",
      )
      .gt("appearance_id", lastAppearanceId)
      .order("appearance_id", { ascending: true })
      .limit(pageSize);

    if (appearancesError) {
      throw appearancesError;
    }

    const chunk = (appearancesData ?? []) as MatchCoverageAppearanceRow[];
    if (chunk.length === 0) {
      break;
    }

    for (const appearance of chunk) {
      const current = coverageByMatch.get(appearance.match_id) ?? {
        hasAppearances: false,
        hasFullStats: false,
      };

      current.hasAppearances = true;

      const statsRows = normalizeRelations(appearance.player_match_stats);
      if (!current.hasFullStats && statsRows.some((stats) => hasFullStats(stats))) {
        current.hasFullStats = true;
      }

      coverageByMatch.set(appearance.match_id, current);
    }

    const maxAppearanceId = Math.max(...chunk.map((row) => row.appearance_id));
    if (maxAppearanceId <= lastAppearanceId) {
      break;
    }

    lastAppearanceId = maxAppearanceId;
  }

  return ((data ?? []) as Omit<MatchListItem, "statsCoverage">[]).map((match) => {
    const coverage = coverageByMatch.get(match.match_id);
    const statsCoverage = coverage?.hasFullStats
      ? "full"
      : coverage?.hasAppearances
        ? "playersOnly"
        : "none";

    return {
      ...match,
      statsCoverage,
    };
  });
}

export const allMatchesOptions = () =>
  queryOptions({
    queryKey: ["matches", "all"],
    queryFn: fetchAllMatches,
  });
