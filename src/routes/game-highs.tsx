import { useSuspenseQuery } from "@tanstack/react-query";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
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
  | "blockPoints"
  | "serveTotal"
  | "serveAces"
  | "serveAcePct"
  | "serveErrorsMost"
  | "serveErrorPct"
  | "serveErrorsLeast"
  | "errorsPerAce"
  | "receptionTotal"
  | "receptionErrors"
  | "receptionErrorsLeast"
  | "receptionErrorPct"
  | "receptionNegativeMost"
  | "receptionNegativeLeast"
  | "receptionNegativePct"
  | "receptionPositiveMost"
  | "receptionPositiveLeast"
  | "receptionPositivePct"
  | "receptionExcellentMost"
  | "receptionExcellentLeast"
  | "receptionExcellentPct"
  | "receptionEfficiencyPct"
  | "attackTotal"
  | "attackErrors"
  | "attackBlocked"
  | "attackKills"
  | "attackKillPctBest"
  | "attackKillPctWorst"
  | "attackEfficiencyBest"
  | "attackEfficiencyWorst";

type CategoryRule = {
  minAttemptsField?: "serveTotal" | "serveAces" | "receptionTotal" | "attackTotal";
  minAttempts?: number;
  isPercent?: boolean;
  sortDirection?: "asc" | "desc";
};

const RECEPTION_MIN_ATTEMPTS = { minAttemptsField: "receptionTotal", minAttempts: 10 } as const;
const ATTACK_MIN_ATTEMPTS = { minAttemptsField: "attackTotal", minAttempts: 10 } as const;

const categoryRules: Record<GameHighCategory, CategoryRule> = {
  pointsPerGame: { sortDirection: "desc" },
  plusMinusBest: { sortDirection: "desc" },
  plusMinusWorst: { sortDirection: "asc" },
  blockPoints: { sortDirection: "desc" },
  serveTotal: { sortDirection: "desc" },
  serveAces: { sortDirection: "desc" },
  serveAcePct: {
    minAttemptsField: "serveTotal",
    minAttempts: 5,
    isPercent: true,
    sortDirection: "desc",
  },
  serveErrorsMost: { sortDirection: "desc" },
  serveErrorPct: {
    minAttemptsField: "serveTotal",
    minAttempts: 1,
    isPercent: true,
    sortDirection: "desc",
  },
  serveErrorsLeast: { minAttemptsField: "serveTotal", minAttempts: 1, sortDirection: "asc" },
  errorsPerAce: { minAttemptsField: "serveAces", minAttempts: 1, sortDirection: "asc" },
  receptionTotal: { ...RECEPTION_MIN_ATTEMPTS, sortDirection: "desc" },
  receptionErrors: { ...RECEPTION_MIN_ATTEMPTS, sortDirection: "desc" },
  receptionErrorsLeast: { ...RECEPTION_MIN_ATTEMPTS, sortDirection: "asc" },
  receptionErrorPct: { ...RECEPTION_MIN_ATTEMPTS, isPercent: true, sortDirection: "desc" },
  receptionNegativeMost: { ...RECEPTION_MIN_ATTEMPTS, sortDirection: "desc" },
  receptionNegativeLeast: { ...RECEPTION_MIN_ATTEMPTS, sortDirection: "asc" },
  receptionNegativePct: { ...RECEPTION_MIN_ATTEMPTS, isPercent: true, sortDirection: "desc" },
  receptionPositiveMost: { ...RECEPTION_MIN_ATTEMPTS, sortDirection: "desc" },
  receptionPositiveLeast: { ...RECEPTION_MIN_ATTEMPTS, sortDirection: "asc" },
  receptionPositivePct: { ...RECEPTION_MIN_ATTEMPTS, isPercent: true, sortDirection: "desc" },
  receptionExcellentMost: { ...RECEPTION_MIN_ATTEMPTS, sortDirection: "desc" },
  receptionExcellentLeast: { ...RECEPTION_MIN_ATTEMPTS, sortDirection: "asc" },
  receptionExcellentPct: { ...RECEPTION_MIN_ATTEMPTS, isPercent: true, sortDirection: "desc" },
  receptionEfficiencyPct: { ...RECEPTION_MIN_ATTEMPTS, isPercent: true, sortDirection: "desc" },
  attackTotal: { ...ATTACK_MIN_ATTEMPTS, sortDirection: "desc" },
  attackErrors: { ...ATTACK_MIN_ATTEMPTS, sortDirection: "desc" },
  attackBlocked: { ...ATTACK_MIN_ATTEMPTS, sortDirection: "desc" },
  attackKills: { ...ATTACK_MIN_ATTEMPTS, sortDirection: "desc" },
  attackKillPctBest: { ...ATTACK_MIN_ATTEMPTS, isPercent: true, sortDirection: "desc" },
  attackKillPctWorst: { ...ATTACK_MIN_ATTEMPTS, isPercent: true, sortDirection: "asc" },
  attackEfficiencyBest: { ...ATTACK_MIN_ATTEMPTS, isPercent: true, sortDirection: "desc" },
  attackEfficiencyWorst: { ...ATTACK_MIN_ATTEMPTS, isPercent: true, sortDirection: "asc" },
};

type ServeContextKey =
  "serveTotal" | "serveErrors" | "serveAces" | "serveAcePct" | "serveErrorPct" | "errorsPerAce";
type ReceptionContextKey =
  | "receptionTotal"
  | "receptionErrors"
  | "receptionErrorPct"
  | "receptionNegativeTotal"
  | "receptionNegativePct"
  | "receptionPositiveTotal"
  | "receptionPositivePct"
  | "receptionIdealTotal"
  | "receptionExcellentPct"
  | "receptionEfficiency";
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
      return ["serveTotal", "serveErrors", "serveAces"];
    case "serveAcePct":
      return ["serveTotal", "serveErrors", "serveAces", "serveAcePct"];
    case "serveErrorPct":
      return ["serveTotal", "serveErrors", "serveAces", "serveErrorPct"];
    case "errorsPerAce":
      return ["serveTotal", "serveErrors", "serveAces", "errorsPerAce"];
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
  return (
    isServeCountMetric(metric) ||
    metric === "serveAcePct" ||
    metric === "serveErrorPct" ||
    metric === "errorsPerAce" ||
    isReceptionMetric(metric) ||
    isAttackMetric(metric)
  );
}

function isServeContextHighlighted(metric: string, key: ServeContextKey): boolean {
  switch (metric) {
    case "serveTotal":
      return key === "serveTotal";
    case "serveAces":
      return key === "serveAces";
    case "serveAcePct":
      return key === "serveAcePct";
    case "serveErrorPct":
      return key === "serveErrorPct";
    case "errorsPerAce":
      return key === "errorsPerAce";
    case "serveErrors":
    case "serveErrorsMost":
    case "serveErrorsLeast":
      return key === "serveErrors";
    default:
      return false;
  }
}

const serveContextLabels: Record<ServeContextKey, string> = {
  serveTotal: "S TOT",
  serveErrors: "S ERR",
  serveAces: "S ACE",
  serveAcePct: "S ACE%",
  serveErrorPct: "S ERR%",
  errorsPerAce: "ERR/ACE",
};

function formatServeContextValue(key: ServeContextKey, value: number | null | undefined): string {
  if (value == null) return "—";
  if (key === "serveAcePct" || key === "serveErrorPct") return `${Math.round(value)}%`;
  if (key === "errorsPerAce") return value.toFixed(2);
  return String(value);
}

function isReceptionContextHighlighted(metric: string, key: ReceptionContextKey): boolean {
  switch (metric) {
    case "receptionTotal":
      return key === "receptionTotal";
    case "receptionErrors":
    case "receptionErrorsLeast":
      return key === "receptionErrors";
    case "receptionErrorPct":
      return key === "receptionErrorPct";
    case "receptionNegativeMost":
    case "receptionNegativeLeast":
      return key === "receptionNegativeTotal";
    case "receptionNegativePct":
      return key === "receptionNegativePct";
    case "receptionPositiveMost":
    case "receptionPositiveLeast":
      return key === "receptionPositiveTotal";
    case "receptionPositivePct":
      return key === "receptionPositivePct";
    case "receptionExcellentMost":
    case "receptionExcellentLeast":
      return key === "receptionIdealTotal";
    case "receptionExcellentPct":
      return key === "receptionExcellentPct";
    case "receptionEfficiencyPct":
      return key === "receptionEfficiency";
    default:
      return false;
  }
}

function getReceptionDerivedFields(
  total: number | null | undefined,
  errors: number | null | undefined,
  positivePct: number | null | undefined,
  idealPct: number | null | undefined,
) {
  const hasTotal = total != null && total > 0;
  const positiveTotal =
    total != null && positivePct != null ? Math.round((total * positivePct) / 100) : null;
  const idealTotal =
    total != null && idealPct != null ? Math.round((total * idealPct) / 100) : null;
  const negativeTotal =
    total != null && errors != null && positiveTotal != null
      ? total - errors - positiveTotal
      : null;
  return {
    receptionErrorPct: hasTotal && errors != null ? (errors / total) * 100 : null,
    receptionPositiveTotal: positiveTotal,
    receptionIdealTotal: idealTotal,
    receptionNegativeTotal: negativeTotal,
    receptionNegativePct: hasTotal && negativeTotal != null ? (negativeTotal / total) * 100 : null,
    receptionEfficiency:
      hasTotal && errors != null && idealTotal != null
        ? ((idealTotal - errors) / total) * 100
        : null,
  };
}

const RECEPTION_COLUMN_ORDER: ReceptionContextKey[] = [
  "receptionTotal",
  "receptionErrors",
  "receptionErrorPct",
  "receptionNegativeTotal",
  "receptionNegativePct",
  "receptionPositiveTotal",
  "receptionPositivePct",
  "receptionIdealTotal",
  "receptionExcellentPct",
  "receptionEfficiency",
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
  receptionErrorPct: "R ERR%",
  receptionNegativeTotal: "R NEG",
  receptionNegativePct: "R NEG%",
  receptionPositiveTotal: "R POS",
  receptionPositivePct: "R POS%",
  receptionIdealTotal: "R EXC",
  receptionExcellentPct: "R EXC%",
  receptionEfficiency: "R EFF%",
};

function formatReceptionContextValue(
  key: ReceptionContextKey,
  value: number | null | undefined,
): string {
  if (value == null) return "—";
  return key === "receptionErrorPct" ||
    key === "receptionNegativePct" ||
    key === "receptionPositivePct" ||
    key === "receptionExcellentPct" ||
    key === "receptionEfficiency"
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
  validateSearch: (search: Record<string, unknown>): { view: "players" | "team" } => ({
    view: search.view === "team" ? "team" : "players",
  }),
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

type GameHighBlock = "general" | "serve" | "reception" | "attacks";

const GAME_HIGH_BLOCK_BY_KEY: Record<string, GameHighBlock> = {
  pointsPerGame: "general",
  plusMinusBest: "general",
  plusMinusWorst: "general",
  blockPoints: "general",
  points: "general",
  oppErrors: "general",
  maxEstoniaSetPoints: "general",
  breakPoints: "general",
  plusMinus: "general",
  serveTotal: "serve",
  serveAces: "serve",
  serveAcePct: "serve",
  serveErrorsMost: "serve",
  serveErrors: "serve",
  serveErrorPct: "serve",
  serveErrorsLeast: "serve",
  errorsPerAce: "serve",
  receptionTotal: "reception",
  receptionErrors: "reception",
  receptionErrorsLeast: "reception",
  receptionErrorPct: "reception",
  receptionNegativeMost: "reception",
  receptionNegativeLeast: "reception",
  receptionNegativeTotal: "reception",
  receptionNegativePct: "reception",
  receptionPositiveMost: "reception",
  receptionPositiveLeast: "reception",
  receptionPositiveTotal: "reception",
  receptionPositivePct: "reception",
  receptionExcellentMost: "reception",
  receptionExcellentLeast: "reception",
  receptionIdealTotal: "reception",
  receptionExcellentPct: "reception",
  receptionEfficiencyPct: "reception",
  receptionEfficiency: "reception",
  attackTotal: "attacks",
  attackErrors: "attacks",
  attackBlocked: "attacks",
  attackKills: "attacks",
  attackKillPctBest: "attacks",
  attackKillPctWorst: "attacks",
  attackEfficiencyBest: "attacks",
  attackEfficiencyWorst: "attacks",
  attackKillPct: "attacks",
  attackEfficiency: "attacks",
};

function isGameHighBlockStart(rows: readonly { key: string }[], index: number) {
  return (
    index === 0 ||
    GAME_HIGH_BLOCK_BY_KEY[rows[index - 1].key] !== GAME_HIGH_BLOCK_BY_KEY[rows[index].key]
  );
}

function GameHighBlockHeader({
  label,
  isOpen,
  colSpan,
  onToggle,
}: {
  label: string;
  isOpen: boolean;
  colSpan: number;
  onToggle: () => void;
}) {
  return (
    <TableRow className="bg-slate-100 hover:bg-slate-200">
      <TableCell colSpan={colSpan} className="p-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-center gap-2 px-3 py-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-600"
        >
          <span>{label}</span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </TableCell>
    </TableRow>
  );
}

function getTeamMinAttempts(
  key: string,
): { field: "serveTotal" | "receptionTotal" | "attackTotal"; min: number } | null {
  if (key === "serveAcePct") return { field: "serveTotal", min: 5 };
  if (key.startsWith("reception")) return { field: "receptionTotal", min: 10 };
  if (key.startsWith("attack")) return { field: "attackTotal", min: 10 };
  return null;
}

const thresholdNouns: Record<"serveTotal" | "receptionTotal" | "attackTotal", [string, string]> = {
  serveTotal: ["Serves", "servi"],
  receptionTotal: ["Receptions", "vastuvõttu"],
  attackTotal: ["Attacks", "rünnet"],
};

function getThresholdLabel(key: string, isEstonian: boolean): string | null {
  const threshold = getTeamMinAttempts(key);
  if (!threshold) return null;
  const [en, et] = thresholdNouns[threshold.field];
  return `Min ${threshold.min} ${isEstonian ? et : en}`;
}

function getFormulaLabel(key: string, isEstonian: boolean): string | null {
  if (key !== "receptionEfficiency" && key !== "receptionEfficiencyPct") return null;
  return isEstonian
    ? "R EFF% = (Väga hea − Vead) ÷ Vastuvõtud × 100"
    : "R EFF% = (Excellent − Errors) ÷ Receptions × 100";
}

const TEAM_METRIC_REQUIRED_FIELDS: Record<string, string[]> = {
  serveAcePct: ["serve_total", "serve_aces"],
  serveErrorPct: ["serve_total", "serve_errors"],
  errorsPerAce: ["serve_aces", "serve_errors"],
  receptionErrorPct: ["reception_total", "reception_errors"],
  receptionErrorsLeast: ["reception_total", "reception_errors"],
  receptionNegativeTotal: ["reception_total", "reception_errors", "reception_positive_pct"],
  receptionNegativePct: ["reception_total", "reception_errors", "reception_positive_pct"],
  receptionPositiveTotal: ["reception_total", "reception_positive_pct"],
  receptionIdealTotal: ["reception_total", "reception_excellent_pct"],
  receptionEfficiency: ["reception_total", "reception_errors", "reception_excellent_pct"],
};

function GameHighsPage() {
  const { t, i18n } = useTranslation();
  const { data } = useSuspenseQuery(gameHighsOptions());
  const { data: teamTotalRows } = useSuspenseQuery(matchTeamTotalsOptions());
  const { teamTotalsByMatch, oppErrorsByMatch } = useMemo(() => {
    // A match is present in teamTotalsByMatch only if it has a match_team_totals row.
    const teamTotals = new Map<number, Map<string, number | null>>();
    const oppErrors = new Map<number, number>();
    for (const row of teamTotalRows) {
      if (row.statField === "opp_errors") {
        if (row.teamTotal != null) oppErrors.set(row.matchId, row.teamTotal);
        continue;
      }
      const stats = teamTotals.get(row.matchId) ?? new Map<string, number | null>();
      stats.set(row.statField, row.teamTotal);
      teamTotals.set(row.matchId, stats);
    }
    return { teamTotalsByMatch: teamTotals, oppErrorsByMatch: oppErrors };
  }, [teamTotalRows]);
  const { view } = Route.useSearch();
  const viewMode = view === "team" ? "TEAM" : "PLAYERS";
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
      serveAcePct: t("gameHighs.categories.serveAcePct"),
      serveErrorsMost: t("gameHighs.categories.serveMistakesMostInMatch"),
      serveErrorPct: t("gameHighs.categories.serveErrorPct"),
      serveErrorsLeast: t("gameHighs.categories.serveMistakesLeastInMatch"),
      errorsPerAce: t("gameHighs.categories.errorsPerAce"),
      receptionTotal: t("gameHighs.categories.receptionsInMatch"),
      receptionErrors: t("gameHighs.categories.receptionMistakesMostInMatch"),
      receptionErrorsLeast: t("gameHighs.categories.receptionMistakesLeastInMatch"),
      receptionErrorPct: t("gameHighs.categories.receptionErrorPct"),
      receptionNegativeMost: t("gameHighs.categories.receptionNegativeMost"),
      receptionNegativeLeast: t("gameHighs.categories.receptionNegativeLeast"),
      receptionNegativePct: t("gameHighs.categories.receptionNegativePct"),
      receptionPositiveMost: t("gameHighs.categories.receptionPositiveMost"),
      receptionPositiveLeast: t("gameHighs.categories.receptionPositiveLeast"),
      receptionPositivePct: t("gameHighs.categories.receptionPositivePct"),
      receptionExcellentMost: t("gameHighs.categories.receptionExcellentMost"),
      receptionExcellentLeast: t("gameHighs.categories.receptionExcellentLeast"),
      receptionExcellentPct: t("gameHighs.categories.receptionExcellentPct"),
      receptionEfficiencyPct: t("gameHighs.categories.receptionEfficiencyPct"),
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
        "serveAcePct",
        "serveErrorsMost",
        "serveErrorPct",
        "serveErrorsLeast",
        "errorsPerAce",
        "receptionTotal",
        "receptionErrors",
        "receptionErrorsLeast",
        "receptionErrorPct",
        "receptionNegativeMost",
        "receptionNegativeLeast",
        "receptionNegativePct",
        "receptionPositiveMost",
        "receptionPositiveLeast",
        "receptionPositivePct",
        "receptionExcellentMost",
        "receptionExcellentLeast",
        "receptionExcellentPct",
        "receptionEfficiencyPct",
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
      serveAcePct: categoryLabel.serveAcePct,
      serveErrorsMost: categoryLabel.serveErrorsMost,
      serveErrorPct: categoryLabel.serveErrorPct,
      serveErrorsLeast: categoryLabel.serveErrorsLeast,
      errorsPerAce: categoryLabel.errorsPerAce,
      receptionTotal: categoryLabel.receptionTotal,
      receptionErrors: categoryLabel.receptionErrors,
      receptionErrorsLeast: categoryLabel.receptionErrorsLeast,
      receptionErrorPct: categoryLabel.receptionErrorPct,
      receptionNegativeMost: categoryLabel.receptionNegativeMost,
      receptionNegativeLeast: categoryLabel.receptionNegativeLeast,
      receptionNegativePct: categoryLabel.receptionNegativePct,
      receptionPositiveMost: categoryLabel.receptionPositiveMost,
      receptionPositiveLeast: categoryLabel.receptionPositiveLeast,
      receptionPositivePct: categoryLabel.receptionPositivePct,
      receptionExcellentMost: categoryLabel.receptionExcellentMost,
      receptionExcellentLeast: categoryLabel.receptionExcellentLeast,
      receptionExcellentPct: categoryLabel.receptionExcellentPct,
      receptionEfficiencyPct: categoryLabel.receptionEfficiencyPct,
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
      serveAcePct: isEstonian
        ? "Võrdse ässade % korral eelistatakse suuremat servide koguarvu (S TOT)."
        : "For equal ace %, more total serve attempts (S TOT) rank higher.",
      serveErrorPct: isEstonian
        ? "Võrdse servivigade % korral eelistatakse suuremat servide koguarvu (S TOT)."
        : "For equal serve error %, more total serve attempts (S TOT) rank higher.",
      errorsPerAce: isEstonian
        ? "Võrdse vigade ja ässade suhte korral eelistatakse suuremat ässade arvu."
        : "For equal errors per ace, more aces rank higher.",
      receptionErrorPct: isEstonian
        ? "Võrdse vastuvõtuvigade % korral eelistatakse suuremat vastuvõttude koguarvu (R TOT)."
        : "For equal reception error %, more total receptions (R TOT) rank higher.",
      receptionNegativeMost: isEstonian
        ? "Võrdse negatiivsete vastuvõttude arvu korral eelistatakse väiksemat vastuvõttude koguarvu (R TOT)."
        : "For equal negative receptions, fewer total receptions (R TOT) rank higher.",
      receptionNegativeLeast: isEstonian
        ? "Võrdse negatiivsete vastuvõttude arvu korral eelistatakse suuremat vastuvõttude koguarvu (R TOT)."
        : "For equal negative receptions, more total receptions (R TOT) rank higher.",
      receptionNegativePct: isEstonian
        ? "Võrdse negatiivse vastuvõtu % korral eelistatakse suuremat vastuvõttude koguarvu (R TOT)."
        : "For equal negative reception %, more total receptions (R TOT) rank higher.",
      receptionPositiveMost: isEstonian
        ? "Võrdse positiivsete vastuvõttude arvu korral eelistatakse suuremat vastuvõttude koguarvu (R TOT)."
        : "For equal positive receptions, more total receptions (R TOT) rank higher.",
      receptionPositiveLeast: isEstonian
        ? "Võrdse positiivsete vastuvõttude arvu korral eelistatakse väiksemat vastuvõttude koguarvu (R TOT)."
        : "For equal positive receptions, fewer total receptions (R TOT) rank higher.",
      receptionPositivePct: isEstonian
        ? "Võrdse positiivse vastuvõtu % korral eelistatakse suuremat vastuvõttude koguarvu (R TOT). Kui ka see on võrdne, eelistatakse väiksemat vastuvõttuvigade arvu (R ERR)."
        : "For equal positive reception %, more total receptions (R TOT) rank higher. If still equal, fewer reception errors (R ERR) rank higher.",
      receptionExcellentMost: isEstonian
        ? "Võrdse ideaalsete vastuvõttude arvu korral eelistatakse suuremat vastuvõttude koguarvu (R TOT)."
        : "For equal excellent receptions, more total receptions (R TOT) rank higher.",
      receptionExcellentLeast: isEstonian
        ? "Võrdse ideaalsete vastuvõttude arvu korral eelistatakse väiksemat vastuvõttude koguarvu (R TOT)."
        : "For equal excellent receptions, fewer total receptions (R TOT) rank higher.",
      receptionExcellentPct: isEstonian
        ? "Võrdse ideaalse vastuvõtu % korral eelistatakse suuremat vastuvõttude koguarvu (R TOT)."
        : "For equal excellent reception %, more total receptions (R TOT) rank higher.",
      receptionEfficiencyPct: isEstonian
        ? "Võrdse vastuvõtuefektiivsuse korral eelistatakse suuremat vastuvõttude koguarvu (R TOT)."
        : "For equal reception efficiency, more total receptions (R TOT) rank higher.",
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

    type TieBreaker = {
      field: "receptionTotal" | "receptionErrors" | "serveTotal" | "serveAces" | "attackTotal";
      direction: "asc" | "desc";
    };

    const tieBreakers: Partial<Record<PlayerMetricKey, TieBreaker[]>> = {
      pointsPerGame: [{ field: "attackTotal", direction: "asc" }],
      serveAces: [{ field: "serveTotal", direction: "asc" }],
      serveAcePct: [{ field: "serveTotal", direction: "desc" }],
      serveErrorsMost: [{ field: "serveTotal", direction: "asc" }],
      serveErrorPct: [{ field: "serveTotal", direction: "desc" }],
      serveErrorsLeast: [{ field: "serveTotal", direction: "desc" }],
      errorsPerAce: [{ field: "serveAces", direction: "desc" }],
      receptionErrors: [{ field: "receptionTotal", direction: "asc" }],
      receptionErrorsLeast: [{ field: "receptionTotal", direction: "desc" }],
      receptionErrorPct: [{ field: "receptionTotal", direction: "desc" }],
      receptionNegativeMost: [{ field: "receptionTotal", direction: "asc" }],
      receptionNegativeLeast: [{ field: "receptionTotal", direction: "desc" }],
      receptionNegativePct: [{ field: "receptionTotal", direction: "desc" }],
      receptionPositiveMost: [{ field: "receptionTotal", direction: "desc" }],
      receptionPositiveLeast: [{ field: "receptionTotal", direction: "asc" }],
      receptionPositivePct: [
        { field: "receptionTotal", direction: "desc" },
        { field: "receptionErrors", direction: "asc" },
      ],
      receptionExcellentMost: [{ field: "receptionTotal", direction: "desc" }],
      receptionExcellentLeast: [{ field: "receptionTotal", direction: "asc" }],
      receptionExcellentPct: [{ field: "receptionTotal", direction: "desc" }],
      receptionEfficiencyPct: [{ field: "receptionTotal", direction: "desc" }],
      attackErrors: [{ field: "attackTotal", direction: "asc" }],
      attackBlocked: [{ field: "attackTotal", direction: "asc" }],
      attackKills: [{ field: "attackTotal", direction: "asc" }],
      attackKillPctBest: [{ field: "attackTotal", direction: "desc" }],
      attackKillPctWorst: [{ field: "attackTotal", direction: "desc" }],
      attackEfficiencyBest: [{ field: "attackTotal", direction: "desc" }],
      attackEfficiencyWorst: [{ field: "attackTotal", direction: "desc" }],
    };

    const isSameDisplayedRank = (
      metric: PlayerMetricKey,
      current: GameHighRow,
      previous: GameHighRow,
    ) => {
      const currentPrimary = getCategoryValue(current, metric);
      const previousPrimary = getCategoryValue(previous, metric);
      if (currentPrimary == null || previousPrimary == null) {
        return false;
      }

      if (Math.abs(currentPrimary - previousPrimary) >= 0.0001) {
        return false;
      }

      return (tieBreakers[metric] ?? []).every(
        ({ field }) => (current[field] ?? 0) === (previous[field] ?? 0),
      );
    };

    return playerMetrics.map((metric) => {
      const ranked = [...playerFilteredRows]
        .filter((row) => {
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
          const leftValue = getCategoryValue(left, metric) ?? 0;
          const rightValue = getCategoryValue(right, metric) ?? 0;
          const direction = categoryRules[metric].sortDirection ?? "desc";

          if (leftValue !== rightValue) {
            return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
          }

          for (const { field, direction } of tieBreakers[metric] ?? []) {
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
          rankLabel: `${rank}`,
          name: row.name,
          playerHref: `/players/${row.playerId}`,
          position: row.position ?? t("positions.Unknown"),
          serveTotal: row.serveTotal,
          serveErrors:
            metric === "serveErrorsLeast" ? getCategoryValue(row, metric) : row.serveErrors,
          serveAces: row.serveAces,
          serveAcePct: getCategoryValue(row, "serveAcePct"),
          serveErrorPct: getCategoryValue(row, "serveErrorPct"),
          errorsPerAce: getCategoryValue(row, "errorsPerAce"),
          receptionTotal: row.receptionTotal,
          receptionErrors:
            metric === "receptionErrorsLeast" ? getCategoryValue(row, metric) : row.receptionErrors,
          receptionPositivePct: row.receptionPositivePct,
          receptionExcellentPct: row.receptionExcellentPct,
          ...getReceptionDerivedFields(
            row.receptionTotal,
            metric === "receptionErrorsLeast" ? getCategoryValue(row, metric) : row.receptionErrors,
            row.receptionPositivePct,
            row.receptionExcellentPct,
          ),
          attackTotal: row.attackTotal,
          attackErrors: row.attackErrors,
          attackBlocked: row.attackBlocked,
          attackKills: row.attackKills,
          attackKillPct: row.attackKillPct,
          attackEfficiency: row.attackEfficiency,
          value: formatCategoryValue(getCategoryValue(row, metric), metric),
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
      return {
        key: metric,
        metric: metricLabel[metric],
        topTenMetric: metricLabel[metric],
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

  const playerSectionToneClass = {
    pointsPerGame: "bg-slate-50/60",
    plusMinusBest: "bg-slate-50/60",
    plusMinusWorst: "bg-slate-50/60",
    blockPoints: "bg-slate-50/60",
    serveTotal: "bg-amber-50/60",
    serveAces: "bg-amber-50/60",
    serveAcePct: "bg-amber-50/60",
    serveErrorsMost: "bg-amber-50/60",
    serveErrorPct: "bg-amber-50/60",
    serveErrorsLeast: "bg-amber-50/60",
    errorsPerAce: "bg-amber-50/60",
    receptionTotal: "bg-sky-50/60",
    receptionErrors: "bg-sky-50/60",
    receptionErrorsLeast: "bg-sky-50/60",
    receptionErrorPct: "bg-sky-50/60",
    receptionNegativeMost: "bg-sky-50/60",
    receptionNegativeLeast: "bg-sky-50/60",
    receptionNegativePct: "bg-sky-50/60",
    receptionPositiveMost: "bg-sky-50/60",
    receptionPositiveLeast: "bg-sky-50/60",
    receptionPositivePct: "bg-sky-50/60",
    receptionExcellentMost: "bg-sky-50/60",
    receptionExcellentLeast: "bg-sky-50/60",
    receptionExcellentPct: "bg-sky-50/60",
    receptionEfficiencyPct: "bg-sky-50/60",
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
      estoniaSetPointsTotal: number | null;
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
        estoniaSetPointsTotal: row.estoniaSetPointsTotal,
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
      // When a match_team_totals row exists it is authoritative: a null there means unavailable,
      // and player sums are not used as a fallback.
      const unavailable = new Set<string>(teamTotals ? [] : match.unavailableStats);
      if (teamTotals) {
        TEAM_TOTAL_STAT_FIELDS.forEach((field) => {
          if (teamTotals.get(field) == null) unavailable.add(field);
        });
      } else if (match.unavailableStats.size > 0) {
        TEAM_TOTAL_STAT_FIELDS.forEach((field) => unavailable.add(field));
      }

      const teamValue = (field: string): number | null => teamTotals?.get(field) ?? null;
      const value = (field: string, playerSum: number): number | null =>
        teamTotals ? teamValue(field) : playerSum;

      const points = value("points", match.points);
      const breakPoints = value("break_points", match.breakPoints);
      const plusMinus = teamTotals
        ? teamValue("plus_minus")
        : match.plusMinusCount > 0
          ? match.plusMinus
          : null;
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

      const receptionPositivePct = teamTotals
        ? teamValue("reception_positive_pct")
        : unavailable.has("reception_total") || unavailable.has("reception_positive_pct")
          ? null
          : derivedReceptionPositivePct;
      const receptionExcellentPct = teamTotals
        ? teamValue("reception_excellent_pct")
        : unavailable.has("reception_total") || unavailable.has("reception_excellent_pct")
          ? null
          : derivedReceptionExcellentPct;
      const attackKillPct = teamTotals
        ? teamValue("attack_kill_pct")
        : !unavailable.has("attack_total") &&
            !unavailable.has("attack_kills") &&
            match.attackTotal > 0
          ? (match.attackKills / match.attackTotal) * 100
          : null;
      const attackEfficiency =
        !unavailable.has("attack_total") &&
        !unavailable.has("attack_kills") &&
        !unavailable.has("attack_blocked") &&
        !unavailable.has("attack_errors") &&
        attackTotal != null &&
        attackKills != null &&
        attackBlocked != null &&
        attackErrors != null &&
        attackTotal > 0
          ? ((attackKills - attackBlocked - attackErrors) / attackTotal) * 100
          : null;

      const serveAcePct =
        serveTotal != null && serveAces != null && serveTotal > 0
          ? (serveAces / serveTotal) * 100
          : null;
      const serveErrorPct =
        serveTotal != null && serveErrors != null && serveTotal > 0
          ? (serveErrors / serveTotal) * 100
          : null;
      const errorsPerAce =
        serveErrors != null && serveAces != null && serveAces > 0 ? serveErrors / serveAces : null;
      const receptionDerived = getReceptionDerivedFields(
        unavailable.has("reception_total") ? null : receptionTotal,
        unavailable.has("reception_errors") ? null : receptionErrors,
        unavailable.has("reception_positive_pct") ? null : receptionPositivePct,
        unavailable.has("reception_excellent_pct") ? null : receptionExcellentPct,
      );

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
          unavailable.has("reception_total") || unavailable.has("reception_errors")
            ? null
            : receptionErrors,
        receptionPositivePct,
        receptionExcellentPct,
        attackKillPct,
        attackEfficiency,
        oppErrors: teamTotals
          ? (oppErrorsByMatch.get(match.matchId) ?? null)
          : !unavailable.has("points") && match.estoniaSetPointsTotal != null
            ? match.estoniaSetPointsTotal - match.points
            : null,
        serveAcePct,
        serveErrorPct,
        errorsPerAce,
        ...receptionDerived,
        unavailableStats: unavailable,
      };
    });

    const metrics = [
      { key: "points", label: t("players.statsField.points"), direction: "desc" as const },
      {
        key: "oppErrors",
        label: isEstonian ? "Vastase vead" : "Opposition Errors",
        direction: "desc" as const,
      },
      {
        key: "maxEstoniaSetPoints",
        label: isEstonian ? "Punktid setis" : "Points in a set",
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
        key: "serveAcePct",
        label: isEstonian ? "Ässade %" : "Serve Ace %",
        direction: "desc" as const,
      },
      {
        key: "serveErrors",
        label: isEstonian ? "Servivead" : "Serve Errors",
        direction: "desc" as const,
      },
      {
        key: "serveErrorPct",
        label: isEstonian ? "Servivigade %" : "Error %",
        direction: "desc" as const,
      },
      {
        key: "serveErrors",
        label: isEstonian ? "Servivead (vähim)" : "Errors (least)",
        direction: "asc" as const,
      },
      {
        key: "errorsPerAce",
        label: isEstonian ? "Vigu ässa kohta" : "Errors per Ace",
        direction: "asc" as const,
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
        key: "receptionErrorPct",
        label: isEstonian ? "Vastuvõtuvigade %" : "Error %",
        direction: "desc" as const,
      },
      {
        key: "receptionNegativeTotal",
        label: isEstonian ? "Negatiivsed (enim)" : "Negative (most)",
        direction: "desc" as const,
      },
      {
        key: "receptionNegativeTotal",
        label: isEstonian ? "Negatiivsed (vähim)" : "Negative (least)",
        direction: "asc" as const,
      },
      {
        key: "receptionNegativePct",
        label: isEstonian ? "Negatiivsed %" : "Negative %",
        direction: "desc" as const,
      },
      {
        key: "receptionPositiveTotal",
        label: isEstonian ? "Positiivsed (enim)" : "Positive (most)",
        direction: "desc" as const,
      },
      {
        key: "receptionPositiveTotal",
        label: isEstonian ? "Positiivsed (vähim)" : "Positive (least)",
        direction: "asc" as const,
      },
      {
        key: "receptionPositivePct",
        label: isEstonian ? "Positiivsed %" : "Positive %",
        direction: "desc" as const,
      },
      {
        key: "receptionIdealTotal",
        label: isEstonian ? "Ideaalsed (enim)" : "Excellent (most)",
        direction: "desc" as const,
      },
      {
        key: "receptionIdealTotal",
        label: isEstonian ? "Ideaalsed (vähim)" : "Excellent (least)",
        direction: "asc" as const,
      },
      {
        key: "receptionExcellentPct",
        label: isEstonian ? "Ideaalsed %" : "Excellent %",
        direction: "desc" as const,
      },
      {
        key: "receptionEfficiency",
        label: isEstonian ? "Efektiivsus %" : "Efficiency %",
        direction: "desc" as const,
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
        label: isEstonian ? "Resultatiivsed rünnakud" : "Kills",
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
        key === "receptionErrorPct" ||
        key === "receptionNegativePct" ||
        key === "receptionEfficiency" ||
        key === "serveAcePct" ||
        key === "serveErrorPct" ||
        key === "attackKillPct" ||
        key === "attackEfficiency"
      ) {
        return `${Math.round(value)}%`;
      }

      return Number.isInteger(value) ? String(value) : value.toFixed(2);
    };

    return metrics.map((metric) => {
      const requiredStatFields = TEAM_METRIC_REQUIRED_FIELDS[metric.key];
      const ranked = [...teamMatches]
        .filter((match) => {
          const minAttempts = getTeamMinAttempts(metric.key);
          if (minAttempts && (match[minAttempts.field] ?? 0) < minAttempts.min) {
            return false;
          }

          if (requiredStatFields) {
            return (
              requiredStatFields.every((field) => !match.unavailableStats.has(field)) &&
              match[metric.key as keyof typeof match] != null
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
              match[metric.key] != null
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
          const leftValue = left[metric.key as keyof typeof left] as number | null | undefined;
          const rightValue = right[metric.key as keyof typeof right] as number | null | undefined;

          if ((leftValue ?? 0) !== (rightValue ?? 0)) {
            return metric.direction === "asc"
              ? (leftValue ?? 0) - (rightValue ?? 0)
              : (rightValue ?? 0) - (leftValue ?? 0);
          }

          if (metric.key === "receptionErrorsLeast") {
            if (left.receptionTotal !== right.receptionTotal) {
              return (right.receptionTotal ?? 0) - (left.receptionTotal ?? 0);
            }
          }

          if (metric.key === "attackKillPct" || metric.key === "attackEfficiency") {
            if (left.attackTotal !== right.attackTotal) {
              return (right.attackTotal ?? 0) - (left.attackTotal ?? 0);
            }
          }

          if (
            metric.key === "attackErrors" ||
            metric.key === "attackBlocked" ||
            metric.key === "attackKills"
          ) {
            if (left.attackTotal !== right.attackTotal) {
              return (left.attackTotal ?? 0) - (right.attackTotal ?? 0);
            }
          }

          if (metric.key === "points") {
            if (left.attackTotal !== right.attackTotal) {
              return (left.attackTotal ?? 0) - (right.attackTotal ?? 0);
            }
          }

          if (metric.key === "serveAces" || metric.key === "serveErrors") {
            if (left.serveTotal !== right.serveTotal) {
              return (left.serveTotal ?? 0) - (right.serveTotal ?? 0);
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
          (match[metric.key as keyof typeof match] as number | null | undefined) ?? 0;

        const samePrimaryValue =
          previousComparableValue != null &&
          Math.abs(currentComparableValue - previousComparableValue) < 0.0001;
        let isSameRank = samePrimaryValue;
        if (metric.key === "receptionErrorsLeast") {
          isSameRank =
            previousTeamMatch?.receptionErrorsLeast === match.receptionErrorsLeast &&
            previousTeamMatch?.receptionTotal === match.receptionTotal;
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
          rankLabel: `${rank}`,
          value: formatTeamValue(
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
          ...getReceptionDerivedFields(
            match.receptionTotal,
            match.receptionErrorsLeast ?? match.receptionErrors,
            match.receptionPositivePct,
            match.receptionExcellentPct,
          ),
          serveTotal: match.serveTotal,
          serveErrors: match.serveErrors,
          serveAces: match.serveAces,
          serveAcePct: match.serveAcePct,
          serveErrorPct: match.serveErrorPct,
          errorsPerAce: match.errorsPerAce,
          attackTotal: match.attackTotal,
          attackErrors: match.attackErrors,
          attackBlocked: match.attackBlocked,
          attackKills: match.attackKills,
          attackKillPct: match.attackKillPct,
          attackEfficiency: match.attackEfficiency,
          matchHref: match.mam === true ? `/match/${match.matchId}/all` : `/match/${match.matchId}`,
        };
      });

      let tieBreakerDescription: string | null = null;
      if (metric.key === "receptionErrorsLeast") {
        tieBreakerDescription = isEstonian
          ? "Võrdsete vastuvõtuvigade korral eelistatakse suuremat vastuvõttude arvu."
          : "For equal reception-error counts, more receptions rank higher.";
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
        topTenMetric: metric.label,
        tieBreakerDescription,
        value: formatTeamValue(
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
  }, [
    teamFilteredRows,
    t,
    isEstonian,
    showAdditionalSetsInScore,
    teamTotalsByMatch,
    oppErrorsByMatch,
  ]);

  const positionButtonsDisabled = viewMode === "TEAM";

  const gameHighBlockLabels: Record<GameHighBlock, string> = {
    general: t("gameHighs.categories.blockGeneral"),
    serve: t("gameHighs.categories.blockServe"),
    reception: t("gameHighs.categories.blockReception"),
    attacks: t("gameHighs.categories.blockAttacks"),
  };

  const [openBlocks, setOpenBlocks] = useState<Record<GameHighBlock, boolean>>({
    general: false,
    serve: false,
    reception: false,
    attacks: false,
  });
  const toggleBlock = (block: GameHighBlock) =>
    setOpenBlocks((current) => ({ ...current, [block]: !current[block] }));

  const teamSectionToneClass: Record<string, string> = {
    points: "bg-slate-50/60",
    oppErrors: "bg-slate-50/60",
    maxEstoniaSetPoints: "bg-slate-50/60",
    breakPoints: "bg-slate-50/60",
    plusMinus: "bg-slate-50/60",
    blockPoints: "bg-slate-50/60",
    serveTotal: "bg-amber-50/60",
    serveAces: "bg-amber-50/60",
    serveAcePct: "bg-amber-50/60",
    serveErrors: "bg-amber-50/60",
    serveErrorPct: "bg-amber-50/60",
    errorsPerAce: "bg-amber-50/60",
    receptionTotal: "bg-sky-50/60",
    receptionErrors: "bg-sky-50/60",
    receptionErrorsLeast: "bg-sky-50/60",
    receptionErrorPct: "bg-sky-50/60",
    receptionNegativeTotal: "bg-sky-50/60",
    receptionNegativePct: "bg-sky-50/60",
    receptionPositiveTotal: "bg-sky-50/60",
    receptionPositivePct: "bg-sky-50/60",
    receptionIdealTotal: "bg-sky-50/60",
    receptionExcellentPct: "bg-sky-50/60",
    receptionEfficiency: "bg-sky-50/60",
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
                  {playerGameHighRows.map((row, index) => (
                    <Fragment key={row.key}>
                      {isGameHighBlockStart(playerGameHighRows, index) && (
                        <GameHighBlockHeader
                          label={gameHighBlockLabels[GAME_HIGH_BLOCK_BY_KEY[row.key]]}
                          isOpen={openBlocks[GAME_HIGH_BLOCK_BY_KEY[row.key]]}
                          colSpan={8}
                          onToggle={() => toggleBlock(GAME_HIGH_BLOCK_BY_KEY[row.key])}
                        />
                      )}

                      <TableRow
                        className={`${playerSectionToneClass[row.key]} ${openBlocks[GAME_HIGH_BLOCK_BY_KEY[row.key]] ? "" : "hidden"}`}
                      >
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
                              {getThresholdLabel(row.key, isEstonian) && (
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {getThresholdLabel(row.key, isEstonian)}
                                </p>
                              )}
                              {getFormulaLabel(row.key, isEstonian) && (
                                <p className="mt-1 text-[11px] text-slate-500">
                                  {getFormulaLabel(row.key, isEstonian)}
                                </p>
                              )}
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
                                          {formatServeContextValue(
                                            key,
                                            item[key as "serveTotal" | "serveErrors" | "serveAces"],
                                          )}
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
                  {teamGameHighRows.map((row, index) => (
                    <Fragment key={row.rowId}>
                      {isGameHighBlockStart(teamGameHighRows, index) && (
                        <GameHighBlockHeader
                          label={gameHighBlockLabels[GAME_HIGH_BLOCK_BY_KEY[row.key]]}
                          isOpen={openBlocks[GAME_HIGH_BLOCK_BY_KEY[row.key]]}
                          colSpan={7}
                          onToggle={() => toggleBlock(GAME_HIGH_BLOCK_BY_KEY[row.key])}
                        />
                      )}

                      <TableRow
                        className={`${teamSectionToneClass[row.key] ?? "bg-white"} ${openBlocks[GAME_HIGH_BLOCK_BY_KEY[row.key]] ? "" : "hidden"}`}
                      >
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
                                {getThresholdLabel(row.key, isEstonian) && (
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    {getThresholdLabel(row.key, isEstonian)}
                                  </p>
                                )}
                                {getFormulaLabel(row.key, isEstonian) && (
                                  <p className="mt-1 text-[11px] text-slate-500">
                                    {getFormulaLabel(row.key, isEstonian)}
                                  </p>
                                )}
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
                                            {formatServeContextValue(key, item[key])}
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

function percentOf(part: number | null, total: number | null): number | null {
  if (part == null || total == null || total <= 0) {
    return null;
  }
  return (part / total) * 100;
}

function hasUnavailableStat(row: GameHighRow, fields: string[]): boolean {
  return fields.some((field) => row.unavailableStats.includes(field));
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
    case "serveAcePct":
      if (hasUnavailableStat(row, ["serve_total", "serve_aces"])) {
        return null;
      }
      return percentOf(row.serveAces, row.serveTotal);
    case "serveErrorPct":
      if (hasUnavailableStat(row, ["serve_total", "serve_errors"])) {
        return null;
      }
      return percentOf(row.serveErrors, row.serveTotal);
    case "errorsPerAce":
      if (
        hasUnavailableStat(row, ["serve_aces", "serve_errors"]) ||
        row.serveAces == null ||
        row.serveAces <= 0 ||
        row.serveErrors == null
      ) {
        return null;
      }
      return row.serveErrors / row.serveAces;
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
    case "receptionErrorPct":
      if (hasUnavailableStat(row, ["reception_total", "reception_errors"])) {
        return null;
      }
      return row.receptionErrorPct;
    case "receptionNegativeMost":
    case "receptionNegativeLeast":
      if (
        hasUnavailableStat(row, ["reception_total", "reception_errors", "reception_positive_pct"])
      ) {
        return null;
      }
      return row.receptionNegative;
    case "receptionNegativePct":
      if (
        hasUnavailableStat(row, ["reception_total", "reception_errors", "reception_positive_pct"])
      ) {
        return null;
      }
      return row.receptionNegativePct;
    case "receptionPositiveMost":
    case "receptionPositiveLeast":
      if (hasUnavailableStat(row, ["reception_total", "reception_positive_pct"])) {
        return null;
      }
      return row.receptionPositive;
    case "receptionPositivePct":
      return row.receptionPositivePct;
    case "receptionExcellentMost":
    case "receptionExcellentLeast":
      if (hasUnavailableStat(row, ["reception_total", "reception_excellent_pct"])) {
        return null;
      }
      return row.receptionExcellent;
    case "receptionExcellentPct":
      return row.receptionExcellentPct;
    case "receptionEfficiencyPct":
      if (
        hasUnavailableStat(row, ["reception_total", "reception_errors", "reception_excellent_pct"])
      ) {
        return null;
      }
      return row.receptionEfficiency;
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
    serveAcePct: "S ACE%",
    serveErrorPct: "S ERR%",
    errorsPerAce: "ERR/ACE",
    serveErrorsMost: "S ERR",
    serveErrorsLeast: "S ERR",
    serveErrors: "S ERR",
    receptionTotal: "R TOT",
    receptionErrors: "R ERR",
    receptionErrorPct: "R ERR%",
    receptionNegativeMost: "R NEG",
    receptionNegativeLeast: "R NEG",
    receptionNegative: "R NEG",
    receptionNegativePct: "R NEG%",
    receptionPositiveMost: "R POS",
    receptionPositiveLeast: "R POS",
    receptionPositive: "R POS",
    receptionPositivePct: "R POS%",
    receptionExcellentMost: "R EXC",
    receptionExcellentLeast: "R EXC",
    receptionExcellent: "R EXC",
    receptionExcellentPct: "R EXC%",
    receptionEfficiencyPct: "R EFF%",
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
