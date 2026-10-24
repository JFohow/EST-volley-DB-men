import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { allMatchesOptions, type MatchListItem } from "@/lib/matches.queries";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import MultiSelect from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createFileRoute, useRouter, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/matches")({
  head: () => ({
    meta: [
      { title: "Matches — Eesti Võrkpall DB" },
      {
        name: "description",
        content:
          "Complete archive of Estonia Men's National Volleyball Team matches: dates, opponents, competitions, and set scores.",
      },
      { property: "og:title", content: "Matches — Eesti Võrkpall DB" },
      {
        property: "og:description",
        content: "Every match played by the Estonia Men's National Volleyball Team.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(allMatchesOptions()),
  component: MatchesPage,
  errorComponent: MatchesError,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl uppercase italic">No matches</h1>
    </div>
  ),
});

function getLocalizedOpponent(match: MatchListItem, currentLanguage: "et" | "en") {
  return currentLanguage === "et" ? match.opponent : (match.opponent_en ?? match.opponent);
}

function getLocalizedCompetition(match: MatchListItem, currentLanguage: "et" | "en") {
  return currentLanguage === "et" ? match.competition : (match.competition_en ?? match.competition);
}

function MatchesError({ error, reset }: { error: Error; reset: () => void }) {
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
function MatchesPage() {
  const { data: matches } = useSuspenseQuery(allMatchesOptions());
  const { t, i18n } = useTranslation();
  const [matchType, setMatchType] = useState<"ALL" | "OFFICIAL" | "COMPETITIVE" | "NON_OFFICIAL">(
    "OFFICIAL",
  );
  const [statisticsCoverageFilter, setStatisticsCoverageFilter] = useState<
    "all" | "full" | "partial" | "none"
  >("all");
  const [selectedYear, setSelectedYear] = useState<string[]>(["all"]);
  const [selectedCompetition, setSelectedCompetition] = useState<string[]>(["all"]);
  const [selectedOpponent, setSelectedOpponent] = useState<string[]>(["all"]);
  const currentLanguage = i18n.language?.startsWith("et") ? "et" : "en";

  const matchTypeFilteredRows = useMemo(() => {
    return matches.filter((m) => {
      const matchesType =
        matchType === "OFFICIAL"
          ? m.am === true
          : matchType === "COMPETITIVE"
            ? m.vm === true
            : matchType === "NON_OFFICIAL"
              ? m.mam === true
              : true;
      const matchesCoverage =
        statisticsCoverageFilter === "all" ||
        m.statisticsCoverage === statisticsCoverageFilter;

      return matchesType && matchesCoverage;
    });
  }, [matches, matchType, statisticsCoverageFilter]);

  const yearOptions = useMemo(() => {
    const values = new Set<string>();

    matchTypeFilteredRows.forEach((m) => {
      const localizedCompetition = getLocalizedCompetition(m, currentLanguage);
      const localizedOpponent = getLocalizedOpponent(m, currentLanguage);

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

      values.add(new Date(m.match_date).getFullYear().toString());
    });

    return [...values].sort().reverse();
  }, [matchTypeFilteredRows, selectedCompetition, selectedOpponent, currentLanguage]);

  const competitionOptions = useMemo(() => {
    const values = new Set<string>();

    matchTypeFilteredRows.forEach((m) => {
      const localizedCompetition = getLocalizedCompetition(m, currentLanguage);
      const localizedOpponent = getLocalizedOpponent(m, currentLanguage);

      if (!selectedYear.includes("all")) {
        const year = new Date(m.match_date).getFullYear().toString();
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

    return [...values].sort();
  }, [matchTypeFilteredRows, selectedYear, selectedOpponent, currentLanguage]);

  const opponentOptions = useMemo(() => {
    const values = new Set<string>();

    matchTypeFilteredRows.forEach((m) => {
      const localizedCompetition = getLocalizedCompetition(m, currentLanguage);
      const localizedOpponent = getLocalizedOpponent(m, currentLanguage);

      if (!selectedYear.includes("all")) {
        const year = new Date(m.match_date).getFullYear().toString();
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

    return [...values].sort();
  }, [matchTypeFilteredRows, selectedYear, selectedCompetition, currentLanguage]);

  useEffect(() => {
    const allowed = new Set(yearOptions);
    setSelectedYear((current) => {
      if (current.includes("all")) return current;
      const next = current.filter((v) => allowed.has(v));
      return next.length > 0 ? next : ["all"];
    });
  }, [yearOptions]);

  useEffect(() => {
    const allowed = new Set(competitionOptions);
    setSelectedCompetition((current) => {
      if (current.includes("all")) return current;
      const next = current.filter((v) => allowed.has(v));
      return next.length > 0 ? next : ["all"];
    });
  }, [competitionOptions]);

  useEffect(() => {
    const allowed = new Set(opponentOptions);
    setSelectedOpponent((current) => {
      if (current.includes("all")) return current;
      const next = current.filter((v) => allowed.has(v));
      return next.length > 0 ? next : ["all"];
    });
  }, [opponentOptions]);

  const filtered = useMemo(() => {
    return matchTypeFilteredRows.filter((m) => {
      const opponent = getLocalizedOpponent(m, currentLanguage);
      const competition = getLocalizedCompetition(m, currentLanguage);

      if (!selectedYear.includes("all") && selectedYear.length > 0) {
        const year = new Date(m.match_date).getFullYear().toString();
        if (!selectedYear.includes(year)) return false;
      }

      if (!selectedCompetition.includes("all") && selectedCompetition.length > 0) {
        if (!competition || !selectedCompetition.includes(competition)) return false;
      }

      if (!selectedOpponent.includes("all") && selectedOpponent.length > 0) {
        if (!opponent || !selectedOpponent.includes(opponent)) return false;
      }

      return true;
    });
  }, [matchTypeFilteredRows, selectedYear, selectedCompetition, selectedOpponent, currentLanguage]);

  const selectedOpponentRecord = useMemo(() => {
    if (selectedOpponent.includes("all") || selectedOpponent.length === 0) {
      return null;
    }

    const rows = matchTypeFilteredRows.filter((m) => {
      const opponent = getLocalizedOpponent(m, currentLanguage);
      const competition = getLocalizedCompetition(m, currentLanguage);

      if (!selectedYear.includes("all") && selectedYear.length > 0) {
        const year = new Date(m.match_date).getFullYear().toString();
        if (!selectedYear.includes(year)) return false;
      }

      if (!selectedCompetition.includes("all") && selectedCompetition.length > 0) {
        if (!competition || !selectedCompetition.includes(competition)) return false;
      }

      return selectedOpponent.includes(opponent);
    });

    const wins = rows.filter((m) => m.estonia_sets > m.opponent_sets).length;
    const draws = rows.filter((m) => m.estonia_sets === m.opponent_sets).length;
    const losses = rows.filter((m) => m.estonia_sets < m.opponent_sets).length;

    return {
      count: rows.length,
      wins,
      draws,
      losses,
      label:
        selectedOpponent.length === 1
          ? selectedOpponent[0]
          : t("matches.selectedOpponents", { count: selectedOpponent.length }),
    };
  }, [
    matchTypeFilteredRows,
    selectedYear,
    selectedCompetition,
    selectedOpponent,
    currentLanguage,
    t,
  ]);

  const vmMatches = matches.filter((m) => m.vm);
  const vmWins = vmMatches.filter((m) => m.estonia_sets > m.opponent_sets).length;
  const vmLosses = vmMatches.length - vmWins;

  const amMatches = matches.filter((m) => m.am);
  const amWins = amMatches.filter((m) => m.estonia_sets > m.opponent_sets).length;
  const amLosses = amMatches.length - amWins;

  const allMatches = matches.filter((m) => m.am || m.mam);
  const allWins = allMatches.filter((m) => m.estonia_sets > m.opponent_sets).length;
  const allLosses = allMatches.length - allWins;

  return (
    <>
      <div className="text-slate-900">
        <header className="bg-estonia-dark px-6 py-10 text-white">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-4 md:grid-cols-3">
              <StatGroup
                title={t("matches.competitiveMatches")}
                total={vmMatches.length}
                wins={vmWins}
                losses={vmLosses}
              />

              <StatGroup
                title={t("matches.officialMatches")}
                total={amMatches.length}
                wins={amWins}
                losses={amLosses}
              />

              <StatGroup
                title={t("matches.allMatches")}
                total={allMatches.length}
                wins={allWins}
                losses={allLosses}
              />
            </div>
            <p className="mt-4 max-w-5xl text-xs leading-relaxed text-white/55">
              {t("common.databaseExplanation")} {t("matches.additionalSetsInfo")}
            </p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-6 py-10">
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <Segmented
                  value={matchType}
                  onChange={(v) => setMatchType(v as typeof matchType)}
                  options={[
                    { value: "OFFICIAL", label: t("matches.officialMatches") },
                    { value: "COMPETITIVE", label: t("matches.competitiveMatches") },
                    { value: "NON_OFFICIAL", label: t("matches.nonOfficialMatches") },
                    { value: "ALL", label: t("matches.allMatches") },
                  ]}
                />
              </div>

              <div className="shrink-0 text-right text-xs uppercase tracking-widest text-slate-400">
                {filtered.length} match{filtered.length === 1 ? "" : "es"}
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MultiSelect
                options={yearOptions.map((y) => ({ value: y, label: y }))}
                value={selectedYear}
                onChange={(v) =>
                  setSelectedYear(v.length === 0 ? ["all"] : v.includes("all") ? ["all"] : v)
                }
                placeholder={t("matches.filters.allYears")}
                className="w-full"
              />

              <MultiSelect
                options={competitionOptions.map((c) => ({ value: c, label: c }))}
                value={selectedCompetition}
                onChange={(v) =>
                  setSelectedCompetition(v.length === 0 ? ["all"] : v.includes("all") ? ["all"] : v)
                }
                placeholder={t("matches.filters.allCompetitions")}
                className="w-full"
              />

              <MultiSelect
                options={opponentOptions.map((o) => ({ value: o, label: o }))}
                value={selectedOpponent}
                onChange={(v) =>
                  setSelectedOpponent(v.length === 0 ? ["all"] : v.includes("all") ? ["all"] : v)
                }
                placeholder={t("matches.filters.allOpponents")}
                className="w-full"
              />

              <Select
                value={statisticsCoverageFilter}
                onValueChange={(value) =>
                  setStatisticsCoverageFilter(value as typeof statisticsCoverageFilter)
                }
              >
                <SelectTrigger className="w-full" aria-label={t("matches.filters.statisticsCoverage")}>
                  <SelectValue placeholder={t("matches.filters.allStatistics")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("matches.filters.allStatistics")}</SelectItem>
                  <SelectItem value="full">{t("matches.filters.fullStatistics")}</SelectItem>
                  <SelectItem value="partial">{t("matches.filters.partialStatistics")}</SelectItem>
                  <SelectItem value="none">{t("matches.filters.withoutStatistics")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {selectedOpponentRecord ? (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {t("matches.opponentRecordTitle", { opponent: selectedOpponentRecord.label })}
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <RecordKpi label={t("common.total")} value={selectedOpponentRecord.count} />
                <RecordKpi label={t("common.wins")} value={selectedOpponentRecord.wins} />
                <RecordKpi label={t("common.draws")} value={selectedOpponentRecord.draws} />
                <RecordKpi label={t("common.losses")} value={selectedOpponentRecord.losses} />
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-13 gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 md:grid">
              <div className="col-span-2 text-center">{t("matches.date")}</div>

              <div className="col-span-3 text-center">{t("matches.opponent")}</div>

              <div className="col-span-3 text-center">{t("matches.score")}</div>

              <div className="col-span-2 text-center">{t("matches.competition")}</div>

              <div className="col-span-2 text-center">{t("matches.city")}</div>

              <div className="col-span-1 text-center">{t("matches.statistics")}</div>
            </div>
            {filtered.length === 0 ? (
              <div className="p-12 text-center">
                <p className="font-display text-xl uppercase italic text-slate-400">
                  {t("common.noResults")}
                </p>
                <p className="mt-2 text-sm text-slate-500">Adjust filters or clear the search.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((m) => (
                  <MatchRow key={m.match_id} match={m} matchType={matchType} />
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>

      <Outlet />
    </>
  );
}

function RecordKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <div className="font-display text-2xl text-slate-900">{value.toLocaleString("en-US")}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-l-2 border-estonia-blue pl-4 text-center">
      <div className="font-display text-3xl">{value.toLocaleString("en-US")}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest opacity-60">{label}</div>
    </div>
  );
}

function StatGroup({
  title,
  total,
  wins,
  losses,
}: {
  title: string;
  total: number;
  wins: number;
  losses: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-white/20 bg-white/5 p-4">
      <div className="mb-4 border-b border-white/10 pb-2 text-center text-xs font-bold uppercase tracking-[0.22em] text-white sm:text-sm">
        {title}
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <Kpi label={t("common.total")} value={total} />
        <Kpi label={t("common.wins")} value={wins} />
        <Kpi label={t("common.losses")} value={losses} />
      </div>
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid w-full grid-cols-2 overflow-hidden rounded-md border border-slate-200 bg-white text-xs font-semibold uppercase tracking-[0.12em] sm:grid-cols-4">
      {options.map((o, index) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-11 min-w-0 px-2 py-2 text-center text-[10px] leading-tight transition-colors sm:px-3 sm:text-xs ${index % 2 === 0 ? "border-r border-slate-200" : ""} ${index < 2 ? "border-b border-slate-200 sm:border-b-0" : ""} ${index < 3 ? "sm:border-r" : ""} ${active ? "bg-estonia-dark text-white" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function MatchRow({
  match,
  matchType,
}: {
  match: MatchListItem;
  matchType: "ALL" | "OFFICIAL" | "COMPETITIVE" | "NON_OFFICIAL";
}) {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language?.startsWith("et") ? "et" : "en";
  const resultStyle =
    match.estonia_sets > match.opponent_sets
      ? "text-estonia-blue"
      : match.estonia_sets === match.opponent_sets
        ? "text-green-700"
        : "text-red-700";
  const opponent =
    currentLanguage === "et" ? match.opponent : (match.opponent_en ?? match.opponent);
  const competition =
    currentLanguage === "et" ? match.competition : (match.competition_en ?? match.competition);
  const city = currentLanguage === "et" ? match.city : (match.city_en ?? match.city);
  const officialSetsPlayed = match.estonia_sets + match.opponent_sets;
  const officialSetScores = (match.match_sets ?? [])
    .filter((set) => set.set_number <= 5)
    .map((set) => `${set.estonia_points}:${set.opponent_points}`)
    .join(" • ");
  const additionalSetScores = (match.match_sets ?? [])
    .filter((set) => set.set_number > 5)
    .map((set) => `${set.estonia_points}:${set.opponent_points}`)
    .join(" • ");
  const hasAdditionalSets = match.has_additional_sets && additionalSetScores !== "";
  const scoreTarget =
    matchType === "ALL" && hasAdditionalSets
      ? `/match/${match.match_id}/all`
      : `/match/${match.match_id}`;
  const detailLine = match.notes;
  const statsIconClass =
    match.match_unavailable_stats.length > 0
      ? "text-amber-600 hover:text-amber-700"
      : match.statsCoverage === "full"
        ? "text-emerald-600 hover:text-emerald-700"
        : match.statsCoverage === "playersOnly"
          ? "text-red-600 hover:text-red-700"
          : "text-slate-500 hover:text-slate-500 opacity-70";
  const statsTitle =
    match.statsCoverage === "full"
      ? t("matches.stats_full")
      : match.statsCoverage === "playersOnly"
        ? t("matches.stats_players_only")
        : t("matches.stats_none");

  return (
    <li
      className={`grid grid-cols-1 gap-2 px-6 py-2 transition-colors hover:bg-slate-50 md:grid-cols-13 md:items-center md:gap-3 ${match.am ? "bg-white" : "bg-slate-100"
        }`}
    >
      <div className="col-span-2 text-center text-slate-500">
        {new Date(match.match_date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </div>

      <div className="col-span-3 flex items-center justify-center gap-2 text-center">
        <span className="font-display text-2xl uppercase text-slate-900">{opponent || "—"}</span>
      </div>

      <div className="col-span-3 flex items-center justify-center">
        <div className={`min-w-[110px] rounded-lg px-3 py-1 text-center ${resultStyle}`}>
          <a
            href={scoreTarget}
            className="font-display text-2xl leading-none underline-offset-2 hover:underline"
          >
            {match.estonia_sets}–{match.opponent_sets}
          </a>

          {officialSetScores ? (
            <div className="mt-1 text-xs font-medium text-slate-700">{officialSetScores}</div>
          ) : null}

          {matchType === "ALL" && hasAdditionalSets && (
            <div className="mt-1 text-center text-[10px] italic text-amber-700">
              <span className="font-medium">
                {t("matches.additional_set", {
                  count: match.additional_sets_count,
                })}
              </span>
              {": "}
              <span>{additionalSetScores}</span>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-2 text-center text-sm font-medium text-slate-700">
        {competition ?? "—"}
      </div>

      <div className="col-span-2 text-center text-sm text-slate-500">{city ?? "—"}</div>

      <div className="col-span-1 flex justify-center gap-1">
        <a
          href={`/match/${match.match_id}`}
          title={statsTitle}
          className={`transition-colors ${statsIconClass}`}
        >
          <FileText className="h-5 w-5" />
        </a>

        {/* additional sets link removed: match page now supports toggling official/all stats */}
      </div>

      {detailLine ? (
        <div className="col-span-13 text-center text-xs italic text-slate-500">{detailLine}</div>
      ) : null}
    </li>
  );
}
