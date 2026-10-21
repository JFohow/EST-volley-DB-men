import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RecentMatch = {
  match_id: number;
  match_date: string;
  opponent: string;
  opponent_en: string | null;
  competition: string | null;
  competition_en: string | null;
  city: string | null;
  city_en: string | null;
  estonia_sets: number;
  opponent_sets: number;
  vm: boolean | null;
  am: boolean | null;
  mam: boolean | null;
  has_additional_sets: boolean;
  additional_sets_count: number;
  match_sets: {
    set_number: number;
    estonia_points: number;
    opponent_points: number;
  }[];
};

export type HomeSummary = {
  totalMatches: number;
  officialMatches: number;
  totalPlayers: number;
  totalAppearances: number;
  totalSets: number;
  recentMatches: RecentMatch[];
  topAppearance: {
    first_name: string;
    last_name: string;
    position: string | null;
    matches: number;
    sets: number;
  } | null;
  matchCoverage: {
    official: MatchCoverageCounts;
    competitive: MatchCoverageCounts;
    all: MatchCoverageCounts;
  };
};

export type MatchCoverageCounts = {
  totalMatches: number;
  fullStatistics: number;
  partialStatistics: number;
  withoutStatistics: number;
};

type MatchFlagRow = {
  match_id: number;
  am: boolean | null;
  vm: boolean | null;
  match_unavailable_stats: { stat_field: string }[] | null;
};

const PAGE_SIZE = 1000;

async function fetchAllMatchFlags() {
  const rows: MatchFlagRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("matches")
      .select("match_id, am, vm, match_unavailable_stats(stat_field)")
      .order("match_id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchAllAppearances() {
  const rows: {
    appearance_id: number;
    player_id: number;
    sets_played: number | null;
    match_id: number;
    player_match_stats: Record<string, number | null>[] | Record<string, number | null> | null;
  }[] = [];
  let lastId = 0;
  while (true) {
    const { data, error } = await supabase
      .from("appearances")
      .select(
        "appearance_id, player_id, sets_played, match_id, player_match_stats(points, plus_minus, break_points, serve_total, reception_total, attack_total, attack_kills, block_points)",
      )
      .gt("appearance_id", lastId)
      .order("appearance_id", { ascending: true })
      .limit(PAGE_SIZE);
    if (error) throw error;
    const chunk = data ?? [];
    if (chunk.length === 0) break;
    rows.push(...chunk);
    lastId = chunk[chunk.length - 1].appearance_id;
    if (chunk.length < PAGE_SIZE) break;
  }
  return rows;
}

async function fetchHomeSummary(): Promise<HomeSummary> {
  const matchList = await fetchAllMatchFlags();
  const totalMatches = matchList.length;
  const officialMatches = matchList.filter((match) => match.am === true).length;

  const [playersCount, allApps, sets, recent] = await Promise.all([
    supabase.from("players").select("*", { count: "exact", head: true }),
    fetchAllAppearances(),
    supabase.from("match_sets").select("match_set_id", { count: "exact", head: true }),
    supabase
      .from("matches")
      .select(
        "match_id, match_date, opponent, opponent_en, competition, competition_en, city, city_en, estonia_sets, opponent_sets, vm, am, mam, has_additional_sets, additional_sets_count, match_sets(set_number, estonia_points, opponent_points)",
      )
      .order("match_date", { ascending: false })
      .limit(6),
  ]);

  const totalPlayers = playersCount.count ?? 0;
  const totalAppearances = allApps.length;
  const totalSets = sets.count ?? 0;

  const matchesWithStatistics = new Set<number>();
  for (const appearance of allApps) {
    const statsRows = Array.isArray(appearance.player_match_stats)
      ? appearance.player_match_stats
      : appearance.player_match_stats
        ? [appearance.player_match_stats]
        : [];
    if (statsRows.some((stats) => Object.values(stats).some((value) => typeof value === "number"))) {
      matchesWithStatistics.add(appearance.match_id);
    }
  }

  const getMatchCoverageCounts = (matches: MatchFlagRow[]): MatchCoverageCounts => {
    const counts: MatchCoverageCounts = {
      totalMatches: matches.length,
      fullStatistics: 0,
      partialStatistics: 0,
      withoutStatistics: 0,
    };

    for (const match of matches) {
      const hasStatistics = matchesWithStatistics.has(match.match_id);
      if (!hasStatistics) {
        counts.withoutStatistics += 1;
      } else if ((match.match_unavailable_stats?.length ?? 0) > 0) {
        counts.partialStatistics += 1;
      } else {
        counts.fullStatistics += 1;
      }
    }

    return counts;
  };

  const matchCoverage = {
    official: getMatchCoverageCounts(matchList.filter((match) => match.am === true)),
    competitive: getMatchCoverageCounts(matchList.filter((match) => match.vm === true)),
    all: getMatchCoverageCounts(matchList),
  };

  let topAppearance: HomeSummary["topAppearance"] = null;
  const appsData = allApps as { player_id: number; sets_played: number | null }[];
  if (appsData && appsData.length) {
    const agg = new Map<number, { matches: number; sets: number }>();
    for (const a of appsData) {
      const cur = agg.get(a.player_id) ?? { matches: 0, sets: 0 };
      cur.matches += 1;
      cur.sets += a.sets_played ?? 0;
      agg.set(a.player_id, cur);
    }
    const sorted = [...agg.entries()].sort((a, b) => b[1].matches - a[1].matches);
    if (sorted.length) {
      const [topId, top] = sorted[0];
      const { data: p } = await supabase
        .from("players")
        .select("first_name, last_name, position")
        .eq("player_id", topId)
        .maybeSingle();
      if (p) topAppearance = { ...p, matches: top.matches, sets: top.sets };
    }
  }

  return {
    totalMatches,
    officialMatches,
    totalPlayers,
    totalAppearances,
    totalSets,
    recentMatches: ((recent.data ?? []) as unknown) as RecentMatch[],
    topAppearance,
    matchCoverage,
  };
}

export const homeSummaryOptions = () =>
  queryOptions({
    queryKey: ["home-summary"],
    queryFn: () => fetchHomeSummary(),
  });
