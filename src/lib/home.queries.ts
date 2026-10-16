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
  statsCoverage: {
    matchesWithStats: number;
    totalMatches: number;
  };
  playerCoverage: {
    matchesWithPlayers: number;
    totalMatches: number;
  };
};

const PAGE_SIZE = 1000;

async function fetchAllMatchFlags() {
  const rows: { match_id: number; am: boolean | null }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("matches")
      .select("match_id, am")
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

  const officialIds = new Set(matchList.filter((m) => m.am === true).map((m) => m.match_id));
  const officialApps = allApps.filter((a) => officialIds.has(a.match_id));
  const matchesWithPlayers = new Set(officialApps.map((a) => a.match_id)).size;
  // Only stat rows with real numeric values count; players-list-only rows are empty.
  const matchesWithStats = new Set(
    officialApps
      .filter((a) =>
        [a.player_match_stats].flat().some(
          (s) => s && Object.values(s).some((v) => typeof v === "number"),
        ),
      )
      .map((a) => a.match_id),
  ).size;

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
    statsCoverage: {
      matchesWithStats,
      totalMatches: officialMatches,
    },
    playerCoverage: {
      matchesWithPlayers,
      totalMatches: officialMatches,
    },
  };
}

export const homeSummaryOptions = () =>
  queryOptions({
    queryKey: ["home-summary"],
    queryFn: () => fetchHomeSummary(),
  });
