import { useSuspenseQuery } from "@tanstack/react-query";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  gameHighsOptions,
  matchTeamTotalsOptions,
  TEAM_TOTAL_STAT_FIELDS,
  type GameHighRow,
} from "@/lib/game-highs.queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import MultiSelect from "@/components/ui/multi-select";
import { useTranslation } from "react-i18next";

const positionOrder = ["SET", "OPP", "OH", "MB", "LIB"];

type GameHighCategory =
  | "pointsPerGame"
  | "plusMinusBest"
  | "plusMinusWorst"
  | "serveTotal"
  | "serveAces"
  | "serveErrorsMost"
  | "serveErrorsLeast"
  | "receptionTotal"
  | "receptionErrors"
  | "receptionErrorsLeast"
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

type CategoryRule = {
  minAttemptsField?: "serveTotal" | "receptionTotal" | "attackTotal";
  minAttempts?: number;
  isPercent?: boolean;
  sortDirection?: "asc" | "desc";
};

const categoryRules: Record<GameHighCategory, CategoryRule> = {
  pointsPerGame: { sortDirection: "desc" },
  plusMinusBest: { sortDirection: "desc" },
  plusMinusWorst: { sortDirection: "asc" },
  serveTotal: { sortDirection: "desc" },
  serveAces: { sortDirection: "desc" },
  serveErrorsMost: { sortDirection: "desc" },
  serveErrorsLeast: { minAttemptsField: "serveTotal", minAttempts: 10, sortDirection: "asc" },
  receptionTotal: { sortDirection: "desc" },
  receptionErrors: { sortDirection: "desc" },
  receptionErrorsLeast: {
    minAttemptsField: "receptionTotal",
    minAttempts: 10,
    sortDirection: "asc",
  },
  receptionPositivePctBest: {
    minAttemptsField: "receptionTotal",
    minAttempts: 10,
    isPercent: true,
    sortDirection: "desc",
  },
  receptionPositivePctWorst: {
    minAttemptsField: "receptionTotal",
    minAttempts: 10,
    isPercent: true,
    sortDirection: "asc",
  },
  receptionExcellentPctBest: {
    minAttemptsField: "receptionTotal",
    minAttempts: 10,
    isPercent: true,
    sortDirection: "desc",
  },
  receptionExcellentPctWorst: {
    minAttemptsField: "receptionTotal",
    minAttempts: 10,
    isPercent: true,
    sortDirection: "asc",
  },
  attackTotal: { sortDirection: "desc" },
  attackErrors: { sortDirection: "desc" },
  attackBlocked: { sortDirection: "desc" },
  attackKills: { sortDirection: "desc" },
  attackKillPctBest: {
    minAttemptsField: "attackTotal",
    minAttempts: 10,
    isPercent: true,
    sortDirection: "desc",
  },
  attackKillPctWorst: {
    minAttemptsField: "attackTotal",
    minAttempts: 10,
    isPercent: true,
    sortDirection: "asc",
  },
  attackEfficiencyBest: {
    minAttemptsField: "attackTotal",
    minAttempts: 10,
    isPercent: true,
    sortDirection: "desc",
  },
  attackEfficiencyWorst: {
    minAttemptsField: "attackTotal",
    minAttempts: 10,
    isPercent: true,
    sortDirection: "asc",
  },
  blockPoints: { sortDirection: "desc" },
};

type ServeContextKey = "serveTotal" | "serveErrors" | "serveAces";
type ReceptionContextKey =
  "receptionTotal" | "receptionErrors" | "receptionPositivePct" | "receptionExcellentPct";
type AttackContextKey =
  | "attackTotal"
  | "attackKills"
  | "attackErrors"
  | "attackBlocked"
  | "attackKillPct"
  | "attackEfficiency";

function getServeContextKeys(metric: string): ServeContextKey[] {
  switch (metric) {
    case "serveTotal":
    case "serveAces":
    case "serveErrors":
    case "serveErrorsMost":
    case "serveErrorsLeast":
    case "bestAceErrorRatio":
      return ["serveTotal", "serveErrors", "serveAces"];
    default:
      return [];
  }
}

function isServeCountMetric(metric: string): boolean {
  return (
    metric === "serveTotal" ||
    metric === "serveAces" ||
    metric === "serveErrors" ||
    metric === "serveErrorsMost" ||
    metric === "serveErrorsLeast"
  );
}

function isValueColumnHidden(metric: string): boolean {
  return isServeCountMetric(metric) || isReceptionMetric(metric) || isAttackMetric(metric);
}

function isServeContextHighlighted(metric: string, key: ServeContextKey): boolean {
  switch (metric) {
    case "serveTotal":
      return key === "serveTotal";
    case "serveAces":
      return key === "serveAces";
    case "serveErrors":
    case "serveErrorsMost":
    case "serveErrorsLeast":
      return key === "serveErrors";
    case "bestAceErrorRatio":
      return key === "serveAces" || key === "serveErrors";
    default:
      return false;
  }
}

const serveContextLabels: Record<ServeContextKey, string> = {
  serveTotal: "S TOT",
  serveErrors: "S ERR",
  serveAces: "S ACE",
};

function formatServeContextValue(value: number | null | undefined): string {
  return value == null ? "—" : String(value);
}

function isReceptionContextHighlighted(metric: string, key: ReceptionContextKey): boolean {
  switch (metric) {
    case "receptionTotal":
      return key === "receptionTotal";
    case "receptionErrors":
    case "receptionErrorsLeast":
      return key === "receptionErrors";
    case "receptionPositivePct":
    case "receptionPositivePctBest":
    case "receptionPositivePctWorst":
      return key === "receptionPositivePct";
    case "receptionExcellentPct":
    case "receptionExcellentPctBest":
    case "receptionExcellentPctWorst":
      return key === "receptionExcellentPct";
    default:
      return false;
  }
}

const RECEPTION_COLUMN_ORDER: ReceptionContextKey[] = [
  "receptionTotal",
  "receptionErrors",
  "receptionPositivePct",
  "receptionExcellentPct",
];

function getReceptionContextKeys(metric: string): ReceptionContextKey[] {
  return isReceptionMetric(metric) ? RECEPTION_COLUMN_ORDER : [];
}

function isReceptionMetric(metric: string): boolean {
  return metric.startsWith("reception");
}

const receptionContextLabels: Record<ReceptionContextKey, string> = {
  receptionTotal: "R TOT",
  receptionErrors: "R ERR",
  receptionPositivePct: "R POS%",
  receptionExcellentPct: "R EXC%",
};

function formatReceptionContextValue(
  key: ReceptionContextKey,
  value: number | null | undefined,
): string {
  if (value == null) return "—";
  return key === "receptionPositivePct" || key === "receptionExcellentPct"
    ? `${Math.round(value)}%`
    : String(value);
}

const ATTACK_COLUMN_ORDER: AttackContextKey[] = [
  "attackTotal",
  "attackErrors",
  "attackBlocked",
  "attackKills",
  "attackKillPct",
  "attackEfficiency",
];

function isAttackMetric(metric: string): boolean {
  return metric.startsWith("attack");
}

function getAttackContextKeys(metric: string): AttackContextKey[] {
  return isAttackMetric(metric) ? ATTACK_COLUMN_ORDER : [];
}

function isAttackContextHighlighted(metric: string, key: AttackContextKey): boolean {
  switch (metric) {
    case "attackTotal":
      return key === "attackTotal";
    case "attackErrors":
      return key === "attackErrors";
    case "attackBlocked":
      return key === "attackBlocked";
    case "attackKills":
      return key === "attackKills";
    case "attackKillPctBest":
    case "attackKillPctWorst":
    case "attackKillPct":
      return key === "attackKillPct";
    case "attackEfficiencyBest":
    case "attackEfficiencyWorst":
    case "attackEfficiency":
      return key === "attackEfficiency";
    default:
      return false;
  }
}

const attackContextLabels: Record<AttackContextKey, string> = {
  attackTotal: "A TOT",
  attackKills: "A KIL",
  attackErrors: "A ERR",
  attackBlocked: "A BLK",
  attackKillPct: "ATT%",
  attackEfficiency: "A EFF%",
};

function formatAttackContextValue(key: AttackContextKey, value: number | null | undefined): string {
  if (value == null) return "—";
  return key === "attackKillPct" || key === "attackEfficiency"
    ? `${Math.round(value)}%`
    : String(value);
}

export const Route = createFileRoute("/game-highs")({
  head: () => ({
    meta: [
      { title: "Game Highs — Eesti Võrkpall DB" },
      {
        name: "description",
        content:
          "Individual game highs for Estonia men's national volleyball players, with competitive, official and all-game filters.",
      },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(gameHighsOptions()),
      context.queryClient.ensureQueryData(matchTeamTotalsOptions()),
    ]),
  component: GameHighsPage,
  errorComponent: GameHighsError,
});

function GameHighsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl uppercase italic">Data unavailable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "Could not reach the database."}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-estonia-dark px-4 py-2 text-sm font-medium text-white hover:bg-estonia-blue"
      >
        Try again
      </button>
    </div>
  );
}

const TEAM_HIGHS_EXCLUDED_MATCH_IDS = new Set<number>([478]);

function GameHighsPage() {
  const { t, i18n } = useTranslation();
  const { data } = useSuspenseQuery(gameHighsOptions());
  const { data: teamTotalRows } = useSuspenseQuery(matchTeamTotalsOptions());
  const teamTotalsByMatch = useMemo(() => {
    const byMatch = new Map<number, Map<string, number>>();
    for (const row of teamTotalRows) {
      const stats = byMatch.get(row.matchId) ?? new Map<string, number>();
      stats.set(row.statField, row.teamTotal);
      byMatch.set(row.matchId, stats);
    }
    return byMatch;
  }, [teamTotalRows]);
  const [viewMode, setViewMode] = useState<"PLAYERS" | "TEAM">("PLAYERS");
  const [selectedPosition, setSelectedPosition] = useState<string>("ALL");
  const [matchType, setMatchType] = useState<"ALL" | "OFFICIAL" | "COMPETITIVE" | "NON_OFFICIAL">(
    "OFFICIAL",
  );
  const [matchLengthFilter, setMatchLengthFilter] = useState<3 | 4 | 5>(5);
  const [selectedYear, setSelectedYear] = useState<string[]>(["all"]);
  const [selectedCompetition, setSelectedCompetition] = useState<string[]>(["all"]);
  const [selectedOpponent, setSelectedOpponent] = useState<string[]>(["all"]);
  const [expandedPlayerMetric, setExpandedPlayerMetric] = useState<string | null>(null);
  const [expandedTeamMetric, setExpandedTeamMetric] = useState<string | null>(null);

  const positions = useMemo(() => ["ALL", ...positionOrder], []);
  const currentLanguage = i18n.language?.toLowerCase() ?? "et";
  const isEstonian = currentLanguage.startsWith("et");

  const getLocalizedOpponent = useCallback(
    (row: GameHighRow) => (isEstonian ? row.opponent : (row.opponentEn ?? row.opponent)),
    [isEstonian],
  );

  const getLocalizedCompetition = useCallback(
    (row: GameHighRow) => (isEstonian ? row.competition : (row.competitionEn ?? row.competition)),
    [isEstonian],
  );

  const matchTypeFilteredRows = useMemo(() => {
    const preferredStatsVersion = matchType === "OFFICIAL" ? "AM" : "ALL";
    const byAppearance = new Map<number, GameHighRow>();

    data.forEach((row) => {
      const matchesType = (() => {
        switch (matchType) {
          case "OFFICIAL":
            return row.am === true;
          case "COMPETITIVE":
            return row.vm === true;
          case "NON_OFFICIAL":
            return row.mam === true;
          default:
            return true;
        }
      })();

      if (!matchesType) {
        return;
      }

      if (row.matchSetCount > matchLengthFilter) {
        return;
      }

      const existing = byAppearance.get(row.appearanceId);
      if (!existing) {
        byAppearance.set(row.appearanceId, row);
        return;
      }

      const choosePreferred = () => {
        if (
          row.statsVersion === preferredStatsVersion &&
          existing.statsVersion !== preferredStatsVersion
        ) {
          return true;
        }

        if (existing.statsVersion === preferredStatsVersion) {
          return false;
        }

        if (preferredStatsVersion === "ALL") {
          return row.statsVersion === "ALL" && existing.statsVersion === "AM";
        }

        if (preferredStatsVersion === "AM") {
          return row.statsVersion === "AM" && existing.statsVersion === "ALL";
        }

        return false;
      };

      if (choosePreferred()) {
        byAppearance.set(row.appearanceId, row);
      }
    });

    return Array.from(byAppearance.values());
  }, [data, matchType, matchLengthFilter]);

  const viewFilteredRows = useMemo(() => {
    if (viewMode === "TEAM") {
      return matchTypeFilteredRows;
    }

    return matchTypeFilteredRows.filter((row) => {
      if (selectedPosition === "ALL") {
        return true;
      }

      return row.position === selectedPosition;
    });
  }, [matchTypeFilteredRows, selectedPosition, viewMode]);

  const yearOptions = useMemo(() => {
    const values = new Set<string>();

    viewFilteredRows.forEach((row) => {
      const localizedCompetition = getLocalizedCompetition(row);
      const localizedOpponent = getLocalizedOpponent(row);

      if (
        !selectedCompetition.includes("all") &&
        localizedCompetition &&
        !selectedCompetition.includes(localizedCompetition)
      )
        return;
      if (
        !selectedOpponent.includes("all") &&
        localizedOpponent &&
        !selectedOpponent.includes(localizedOpponent)
      )
        return;

      values.add(new Date(row.matchDate).getFullYear().toString());
    });

    return [...values].sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
  }, [
    viewFilteredRows,
    selectedCompetition,
    selectedOpponent,
    getLocalizedCompetition,
    getLocalizedOpponent,
  ]);

  const competitionOptions = useMemo(() => {
    const values = new Set<string>();

    viewFilteredRows.forEach((row) => {
      const localizedCompetition = getLocalizedCompetition(row);
      const localizedOpponent = getLocalizedOpponent(row);

      if (!selectedYear.includes("all")) {
        const year = new Date(row.matchDate).getFullYear().toString();
        if (!selectedYear.includes(year)) return;
      }
      if (
        !selectedOpponent.includes("all") &&
        localizedOpponent &&
        !selectedOpponent.includes(localizedOpponent)
      )
        return;

      if (localizedCompetition) values.add(localizedCompetition);
    });

    return [...values].sort((a, b) => a.localeCompare(b));
  }, [
    viewFilteredRows,
    selectedYear,
    selectedOpponent,
    getLocalizedCompetition,
    getLocalizedOpponent,
  ]);

  const opponentOptions = useMemo(() => {
    const values = new Set<string>();

    viewFilteredRows.forEach((row) => {
      const localizedCompetition = getLocalizedCompetition(row);
      const localizedOpponent = getLocalizedOpponent(row);

      if (!selectedYear.includes("all")) {
        const year = new Date(row.matchDate).getFullYear().toString();
        if (!selectedYear.includes(year)) return;
      }
      if (
        !selectedCompetition.includes("all") &&
        localizedCompetition &&
        !selectedCompetition.includes(localizedCompetition)
      )
        return;

      if (localizedOpponent) values.add(localizedOpponent);
    });

    return [...values].sort((a, b) => a.localeCompare(b));
  }, [
    viewFilteredRows,
    selectedYear,
    selectedCompetition,
    getLocalizedCompetition,
    getLocalizedOpponent,
  ]);

  const playerFilteredRows = useMemo(() => {
    const filtered = viewFilteredRows.filter((row) => {
      const localizedCompetition = getLocalizedCompetition(row);
      const localizedOpponent = getLocalizedOpponent(row);

      if (!selectedYear.includes("all") && selectedYear.length > 0) {
        const year = new Date(row.matchDate).getFullYear().toString();
        if (!selectedYear.includes(year)) return false;
      }

      if (!selectedCompetition.includes("all") && selectedCompetition.length > 0) {
        if (!localizedCompetition || !selectedCompetition.includes(localizedCompetition))
          return false;
      }

      if (!selectedOpponent.includes("all") && selectedOpponent.length > 0) {
        if (!localizedOpponent || !selectedOpponent.includes(localizedOpponent)) return false;
      }

      return true;
    });

    return filtered;
  }, [
    viewFilteredRows,
    selectedYear,
    selectedCompetition,
    selectedOpponent,
    getLocalizedCompetition,
    getLocalizedOpponent,
  ]);

  const categoryLabel = useMemo<Record<GameHighCategory, string>>(
    () => ({
      pointsPerGame: t("gameHighs.categories.pointsInMatch"),
      plusMinusBest: t("gameHighs.categories.plusMinusBestInMatch"),
      plusMinusWorst: t("gameHighs.categories.plusMinusWorstInMatch"),
      serveTotal: t("gameHighs.categories.servesInMatch"),
      serveAces: t("gameHighs.categories.acesInMatch"),
      serveErrorsMost: t("gameHighs.categories.serveMistakesMostInMatch"),
      serveErrorsLeast: t("gameHighs.categories.serveMistakesLeastInMatch"),
      receptionTotal: t("gameHighs.categories.receptionsInMatch"),
      receptionErrors: t("gameHighs.categories.receptionMistakesMostInMatch"),
      receptionErrorsLeast: t("gameHighs.categories.receptionMistakesLeastInMatch"),
      receptionPositivePctBest: t("gameHighs.categories.receptionPctBestInMatch"),
      receptionPositivePctWorst: t("gameHighs.categories.receptionPctWorstInMatch"),
      receptionExcellentPctBest: t("gameHighs.categories.receptionIdealPctBestInMatch"),
      receptionExcellentPctWorst: t("gameHighs.categories.receptionIdealPctWorstInMatch"),
      attackTotal: t("gameHighs.categories.attacksInMatch"),
      attackErrors: t("gameHighs.categories.attackOutInMatch"),
      attackBlocked: t("gameHighs.categories.attackBlockedInMatch"),
      attackKills: t("gameHighs.categories.attackSuccessfulInMatch"),
      attackKillPctBest: t("gameHighs.categories.attackPctBestInMatch"),
      attackKillPctWorst: t("gameHighs.categories.attackPctWorstInMatch"),
      attackEfficiencyBest: t("gameHighs.categories.attackEfficiencyBestInMatch"),
      attackEfficiencyWorst: t("gameHighs.categories.attackEfficiencyWorstInMatch"),
      blockPoints: t("gameHighs.categories.blocksInMatch"),
    }),
    [t],
  );

  const playerMetrics = useMemo(
    () =>
      [
        "pointsPerGame",
        "plusMinusBest",
        "plusMinusWorst",
        "blockPoints",
        "serveTotal",
        "serveAces",
        "serveErrorsMost",
        "serveErrorsLeast",
        "bestAceErrorRatio",
        "receptionTotal",
        "receptionErrors",
        "receptionErrorsLeast",
        "receptionPositivePctBest",
        "receptionPositivePctWorst",
        "receptionExcellentPctBest",
        "receptionExcellentPctWorst",
        "attackTotal",
        "attackErrors",
        "attackBlocked",
        "attackKills",
        "attackKillPctBest",
        "attackKillPctWorst",
        "attackEfficiencyBest",
        "attackEfficiencyWorst",
      ] as const,
    [],
  );

  const playerGameHighRows = useMemo(() => {
    type PlayerMetricKey = (typeof playerMetrics)[number];

    const metricLabel: Record<PlayerMetricKey, string> = {
      pointsPerGame: categoryLabel.pointsPerGame,
      plusMinusBest: categoryLabel.plusMinusBest,
      plusMinusWorst: categoryLabel.plusMinusWorst,
      serveTotal: categoryLabel.serveTotal,
      serveAces: categoryLabel.serveAces,
      serveErrorsMost: categoryLabel.serveErrorsMost,
      serveErrorsLeast: categoryLabel.serveErrorsLeast,
      bestAceErrorRatio: isEstonian ? "Ässade-vigade suhe" : "Ace to Error Ratio",
      receptionTotal: categoryLabel.receptionTotal,
      receptionErrors: categoryLabel.receptionErrors,
      receptionErrorsLeast: categoryLabel.receptionErrorsLeast,
      receptionPositivePctBest: categoryLabel.receptionPositivePctBest,
      receptionPositivePctWorst: categoryLabel.receptionPositivePctWorst,
      receptionExcellentPctBest: categoryLabel.receptionExcellentPctBest,
      receptionExcellentPctWorst: categoryLabel.receptionExcellentPctWorst,
      attackTotal: categoryLabel.attackTotal,
      attackErrors: categoryLabel.attackErrors,
      attackBlocked: isEstonian ? "Rünnakud blokki" : "Attacks Blocked",
      attackKills: categoryLabel.attackKills,
      attackKillPctBest: categoryLabel.attackKillPctBest,
      attackKillPctWorst: categoryLabel.attackKillPctWorst,
      attackEfficiencyBest: categoryLabel.attackEfficiencyBest,
      attackEfficiencyWorst: categoryLabel.attackEfficiencyWorst,
      blockPoints: categoryLabel.blockPoints,
    };

    const tieBreakerDescription: Partial<Record<PlayerMetricKey, string>> = {
      pointsPerGame: isEstonian
        ? "Võrdsete punktide korral kasutatakse viigilahutajana rünnakute koguarvu. Eelistatakse väiksemat rünnakute arvu."
        : "Total Attacks is used as a tie-breaker in case of equal points.",
      serveAces: isEstonian
        ? "Võrdsete ässade korral kasutatakse viigilahutajana servi koguarvu. Eelistatakse väiksemat servide arvu."
        : "Serve Attempts is used as a tie-breaker in case of equal aces.",
      serveErrorsMost: isEstonian
        ? "Võrdsete servivigade korral kasutatakse viigilahutajana servi koguarvu. Eelistatakse väiksemat servide arvu."
        : "Serve Attempts is used as a tie-breaker in case of equal serve mistakes (most).",
      serveErrorsLeast: isEstonian
        ? "Võrdsete servivigade korral kasutatakse viigilahutajana servi koguarvu. Eelistatakse suuremat servide arvu."
        : "Serve Attempts is used as a tie-breaker in case of equal serve mistakes (least).",
      receptionErrors: isEstonian
        ? "Võrdsete vastuvõtuvigade korral eelistatakse väiksemat vastuvõttude koguarvu (R TOT)."
        : "For equal reception-error counts, fewer total receptions (R TOT) rank higher.",
      receptionErrorsLeast: isEstonian
        ? "Võrdsete vastuvõtuvigade korral eelistatakse suuremat vastuvõttude koguarvu."
        : "For equal reception-error counts, more receptions rank higher.",
      receptionPositivePctBest: isEstonian
        ? "Võrdse positiivse vastuvõtu % korral eelistatakse suuremat vastuvõttude koguarvu (R TOT). Kui ka see on võrdne, eelistatakse väiksemat vastuvõttuvigade arvu (R ERR)."
        : "For equal positive reception %, more total receptions (R TOT) rank higher. If still equal, fewer reception errors (R ERR) rank higher.",
      receptionPositivePctWorst: isEstonian
        ? "Võrdse positiivse vastuvõtu % korral eelistatakse väiksemat vastuvõttude koguarvu (R TOT). Kui ka see on võrdne, eelistatakse suuremat vastuvõttuvigade arvu (R ERR)."
        : "For equal positive reception %, fewer total receptions (R TOT) rank higher. If still equal, more reception errors (R ERR) rank higher.",
      receptionExcellentPctBest: isEstonian
        ? "Võrdse ideaalse vastuvõtu % korral eelistatakse suuremat vastuvõttude koguarvu (R TOT)."
        : "For equal ideal reception %, more total receptions (R TOT) rank higher.",
      receptionExcellentPctWorst: isEstonian
        ? "Võrdse ideaalse vastuvõtu % korral eelistatakse suuremat vastuvõttude koguarvu (R TOT)."
        : "For equal ideal reception %, more total receptions (R TOT) rank higher.",
      bestAceErrorRatio: isEstonian
        ? "Võrdse ässade-vigade suhte korral eelistatakse suuremat servide koguarvu (S TOT)."
        : "For equal ace-to-error ratios, more total serve attempts (S TOT) rank higher.",
      attackKillPctBest: isEstonian
        ? "Võrdse rünnaku % korral eelistatakse suuremat rünnakute koguarvu (A TOT)."
        : "For equal attack percentages, more total attacks (A TOT) rank higher.",
      attackKillPctWorst: isEstonian
        ? "Võrdse rünnaku % korral eelistatakse suuremat rünnakute koguarvu (A TOT)."
        : "For equal attack percentages, more total attacks (A TOT) rank higher.",
      attackEfficiencyBest: isEstonian
        ? "Võrdse rünnakuefektiivsuse korral eelistatakse suuremat rünnakute koguarvu (A TOT)."
        : "For equal attack efficiency, more total attacks (A TOT) rank higher.",
      attackEfficiencyWorst: isEstonian
        ? "Võrdse rünnakuefektiivsuse korral eelistatakse suuremat rünnakute koguarvu (A TOT)."
        : "For equal attack efficiency, more total attacks (A TOT) rank higher.",
      attackErrors: isEstonian
        ? "Võrdse rünnakuvigade arvu korral eelistatakse väiksemat rünnakute koguarvu (A TOT)."
        : "For equal out-of-bounds attacks, fewer total attacks (A TOT) rank higher.",
      attackBlocked: isEstonian
        ? "Võrdse blokeeritud rünnakute arvu korral eelistatakse väiksemat rünnakute koguarvu (A TOT)."
        : "For equal blocked attacks, fewer total attacks (A TOT) rank higher.",
      attackKills: isEstonian
        ? "Võrdse resultatiivsete rünnakute arvu korral eelistatakse väiksemat rünnakute koguarvu (A TOT)."
        : "For equal successful attacks, fewer total attacks (A TOT) rank higher.",
    };

    const receptionTieBreakers: Partial<
      Record<
        PlayerMetricKey,
        { field: "receptionTotal" | "receptionErrors"; direction: "asc" | "desc" }[]
      >
    > = {
      receptionErrors: [{ field: "receptionTotal", direction: "asc" }],
      receptionErrorsLeast: [{ field: "receptionTotal", direction: "desc" }],
      receptionPositivePctBest: [
        { field: "receptionTotal", direction: "desc" },
        { field: "receptionErrors", direction: "asc" },
      ],
      receptionPositivePctWorst: [
        { field: "receptionTotal", direction: "asc" },
        { field: "receptionErrors", direction: "desc" },
      ],
      receptionExcellentPctBest: [{ field: "receptionTotal", direction: "desc" }],
      receptionExcellentPctWorst: [{ field: "receptionTotal", direction: "desc" }],
    };

    const isSameDisplayedRank = (
      metric: PlayerMetricKey,
      current: GameHighRow,
      previous: GameHighRow,
    ) => {
      if (metric === "bestAceErrorRatio") {
        const currentRatio = (current.serveAces ?? 0) / Math.max(current.serveErrors ?? 0, 1);
        const previousRatio = (previous.serveAces ?? 0) / Math.max(previous.serveErrors ?? 0, 1);
        return (
          Math.abs(currentRatio - previousRatio) < 0.0001 &&
          (current.serveTotal ?? 0) === (previous.serveTotal ?? 0)
        );
      }

      const currentPrimary = getCategoryValue(current, metric);
      const previousPrimary = getCategoryValue(previous, metric);
      if (currentPrimary == null || previousPrimary == null) {
        return false;
      }

      if (Math.abs(currentPrimary - previousPrimary) >= 0.0001) {
        return false;
      }

      if (metric === "pointsPerGame") {
        return (
          (current.attackTotal ?? Number.MAX_SAFE_INTEGER) ===
          (previous.attackTotal ?? Number.MAX_SAFE_INTEGER)
        );
      }

      if (metric === "serveAces" || metric === "serveErrorsMost") {
        return (
          (current.serveTotal ?? Number.MAX_SAFE_INTEGER) ===
          (previous.serveTotal ?? Number.MAX_SAFE_INTEGER)
        );
      }

      if (metric === "serveErrorsLeast") {
        return (current.serveTotal ?? 0) === (previous.serveTotal ?? 0);
      }

      const tieBreakers = receptionTieBreakers[metric];
      if (tieBreakers) {
        return tieBreakers.every(({ field }) => (current[field] ?? 0) === (previous[field] ?? 0));
      }

      if (
        metric === "attackKillPctBest" ||
        metric === "attackKillPctWorst" ||
        metric === "attackEfficiencyBest" ||
        metric === "attackEfficiencyWorst" ||
        metric === "attackErrors" ||
        metric === "attackBlocked" ||
        metric === "attackKills"
      ) {
        return (current.attackTotal ?? 0) === (previous.attackTotal ?? 0);
      }

      return true;
    };

    return playerMetrics.map((metric) => {
      const ranked = [...playerFilteredRows]
        .filter((row) => {
          if (metric === "bestAceErrorRatio") {
            return (
              !row.unavailableStats.includes("serve_aces") &&
              !row.unavailableStats.includes("serve_errors") &&
              !row.unavailableStats.includes("serve_total") &&
              (row.serveAces ?? 0) > 0 &&
              (row.serveTotal ?? 0) >= 5
            );
          }

          const value = getCategoryValue(row, metric);
          if (value == null) {
            return false;
          }

          const rule = categoryRules[metric];
          if (rule.minAttemptsField && rule.minAttempts) {
            const attempts = row[rule.minAttemptsField] ?? 0;
            if (attempts < rule.minAttempts) {
              return false;
            }
          }

          return true;
        })
        .sort((left, right) => {
          if (metric === "bestAceErrorRatio") {
            const leftRatio = (left.serveAces ?? 0) / Math.max(left.serveErrors ?? 0, 1);
            const rightRatio = (right.serveAces ?? 0) / Math.max(right.serveErrors ?? 0, 1);

            if (leftRatio !== rightRatio) {
              return rightRatio - leftRatio;
            }

            if ((left.serveTotal ?? 0) !== (right.serveTotal ?? 0)) {
              return (right.serveTotal ?? 0) - (left.serveTotal ?? 0);
            }

            return new Date(right.matchDate).getTime() - new Date(left.matchDate).getTime();
          }

          const leftValue = getCategoryValue(left, metric) ?? 0;
          const rightValue = getCategoryValue(right, metric) ?? 0;
          const direction = categoryRules[metric].sortDirection ?? "desc";

          if (leftValue !== rightValue) {
            return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
          }

          if (
            metric === "attackKillPctBest" ||
            metric === "attackKillPctWorst" ||
            metric === "attackEfficiencyBest" ||
            metric === "attackEfficiencyWorst"
          ) {
            const leftAttackTotal = left.attackTotal ?? 0;
            const rightAttackTotal = right.attackTotal ?? 0;
            if (leftAttackTotal !== rightAttackTotal) {
              return rightAttackTotal - leftAttackTotal;
            }
          }

          if (metric === "attackErrors" || metric === "attackBlocked" || metric === "attackKills") {
            const leftAttackTotal = left.attackTotal ?? Number.MAX_SAFE_INTEGER;
            const rightAttackTotal = right.attackTotal ?? Number.MAX_SAFE_INTEGER;
            if (leftAttackTotal !== rightAttackTotal) {
              return leftAttackTotal - rightAttackTotal;
            }
          }

          if (metric === "pointsPerGame") {
            const leftAttackTotal = left.attackTotal ?? Number.MAX_SAFE_INTEGER;
            const rightAttackTotal = right.attackTotal ?? Number.MAX_SAFE_INTEGER;
            if (leftAttackTotal !== rightAttackTotal) {
              return leftAttackTotal - rightAttackTotal;
            }
          }

          if (metric === "serveAces" || metric === "serveErrorsMost") {
            const leftServeTotal = left.serveTotal ?? Number.MAX_SAFE_INTEGER;
            const rightServeTotal = right.serveTotal ?? Number.MAX_SAFE_INTEGER;
            if (leftServeTotal !== rightServeTotal) {
              return leftServeTotal - rightServeTotal;
            }
          }

          if (metric === "serveErrorsLeast") {
            const leftServeTotal = left.serveTotal ?? 0;
            const rightServeTotal = right.serveTotal ?? 0;
            if (leftServeTotal !== rightServeTotal) {
              return rightServeTotal - leftServeTotal;
            }
          }

          for (const { field, direction } of receptionTieBreakers[metric] ?? []) {
            const leftField = left[field] ?? 0;
            const rightField = right[field] ?? 0;
            if (leftField !== rightField) {
              return direction === "asc" ? leftField - rightField : rightField - leftField;
            }
          }

          return new Date(right.matchDate).getTime() - new Date(left.matchDate).getTime();
        });

      const topTen = ranked.slice(0, 10);
      let previousRow: GameHighRow | null = null;
      let previousRank = 1;
      const topTenWithRanks = topTen.map((row, index) => {
        const rank =
          index === 0
            ? 1
            : previousRow != null && isSameDisplayedRank(metric, row, previousRow)
              ? previousRank
              : index + 1;

        previousRow = row;
        previousRank = rank;

        return {
          rankLabel: `#${rank}`,
          name: row.name,
          playerHref: `/players/${row.playerId}`,
          position: row.position ?? t("positions.Unknown"),
          serveTotal: row.serveTotal,
          serveErrors:
            metric === "serveErrorsLeast" ? getCategoryValue(row, metric) : row.serveErrors,
          serveAces: row.serveAces,
          receptionTotal: row.receptionTotal,
          receptionErrors:
            metric === "receptionErrorsLeast" ? getCategoryValue(row, metric) : row.receptionErrors,
          receptionPositivePct: row.receptionPositivePct,
          receptionExcellentPct: row.receptionExcellentPct,
          attackTotal: row.attackTotal,
          attackErrors: row.attackErrors,
          attackBlocked: row.attackBlocked,
          attackKills: row.attackKills,
          attackKillPct: row.attackKillPct,
          attackEfficiency: row.attackEfficiency,
          value:
            metric === "bestAceErrorRatio"
              ? `${row.serveAces ?? 0} : ${row.serveErrors ?? 0}`
              : formatCategoryValue(getCategoryValue(row, metric), metric),
          opponent: getLocalizedOpponent(row),
          score: row.score,
          date: new Date(row.matchDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          competition: getLocalizedCompetition(row) ?? "—",
          matchHref: row.mam === true ? `/match/${row.matchId}/all` : `/match/${row.matchId}`,
        };
      });

      const best = topTenWithRanks[0] ?? null;
      const minAttemptsLabel = [
        "receptionPositivePctBest",
        "receptionPositivePctWorst",
        "receptionExcellentPctBest",
        "receptionExcellentPctWorst",
      ].includes(metric)
        ? isEstonian
          ? "min 10 vastuvõttu"
          : "minimum 10 receptions"
        : [
              "attackKillPctBest",
              "attackKillPctWorst",
              "attackEfficiencyBest",
              "attackEfficiencyWorst",
            ].includes(metric)
          ? isEstonian
            ? "min 10 rünnakut"
            : "minimum 10 attacks"
          : null;

      return {
        key: metric,
        metric: metricLabel[metric],
        topTenMetric:
          metric === "bestAceErrorRatio"
            ? `${metricLabel[metric]} (${isEstonian ? "min 5 servi" : "minimum 5 serves"})`
            : metric === "receptionErrorsLeast"
              ? `${metricLabel[metric]} (${isEstonian ? "min 10 vastuvõttu" : "minimum 10 receptions"})`
              : minAttemptsLabel
                ? `${metricLabel[metric]} (${minAttemptsLabel})`
                : metricLabel[metric],
        best,
        topTen: topTenWithRanks,
        tieBreakerDescription: tieBreakerDescription[metric] ?? null,
      };
    });
  }, [
    playerMetrics,
    playerFilteredRows,
    categoryLabel,
    isEstonian,
    t,
    getLocalizedCompetition,
    getLocalizedOpponent,
  ]);

  const playerSectionHeaders = {
    serveTotal: isEstonian ? "SERV" : "SERVE",
    receptionTotal: isEstonian ? "VASTUVOTT" : "RECEPTION",
    attackTotal: isEstonian ? "RUNNAK" : "ATTACKS",
  } as const;

  const playerSectionToneClass = {
    pointsPerGame: "bg-slate-50/60",
    plusMinusBest: "bg-slate-50/60",
    plusMinusWorst: "bg-slate-50/60",
    blockPoints: "bg-slate-50/60",
    serveTotal: "bg-amber-50/60",
    serveAces: "bg-amber-50/60",
    serveErrorsMost: "bg-amber-50/60",
    serveErrorsLeast: "bg-amber-50/60",
    bestAceErrorRatio: "bg-amber-50/60",
    receptionTotal: "bg-sky-50/60",
    receptionErrors: "bg-sky-50/60",
    receptionErrorsLeast: "bg-sky-50/60",
    receptionPositivePctBest: "bg-sky-50/60",
    receptionPositivePctWorst: "bg-sky-50/60",
    receptionExcellentPctBest: "bg-sky-50/60",
    receptionExcellentPctWorst: "bg-sky-50/60",
    attackTotal: "bg-rose-50/60",
    attackErrors: "bg-rose-50/60",
    attackBlocked: "bg-rose-50/60",
    attackKills: "bg-rose-50/60",
    attackKillPctBest: "bg-rose-50/60",
    attackKillPctWorst: "bg-rose-50/60",
    attackEfficiencyBest: "bg-rose-50/60",
    attackEfficiencyWorst: "bg-rose-50/60",
  } as const;

  const teamFilteredRows = useMemo(() => {
    return matchTypeFilteredRows.filter((row) => {
      if (TEAM_HIGHS_EXCLUDED_MATCH_IDS.has(row.matchId)) return false;

      const localizedCompetition = getLocalizedCompetition(row);
      const localizedOpponent = getLocalizedOpponent(row);

      if (!selectedYear.includes("all") && selectedYear.length > 0) {
        const year = new Date(row.matchDate).getFullYear().toString();
        if (!selectedYear.includes(year)) return false;
      }

      if (!selectedCompetition.includes("all") && selectedCompetition.length > 0) {
        if (!localizedCompetition || !selectedCompetition.includes(localizedCompetition))
          return false;
      }

      if (!selectedOpponent.includes("all") && selectedOpponent.length > 0) {
        if (!localizedOpponent || !selectedOpponent.includes(localizedOpponent)) return false;
      }

      return true;
    });
  }, [
    matchTypeFilteredRows,
    selectedYear,
    selectedCompetition,
    selectedOpponent,
    getLocalizedCompetition,
    getLocalizedOpponent,
  ]);

  const showAdditionalSetsInScore = matchType === "ALL" || matchType === "NON_OFFICIAL";

  const teamGameHighRows = useMemo(() => {
    type TeamMatchTotals = {
      matchId: number;
      matchDate: string;
      opponent: string;
      opponentEn: string | null;
      competition: string | null;
      competitionEn: string | null;
      score: string;
      am: boolean | null;
      mam: boolean | null;
      maxEstoniaSetPoints: number | null;
      maxSetOpponentPoints: number | null;
      additionalSetScores: string[];
      points: number;
      breakPoints: number;
      plusMinus: number;
      plusMinusCount: number;
      serveTotal: number;
      serveAces: number;
      serveErrors: number;
      receptionTotal: number;
      receptionErrors: number;
      receptionErrorsLeast: number | null;
      receptionPositiveCount: number;
      receptionExcellentCount: number;
      attackTotal: number;
      attackErrors: number;
      attackBlocked: number;
      attackKills: number;
      blockPoints: number;
      unavailableStats: Set<string>;
    };

    const teamByMatch = new Map<number, TeamMatchTotals>();

    teamFilteredRows.forEach((row) => {
      const current = teamByMatch.get(row.matchId) ?? {
        matchId: row.matchId,
        matchDate: row.matchDate,
        opponent: row.opponent,
        opponentEn: row.opponentEn,
        competition: row.competition,
        competitionEn: row.competitionEn,
        score: row.score,
        am: row.am,
        mam: row.mam,
        maxEstoniaSetPoints: row.maxEstoniaSetPoints,
        maxSetOpponentPoints: row.maxSetOpponentPoints,
        additionalSetScores: row.additionalSetScores,
        points: 0,
        breakPoints: 0,
        plusMinus: 0,
        plusMinusCount: 0,
        serveTotal: 0,
        serveAces: 0,
        serveErrors: 0,
        receptionTotal: 0,
        receptionErrors: 0,
        receptionErrorsLeast: null,
        receptionPositiveCount: 0,
        receptionExcellentCount: 0,
        attackTotal: 0,
        attackErrors: 0,
        attackBlocked: 0,
        attackKills: 0,
        blockPoints: 0,
        unavailableStats: new Set(row.unavailableStats),
      };

      current.points += row.points ?? 0;
      current.breakPoints += row.breakPoints ?? 0;
      if (row.plusMinus != null) {
        current.plusMinus += row.plusMinus;
        current.plusMinusCount += 1;
      }
      current.serveTotal += row.serveTotal ?? 0;
      current.serveAces += row.serveAces ?? 0;
      current.serveErrors += row.serveErrors ?? 0;
      current.receptionTotal += row.receptionTotal ?? 0;
      current.receptionErrors += row.receptionErrors ?? 0;
      current.attackTotal += row.attackTotal ?? 0;
      current.attackErrors += row.attackErrors ?? 0;
      current.attackBlocked += row.attackBlocked ?? 0;
      current.attackKills += row.attackKills ?? 0;
      current.blockPoints += row.blockPoints ?? 0;

      if (
        row.maxEstoniaSetPoints != null &&
        (current.maxEstoniaSetPoints == null ||
          row.maxEstoniaSetPoints > current.maxEstoniaSetPoints)
      ) {
        current.maxEstoniaSetPoints = row.maxEstoniaSetPoints;
        current.maxSetOpponentPoints = row.maxSetOpponentPoints;
      }

      if ((row.receptionTotal ?? 0) > 0 && row.receptionPositivePct != null) {
        current.receptionPositiveCount +=
          (row.receptionTotal ?? 0) * (row.receptionPositivePct / 100);
      }

      if ((row.receptionTotal ?? 0) > 0 && row.receptionExcellentPct != null) {
        current.receptionExcellentCount +=
          (row.receptionTotal ?? 0) * (row.receptionExcellentPct / 100);
      }

      teamByMatch.set(row.matchId, current);
    });

    const teamMatches = Array.from(teamByMatch.values()).map((match) => {
      const teamTotals = teamTotalsByMatch.get(match.matchId);
      const unavailable = new Set(match.unavailableStats);
      if (match.unavailableStats.size > 0) {
        TEAM_TOTAL_STAT_FIELDS.forEach((field) => {
          if (!teamTotals?.has(field)) unavailable.add(field);
        });
      }

      const value = (field: string, playerSum: number) => teamTotals?.get(field) ?? playerSum;
      const points = value("points", match.points);
      const breakPoints = value("break_points", match.breakPoints);
      const plusMinus =
        teamTotals?.get("plus_minus") ?? (match.plusMinusCount > 0 ? match.plusMinus : null);
      const serveTotal = value("serve_total", match.serveTotal);
      const serveAces = value("serve_aces", match.serveAces);
      const serveErrors = value("serve_errors", match.serveErrors);
      const receptionTotal = value("reception_total", match.receptionTotal);
      const receptionErrors = value("reception_errors", match.receptionErrors);
      const attackTotal = value("attack_total", match.attackTotal);
      const attackErrors = value("attack_errors", match.attackErrors);
      const attackBlocked = value("attack_blocked", match.attackBlocked);
      const attackKills = value("attack_kills", match.attackKills);
      const blockPoints = value("block_points", match.blockPoints);

      const derivedReceptionPositivePct =
        match.receptionTotal > 0
          ? (match.receptionPositiveCount / match.receptionTotal) * 100
          : null;
      const derivedReceptionExcellentPct =
        match.receptionTotal > 0
          ? (match.receptionExcellentCount / match.receptionTotal) * 100
          : null;

      const receptionPositivePct =
        teamTotals?.get("reception_positive_pct") ??
        (unavailable.has("reception_total") || unavailable.has("reception_positive_pct")
          ? null
          : derivedReceptionPositivePct);
      const receptionExcellentPct =
        teamTotals?.get("reception_excellent_pct") ??
        (unavailable.has("reception_total") || unavailable.has("reception_excellent_pct")
          ? null
          : derivedReceptionExcellentPct);
      const attackKillPct =
        teamTotals?.get("attack_kill_pct") ??
        (!unavailable.has("attack_total") && !unavailable.has("attack_kills") && attackTotal > 0
          ? (attackKills / attackTotal) * 100
          : null);
      const attackEfficiency =
        !unavailable.has("attack_total") &&
        !unavailable.has("attack_kills") &&
        !unavailable.has("attack_blocked") &&
        !unavailable.has("attack_errors") &&
        attackTotal > 0
          ? ((attackKills - attackBlocked - attackErrors) / attackTotal) * 100
          : null;

      return {
        ...match,
        score:
          showAdditionalSetsInScore && match.additionalSetScores.length > 0
            ? `${match.score} (${match.additionalSetScores.join(", ")})`
            : match.score,
        points,
        breakPoints,
        plusMinus,
        serveTotal,
        serveAces,
        serveErrors,
        receptionTotal,
        receptionErrors,
        attackTotal,
        attackErrors,
        attackBlocked,
        attackKills,
        blockPoints,
        receptionErrorsLeast:
          unavailable.has("reception_total") ||
          unavailable.has("reception_errors") ||
          receptionTotal < 10
            ? null
            : receptionErrors,
        receptionPositivePct,
        receptionExcellentPct,
        attackKillPct,
        attackEfficiency,
        unavailableStats: unavailable,
      };
    });

    const metrics = [
      { key: "points", label: t("players.statsField.points"), direction: "desc" as const },
      {
        key: "maxEstoniaSetPoints",
        label: isEstonian ? "Kõige rohkem punkte geimis" : "Most points in a set",
        direction: "desc" as const,
      },
      {
        key: "breakPoints",
        label: t("players.statsField.breakPoints"),
        direction: "desc" as const,
      },
      {
        key: "plusMinus",
        label: isEstonian ? "+/- (parim)" : "+/- (best)",
        direction: "desc" as const,
      },
      {
        key: "plusMinus",
        label: isEstonian ? "+/- (halvim)" : "+/- (worst)",
        direction: "asc" as const,
      },
      {
        key: "blockPoints",
        label: isEstonian ? "Blokid" : "Blocks",
        direction: "desc" as const,
      },
      {
        key: "serveTotal",
        label: isEstonian ? "Servid" : "Serves",
        direction: "desc" as const,
      },
      {
        key: "serveAces",
        label: isEstonian ? "Ässad" : "Aces",
        direction: "desc" as const,
      },
      {
        key: "serveErrors",
        label: isEstonian ? "Servivead" : "Serve Errors",
        direction: "desc" as const,
      },
      {
        key: "bestAceErrorRatio",
        label: isEstonian ? "Ässade-vigade suhe" : "Ace to Error Ratio",
        direction: "desc" as const,
      },
      {
        key: "receptionTotal",
        label: isEstonian ? "Vastuvõtud" : "Receptions",
        direction: "desc" as const,
      },
      {
        key: "receptionErrors",
        label: t("gameHighs.categories.receptionMistakesMostInMatch"),
        direction: "desc" as const,
      },
      {
        key: "receptionErrorsLeast",
        label: t("gameHighs.categories.receptionMistakesLeastInMatch"),
        direction: "asc" as const,
      },
      {
        key: "receptionPositivePct",
        label: isEstonian ? "Vastuvõtu % (parim)" : "Reception % (best)",
        direction: "desc" as const,
      },
      {
        key: "receptionPositivePct",
        label: isEstonian ? "Vastuvõtu % (halvim)" : "Reception % (worst)",
        direction: "asc" as const,
      },
      {
        key: "receptionExcellentPct",
        label: isEstonian ? "Ideaalse vastuvõtu % (parim)" : "Ideal Reception % (best)",
        direction: "desc" as const,
      },
      {
        key: "receptionExcellentPct",
        label: isEstonian ? "Ideaalse vastuvõtu % (halvim)" : "Ideal Reception % (worst)",
        direction: "asc" as const,
      },
      {
        key: "attackTotal",
        label: isEstonian ? "Rünnakud" : "Attacks",
        direction: "desc" as const,
      },
      {
        key: "attackErrors",
        label: isEstonian ? "Rünnakud auti" : "Attacks Out of Bounds",
        direction: "desc" as const,
      },
      {
        key: "attackBlocked",
        label: isEstonian ? "Rünnakud blokki" : "Attacks Blocked",
        direction: "desc" as const,
      },
      {
        key: "attackKills",
        label: isEstonian ? "Resultatiivsed rünnakud" : "Successful Attacks",
        direction: "desc" as const,
      },
      {
        key: "attackKillPct",
        label: isEstonian ? "Rünnaku % (parim)" : "Attack % (best)",
        direction: "desc" as const,
      },
      {
        key: "attackKillPct",
        label: isEstonian ? "Rünnaku % (halvim)" : "Attack % (worst)",
        direction: "asc" as const,
      },
      {
        key: "attackEfficiency",
        label: isEstonian ? "Rünnakuefektiivsus (parim)" : "Attack Efficiency (best)",
        direction: "desc" as const,
      },
      {
        key: "attackEfficiency",
        label: isEstonian ? "Rünnakuefektiivsus (halvim)" : "Attack Efficiency (worst)",
        direction: "asc" as const,
      },
    ] as const;

    const formatTeamValue = (value: number | null, key: string) => {
      if (value == null) return "—";

      if (
        key === "receptionPositivePct" ||
        key === "receptionExcellentPct" ||
        key === "attackKillPct" ||
        key === "attackEfficiency"
      ) {
        return `${Math.round(value)}%`;
      }

      return Number.isInteger(value) ? String(value) : value.toFixed(2);
    };

    return metrics.map((metric) => {
      const ranked = [...teamMatches]
        .filter((match) => {
          if (metric.key === "receptionErrorsLeast") {
            return (
              !match.unavailableStats.has("reception_total") &&
              !match.unavailableStats.has("reception_errors") &&
              match.receptionTotal >= 10
            );
          }

          if (metric.key === "bestAceErrorRatio") {
            return (
              !match.unavailableStats.has("serve_aces") &&
              !match.unavailableStats.has("serve_errors") &&
              !match.unavailableStats.has("serve_total") &&
              match.serveAces > 0
            );
          }

          if (metric.key === "receptionPositivePct" || metric.key === "receptionExcellentPct") {
            const receptionPctField =
              metric.key === "receptionPositivePct"
                ? "reception_positive_pct"
                : "reception_excellent_pct";
            return (
              !match.unavailableStats.has("reception_total") &&
              !match.unavailableStats.has(receptionPctField) &&
              match[metric.key] != null
            );
          }

          if (metric.key === "attackKillPct" || metric.key === "attackEfficiency") {
            return (
              !match.unavailableStats.has("attack_total") &&
              !match.unavailableStats.has("attack_kills") &&
              (metric.key !== "attackEfficiency" ||
                (!match.unavailableStats.has("attack_blocked") &&
                  !match.unavailableStats.has("attack_errors"))) &&
              match.attackTotal >= 10
            );
          }

          const unavailableFieldByMetric: Record<string, string> = {
            points: "points",
            breakPoints: "break_points",
            plusMinus: "plus_minus",
            blockPoints: "block_points",
            serveTotal: "serve_total",
            serveAces: "serve_aces",
            serveErrors: "serve_errors",
            receptionTotal: "reception_total",
            receptionErrors: "reception_errors",
            attackTotal: "attack_total",
            attackErrors: "attack_errors",
            attackBlocked: "attack_blocked",
            attackKills: "attack_kills",
          };
          const unavailableField = unavailableFieldByMetric[metric.key];
          if (unavailableField && match.unavailableStats.has(unavailableField)) return false;

          const value = match[metric.key as keyof typeof match] as number | null | undefined;
          return value != null;
        })
        .sort((left, right) => {
          if (metric.key === "bestAceErrorRatio") {
            const leftRatio = left.serveAces / Math.max(left.serveErrors, 1);
            const rightRatio = right.serveAces / Math.max(right.serveErrors, 1);

            if (leftRatio !== rightRatio) {
              return rightRatio - leftRatio;
            }

            if (left.serveTotal !== right.serveTotal) {
              return right.serveTotal - left.serveTotal;
            }

            return new Date(right.matchDate).getTime() - new Date(left.matchDate).getTime();
          }

          const leftValue = left[metric.key as keyof typeof left] as number | null | undefined;
          const rightValue = right[metric.key as keyof typeof right] as number | null | undefined;

          if ((leftValue ?? 0) !== (rightValue ?? 0)) {
            return metric.direction === "asc"
              ? (leftValue ?? 0) - (rightValue ?? 0)
              : (rightValue ?? 0) - (leftValue ?? 0);
          }

          if (metric.key === "receptionErrorsLeast") {
            if (left.receptionTotal !== right.receptionTotal) {
              return right.receptionTotal - left.receptionTotal;
            }
          }

          if (metric.key === "attackKillPct" || metric.key === "attackEfficiency") {
            if (left.attackTotal !== right.attackTotal) {
              return right.attackTotal - left.attackTotal;
            }
          }

          if (
            metric.key === "attackErrors" ||
            metric.key === "attackBlocked" ||
            metric.key === "attackKills"
          ) {
            if (left.attackTotal !== right.attackTotal) {
              return left.attackTotal - right.attackTotal;
            }
          }

          if (metric.key === "points") {
            if (left.attackTotal !== right.attackTotal) {
              return left.attackTotal - right.attackTotal;
            }
          }

          if (metric.key === "serveAces" || metric.key === "serveErrors") {
            if (left.serveTotal !== right.serveTotal) {
              return left.serveTotal - right.serveTotal;
            }
          }

          return new Date(right.matchDate).getTime() - new Date(left.matchDate).getTime();
        });

      const best = ranked[0] ?? null;
      const topTen = ranked.slice(0, 10);

      let previousComparableValue: number | null = null;
      let previousTeamMatch: (typeof topTen)[number] | null = null;
      let previousRank = 1;
      const topTenWithRanks = topTen.map((match, index) => {
        const currentComparableValue =
          metric.key === "bestAceErrorRatio"
            ? match.serveAces / Math.max(match.serveErrors, 1)
            : ((match[metric.key as keyof typeof match] as number | null | undefined) ?? 0);

        const samePrimaryValue =
          previousComparableValue != null &&
          Math.abs(currentComparableValue - previousComparableValue) < 0.0001;
        let isSameRank = samePrimaryValue;
        if (metric.key === "receptionErrorsLeast") {
          isSameRank =
            previousTeamMatch?.receptionErrorsLeast === match.receptionErrorsLeast &&
            previousTeamMatch?.receptionTotal === match.receptionTotal;
        } else if (metric.key === "bestAceErrorRatio") {
          isSameRank = isSameRank && previousTeamMatch?.serveTotal === match.serveTotal;
        } else if (
          metric.key === "attackKillPct" ||
          metric.key === "attackEfficiency" ||
          metric.key === "attackErrors" ||
          metric.key === "attackBlocked" ||
          metric.key === "attackKills" ||
          metric.key === "points"
        ) {
          isSameRank = isSameRank && previousTeamMatch?.attackTotal === match.attackTotal;
        } else if (metric.key === "serveAces" || metric.key === "serveErrors") {
          isSameRank = isSameRank && previousTeamMatch?.serveTotal === match.serveTotal;
        }
        const rank = index === 0 ? 1 : isSameRank ? previousRank : index + 1;

        previousComparableValue = currentComparableValue;
        previousTeamMatch = match;
        previousRank = rank;

        return {
          rankLabel: `#${rank}`,
          value:
            metric.key === "bestAceErrorRatio"
              ? `${match.serveAces} : ${match.serveErrors}`
              : formatTeamValue(
                  (match[metric.key as keyof typeof match] as number | null) ?? null,
                  metric.key,
                ),
          opponent: isEstonian ? match.opponent : (match.opponentEn ?? match.opponent),
          score: match.score,
          setScore:
            metric.key === "maxEstoniaSetPoints" &&
            match.maxEstoniaSetPoints != null &&
            match.maxSetOpponentPoints != null
              ? `${match.maxEstoniaSetPoints}-${match.maxSetOpponentPoints}`
              : null,
          setWon:
            metric.key === "maxEstoniaSetPoints" &&
            match.maxEstoniaSetPoints != null &&
            match.maxSetOpponentPoints != null
              ? match.maxEstoniaSetPoints > match.maxSetOpponentPoints
              : null,
          date: new Date(match.matchDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          competition: isEstonian
            ? (match.competition ?? "—")
            : (match.competitionEn ?? match.competition ?? "—"),
          receptionTotal: match.receptionTotal,
          receptionErrors: match.receptionErrorsLeast ?? match.receptionErrors,
          receptionPositivePct: match.receptionPositivePct,
          receptionExcellentPct: match.receptionExcellentPct,
          serveTotal: match.serveTotal,
          serveErrors: match.serveErrors,
          serveAces: match.serveAces,
          attackTotal: match.attackTotal,
          attackErrors: match.attackErrors,
          attackBlocked: match.attackBlocked,
          attackKills: match.attackKills,
          attackKillPct: match.attackKillPct,
          attackEfficiency: match.attackEfficiency,
          matchHref: match.mam === true ? `/match/${match.matchId}/all` : `/match/${match.matchId}`,
        };
      });

      const minAttemptsLabel =
        metric.key === "attackKillPct" || metric.key === "attackEfficiency"
          ? isEstonian
            ? "min 10 rünnakut"
            : "minimum 10 attacks"
          : null;
      let tieBreakerDescription: string | null = null;
      if (metric.key === "receptionErrorsLeast") {
        tieBreakerDescription = isEstonian
          ? "Võrdsete vastuvõtuvigade korral eelistatakse suuremat vastuvõttude arvu."
          : "For equal reception-error counts, more receptions rank higher.";
      } else if (metric.key === "bestAceErrorRatio") {
        tieBreakerDescription = isEstonian
          ? "Võrdse ässade-vigade suhte korral eelistatakse suuremat servide koguarvu (S TOT)."
          : "For equal ace-to-error ratios, more total serve attempts (S TOT) rank higher.";
      } else if (metric.key === "attackKillPct") {
        tieBreakerDescription = isEstonian
          ? "Võrdse rünnaku % korral eelistatakse suuremat rünnakute koguarvu (A TOT)."
          : "For equal attack percentages, more total attacks (A TOT) rank higher.";
      } else if (metric.key === "attackEfficiency") {
        tieBreakerDescription = isEstonian
          ? "Võrdse rünnakuefektiivsuse korral eelistatakse suuremat rünnakute koguarvu (A TOT)."
          : "For equal attack efficiency, more total attacks (A TOT) rank higher.";
      } else if (metric.key === "attackErrors") {
        tieBreakerDescription = isEstonian
          ? "Võrdse rünnakuvigade arvu korral eelistatakse väiksemat rünnakute koguarvu (A TOT)."
          : "For equal out-of-bounds attacks, fewer total attacks (A TOT) rank higher.";
      } else if (metric.key === "attackBlocked") {
        tieBreakerDescription = isEstonian
          ? "Võrdse blokeeritud rünnakute arvu korral eelistatakse väiksemat rünnakute koguarvu (A TOT)."
          : "For equal blocked attacks, fewer total attacks (A TOT) rank higher.";
      } else if (metric.key === "points") {
        tieBreakerDescription = isEstonian
          ? "Võrdse punktisumma korral eelistatakse väiksemat rünnakute koguarvu (A TOT)."
          : "For equal points, fewer total attacks (A TOT) rank higher.";
      } else if (metric.key === "serveAces") {
        tieBreakerDescription = isEstonian
          ? "Võrdse ässade arvu korral eelistatakse väiksemat servide koguarvu (S TOT)."
          : "For equal aces, fewer total serves (S TOT) rank higher.";
      } else if (metric.key === "serveErrors") {
        tieBreakerDescription = isEstonian
          ? "Võrdse servivigade arvu korral eelistatakse väiksemat servide koguarvu (S TOT)."
          : "For equal serve errors, fewer total serves (S TOT) rank higher.";
      } else if (metric.key === "attackKills") {
        tieBreakerDescription = isEstonian
          ? "Võrdse resultatiivsete rünnakute arvu korral eelistatakse väiksemat rünnakute koguarvu (A TOT)."
          : "For equal successful attacks, fewer total attacks (A TOT) rank higher.";
      }

      return {
        key: metric.key,
        rowId: `${metric.key}-${metric.direction}`,
        metric: metric.label,
        topTenMetric: `${metric.label}${minAttemptsLabel ? ` (${minAttemptsLabel})` : ""}`,
        tieBreakerDescription,
        value:
          metric.key === "bestAceErrorRatio"
            ? best
              ? `${best.serveAces} : ${best.serveErrors}`
              : "—"
            : formatTeamValue(
                best ? ((best[metric.key as keyof typeof best] as number | null) ?? null) : null,
                metric.key,
              ),
        opponent: best ? (isEstonian ? best.opponent : (best.opponentEn ?? best.opponent)) : "—",
        score: best?.score ?? "—",
        date: best
          ? new Date(best.matchDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—",
        competition: best
          ? isEstonian
            ? (best.competition ?? "—")
            : (best.competitionEn ?? best.competition ?? "—")
          : "—",
        matchHref: best
          ? best.mam === true
            ? `/match/${best.matchId}/all`
            : `/match/${best.matchId}`
          : null,
        topTen: topTenWithRanks,
      };
    });
  }, [teamFilteredRows, t, isEstonian, showAdditionalSetsInScore, teamTotalsByMatch]);

  const positionButtonsDisabled = viewMode === "TEAM";

  const teamSectionHeaders = {
    serveTotal: isEstonian ? "SERV" : "SERVE",
    receptionTotal: isEstonian ? "VASTUVOTT" : "RECEPTION",
    attackTotal: isEstonian ? "RUNNAK" : "ATTACKS",
  } as const;

  const teamSectionToneClass: Record<string, string> = {
    points: "bg-slate-50/60",
    maxEstoniaSetPoints: "bg-slate-50/60",
    breakPoints: "bg-slate-50/60",
    plusMinus: "bg-slate-50/60",
    blockPoints: "bg-slate-50/60",
    serveTotal: "bg-amber-50/60",
    serveAces: "bg-amber-50/60",
    serveErrors: "bg-amber-50/60",
    bestAceErrorRatio: "bg-amber-50/60",
    receptionTotal: "bg-sky-50/60",
    receptionErrors: "bg-sky-50/60",
    receptionErrorsLeast: "bg-sky-50/60",
    receptionPositivePct: "bg-sky-50/60",
    receptionExcellentPct: "bg-sky-50/60",
    attackTotal: "bg-rose-50/60",
    attackErrors: "bg-rose-50/60",
    attackBlocked: "bg-rose-50/60",
    attackKills: "bg-rose-50/60",
    attackKillPct: "bg-rose-50/60",
    attackEfficiency: "bg-rose-50/60",
  };

  useEffect(() => {
    setExpandedPlayerMetric(null);
    setExpandedTeamMetric(null);
  }, [
    viewMode,
    selectedPosition,
    matchType,
    matchLengthFilter,
    selectedYear,
    selectedCompetition,
    selectedOpponent,
  ]);

  return (
    <main className="mx-auto w-full max-w-[1400px] px-6 py-10 text-slate-900">
      <div className="mb-6 rounded-2xl bg-estonia-dark p-6 text-white shadow-sm md:p-8">
        <div className="mx-auto mb-5 grid w-full max-w-[520px] grid-cols-2 gap-2">
          {[
            {
              value: "PLAYERS",
              label: isEstonian ? "Mängu maksimumid mängijate lõikes" : "Game Highs by Players",
            },
            {
              value: "TEAM",
              label: isEstonian ? "Mängu maksimumid koondise lõikes" : "Game Highs by Team",
            },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setViewMode(option.value as typeof viewMode)}
              className={`h-10 w-full rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                viewMode === option.value
                  ? "border-estonia-blue bg-estonia-blue text-white"
                  : "border-white/30 bg-white/10 text-white/90 hover:bg-white/20"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="text-center">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
              {t("gameHighs.filters.matchType")}
            </div>
            <div className="mx-auto grid w-full max-w-[440px] grid-cols-2 gap-2">
              {[
                { value: "OFFICIAL", label: t("gameHighs.filters.official") },
                { value: "COMPETITIVE", label: t("gameHighs.filters.competitive") },
                { value: "NON_OFFICIAL", label: t("gameHighs.filters.nonCompetitive") },
                { value: "ALL", label: t("gameHighs.filters.all") },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMatchType(option.value as typeof matchType)}
                  className={`h-10 w-full rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    matchType === option.value
                      ? "border-estonia-blue bg-estonia-blue text-white"
                      : "border-white/30 bg-white/10 text-white/90 hover:bg-white/20"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
              {t("gameHighs.filters.position")}
            </div>
            <div
              className={`mx-auto grid w-full max-w-[440px] grid-cols-3 gap-2 ${positionButtonsDisabled ? "opacity-45" : ""}`}
            >
              {positions.map((position) => (
                <button
                  key={position}
                  type="button"
                  disabled={positionButtonsDisabled}
                  onClick={() => setSelectedPosition(position)}
                  className={`h-10 w-full rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    selectedPosition === position
                      ? "border-estonia-blue bg-estonia-blue text-white"
                      : "border-white/30 bg-white/10 text-white/90 hover:bg-white/20"
                  }`}
                >
                  {position === "ALL" ? "ALL" : position}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
              {isEstonian ? "Mängu pikkus" : "Match length"}
            </div>
            <div className="mx-auto grid w-full max-w-[440px] grid-cols-3 gap-2">
              {[
                { value: 3 as const, label: isEstonian ? "3 geimi" : "3 Sets" },
                { value: 4 as const, label: isEstonian ? "4 geimi" : "4 Sets" },
                { value: 5 as const, label: isEstonian ? "5 geimi" : "5 Sets" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMatchLengthFilter(option.value)}
                  className={`h-10 w-full rounded-md border px-3 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                    matchLengthFilter === option.value
                      ? "border-estonia-blue bg-estonia-blue text-white"
                      : "border-white/30 bg-white/10 text-white/90 hover:bg-white/20"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <div>
            <span className="sr-only">{t("players.statsFilter.year")}</span>
            <MultiSelect
              options={yearOptions.map((y) => ({ value: y, label: y }))}
              value={selectedYear}
              onChange={(v) =>
                setSelectedYear(v.length === 0 ? ["all"] : v.includes("all") ? ["all"] : v)
              }
              placeholder={t("players.statsFilter.allYears")}
              className="w-full"
            />
          </div>

          <div>
            <span className="sr-only">{t("players.statsFilter.competition")}</span>
            <MultiSelect
              options={competitionOptions.map((c) => ({ value: c, label: c }))}
              value={selectedCompetition}
              onChange={(v) =>
                setSelectedCompetition(v.length === 0 ? ["all"] : v.includes("all") ? ["all"] : v)
              }
              placeholder={t("players.statsFilter.allCompetitions")}
              className="w-full"
            />
          </div>

          <div>
            <span className="sr-only">{t("players.statsFilter.opponent")}</span>
            <MultiSelect
              options={opponentOptions.map((o) => ({ value: o, label: o }))}
              value={selectedOpponent}
              onChange={(v) =>
                setSelectedOpponent(v.length === 0 ? ["all"] : v.includes("all") ? ["all"] : v)
              }
              placeholder={t("players.statsFilter.allOpponents")}
              className="w-full"
            />
          </div>
        </div>
      </div>
      {viewMode === "PLAYERS" && (
        <section>
          <h2 className="mb-4 text-center font-display text-2xl uppercase italic text-estonia-dark">
            {isEstonian ? "Mängijate mängu maksimumid" : "Game Highs by Players"}
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="min-w-[1180px]">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-left">
                      Category
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-left">
                      {t("gameHighs.table.name")}
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-center">
                      {t("gameHighs.table.value")}
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-left">
                      {t("gameHighs.table.opponent")}
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-center">
                      Score
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-center">
                      {t("gameHighs.table.date")}
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-left">
                      {t("gameHighs.table.competition")}
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-center">
                      Top 10
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerGameHighRows.map((row) => (
                    <Fragment key={row.key}>
                      {(row.key === "serveTotal" ||
                        row.key === "receptionTotal" ||
                        row.key === "attackTotal") && (
                        <TableRow className="bg-slate-100">
                          <TableCell
                            colSpan={8}
                            className="py-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600"
                          >
                            {row.key === "serveTotal"
                              ? playerSectionHeaders.serveTotal
                              : row.key === "receptionTotal"
                                ? playerSectionHeaders.receptionTotal
                                : playerSectionHeaders.attackTotal}
                          </TableCell>
                        </TableRow>
                      )}

                      <TableRow className={playerSectionToneClass[row.key]}>
                        <TableCell className="p-3 text-sm text-slate-700">{row.metric}</TableCell>
                        <TableCell className="p-3 text-sm text-slate-700">
                          {row.best ? (
                            <a
                              href={row.best.playerHref}
                              className="font-medium text-estonia-dark hover:text-estonia-blue hover:underline"
                            >
                              {row.best.name}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="p-3 text-center font-semibold text-estonia-dark">
                          {row.best?.value ?? "—"}
                        </TableCell>
                        <TableCell className="p-3 text-sm text-slate-700">
                          {row.best?.opponent ?? "—"}
                        </TableCell>
                        <TableCell className="p-3 text-center">
                          {row.best ? (
                            <a
                              href={row.best.matchHref}
                              className={`font-semibold hover:underline ${getScoreResultStyle(row.best.score)}`}
                            >
                              {row.best.score}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="p-3 text-center text-sm text-slate-700">
                          {row.best?.date ?? "—"}
                        </TableCell>
                        <TableCell className="p-3 text-sm text-slate-700">
                          {row.best?.competition ?? "—"}
                        </TableCell>
                        <TableCell className="p-3 text-center">
                          {row.topTen.length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedPlayerMetric((current) =>
                                  current === row.key ? null : row.key,
                                )
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-500 bg-white text-base font-bold text-slate-900 shadow-sm transition hover:border-estonia-blue hover:text-estonia-blue"
                              aria-label={
                                isEstonian
                                  ? "Ava või peida selle kategooria TOP 10"
                                  : "Toggle top 10 for this category"
                              }
                              title={
                                isEstonian
                                  ? "Ava või peida selle kategooria TOP 10"
                                  : "Toggle top 10 for this category"
                              }
                            >
                              {expandedPlayerMetric === row.key ? "▴" : "▾"}
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {expandedPlayerMetric === row.key && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-slate-50/60 p-3">
                            <div className="mb-2 rounded-md border border-slate-200 bg-slate-100/70 px-3 py-2 text-center">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                                {row.topTenMetric}
                              </p>
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                              <table className="min-w-[1240px] w-full border-collapse">
                                <thead className="bg-slate-50">
                                  <tr>
                                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      #
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      {t("gameHighs.table.name")}
                                    </th>
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      {t("gameHighs.table.position")}
                                    </th>
                                    {!isValueColumnHidden(row.key) && (
                                      <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                        {getTopTenValueLabel(row.key)}
                                      </th>
                                    )}
                                    {getReceptionContextKeys(row.key).map((key) => (
                                      <th
                                        key={key}
                                        className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"
                                      >
                                        {receptionContextLabels[key]}
                                      </th>
                                    ))}
                                    {getServeContextKeys(row.key).map((key) => (
                                      <th
                                        key={key}
                                        className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"
                                      >
                                        {serveContextLabels[key]}
                                      </th>
                                    ))}
                                    {getAttackContextKeys(row.key).map((key) => (
                                      <th
                                        key={key}
                                        className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"
                                      >
                                        {attackContextLabels[key]}
                                      </th>
                                    ))}
                                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      {t("gameHighs.table.opponent")}
                                    </th>
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      Score
                                    </th>
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      {t("gameHighs.table.date")}
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      {t("gameHighs.table.competition")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.topTen.map((item, index) => (
                                    <tr
                                      key={`${row.key}-${index}`}
                                      className="border-t border-slate-100"
                                    >
                                      <td className="px-2 py-2 text-sm text-slate-600">
                                        {item.rankLabel}
                                      </td>
                                      <td className="px-2 py-2 text-sm text-slate-700">
                                        <a
                                          href={item.playerHref}
                                          className="font-medium text-estonia-dark hover:text-estonia-blue hover:underline"
                                        >
                                          {item.name}
                                        </a>
                                      </td>
                                      <td className="px-2 py-2 text-center text-sm text-slate-700">
                                        {item.position}
                                      </td>
                                      {!isValueColumnHidden(row.key) && (
                                        <td className="px-2 py-2 text-center text-sm font-semibold text-estonia-dark">
                                          {item.value}
                                        </td>
                                      )}
                                      {getReceptionContextKeys(row.key).map((key) => (
                                        <td
                                          key={key}
                                          className={`px-2 py-2 text-center text-sm ${isReceptionContextHighlighted(row.key, key) ? "bg-amber-100 font-semibold text-estonia-dark" : "text-slate-700"}`}
                                        >
                                          {formatReceptionContextValue(key, item[key])}
                                        </td>
                                      ))}
                                      {getServeContextKeys(row.key).map((key) => (
                                        <td
                                          key={key}
                                          className={`px-2 py-2 text-center text-sm ${isServeContextHighlighted(row.key, key) ? "bg-amber-100 font-semibold text-estonia-dark" : "text-slate-700"}`}
                                        >
                                          {formatServeContextValue(item[key])}
                                        </td>
                                      ))}
                                      {getAttackContextKeys(row.key).map((key) => (
                                        <td
                                          key={key}
                                          className={`px-2 py-2 text-center text-sm ${isAttackContextHighlighted(row.key, key) ? "bg-amber-100 font-semibold text-estonia-dark" : "text-slate-700"}`}
                                        >
                                          {formatAttackContextValue(key, item[key])}
                                        </td>
                                      ))}
                                      <td className="px-2 py-2 text-sm text-slate-700">
                                        {item.opponent}
                                      </td>
                                      <td className="px-2 py-2 text-center text-sm">
                                        <a
                                          href={item.matchHref}
                                          className={`font-semibold hover:underline ${getScoreResultStyle(item.score)}`}
                                        >
                                          {item.score}
                                        </a>
                                      </td>
                                      <td className="px-2 py-2 text-center text-sm text-slate-700">
                                        {item.date}
                                      </td>
                                      <td className="px-2 py-2 text-sm text-slate-700">
                                        {item.competition}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {row.tieBreakerDescription && (
                              <p className="mt-2 px-1 text-xs italic text-slate-600">
                                {row.tieBreakerDescription}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {playerFilteredRows.length === 0 && (
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
              {t("common.noResults")}
            </div>
          )}
        </section>
      )}

      {viewMode === "TEAM" && (
        <section>
          <h2 className="mb-4 text-center font-display text-2xl uppercase italic text-estonia-dark">
            {isEstonian ? "Koondise Ühe mängu parimad" : "National Team Game Highs"}
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="min-w-[980px]">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-left">
                      Category
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-center">
                      {t("gameHighs.table.value")}
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-left">
                      {t("gameHighs.table.opponent")}
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-center">
                      Score
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-center">
                      {t("gameHighs.table.date")}
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-left">
                      {t("gameHighs.table.competition")}
                    </TableHead>
                    <TableHead className="sticky top-0 z-20 bg-slate-50 p-3 text-center">
                      Top 10
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamGameHighRows.map((row) => (
                    <Fragment key={row.rowId}>
                      {(row.key === "serveTotal" ||
                        row.key === "receptionTotal" ||
                        row.key === "attackTotal") && (
                        <TableRow className="bg-slate-100">
                          <TableCell
                            colSpan={7}
                            className="py-2 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600"
                          >
                            {row.key === "serveTotal"
                              ? teamSectionHeaders.serveTotal
                              : row.key === "receptionTotal"
                                ? teamSectionHeaders.receptionTotal
                                : teamSectionHeaders.attackTotal}
                          </TableCell>
                        </TableRow>
                      )}

                      <TableRow className={teamSectionToneClass[row.key] ?? "bg-white"}>
                        <TableCell className="p-3 text-sm text-slate-700">{row.metric}</TableCell>
                        <TableCell className="p-3 text-center font-semibold text-estonia-dark">
                          {row.value}
                        </TableCell>
                        <TableCell className="p-3 text-sm text-slate-700">{row.opponent}</TableCell>
                        <TableCell className="p-3 text-center">
                          {row.matchHref
                            ? (() => {
                                const parts = row.score.split("-");
                                const estonia = Number.parseInt(parts[0] ?? "0", 10);
                                const opponent = Number.parseInt(parts[1] ?? "0", 10);
                                const resultStyle =
                                  estonia > opponent
                                    ? "text-estonia-blue"
                                    : estonia === opponent
                                      ? "text-green-700"
                                      : "text-red-700";

                                return (
                                  <a
                                    href={row.matchHref}
                                    className={`font-semibold hover:underline ${resultStyle}`}
                                  >
                                    {row.score}
                                  </a>
                                );
                              })()
                            : "—"}
                        </TableCell>
                        <TableCell className="p-3 text-center text-sm text-slate-700">
                          {row.date}
                        </TableCell>
                        <TableCell className="p-3 text-sm text-slate-700">
                          {row.competition}
                        </TableCell>
                        <TableCell className="p-3 text-center">
                          {row.topTen.length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTeamMetric((current) =>
                                  current === row.rowId ? null : row.rowId,
                                )
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-slate-500 bg-white text-base font-bold text-slate-900 shadow-sm transition hover:border-estonia-blue hover:text-estonia-blue"
                              aria-label={
                                isEstonian
                                  ? "Ava või peida selle kategooria TOP 10"
                                  : "Toggle top 10 for this category"
                              }
                              title={
                                isEstonian
                                  ? "Ava või peida selle kategooria TOP 10"
                                  : "Toggle top 10 for this category"
                              }
                            >
                              {expandedTeamMetric === row.rowId ? "▴" : "▾"}
                            </button>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                      </TableRow>

                      {expandedTeamMetric === row.rowId && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-slate-50/60 p-3">
                            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                              <div className="mb-2 rounded-md border border-slate-200 bg-slate-100/70 px-3 py-2 text-center">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                                  {row.topTenMetric}
                                </p>
                              </div>
                              <table className="min-w-[980px] w-full border-collapse">
                                <thead className="bg-slate-50">
                                  <tr>
                                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      #
                                    </th>
                                    {!isValueColumnHidden(row.key) && (
                                      <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                        {getTopTenValueLabel(row.key)}
                                      </th>
                                    )}
                                    {getReceptionContextKeys(row.key).map((key) => (
                                      <th
                                        key={key}
                                        className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"
                                      >
                                        {receptionContextLabels[key]}
                                      </th>
                                    ))}
                                    {getServeContextKeys(row.key).map((key) => (
                                      <th
                                        key={key}
                                        className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"
                                      >
                                        {serveContextLabels[key]}
                                      </th>
                                    ))}
                                    {getAttackContextKeys(row.key).map((key) => (
                                      <th
                                        key={key}
                                        className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"
                                      >
                                        {attackContextLabels[key]}
                                      </th>
                                    ))}
                                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      {t("gameHighs.table.opponent")}
                                    </th>
                                    {row.key === "maxEstoniaSetPoints" && (
                                      <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                        {isEstonian ? "Geimi skoor" : "Set score"}
                                      </th>
                                    )}
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      Score
                                    </th>
                                    <th className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      {t("gameHighs.table.date")}
                                    </th>
                                    <th className="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                      {t("gameHighs.table.competition")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.topTen.map((item, index) => {
                                    return (
                                      <tr
                                        key={`${row.key}-${index}`}
                                        className="border-t border-slate-100"
                                      >
                                        <td className="px-2 py-2 text-sm text-slate-600">
                                          {item.rankLabel}
                                        </td>
                                        {!isValueColumnHidden(row.key) && (
                                          <td className="px-2 py-2 text-center text-sm font-semibold text-estonia-dark">
                                            {item.value}
                                          </td>
                                        )}
                                        {getReceptionContextKeys(row.key).map((key) => (
                                          <td
                                            key={key}
                                            className={`px-2 py-2 text-center text-sm ${isReceptionContextHighlighted(row.key, key) ? "bg-amber-100 font-semibold text-estonia-dark" : "text-slate-700"}`}
                                          >
                                            {formatReceptionContextValue(key, item[key])}
                                          </td>
                                        ))}
                                        {getServeContextKeys(row.key).map((key) => (
                                          <td
                                            key={key}
                                            className={`px-2 py-2 text-center text-sm ${isServeContextHighlighted(row.key, key) ? "bg-amber-100 font-semibold text-estonia-dark" : "text-slate-700"}`}
                                          >
                                            {formatServeContextValue(item[key])}
                                          </td>
                                        ))}
                                        {getAttackContextKeys(row.key).map((key) => (
                                          <td
                                            key={key}
                                            className={`px-2 py-2 text-center text-sm ${isAttackContextHighlighted(row.key, key) ? "bg-amber-100 font-semibold text-estonia-dark" : "text-slate-700"}`}
                                          >
                                            {formatAttackContextValue(key, item[key])}
                                          </td>
                                        ))}
                                        <td className="px-2 py-2 text-sm text-slate-700">
                                          {item.opponent}
                                        </td>
                                        {row.key === "maxEstoniaSetPoints" && (
                                          <td className="px-2 py-2 text-center text-sm font-semibold">
                                            <span
                                              className={
                                                item.setWon == null
                                                  ? "text-slate-500"
                                                  : item.setWon
                                                    ? "text-estonia-blue"
                                                    : "text-red-700"
                                              }
                                            >
                                              {item.setScore ?? "—"}
                                            </span>
                                          </td>
                                        )}
                                        <td className="px-2 py-2 text-center text-sm">
                                          <a
                                            href={item.matchHref}
                                            className={`font-semibold hover:underline ${getScoreResultStyle(item.score)}`}
                                          >
                                            {item.score}
                                          </a>
                                        </td>
                                        <td className="px-2 py-2 text-center text-sm text-slate-700">
                                          {item.date}
                                        </td>
                                        <td className="px-2 py-2 text-sm text-slate-700">
                                          {item.competition}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            {row.tieBreakerDescription && (
                              <p className="mt-2 px-1 text-xs italic text-slate-600">
                                {row.tieBreakerDescription}
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function getCategoryValue(row: GameHighRow, category: GameHighCategory): number | null {
  switch (category) {
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
      return row.serveErrors;
    case "serveErrorsLeast":
      if (row.unavailableStats.includes("serve_errors") || row.serveTotal == null) {
        return null;
      }
      return row.serveErrors ?? 0;
    case "receptionTotal":
      return row.receptionTotal;
    case "receptionErrors":
      return row.receptionErrors;
    case "receptionErrorsLeast":
      if (
        row.unavailableStats.includes("reception_total") ||
        row.unavailableStats.includes("reception_errors") ||
        row.receptionTotal == null
      ) {
        return null;
      }
      return row.receptionErrors ?? 0;
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
    default:
      return null;
  }
}

function getTopTenValueLabel(metric: string): string {
  const labels: Record<string, string> = {
    pointsPerGame: "PTS",
    points: "PTS",
    maxEstoniaSetPoints: "SET PTS",
    breakPoints: "BP",
    plusMinusBest: "+/-",
    plusMinusWorst: "+/-",
    plusMinus: "+/-",
    blockPoints: "BLK",
    serveTotal: "S TOT",
    serveAces: "S ACE",
    serveErrorsMost: "S ERR",
    serveErrorsLeast: "S ERR",
    serveErrors: "S ERR",
    bestAceErrorRatio: "Ratio",
    receptionTotal: "R TOT",
    receptionErrors: "R ERR",
    receptionPositivePctBest: "R POS%",
    receptionPositivePctWorst: "R POS%",
    receptionPositivePct: "R POS%",
    receptionExcellentPctBest: "R EXC%",
    receptionExcellentPctWorst: "R EXC%",
    receptionExcellentPct: "R EXC%",
    attackTotal: "A TOT",
    attackErrors: "A ERR",
    attackBlocked: "A BLK",
    attackKills: "A KIL",
    attackKillPctBest: "ATT%",
    attackKillPctWorst: "ATT%",
    attackKillPct: "ATT%",
    attackEfficiencyBest: "A EFF%",
    attackEfficiencyWorst: "A EFF%",
    attackEfficiency: "A EFF%",
  };

  return labels[metric] ?? "VALUE";
}

function formatCategoryValue(value: number | null, category: GameHighCategory): string {
  if (value == null) {
    return "—";
  }

  if (categoryRules[category].isPercent) {
    return `${Math.round(value)}%`;
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function getScoreResultStyle(score: string): string {
  const parts = score.split("-");
  const estonia = Number.parseInt(parts[0] ?? "0", 10);
  const opponent = Number.parseInt(parts[1] ?? "0", 10);

  if (estonia > opponent) {
    return "text-estonia-blue";
  }

  if (estonia === opponent) {
    return "text-green-700";
  }

  return "text-red-700";
}
