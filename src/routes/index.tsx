import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query";
import { homeSummaryOptions, type RecentMatch } from "@/lib/home.queries";
import { gameHighsOptions, type GameHighRow } from "@/lib/game-highs.queries";
import { totalTopOptions, type TotalTopRow } from "@/lib/total-top.queries";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  getConfiguredHomeCardLabel,
  loadHomeCardConfigs,
  saveHomeCardConfigs,
  type HomeCardMetricConfig,
} from "@/lib/home-card-config";

const ADMIN_EMAILS = new Set(["karl_juhkami@hotmail.com", "mjuhkami@gmail.com"]);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estonian Men's National Volleyball Team Database" },
      {
        name: "description",
        content:
          "Every match. Every set. Every appearance. The searchable historical archive of the Estonia Men's National Volleyball Team.",
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(homeSummaryOptions()),
      context.queryClient.ensureQueryData(totalTopOptions()),
      context.queryClient.ensureQueryData(gameHighsOptions()),
    ]),
  component: HomePage,
  errorComponent: HomeError,
});

type TotalTopStatKey =
  | "appearances"
  | "sets"
  | "points"
  | "blockPoints"
  | "plusMinus"
  | "serveTotal"
  | "serveAces"
  | "serveErrors"
  | "receptionTotal"
  | "receptionErrors"
  | "receptionPositivePct"
  | "receptionExcellentPct"
  | "attackTotal"
  | "attackErrors"
  | "attackBlocked"
  | "attackKills"
  | "attackKillPct"
  | "attackEfficiency"
  | "breakPoints";

type TopLeaderCard = {
  stat: TotalTopStatKey;
  statLabel: string;
  configId: string;
  row: TotalTopRow;
  value: number;
};

type GameHighStatKey =
  | "pointsPerGame"
  | "plusMinusBest"
  | "plusMinusWorst"
  | "serveTotal"
  | "serveAces"
  | "serveErrorsMost"
  | "serveErrorsLeast"
  | "receptionTotal"
  | "receptionErrors"
  | "receptionPositivePctBest"
  | "receptionPositivePctWorst"
  | "receptionExcellentPctBest"
  | "receptionExcellentPctWorst"
  | "attackTotal"
  | "attackErrors"
  | "attackBlocked"
  | "attackKills"
  | "attackKillPctBest"
  | "attackKillPctWorst"
  | "attackEfficiencyBest"
  | "attackEfficiencyWorst"
  | "blockPoints";

type RotatingLeaderCard =
  | {
    kind: "totalTop";
    title: string;
    configId: string;
    row: TotalTopRow;
    value: number;
    isPercent: boolean;
  }
  | {
    kind: "gameHigh";
    title: string;
    configId: string;
    row: GameHighRow;
    value: number;
    isPercent: boolean;
    opponent: string;
    competition: string;
    matchDate: string;
    matchHref: string;
  };

type GameHighRotatingCard = Extract<RotatingLeaderCard, { kind: "gameHigh" }>;

const topStatFields: Array<{ key: TotalTopStatKey; labelKey: string }> = [
  { key: "appearances", labelKey: "totalTop.metrics.mostAppearances" },
  { key: "sets", labelKey: "totalTop.metrics.mostSets" },
  { key: "points", labelKey: "totalTop.metrics.mostPoints" },
  { key: "breakPoints", labelKey: "totalTop.metrics.mostBreakPoints" },
  { key: "plusMinus", labelKey: "totalTop.metrics.bestPlusMinus" },
  { key: "serveTotal", labelKey: "totalTop.metrics.mostServes" },
  { key: "serveAces", labelKey: "totalTop.metrics.mostServeAces" },
  { key: "serveErrors", labelKey: "totalTop.metrics.mostServeErrors" },
  { key: "receptionTotal", labelKey: "totalTop.metrics.mostReceptions" },
  { key: "receptionErrors", labelKey: "totalTop.metrics.mostReceptionErrors" },
  { key: "receptionPositivePct", labelKey: "totalTop.metrics.bestReceptionPct" },
  { key: "receptionExcellentPct", labelKey: "totalTop.metrics.bestIdealReceptionPct" },
  { key: "attackTotal", labelKey: "totalTop.metrics.mostAttacks" },
  { key: "attackErrors", labelKey: "totalTop.metrics.mostAttackErrors" },
  { key: "attackBlocked", labelKey: "totalTop.metrics.mostAttackBlocks" },
  { key: "attackKills", labelKey: "totalTop.metrics.mostSuccessfulAttack" },
  { key: "attackKillPct", labelKey: "totalTop.metrics.bestAttackPct" },
  { key: "attackEfficiency", labelKey: "totalTop.metrics.bestAttackEffPct" },
  { key: "blockPoints", labelKey: "totalTop.metrics.mostBlockPoints" },
];

const gameHighFields: Array<{
  key: GameHighStatKey;
  labelKey: string;
  sortDirection: "asc" | "desc";
  isPercent?: boolean;
  minAttemptsField?: "serveTotal" | "receptionTotal" | "attackTotal";
  minAttempts?: number;
}> = [
    {
      key: "pointsPerGame",
      labelKey: "gameHighs.categoryDescriptions.pointsInMatch",
      sortDirection: "desc",
    },
    {
      key: "plusMinusBest",
      labelKey: "gameHighs.categoryDescriptions.plusMinusBestInMatch",
      sortDirection: "desc",
    },
    {
      key: "plusMinusWorst",
      labelKey: "gameHighs.categoryDescriptions.plusMinusWorstInMatch",
      sortDirection: "asc",
    },
    {
      key: "serveTotal",
      labelKey: "gameHighs.categoryDescriptions.servesInMatch",
      sortDirection: "desc",
    },
    {
      key: "serveAces",
      labelKey: "gameHighs.categoryDescriptions.acesInMatch",
      sortDirection: "desc",
    },
    {
      key: "serveErrorsMost",
      labelKey: "gameHighs.categoryDescriptions.serveMistakesMostInMatch",
      sortDirection: "desc",
    },
    {
      key: "serveErrorsLeast",
      labelKey: "gameHighs.categoryDescriptions.serveMistakesLeastInMatch",
      sortDirection: "asc",
      minAttemptsField: "serveTotal",
      minAttempts: 10,
    },
    {
      key: "receptionTotal",
      labelKey: "gameHighs.categoryDescriptions.receptionsInMatch",
      sortDirection: "desc",
    },
    {
      key: "receptionErrors",
      labelKey: "gameHighs.categoryDescriptions.receptionMistakesInMatch",
      sortDirection: "desc",
    },
    {
      key: "receptionPositivePctBest",
      labelKey: "gameHighs.categoryDescriptions.receptionPctBestInMatch",
      sortDirection: "desc",
      isPercent: true,
      minAttemptsField: "receptionTotal",
      minAttempts: 10,
    },
    {
      key: "receptionPositivePctWorst",
      labelKey: "gameHighs.categoryDescriptions.receptionPctWorstInMatch",
      sortDirection: "asc",
      isPercent: true,
      minAttemptsField: "receptionTotal",
      minAttempts: 10,
    },
    {
      key: "receptionExcellentPctBest",
      labelKey: "gameHighs.categoryDescriptions.receptionIdealPctBestInMatch",
      sortDirection: "desc",
      isPercent: true,
      minAttemptsField: "receptionTotal",
      minAttempts: 10,
    },
    {
      key: "receptionExcellentPctWorst",
      labelKey: "gameHighs.categoryDescriptions.receptionIdealPctWorstInMatch",
      sortDirection: "asc",
      isPercent: true,
      minAttemptsField: "receptionTotal",
      minAttempts: 10,
    },
    {
      key: "attackTotal",
      labelKey: "gameHighs.categoryDescriptions.attacksInMatch",
      sortDirection: "desc",
    },
    {
      key: "attackErrors",
      labelKey: "gameHighs.categoryDescriptions.attackOutInMatch",
      sortDirection: "desc",
    },
    {
      key: "attackBlocked",
      labelKey: "gameHighs.categoryDescriptions.attackBlockedInMatch",
      sortDirection: "desc",
    },
    {
      key: "attackKills",
      labelKey: "gameHighs.categoryDescriptions.attackSuccessfulInMatch",
      sortDirection: "desc",
    },
    {
      key: "attackKillPctBest",
      labelKey: "gameHighs.categoryDescriptions.attackPctBestInMatch",
      sortDirection: "desc",
      isPercent: true,
      minAttemptsField: "attackTotal",
      minAttempts: 10,
    },
    {
      key: "attackKillPctWorst",
      labelKey: "gameHighs.categoryDescriptions.attackPctWorstInMatch",
      sortDirection: "asc",
      isPercent: true,
      minAttemptsField: "attackTotal",
      minAttempts: 10,
    },
    {
      key: "attackEfficiencyBest",
      labelKey: "gameHighs.categoryDescriptions.attackEfficiencyBestInMatch",
      sortDirection: "desc",
      isPercent: true,
      minAttemptsField: "attackTotal",
      minAttempts: 10,
    },
    {
      key: "attackEfficiencyWorst",
      labelKey: "gameHighs.categoryDescriptions.attackEfficiencyWorstInMatch",
      sortDirection: "asc",
      isPercent: true,
      minAttemptsField: "attackTotal",
      minAttempts: 10,
    },
    {
      key: "blockPoints",
      labelKey: "gameHighs.categoryDescriptions.blocksInMatch",
      sortDirection: "desc",
    },
  ];

function getGameHighValue(row: GameHighRow, key: GameHighStatKey): number | null {
  switch (key) {
    case "pointsPerGame":
      return row.points;
    case "plusMinusBest":
    case "plusMinusWorst":
      return row.plusMinus;
    case "serveTotal":
      return row.serveTotal;
    case "serveAces":
      return row.serveAces;
    case "serveErrorsMost":
    case "serveErrorsLeast":
      return row.serveErrors;
    case "receptionTotal":
      return row.receptionTotal;
    case "receptionErrors":
      return row.receptionErrors;
    case "receptionPositivePctBest":
    case "receptionPositivePctWorst":
      return row.receptionPositivePct;
    case "receptionExcellentPctBest":
    case "receptionExcellentPctWorst":
      return row.receptionExcellentPct;
    case "attackTotal":
      return row.attackTotal;
    case "attackErrors":
      return row.attackErrors;
    case "attackBlocked":
      return row.attackBlocked;
    case "attackKills":
      return row.attackKills;
    case "attackKillPctBest":
    case "attackKillPctWorst":
      return row.attackKillPct;
    case "attackEfficiencyBest":
    case "attackEfficiencyWorst":
      return row.attackEfficiency;
    case "blockPoints":
      return row.blockPoints;
  }
}

function formatLeaderValue(value: number, isPercent: boolean) {
  if (isPercent) {
    return `${Math.round(value)}%`;
  }

  return Number.isInteger(value) ? fmt(value) : value.toFixed(1);
}

function stripTrailingPeriod(value: string) {
  return value.replace(/\.$/, "");
}

function pickGameHighLeader(rows: GameHighRow[], field: (typeof gameHighFields)[number]) {
  const filteredRows = rows.filter((row) => {
    if (field.minAttemptsField && field.minAttempts != null) {
      const attempts = row[field.minAttemptsField] ?? 0;
      if (attempts < field.minAttempts) {
        return false;
      }
    }

    return getGameHighValue(row, field.key) != null;
  });

  const sortedRows = [...filteredRows].sort((left, right) => {
    const leftValue = getGameHighValue(left, field.key) ?? 0;
    const rightValue = getGameHighValue(right, field.key) ?? 0;

    if (leftValue !== rightValue) {
      return field.sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
    }

    return new Date(right.matchDate).getTime() - new Date(left.matchDate).getTime();
  });

  return sortedRows[0] ?? null;
}

function HomeError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { reset: qReset } = useQueryErrorResetBoundary();
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl uppercase italic">Data unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "Could not reach the database."}
      </p>
      <button
        onClick={() => {
          qReset();
          router.invalidate();
          reset();
        }}
        className="mt-6 rounded-md bg-estonia-dark px-4 py-2 text-sm font-medium text-white hover:bg-estonia-blue"
      >
        Try again
      </button>
    </div>
  );
}
function fmt(n: number) {
  return n.toLocaleString("en-US");
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumberOrDefault(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function HomePage() {
  const { t, i18n } = useTranslation();
  const { data } = useSuspenseQuery(homeSummaryOptions());
  const { data: totalTopRows } = useSuspenseQuery(totalTopOptions());
  const { data: gameHighRows } = useSuspenseQuery(gameHighsOptions());
  const [activeLeaderIndex, setActiveLeaderIndex] = useState(0);
  const [coverageMatchType, setCoverageMatchType] = useState<"official" | "competitive" | "all">("official");
  const [isAdmin, setIsAdmin] = useState(false);
  const [homeCardConfigs, setHomeCardConfigs] = useState<HomeCardMetricConfig[]>(() => loadHomeCardConfigs());
  const [isSavingImport, setIsSavingImport] = useState(false);
  const [importStatus, setImportStatus] = useState<string>("");
  const [createdMatchId, setCreatedMatchId] = useState<number | null>(null);
  const [targetMatchId, setTargetMatchId] = useState("");
  const [setsPayloadText, setSetsPayloadText] = useState(
    '[\n  { "set_number": 1, "estonia_points": 25, "opponent_points": 19 }\n]',
  );
  const [appearancesPayloadText, setAppearancesPayloadText] = useState(
    '[\n  { "player_id": 1, "sets_played": 3, "sets_started": 3, "on_the_bench": false, "captain": false, "player_position_in_match": "OH", "shirt_number": 7 }\n]',
  );
  const [statsPayloadText, setStatsPayloadText] = useState(
    '[\n  { "player_id": 1, "stats_version": "AM", "points": 12, "plus_minus": 8, "break_points": 4, "serve_total": 20, "serve_aces": 2, "serve_errors": 1, "reception_total": 15, "reception_errors": 1, "reception_positive_pct": 60, "reception_excellent_pct": 33, "attack_total": 18, "attack_kills": 9, "attack_errors": 2, "attack_blocked": 1, "attack_kill_pct": 50, "attack_efficiency": 33, "block_points": 1 }\n]',
  );
  const [setsStatus, setSetsStatus] = useState("");
  const [appearancesStatus, setAppearancesStatus] = useState("");
  const [statsStatus, setStatsStatus] = useState("");
  const [isSavingSets, setIsSavingSets] = useState(false);
  const [isSavingAppearances, setIsSavingAppearances] = useState(false);
  const [isSavingStats, setIsSavingStats] = useState(false);
  const [importDraft, setImportDraft] = useState({
    matchDate: "",
    opponent: "",
    opponentEn: "",
    competition: "",
    competitionEn: "",
    city: "",
    cityEn: "",
    estoniaSets: "",
    opponentSets: "",
    am: true,
    vm: false,
    mam: false,
  });
  const coverageCounts = data.matchCoverage[coverageMatchType];

  const currentLanguage = i18n.language?.startsWith("et") ? "et" : "en";
  const homeCardConfigMap = useMemo(
    () => new Map(homeCardConfigs.map((config) => [config.id, config])),
    [homeCardConfigs],
  );

  useEffect(() => {
    saveHomeCardConfigs(homeCardConfigs);
  }, [homeCardConfigs]);

  const topLeaders = useMemo<TopLeaderCard[]>(() => {
    return topStatFields
      .map((field) => {
        const leader = totalTopRows.reduce<TotalTopRow | null>((best, row) => {
          const rowValue = row.official[field.key];
          if (!best) {
            return row;
          }
          return rowValue > best.official[field.key] ? row : best;
        }, null);

        if (!leader) {
          return null;
        }

        return {
          stat: field.key,
          statLabel: t(field.labelKey),
          configId: `totalTop:${field.key}`,
          row: leader,
          value: leader.official[field.key],
        };
      })
      .filter((leader): leader is TopLeaderCard => leader !== null);
  }, [t, totalTopRows]);

  const gameHighLeaders = useMemo<GameHighRotatingCard[]>(() => {
    const competitiveRows = gameHighRows.filter((row) => row.vm === true);

    return gameHighFields
      .map((field) => {
        const leader = pickGameHighLeader(competitiveRows, field);
        if (!leader) {
          return null;
        }

        const opponent =
          currentLanguage === "et" ? leader.opponent : (leader.opponentEn ?? leader.opponent);
        const competition =
          currentLanguage === "et"
            ? leader.competition
            : (leader.competitionEn ?? leader.competition);

        return {
          kind: "gameHigh" as const,
          title: t(field.labelKey),
          configId: `gameHigh:${field.key}`,
          row: leader,
          value: getGameHighValue(leader, field.key) ?? 0,
          isPercent: field.isPercent === true,
          opponent,
          competition: competition ?? "—",
          matchDate: new Date(leader.matchDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          matchHref:
            leader.mam === true ? `/match/${leader.matchId}/all` : `/match/${leader.matchId}`,
        };
      })
      .filter((leader): leader is GameHighRotatingCard => leader !== null);
  }, [gameHighRows, currentLanguage, t]);

  const rotatingLeaders = useMemo<RotatingLeaderCard[]>(() => {
    const cards: RotatingLeaderCard[] = [
      ...topLeaders.map((leader) => ({
        kind: "totalTop" as const,
        title: getConfiguredHomeCardLabel(leader.configId, leader.statLabel),
        configId: leader.configId,
        row: leader.row,
        value: leader.value,
        isPercent:
          leader.stat === "receptionPositivePct" ||
          leader.stat === "receptionExcellentPct" ||
          leader.stat === "attackKillPct" ||
          leader.stat === "attackEfficiency",
      })),
      ...gameHighLeaders.map((leader) => ({
        ...leader,
        title: getConfiguredHomeCardLabel(leader.configId, leader.title),
      })),
    ];

    return cards.filter((leader) => (homeCardConfigMap.get(leader.configId)?.enabled ?? true));
  }, [gameHighLeaders, homeCardConfigMap, topLeaders]);

  useEffect(() => {
    if (rotatingLeaders.length === 0) {
      setActiveLeaderIndex(0);
      return;
    }
    setActiveLeaderIndex((current) => current % rotatingLeaders.length);
  }, [rotatingLeaders.length]);

  useEffect(() => {
    if (rotatingLeaders.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setActiveLeaderIndex((current) => {
        let next = current;
        while (next === current) {
          next = Math.floor(Math.random() * rotatingLeaders.length);
        }
        return next;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [rotatingLeaders.length]);

  const activeLeader =
    rotatingLeaders.length > 0 ? rotatingLeaders[activeLeaderIndex % rotatingLeaders.length] : null;
  const canManuallyCycleLeaders = rotatingLeaders.length > 1;

  function updateHomeCardConfig(id: string, updater: (config: HomeCardMetricConfig) => HomeCardMetricConfig) {
    setHomeCardConfigs((current) =>
      current.map((config) => (config.id === id ? updater(config) : config)),
    );
  }

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      const user = data.session?.user;
      const appRole = user?.app_metadata?.role;
      const appAdmin = user?.app_metadata?.admin;
      const email = user?.email?.toLowerCase() ?? "";
      setIsAdmin(appRole === "admin" || appAdmin === true || ADMIN_EMAILS.has(email));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      const appRole = user?.app_metadata?.role;
      const appAdmin = user?.app_metadata?.admin;
      const email = user?.email?.toLowerCase() ?? "";
      setIsAdmin(appRole === "admin" || appAdmin === true || ADMIN_EMAILS.has(email));
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSaveMatch() {
    if (!isAdmin) {
      setImportStatus("Only admin users can save matches.");
      return;
    }

    if (!importDraft.matchDate || !importDraft.opponent.trim()) {
      setImportStatus("Match date and opponent are required.");
      return;
    }

    const estoniaSets = Number(importDraft.estoniaSets);
    const opponentSets = Number(importDraft.opponentSets);

    if (
      !Number.isFinite(estoniaSets) ||
      estoniaSets < 0 ||
      !Number.isFinite(opponentSets) ||
      opponentSets < 0
    ) {
      setImportStatus("Set scores must be non-negative numbers.");
      return;
    }

    const matchType = importDraft.vm ? "VM" : importDraft.am ? "AM" : "MAM";

    setIsSavingImport(true);
    setImportStatus("");
    setCreatedMatchId(null);

    const payload = {
      match_date: importDraft.matchDate,
      opponent: importDraft.opponent.trim(),
      opponent_en: importDraft.opponentEn.trim() || null,
      competition: importDraft.competition.trim() || null,
      competition_en: importDraft.competitionEn.trim() || null,
      city: importDraft.city.trim() || null,
      city_en: importDraft.cityEn.trim() || null,
      estonia_sets: estoniaSets,
      opponent_sets: opponentSets,
      am: importDraft.am,
      vm: importDraft.vm,
      mam: importDraft.mam,
      match_type: matchType as "VM" | "AM" | "MAM",
      has_additional_sets: false,
      additional_sets_count: 0,
    };

    const { data: inserted, error } = await supabase
      .from("matches")
      .insert(payload)
      .select("match_id")
      .single();

    if (error) {
      setImportStatus(error.message);
      setIsSavingImport(false);
      return;
    }

    setCreatedMatchId(inserted.match_id);
    setTargetMatchId(String(inserted.match_id));
    setImportStatus(`Match created successfully (ID ${inserted.match_id}).`);
    setIsSavingImport(false);
  }

  function getSelectedMatchId(): number | null {
    const parsed = Number(targetMatchId);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }

  async function handleSaveSets() {
    if (!isAdmin) {
      setSetsStatus("Only admin users can save sets.");
      return;
    }

    const matchId = getSelectedMatchId();
    if (!matchId) {
      setSetsStatus("Select a valid Match ID first.");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(setsPayloadText);
    } catch {
      setSetsStatus("Invalid JSON for sets payload.");
      return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      setSetsStatus("Sets payload must be a non-empty JSON array.");
      return;
    }

    let rows: Array<{
      match_id: number;
      set_number: number;
      estonia_points: number;
      opponent_points: number;
    }>;
    try {
      rows = parsed.map((item, index) => {
        const row = item as Record<string, unknown>;
        const setNumber = Number(row.set_number);
        const estoniaPoints = Number(row.estonia_points);
        const opponentPoints = Number(row.opponent_points);

        if (!Number.isInteger(setNumber) || setNumber <= 0) {
          throw new Error(`Row ${index + 1}: set_number must be a positive integer.`);
        }
        if (
          !Number.isFinite(estoniaPoints) ||
          estoniaPoints < 0 ||
          !Number.isFinite(opponentPoints) ||
          opponentPoints < 0
        ) {
          throw new Error(
            `Row ${index + 1}: estonia_points and opponent_points must be non-negative numbers.`,
          );
        }

        return {
          match_id: matchId,
          set_number: setNumber,
          estonia_points: estoniaPoints,
          opponent_points: opponentPoints,
        };
      });
    } catch (error) {
      setSetsStatus(error instanceof Error ? error.message : "Invalid set rows.");
      return;
    }

    setIsSavingSets(true);
    setSetsStatus("");

    const { error: insertError } = await supabase.from("match_sets").insert(rows);
    if (insertError) {
      setSetsStatus(insertError.message);
      setIsSavingSets(false);
      return;
    }

    const { data: matchRow, error: matchError } = await supabase
      .from("matches")
      .select("estonia_sets, opponent_sets")
      .eq("match_id", matchId)
      .single();

    if (!matchError && matchRow) {
      const officialSetCount = (matchRow.estonia_sets ?? 0) + (matchRow.opponent_sets ?? 0);
      const { data: allSets } = await supabase
        .from("match_sets")
        .select("set_number")
        .eq("match_id", matchId);

      const additionalCount = (allSets ?? []).filter(
        (setRow) => setRow.set_number > officialSetCount,
      ).length;
      await supabase
        .from("matches")
        .update({
          has_additional_sets: additionalCount > 0,
          additional_sets_count: additionalCount,
        })
        .eq("match_id", matchId);
    }

    setSetsStatus(`Saved ${rows.length} set row(s) for match ${matchId}.`);
    setIsSavingSets(false);
  }

  async function handleSaveAppearances() {
    if (!isAdmin) {
      setAppearancesStatus("Only admin users can save appearances.");
      return;
    }

    const matchId = getSelectedMatchId();
    if (!matchId) {
      setAppearancesStatus("Select a valid Match ID first.");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(appearancesPayloadText);
    } catch {
      setAppearancesStatus("Invalid JSON for appearances payload.");
      return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      setAppearancesStatus("Appearances payload must be a non-empty JSON array.");
      return;
    }

    let rows: Array<{
      match_id: number;
      player_id: number;
      sets_played: number;
      sets_started: number;
      on_the_bench: boolean;
      captain: boolean;
      player_position_in_match: string | null;
      shirt_number: number | null;
    }>;
    try {
      rows = parsed.map((item, index) => {
        const row = item as Record<string, unknown>;
        const playerId = Number(row.player_id);
        if (!Number.isInteger(playerId) || playerId <= 0) {
          throw new Error(`Row ${index + 1}: player_id must be a positive integer.`);
        }

        return {
          match_id: matchId,
          player_id: playerId,
          sets_played: toNumberOrDefault(row.sets_played, 0),
          sets_started: toNumberOrDefault(row.sets_started, 0),
          on_the_bench: row.on_the_bench === true,
          captain: row.captain === true,
          player_position_in_match:
            typeof row.player_position_in_match === "string" && row.player_position_in_match.trim()
              ? row.player_position_in_match.trim()
              : null,
          shirt_number: toNullableNumber(row.shirt_number),
        };
      });
    } catch (error) {
      setAppearancesStatus(error instanceof Error ? error.message : "Invalid appearance rows.");
      return;
    }

    setIsSavingAppearances(true);
    setAppearancesStatus("");

    const { error } = await supabase.from("appearances").insert(rows);
    if (error) {
      setAppearancesStatus(error.message);
      setIsSavingAppearances(false);
      return;
    }

    setAppearancesStatus(`Saved ${rows.length} appearance row(s) for match ${matchId}.`);
    setIsSavingAppearances(false);
  }

  async function handleSaveStats() {
    if (!isAdmin) {
      setStatsStatus("Only admin users can save player stats.");
      return;
    }

    const matchId = getSelectedMatchId();
    if (!matchId) {
      setStatsStatus("Select a valid Match ID first.");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(statsPayloadText);
    } catch {
      setStatsStatus("Invalid JSON for stats payload.");
      return;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      setStatsStatus("Stats payload must be a non-empty JSON array.");
      return;
    }

    setIsSavingStats(true);
    setStatsStatus("");

    const { data: appearances, error: appearancesError } = await supabase
      .from("appearances")
      .select("appearance_id, player_id")
      .eq("match_id", matchId);

    if (appearancesError) {
      setStatsStatus(appearancesError.message);
      setIsSavingStats(false);
      return;
    }

    const appearanceByPlayer = new Map<number, number>();
    for (const appearance of appearances ?? []) {
      appearanceByPlayer.set(appearance.player_id, appearance.appearance_id);
    }

    let rows: Array<Record<string, number | string | null>>;
    try {
      rows = parsed.map((item, index) => {
        const row = item as Record<string, unknown>;
        const explicitAppearanceId = toNullableNumber(row.appearance_id);
        const playerId = toNullableNumber(row.player_id);

        let appearanceId = explicitAppearanceId;
        if (appearanceId == null && playerId != null) {
          appearanceId = appearanceByPlayer.get(playerId) ?? null;
        }

        if (appearanceId == null) {
          throw new Error(
            `Row ${index + 1}: appearance_id missing and player_id could not be mapped to an appearance for match ${matchId}.`,
          );
        }

        const statsVersion = row.stats_version === "ALL" ? "ALL" : "AM";

        return {
          appearance_id: appearanceId,
          stats_version: statsVersion as "ALL" | "AM",
          points: toNullableNumber(row.points),
          plus_minus: toNullableNumber(row.plus_minus),
          break_points: toNullableNumber(row.break_points),
          serve_total: toNullableNumber(row.serve_total),
          serve_aces: toNullableNumber(row.serve_aces),
          serve_errors: toNullableNumber(row.serve_errors),
          reception_total: toNullableNumber(row.reception_total),
          reception_errors: toNullableNumber(row.reception_errors),
          reception_positive_pct: toNullableNumber(row.reception_positive_pct),
          reception_excellent_pct: toNullableNumber(row.reception_excellent_pct),
          attack_total: toNullableNumber(row.attack_total),
          attack_kills: toNullableNumber(row.attack_kills),
          attack_errors: toNullableNumber(row.attack_errors),
          attack_blocked: toNullableNumber(row.attack_blocked),
          attack_kill_pct: toNullableNumber(row.attack_kill_pct),
          attack_efficiency: toNullableNumber(row.attack_efficiency),
          block_points: toNullableNumber(row.block_points),
        };
      });
    } catch (error) {
      setStatsStatus(error instanceof Error ? error.message : "Invalid stats rows.");
      setIsSavingStats(false);
      return;
    }

    const { error } = await supabase.from("player_match_stats").insert(rows as never);
    if (error) {
      setStatsStatus(error.message);
      setIsSavingStats(false);
      return;
    }

    setStatsStatus(`Saved ${rows.length} player stat row(s) for match ${matchId}.`);
    setIsSavingStats(false);
  }

  function showPreviousLeader() {
    if (!canManuallyCycleLeaders) return;
    setActiveLeaderIndex(
      (current) => (current - 1 + rotatingLeaders.length) % rotatingLeaders.length,
    );
  }

  function showNextLeader() {
    if (!canManuallyCycleLeaders) return;
    setActiveLeaderIndex((current) => (current + 1) % rotatingLeaders.length);
  }

  return (
    <div className="text-slate-900">
      {/* Hero Metrics */}
      <header className="bg-estonia-dark px-4 pt-10 pb-16 text-white sm:px-6 sm:pt-12 sm:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-3 lg:items-start lg:gap-8">
            <div className="lg:col-span-2">
              <h1 className="mb-3 font-display text-3xl uppercase italic leading-tight sm:text-4xl md:text-5xl">
                {t("home.title")}
                <span className="block text-estonia-blue">{t("home.titleAccent")}</span>
              </h1>
              <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed text-white/70 sm:text-base">
                {t("home.subtitle")}
              </p>
            </div>

            <div className="w-full rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
              <div className="grid grid-cols-3 gap-1 rounded-md border border-white/15 p-1">
                {([
                  ["official", t("matches.officialMatches")],
                  ["competitive", t("matches.competitiveMatches")],
                  ["all", t("matches.allMatches")],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={coverageMatchType === value}
                    onClick={() => setCoverageMatchType(value)}
                    className={`min-h-9 rounded px-1 text-[9px] font-semibold uppercase leading-tight transition-colors sm:text-[10px] ${coverageMatchType === value
                      ? "bg-white text-slate-900"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-b border-white/15 pb-2">
                <span className="text-xs font-semibold uppercase text-white/70">
                  {t("home.totalMatches")}
                </span>
                <span className="font-display text-3xl text-white">
                  {fmt(coverageCounts.totalMatches)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {([
                  ["fullStatistics", coverageCounts.fullStatistics, "text-emerald-300"],
                  ["partialStatistics", coverageCounts.partialStatistics, "text-amber-300"],
                  ["withoutStatistics", coverageCounts.withoutStatistics, "text-white/70"],
                ] as const).map(([labelKey, count, color]) => (
                  <div key={labelKey} className="min-w-0 border-l-2 border-white/20 pl-2">
                    <div className={`font-display text-2xl ${color}`}>{fmt(count)}</div>
                    <div className="text-[9px] font-medium uppercase leading-tight text-white/65 sm:text-[10px]">
                      {t(`home.${labelKey}`)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header >

      {/* Main */}
      < main className="mx-auto -mt-8 max-w-7xl px-4 sm:-mt-12 sm:px-6" >
        {isAdmin && (
          <>
            <section
              id="admin-home-card-config"
              className="mb-6 rounded-2xl border border-estonia-blue/30 bg-white p-4 shadow-sm sm:p-6"
            >
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-estonia-blue">
                Home card setup
              </div>
              <h2 className="font-display text-2xl uppercase italic text-slate-900">
                Configure rotating stat cards
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Toggle metrics on or off and rename them to match the wording you want on the home page.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {homeCardConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={() =>
                          updateHomeCardConfig(config.id, (item) => ({
                            ...item,
                            enabled: !item.enabled,
                          }))
                        }
                      />
                      {config.group === "totalTop" ? "Career" : "Match"}
                    </label>
                    <input
                      type="text"
                      value={config.label}
                      onChange={(event) =>
                        updateHomeCardConfig(config.id, (item) => ({
                          ...item,
                          label: event.target.value,
                        }))
                      }
                      className="mt-2 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-estonia-blue"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section
              id="admin-import"
              className="mb-6 rounded-2xl border border-estonia-blue/30 bg-white p-4 shadow-sm sm:p-6"
            >
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-estonia-blue">
                Admin Import
              </div>
              <h2 className="font-display text-2xl uppercase italic text-slate-900">Add New Match</h2>
              <p className="mt-1 text-sm text-slate-500">
                Create a match first, then use the selected Match ID to import sets, appearances, and
                player stats.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <input
                  type="date"
                  value={importDraft.matchDate}
                  onChange={(event) =>
                    setImportDraft((current) => ({ ...current, matchDate: event.target.value }))
                  }
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-estonia-blue"
                />
                <input
                  type="text"
                  placeholder="Opponent (ET)"
                  value={importDraft.opponent}
                  onChange={(event) =>
                    setImportDraft((current) => ({ ...current, opponent: event.target.value }))
                  }
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-estonia-blue"
                />
                <input
                  type="text"
                  placeholder="Opponent (EN)"
                  value={importDraft.opponentEn}
                  onChange={(event) =>
                    setImportDraft((current) => ({ ...current, opponentEn: event.target.value }))
                  }
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-estonia-blue"
                />
                <input
                  type="text"
                  placeholder="Competition (ET)"
                  value={importDraft.competition}
                  onChange={(event) =>
                    setImportDraft((current) => ({ ...current, competition: event.target.value }))
                  }
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-estonia-blue"
                />
                <input
                  type="text"
                  placeholder="Competition (EN)"
                  value={importDraft.competitionEn}
                  onChange={(event) =>
                    setImportDraft((current) => ({ ...current, competitionEn: event.target.value }))
                  }
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-estonia-blue"
                />
                <input
                  type="text"
                  placeholder="City (ET)"
                  value={importDraft.city}
                  onChange={(event) =>
                    setImportDraft((current) => ({ ...current, city: event.target.value }))
                  }
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-estonia-blue"
                />
                <input
                  type="text"
                  placeholder="City (EN)"
                  value={importDraft.cityEn}
                  onChange={(event) =>
                    setImportDraft((current) => ({ ...current, cityEn: event.target.value }))
                  }
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-estonia-blue"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Estonia sets"
                  value={importDraft.estoniaSets}
                  onChange={(event) =>
                    setImportDraft((current) => ({ ...current, estoniaSets: event.target.value }))
                  }
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-estonia-blue"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Opponent sets"
                  value={importDraft.opponentSets}
                  onChange={(event) =>
                    setImportDraft((current) => ({ ...current, opponentSets: event.target.value }))
                  }
                  className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-estonia-blue"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <input
                    type="checkbox"
                    checked={importDraft.am}
                    onChange={() =>
                      setImportDraft((current) => ({ ...current, am: true, vm: false, mam: false }))
                    }
                  />
                  AM
                </label>
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <input
                    type="checkbox"
                    checked={importDraft.vm}
                    onChange={() =>
                      setImportDraft((current) => ({ ...current, am: false, vm: true, mam: false }))
                    }
                  />
                  VM
                </label>
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  <input
                    type="checkbox"
                    checked={importDraft.mam}
                    onChange={() =>
                      setImportDraft((current) => ({ ...current, am: false, vm: false, mam: true }))
                    }
                  />
                  MAM
                </label>
              </div>

              <button
                type="button"
                onClick={handleSaveMatch}
                disabled={isSavingImport}
                className="mt-5 h-10 rounded-md bg-estonia-blue px-4 text-sm font-semibold text-white transition hover:bg-estonia-blue/90"
              >
                {isSavingImport ? "Saving..." : "Save match"}
              </button>

              {importStatus && <p className="mt-3 text-sm text-slate-600">{importStatus}</p>}

              {createdMatchId != null && (
                <a
                  href={`/match/${createdMatchId}`}
                  className="mt-2 inline-block text-sm font-semibold text-estonia-blue underline-offset-2 hover:underline"
                >
                  Open match statistics
                </a>
              )}

              <div className="mt-6 border-t border-slate-200 pt-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Next steps
                </div>
                <div className="mt-3 grid gap-3 sm:max-w-xs">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Target Match ID
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={targetMatchId}
                    onChange={(event) => setTargetMatchId(event.target.value)}
                    placeholder="e.g. 123"
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-estonia-blue"
                  />
                </div>

                <div className="mt-5 grid gap-5 lg:grid-cols-3">
                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                      Step 2: Match sets
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      JSON array with set_number, estonia_points, opponent_points.
                    </p>
                    <textarea
                      value={setsPayloadText}
                      onChange={(event) => setSetsPayloadText(event.target.value)}
                      rows={9}
                      className="mt-2 w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900 outline-none focus:border-estonia-blue"
                    />
                    <button
                      type="button"
                      onClick={handleSaveSets}
                      disabled={isSavingSets}
                      className="mt-3 h-9 rounded-md bg-estonia-dark px-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-estonia-blue disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingSets ? "Saving..." : "Save sets"}
                    </button>
                    {setsStatus && <p className="mt-2 text-xs text-slate-600">{setsStatus}</p>}
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                      Step 3: Appearances
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      JSON array with player_id and appearance fields.
                    </p>
                    <textarea
                      value={appearancesPayloadText}
                      onChange={(event) => setAppearancesPayloadText(event.target.value)}
                      rows={9}
                      className="mt-2 w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900 outline-none focus:border-estonia-blue"
                    />
                    <button
                      type="button"
                      onClick={handleSaveAppearances}
                      disabled={isSavingAppearances}
                      className="mt-3 h-9 rounded-md bg-estonia-dark px-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-estonia-blue disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingAppearances ? "Saving..." : "Save appearances"}
                    </button>
                    {appearancesStatus && (
                      <p className="mt-2 text-xs text-slate-600">{appearancesStatus}</p>
                    )}
                  </section>

                  <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                      Step 4: Player stats
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      JSON array with stats fields and either appearance_id or player_id.
                    </p>
                    <textarea
                      value={statsPayloadText}
                      onChange={(event) => setStatsPayloadText(event.target.value)}
                      rows={9}
                      className="mt-2 w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-900 outline-none focus:border-estonia-blue"
                    />
                    <button
                      type="button"
                      onClick={handleSaveStats}
                      disabled={isSavingStats}
                      className="mt-3 h-9 rounded-md bg-estonia-dark px-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-estonia-blue disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingStats ? "Saving..." : "Save stats"}
                    </button>
                    {statsStatus && <p className="mt-2 text-xs text-slate-600">{statsStatus}</p>}
                  </section>
                </div>
              </div>
            </section>
          </>
        )
        }

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Recent Matches */}
          <div className="space-y-6 lg:col-span-2">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
                <h2 className="font-display text-xl uppercase italic">{t("home.recentMatches")}</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {data.recentMatches.length === 0 ? (
                  <EmptyMatches />
                ) : (
                  data.recentMatches.map((m) => <MatchRow key={m.match_id} match={m} />)
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              {activeLeader ? (
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <button
                      type="button"
                      onClick={showPreviousLeader}
                      disabled={!canManuallyCycleLeaders}
                      aria-label="Previous metric"
                      className="h-8 w-8 rounded-full border border-slate-300 bg-white text-sm font-bold text-slate-600 transition hover:border-estonia-blue hover:text-estonia-blue disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      &lt;
                    </button>
                    <div className="px-2 text-center text-sm font-bold uppercase text-estonia-dark sm:text-base">
                      {stripTrailingPeriod(activeLeader.title)}
                    </div>
                    <button
                      type="button"
                      onClick={showNextLeader}
                      disabled={!canManuallyCycleLeaders}
                      aria-label="Next metric"
                      className="h-8 w-8 rounded-full border border-slate-300 bg-white text-sm font-bold text-slate-600 transition hover:border-estonia-blue hover:text-estonia-blue disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      &gt;
                    </button>
                  </div>
                  <div className="px-4 py-5 sm:px-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="break-words text-base font-bold uppercase leading-tight text-slate-900 sm:text-lg">
                          {activeLeader.row.name}
                        </h3>
                        {activeLeader.kind === "totalTop" && activeLeader.row.position && (
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {activeLeader.row.position}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 font-display text-4xl leading-none text-estonia-dark sm:text-5xl">
                        {formatLeaderValue(activeLeader.value, activeLeader.isPercent)}
                      </div>
                    </div>

                    {activeLeader.kind === "gameHigh" && (
                      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-200 pt-3 text-[10px] uppercase tracking-[0.12em]">
                        <div className="min-w-0">
                          <p className="text-slate-400">{t("matches.opponent")}</p>
                          <a
                            href={activeLeader.matchHref}
                            className="mt-0.5 block truncate font-semibold text-slate-700 hover:text-estonia-blue"
                          >
                            {activeLeader.opponent}
                          </a>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400">{t("matches.date")}</p>
                          <p className="mt-0.5 font-semibold text-slate-700">
                            {activeLeader.matchDate}
                          </p>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <p className="text-slate-400">{t("matches.competition")}</p>
                          <p className="mt-0.5 truncate font-semibold text-slate-700">
                            {activeLeader.competition}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">{t("home.noTopStatData")}</p>
              )}
            </section>

          </aside>
        </div>
      </main >
    </div >
  );
}

function MatchRow({ match }: { match: RecentMatch }) {
  const { t, i18n } = useTranslation();
  const won = match.estonia_sets > match.opponent_sets;
  const currentLanguage = i18n.language?.startsWith("et") ? "et" : "en";
  const opponent =
    currentLanguage === "et" ? match.opponent : (match.opponent_en ?? match.opponent);
  const competition =
    currentLanguage === "et" ? match.competition : (match.competition_en ?? match.competition);
  const city = currentLanguage === "et" ? match.city : (match.city_en ?? match.city);
  const typeStyles: Record<string, string> = {
    VM: "bg-green-100 text-green-700",
    AM: "bg-slate-100 text-slate-600",
    MAM: "bg-amber-100 text-amber-700",
    "—": "bg-slate-100 text-slate-500",
  };
  const typeLabels: Record<string, string> = {
    VM: t("common.competitive"),
    AM: t("matches.official_match"),
    MAM: t("common.nonCompetitive"),
    "—": "Unknown",
  };
  const officialSets = match.match_sets
    .filter((s) => s.set_number <= match.estonia_sets + match.opponent_sets)
    .sort((a, b) => a.set_number - b.set_number);
  const officialSetScores = officialSets
    .map((s) => `${s.estonia_points}:${s.opponent_points}`)
    .join(" · ");
  const additionalSets = match.match_sets
    .filter((s) => s.set_number > match.estonia_sets + match.opponent_sets)
    .sort((a, b) => a.set_number - b.set_number);
  const additionalSetScores = additionalSets
    .map((s) => `${s.estonia_points}:${s.opponent_points}`)
    .join(" · ");
  const additionalSetCount = additionalSets.length;
  const additionalSetsLabel =
    currentLanguage === "et"
      ? t("matches.additional_set", { count: additionalSetCount })
      : `${additionalSetCount} Additional Set${additionalSetCount === 1 ? "" : "s"}`;
  const matchType = match.vm ? "VM" : match.am ? "AM" : match.mam ? "MAM" : "—";
  const scoreTarget =
    matchType === "MAM" ? `/match/${match.match_id}/all` : `/match/${match.match_id}`;
  return (
    <div className="p-4 transition-colors hover:bg-slate-50 sm:p-6">
      <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase text-slate-400">
            {competition ?? "—"} •{" "}
            {new Date(match.match_date).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            {city ? ` • ${city}` : ""}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-bold sm:text-lg">
            {t("common.estonia")}
            <a
              href={scoreTarget}
              className={`${won ? "text-estonia-blue" : "text-red-700"} underline-offset-2 hover:underline`}
            >
              {match.estonia_sets} – {match.opponent_sets}
            </a>
            <span className="uppercase break-words">{opponent}</span>
          </div>
        </div>
        <span
          className={`inline-flex w-fit shrink-0 rounded px-2.5 py-1 text-[11px] font-bold ${typeStyles[matchType]}`}
        >
          {typeLabels[matchType]}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
        {officialSetScores && (
          <span className="text-base font-semibold text-slate-800">{officialSetScores}</span>
        )}
        {match.has_additional_sets && additionalSetCount > 0 && (
          <div className="flex flex-col border-l border-slate-200 pl-3">
            <span className="text-base font-semibold text-slate-700">
              <span className="mr-2 text-[11px] font-bold uppercase tracking-[0.08em] text-estonia-blue">
                {additionalSetsLabel}:
              </span>
              {additionalSetScores}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyMatches() {
  return (
    <div className="p-12 text-center">
      <p className="font-display text-xl uppercase italic text-slate-400">Archive empty</p>
      <p className="mt-2 text-sm text-slate-500">
        No matches have been imported yet. Once match data is added to the database, recent results
        will appear here automatically.
      </p>
    </div>
  );
}
