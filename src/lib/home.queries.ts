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

function extractMatchIdFromAppearanceRelation(value: unknown): number | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    const first = value[0] as { match_id?: unknown } | undefined;
    return typeof first?.match_id === "number" ? first.match_id : null;
  }

  const row = value as { match_id?: unknown };
  return typeof row.match_id === "number" ? row.match_id : null;
}

async function fetchHomeSummary(): Promise<HomeSummary> {
  const { data: matchList } = await supabase.from("matches").select("match_id, am");
  const filteredMatchIds = (matchList ?? []).map((m) => m.match_id);
  const totalMatches = filteredMatchIds.length;
  const officialMatches = (matchList ?? []).filter((match) => match.am === true).length;

  const [playersCount, apps, sets, recent, statCoverage] = await Promise.all([
    supabase.from("players").select("*", { count: "exact", head: true }),
    filteredMatchIds.length
      ? supabase.from("appearances").select("player_id, sets_played, match_id").in("match_id", filteredMatchIds)
      : Promise.resolve({ data: [] as any[] }),
    filteredMatchIds.length
      ? supabase.from("match_sets").select("match_set_id", { count: "exact", head: true }).in("match_id", filteredMatchIds)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("matches")
      .select(
        "match_id, match_date, opponent, opponent_en, competition, competition_en, city, city_en, estonia_sets, opponent_sets, vm, am, mam, has_additional_sets, additional_sets_count, match_sets(set_number, estonia_points, opponent_points)",
      )
      .order("match_date", { ascending: false })
      .limit(6),
    filteredMatchIds.length
      ? supabase
        .from("player_match_stats")
        .select(`
        appearance_id,
        appearances!inner(
          match_id
        )
      `)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const totalPlayers = playersCount.count ?? 0;
  const totalAppearances = (apps as any).data?.length ?? 0;
  const totalSets = (sets as any).count ?? 0;

  const appsDataRaw = (apps as any).data ?? [];
  const statsData = (statCoverage as any).data ?? [];

  const appearanceMatchIds = appsDataRaw
    .map((a: any) => (typeof a.match_id === "number" ? a.match_id : null))
    .filter((matchId: number | null): matchId is number => matchId != null);

  const statsMatchIds = statsData
    .map((s: any) => extractMatchIdFromAppearanceRelation(s.appearances))
    .filter((matchId: number | null): matchId is number => matchId != null);

  const matchesWithPlayers = new Set([...appearanceMatchIds, ...statsMatchIds]).size;

  const matchesWithStats = new Set(
    statsMatchIds
  ).size;

  let topAppearance: HomeSummary["topAppearance"] = null;
  const appsData = (apps as any).data as { player_id: number; sets_played: number | null }[] | undefined;
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
      totalMatches,
    },
    playerCoverage: {
      matchesWithPlayers,
      totalMatches,
    },
  };
}

export const homeSummaryOptions = () =>
  queryOptions({
    queryKey: ["home-summary"],
    queryFn: () => fetchHomeSummary(),
  });
