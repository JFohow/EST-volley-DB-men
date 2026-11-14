import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMatchStatsCoverage } from "@/lib/match-stats-coverage";
import { getUnavailableStatSet, type MatchUnavailableStatRow } from "@/lib/match-unavailable-stats";

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
  statsCoverage: "full" | "partial" | "playersOnly" | "none";
  statisticsCoverage: "full" | "partial" | "none";
  match_unavailable_stats: MatchUnavailableStatRow | MatchUnavailableStatRow[] | null;
  match_sets: {
    set_number: number;
    estonia_points: number | null;
    opponent_points: number | null;
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
  set1_position: string | null;
  set2_position: string | null;
  set3_position: string | null;
  set4_position: string | null;
  set5_position: string | null;
  set6_position: string | null;
};

type MatchCoverageAppearanceRow = {
  appearance_id: number;
  match_id: number;
  player_match_stats: MatchCoverageStatRow | MatchCoverageStatRow[] | null;
};

async function fetchAllMatches(): Promise<MatchListItem[]> {
  const data: Omit<MatchListItem, "statsCoverage" | "statisticsCoverage">[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await supabase
      .from("matches")
      .select(
        "match_id, match_date, opponent, opponent_en, competition, competition_en, city, city_en, notes, estonia_sets, opponent_sets, vm, am, mam, has_additional_sets, additional_sets_count, match_sets(set_number, estonia_points, opponent_points), match_unavailable_stats(points_unavailable, block_points_unavailable, plus_minus_unavailable, break_points_unavailable, serve_total_unavailable, serve_aces_unavailable, serve_errors_unavailable, reception_total_unavailable, reception_errors_unavailable, reception_positive_pct_unavailable, reception_excellent_pct_unavailable, attack_total_unavailable, attack_errors_unavailable, attack_blocked_unavailable, attack_kills_unavailable)",
      )
      .order("match_date", { ascending: false })
      .order("match_id", { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    data.push(
      ...((page ?? []) as unknown as Omit<MatchListItem, "statsCoverage" | "statisticsCoverage">[]),
    );
    if ((page ?? []).length < 1000) break;
  }

  const appearancesByMatch = new Map<number, MatchCoverageAppearanceRow[]>();
  const pageSize = 1000;
  let lastAppearanceId = 0;

  while (true) {
    const { data: appearancesData, error: appearancesError } = await supabase
      .from("appearances")
      .select(
        "appearance_id, match_id, player_match_stats(points, block_points, plus_minus, serve_total, serve_aces, serve_errors, reception_total, reception_errors, reception_positive_pct, reception_excellent_pct, attack_total, attack_errors, attack_blocked, attack_kills, attack_kill_pct, attack_efficiency, break_points, set1_position, set2_position, set3_position, set4_position, set5_position, set6_position)",
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
      const current = appearancesByMatch.get(appearance.match_id) ?? [];
      current.push(appearance);
      appearancesByMatch.set(appearance.match_id, current);
    }

    const maxAppearanceId = Math.max(...chunk.map((row) => row.appearance_id));
    if (maxAppearanceId <= lastAppearanceId) {
      break;
    }

    lastAppearanceId = maxAppearanceId;
  }

  return ((data ?? []) as Omit<MatchListItem, "statsCoverage" | "statisticsCoverage">[]).map((match) => {
    const statsCoverage = getMatchStatsCoverage(appearancesByMatch.get(match.match_id) ?? []);
    const statisticsCoverage =
      statsCoverage === "full"
        ? (getUnavailableStatSet(match.match_unavailable_stats).size > 0 ? "partial" : "full")
        : statsCoverage === "partial"
          ? "partial"
          : "none";

    return {
      ...match,
      statsCoverage,
      statisticsCoverage,
    };
  });
}

export const allMatchesOptions = () =>
  queryOptions({
    queryKey: ["matches", "all"],
    queryFn: fetchAllMatches,
  });
