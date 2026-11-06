import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import MultiSelect from "@/components/ui/multi-select";
import {
    buildTriviaFilterOptions,
    buildTriviaModeData,
    triviaOptions,
    type TriviaCityRow,
    type TriviaEra,
    type TriviaMatchDurationRow,
    type TriviaMatchLength,
    type TriviaMatchTotalRow,
    type TriviaMode,
    type TriviaSetRow,
} from "@/lib/trivia.queries";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/trivia")({
    head: () => ({
        meta: [
            { title: "Trivia — Estonian Men's National Team Database" },
            {
                name: "description",
                content: "Top 10 trivia lists from Estonia Men's National Volleyball match data.",
            },
        ],
    }),
    loader: ({ context }) => context.queryClient.ensureQueryData(triviaOptions()),
    component: TriviaPage,
});

type Section = {
    key: string;
    title: string;
    content: ReactNode;
};

type TriviaText = {
    rank: string;
    city: string;
    matches: string;
    won: string;
    draw: string;
    lost: string;
    wonPct: string;
    share: string;
    years: string;
    date: string;
    opponent: string;
    score: string;
    competition: string;
    estoniaPoints: string;
    opponentPoints: string;
    setScore: string;
    durationMinutes: string;
    matchType: string;
    era: string;
    eras: {
        twentyFive: string;
        twoSet: string;
        fifteen: string;
        all: string;
    };
    matchLength: string;
    setsLabel: (sets: number) => string;
    sections: {
        topCities: string;
        topAbroadCities: string;
        leastEstPoints: string;
        leastOppPoints: string;
        mostEstPoints: string;
        mostOppPoints: string;
        highestScoringSets: string;
        lowestScoringSets: string;
        shortestSetDuration: string;
        longestSetDuration: string;
        shortestMatchDuration: string;
        longestMatchDuration: string;
    };
};

function TriviaPage() {
    const { data } = useSuspenseQuery(triviaOptions());
    const { i18n, t } = useTranslation();
    const [mode, setMode] = useState<TriviaMode>("official");
    const [era, setEra] = useState<TriviaEra>("25");
    const [matchLength, setMatchLength] = useState<TriviaMatchLength>(5);
    const [years, setYears] = useState<string[]>([]);
    const [competitions, setCompetitions] = useState<string[]>([]);
    const [opponents, setOpponents] = useState<string[]>([]);
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [navHeight, setNavHeight] = useState(0);

    useEffect(() => {
        const nav = document.querySelector("nav");
        if (!nav) return;
        const updateNavHeight = () => setNavHeight(nav.getBoundingClientRect().height);
        updateNavHeight();
        const observer = new ResizeObserver(updateNavHeight);
        observer.observe(nav);
        return () => observer.disconnect();
    }, []);

    const isEstonian = i18n.language?.startsWith("et") ?? false;

    const text: TriviaText = isEstonian
        ? {
            rank: "Koht",
            city: "Linn",
            matches: "Mange",
            won: "Võidud",
            draw: "Viigid",
            lost: "Kaotused",
            wonPct: "Võidu %",
            share: "Osakaal",
            years: "Aastad",
            date: "Kuupaev",
            opponent: "Vastane",
            score: "Skor",
            competition: "Voistlus",
            estoniaPoints: "Eesti punktid",
            opponentPoints: "Vastase punktid",
            setScore: "Geimi skoor",
            durationMinutes: "Minutid",
            matchType: "Mangu tuup",
            era: "Ajajärk",
            eras: {
                twentyFive: "25 punkti",
                twoSet: "2 geimi",
                fifteen: "15 punkti",
                all: "Kõik ajajärgud",
            },
            matchLength: "Mängu pikkus",
            setsLabel: (sets) => `${sets} geimi`,
            sections: {
                topCities: "Linnad, kus mangitud koige rohkem",
                topAbroadCities: "Valismaa linnad, kus mangitud koige rohkem",
                leastEstPoints: "Mangud koige vahemate Eesti punktidega",
                leastOppPoints: "Mangud koige vahemate vastase punktidega",
                mostEstPoints: "Mangud koige rohkemate Eesti punktidega",
                mostOppPoints: "Mangud koige rohkemate vastase punktidega",
                highestScoringSets: "Koige suurema punktisummaga geimid",
                lowestScoringSets: "Koige vaiksema punktisummaga geimid",
                shortestSetDuration: "Luhimad geimid minutites",
                longestSetDuration: "Pikimad geimid minutites",
                shortestMatchDuration: "Luhimad mangud minutites",
                longestMatchDuration: "Pikimad mangud minutites",
            },
        }
        : {
            rank: "Rank",
            city: "City",
            matches: "Matches",
            won: "Won",
            draw: "Draw",
            lost: "Lost",
            wonPct: "Won %",
            share: "Share",
            years: "Years",
            date: "Date",
            opponent: "Opponent",
            score: "Score",
            competition: "Competition",
            estoniaPoints: "Estonia points",
            opponentPoints: "Opponent points",
            setScore: "Set Score",
            durationMinutes: "Minutes",
            matchType: "Match type",
            era: "Era",
            eras: {
                twentyFive: "25 point era",
                twoSet: "2 set era",
                fifteen: "15 point era",
                all: "All eras",
            },
            matchLength: "Match length",
            setsLabel: (sets) => `${sets} Sets`,
            sections: {
                topCities: "Cities where played the most",
                topAbroadCities: "Cities abroad where played the most",
                leastEstPoints: "Matches with least Estonia points",
                leastOppPoints: "Matches with least opponent points",
                mostEstPoints: "Matches with most Estonia points",
                mostOppPoints: "Matches with most opponent points",
                highestScoringSets: "Highest scoring sets",
                lowestScoringSets: "Lowest scoring sets",
                shortestSetDuration: "Shortest set in minutes",
                longestSetDuration: "Longest set in minutes",
                shortestMatchDuration: "Shortest match in minutes",
                longestMatchDuration: "Longest match in minutes",
            },
        };

    const filters = useMemo(
        () => ({ mode, era, matchLength, years, competitions, opponents }),
        [mode, era, matchLength, years, competitions, opponents],
    );

    const modeData = useMemo(() => buildTriviaModeData(data, filters), [data, filters]);

    const filterOptions = useMemo(
        () => buildTriviaFilterOptions(data, filters, !isEstonian),
        [data, filters, isEstonian],
    );

    const renderCitySummary = (row: TriviaCityRow | undefined): ReactNode => {
        if (!row) return "—";
        const name = isEstonian ? row.city : (row.cityEn ?? row.city);
        return (
            <span className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                <span className="font-display text-base uppercase">{name}</span>
                <span className="text-slate-600">
                    {text.matches}: <span className="text-estonia-dark">{row.count}</span>
                </span>
                <span className="text-slate-600">
                    {text.share}: <span className="text-estonia-dark">{row.share.toFixed(1)}%</span>
                </span>
                <span className="text-slate-600">
                    {text.years}:{" "}
                    <span className="text-estonia-dark">
                        {row.firstYear === row.lastYear ? row.firstYear : `${row.firstYear}–${row.lastYear}`}
                    </span>
                </span>
            </span>
        );
    };

    const getSectionSummary = (sectionKey: string): ReactNode => {
        switch (sectionKey) {
            case "topCities":
                return renderCitySummary(modeData.topCities[0]);
            case "topAbroadCities":
                return renderCitySummary(modeData.topAbroadCities[0]);
            case "leastEstPoints": {
                const row = modeData.leastEstoniaPointsMatches[0];
                return row ? `${row.estoniaSets}-${row.opponentSets} • ${row.estoniaPoints}` : "—";
            }
            case "leastOppPoints": {
                const row = modeData.leastOpponentPointsMatches[0];
                return row ? `${row.estoniaSets}-${row.opponentSets} • ${row.opponentPoints}` : "—";
            }
            case "mostEstPoints": {
                const row = modeData.mostEstoniaPointsMatches[0];
                return row ? `${row.estoniaSets}-${row.opponentSets} • ${row.estoniaPoints}` : "—";
            }
            case "mostOppPoints": {
                const row = modeData.mostOpponentPointsMatches[0];
                return row ? `${row.estoniaSets}-${row.opponentSets} • ${row.opponentPoints}` : "—";
            }
            case "highestScoringSets": {
                const row = modeData.highestScoringSets[0];
                return row ? `${row.estoniaPoints}-${row.opponentPoints} • ${row.estoniaSets}-${row.opponentSets}` : "—";
            }
            case "lowestScoringSets": {
                const row = modeData.lowestScoringSets[0];
                return row ? `${row.estoniaPoints}-${row.opponentPoints} • ${row.estoniaSets}-${row.opponentSets}` : "—";
            }
            case "shortestSetDuration": {
                const row = modeData.shortestSets[0];
                return row ? `${row.estoniaPoints}-${row.opponentPoints} • ${row.setDuration} min` : "—";
            }
            case "longestSetDuration": {
                const row = modeData.longestSets[0];
                return row ? `${row.estoniaPoints}-${row.opponentPoints} • ${row.setDuration} min` : "—";
            }
            case "shortestMatchDuration": {
                const row = modeData.shortestMatches[0];
                return row ? `${row.estoniaSets}-${row.opponentSets} • ${row.durationMinutes} min` : "—";
            }
            case "longestMatchDuration": {
                const row = modeData.longestMatches[0];
                return row ? `${row.estoniaSets}-${row.opponentSets} • ${row.durationMinutes} min` : "—";
            }
            default:
                return "—";
        }
    };

    const sections: Section[] = [
        {
            key: "topCities",
            title: text.sections.topCities,
            content: <CitiesTable rows={modeData.topCities} isEstonian={isEstonian} text={text} />,
        },
        {
            key: "topAbroadCities",
            title: text.sections.topAbroadCities,
            content: <CitiesTable rows={modeData.topAbroadCities} isEstonian={isEstonian} text={text} />,
        },
        {
            key: "leastEstPoints",
            title: text.sections.leastEstPoints,
            content: (
                <MatchPointsTable
                    rows={modeData.leastEstoniaPointsMatches}
                    isEstonian={isEstonian}
                    text={text}
                    pointsKey="estoniaPoints"
                />
            ),
        },
        {
            key: "leastOppPoints",
            title: text.sections.leastOppPoints,
            content: (
                <MatchPointsTable
                    rows={modeData.leastOpponentPointsMatches}
                    isEstonian={isEstonian}
                    text={text}
                    pointsKey="opponentPoints"
                />
            ),
        },
        {
            key: "mostEstPoints",
            title: text.sections.mostEstPoints,
            content: (
                <MatchPointsTable
                    rows={modeData.mostEstoniaPointsMatches}
                    isEstonian={isEstonian}
                    text={text}
                    pointsKey="estoniaPoints"
                />
            ),
        },
        {
            key: "mostOppPoints",
            title: text.sections.mostOppPoints,
            content: (
                <MatchPointsTable
                    rows={modeData.mostOpponentPointsMatches}
                    isEstonian={isEstonian}
                    text={text}
                    pointsKey="opponentPoints"
                />
            ),
        },
        {
            key: "highestScoringSets",
            title: text.sections.highestScoringSets,
            content: <SetsTable rows={modeData.highestScoringSets} isEstonian={isEstonian} text={text} />,
        },
        {
            key: "lowestScoringSets",
            title: text.sections.lowestScoringSets,
            content: <SetsTable rows={modeData.lowestScoringSets} isEstonian={isEstonian} text={text} />,
        },
        {
            key: "shortestSetDuration",
            title: text.sections.shortestSetDuration,
            content: (
                <SetsTable rows={modeData.shortestSets} isEstonian={isEstonian} text={text} showDuration />
            ),
        },
        {
            key: "longestSetDuration",
            title: text.sections.longestSetDuration,
            content: (
                <SetsTable rows={modeData.longestSets} isEstonian={isEstonian} text={text} showDuration />
            ),
        },
        {
            key: "shortestMatchDuration",
            title: text.sections.shortestMatchDuration,
            content: (
                <MatchDurationTable rows={modeData.shortestMatches} isEstonian={isEstonian} text={text} />
            ),
        },
        {
            key: "longestMatchDuration",
            title: text.sections.longestMatchDuration,
            content: (
                <MatchDurationTable rows={modeData.longestMatches} isEstonian={isEstonian} text={text} />
            ),
        },
    ];

    return (
        <main className="mx-auto w-full max-w-[1400px] px-6 py-10 text-slate-900">
            <div
                style={{ top: navHeight }}
                className="sticky z-30 mb-6 rounded-2xl bg-estonia-dark p-6 text-white shadow-sm md:p-8"
            >
                <div className="grid gap-5 lg:grid-cols-3">
                    <FilterGroup label={text.matchType}>
                        {(["official", "competitive", "nonCompetitive", "all"] as TriviaMode[]).map(
                            (currentMode) => (
                                <FilterButton
                                    key={currentMode}
                                    active={mode === currentMode}
                                    onClick={() => setMode(currentMode)}
                                >
                                    {t(`statistics.filters.${currentMode}`)}
                                </FilterButton>
                            ),
                        )}
                    </FilterGroup>

                    <FilterGroup label={text.era}>
                        {(
                            [
                                { value: "25", label: text.eras.twentyFive },
                                { value: "2set", label: text.eras.twoSet },
                                { value: "15", label: text.eras.fifteen },
                                { value: "all", label: text.eras.all },
                            ] as { value: TriviaEra; label: string }[]
                        ).map((option) => (
                            <FilterButton
                                key={option.value}
                                active={era === option.value}
                                onClick={() => setEra(option.value)}
                            >
                                {option.label}
                            </FilterButton>
                        ))}
                    </FilterGroup>

                    <FilterGroup label={text.matchLength} columns={3}>
                        {(
                            [
                                { value: 3, label: text.setsLabel(3) },
                                { value: 4, label: text.setsLabel(4) },
                                { value: 5, label: text.setsLabel(5) },
                            ] as { value: TriviaMatchLength; label: string }[]
                        ).map((option) => (
                            <FilterButton
                                key={option.value}
                                active={matchLength === option.value}
                                onClick={() => setMatchLength(option.value)}
                            >
                                {option.label}
                            </FilterButton>
                        ))}
                    </FilterGroup>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    <MultiSelect
                        options={filterOptions.years.map((year) => ({ value: year, label: year }))}
                        value={years}
                        onChange={(next) => setYears(next.filter((value) => value !== "all"))}
                        placeholder={t("players.statsFilter.allYears")}
                        className="w-full"
                    />
                    <MultiSelect
                        options={filterOptions.competitions}
                        value={competitions}
                        onChange={(next) => setCompetitions(next.filter((value) => value !== "all"))}
                        placeholder={t("players.statsFilter.allCompetitions")}
                        className="w-full"
                    />
                    <MultiSelect
                        options={filterOptions.opponents}
                        value={opponents}
                        onChange={(next) => setOpponents(next.filter((value) => value !== "all"))}
                        placeholder={t("players.statsFilter.allOpponents")}
                        className="w-full"
                    />
                </div>
            </div>

            <section className="space-y-6">
                {sections.map((section) => {
                    const isExpanded = expandedSection === section.key;
                    const summary = getSectionSummary(section.key);

                    return (
                        <article
                            key={section.key}
                            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setExpandedSection((current) => (current === section.key ? null : section.key))
                                }
                                className="flex w-full items-center gap-4 bg-slate-50 px-4 py-3 text-left sm:px-5"
                            >
                                <h2 className="min-w-0 flex-1 font-display text-xl uppercase italic text-estonia-dark sm:text-2xl">
                                    {section.title}
                                </h2>
                                <div className="min-w-0 shrink text-sm font-semibold text-estonia-dark">{summary}</div>
                                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-slate-500 bg-white text-base font-bold text-slate-900 shadow-sm">
                                    {isExpanded ? "▴" : "▾"}
                                </span>
                            </button>
                            {isExpanded && (
                                <div className="border-t border-slate-200 p-3 sm:p-4">{section.content}</div>
                            )}
                        </article>
                    );
                })}
            </section>
        </main>
    );
}

function FilterGroup({
    label,
    columns = 2,
    children,
}: {
    label: string;
    columns?: 2 | 3;
    children: ReactNode;
}) {
    return (
        <div className="text-center">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">{label}</div>
            <div
                className={`mx-auto grid w-full max-w-[440px] gap-2 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}
            >
                {children}
            </div>
        </div>
    );
}

function FilterButton({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`min-h-10 w-full rounded-md border px-2 py-2 text-xs font-semibold uppercase leading-tight tracking-[0.12em] break-words transition ${
                active
                    ? "border-estonia-blue bg-estonia-blue text-white"
                    : "border-white/30 bg-white/10 text-white/90 hover:bg-white/20"
            }`}
        >
            {children}
        </button>
    );
}

function getScoreStyle(estoniaScore: number, opponentScore: number): string {
    if (estoniaScore > opponentScore) return "text-estonia-blue";
    if (estoniaScore < opponentScore) return "text-red-700";
    return "text-green-700";
}

function CitiesTable({
    rows,
    isEstonian,
    text,
}: {
    rows: TriviaCityRow[];
    isEstonian: boolean;
    text: TriviaText;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-50">
                    <tr className="text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <th className="px-3 py-3">{text.rank}</th>
                        <th className="px-3 py-3">{text.city}</th>
                        <th className="px-3 py-3 text-center">{text.matches}</th>
                        <th className="px-3 py-3 text-center">{text.won}</th>
                        <th className="px-3 py-3 text-center">{text.draw}</th>
                        <th className="px-3 py-3 text-center">{text.lost}</th>
                        <th className="px-3 py-3 text-center">{text.wonPct}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => {
                        const city = isEstonian ? row.city : (row.cityEn ?? row.city);
                        return (
                            <tr
                                key={`${row.city}-${index}`}
                                className="border-b border-slate-100 last:border-b-0"
                            >
                                <td className="px-2 py-2 font-semibold text-slate-500">{index + 1}</td>
                                <td className="px-2 py-2 font-medium text-slate-800">{city}</td>
                                <td className="px-2 py-2 text-center font-semibold text-estonia-dark">
                                    {row.count}
                                </td>
                                <td className="px-2 py-2 text-center text-slate-700">{row.won}</td>
                                <td className="px-2 py-2 text-center text-slate-700">{row.draw}</td>
                                <td className="px-2 py-2 text-center text-slate-700">{row.lost}</td>
                                <td className="px-2 py-2 text-center font-semibold text-estonia-dark">
                                    {row.wonPct.toFixed(1)}%
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function MatchPointsTable({
    rows,
    isEstonian,
    text,
    pointsKey,
}: {
    rows: TriviaMatchTotalRow[];
    isEstonian: boolean;
    text: TriviaText;
    pointsKey: "estoniaPoints" | "opponentPoints";
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="bg-slate-50">
                    <tr className="text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <th className="px-3 py-3">{text.rank}</th>
                        <th className="px-3 py-3">{text.date}</th>
                        <th className="px-3 py-3">{text.opponent}</th>
                        <th className="px-3 py-3 text-center">{text.score}</th>
                        <th className="px-3 py-3 text-right">
                            {pointsKey === "estoniaPoints" ? text.estoniaPoints : text.opponentPoints}
                        </th>
                        <th className="px-3 py-3">{text.competition}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => {
                        const opponent = isEstonian ? row.opponent : (row.opponentEn ?? row.opponent);
                        const competition = isEstonian
                            ? row.competition
                            : (row.competitionEn ?? row.competition);
                        const scoreTarget = row.hasAdditionalSets
                            ? `/match/${row.matchId}/all`
                            : `/match/${row.matchId}`;
                        const scoreStyle = getScoreStyle(row.estoniaSets, row.opponentSets);

                        return (
                            <tr
                                key={`${row.matchId}-${index}`}
                                className="border-b border-slate-100 last:border-b-0"
                            >
                                <td className="px-2 py-2 font-semibold text-slate-500">{index + 1}</td>
                                <td className="px-2 py-2">{new Date(row.matchDate).toLocaleDateString("en-GB")}</td>
                                <td className="px-2 py-2 font-medium text-slate-800">{opponent}</td>
                                <td className="px-2 py-2 text-center font-semibold">
                                    <a href={scoreTarget} className={`${scoreStyle} hover:underline`}>
                                        {row.estoniaSets}-{row.opponentSets}
                                    </a>
                                </td>
                                <td className="px-2 py-2 text-right font-semibold text-estonia-dark">
                                    {row[pointsKey]}
                                </td>
                                <td className="px-2 py-2 text-slate-600">{competition ?? "-"}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function SetsTable({
    rows,
    isEstonian,
    text,
    showDuration = false,
}: {
    rows: TriviaSetRow[];
    isEstonian: boolean;
    text: TriviaText;
    showDuration?: boolean;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="bg-slate-50">
                    <tr className="text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <th className="px-3 py-3">{text.rank}</th>
                        <th className="px-3 py-3">{text.date}</th>
                        <th className="px-3 py-3">{text.opponent}</th>
                        <th className="px-3 py-3 text-center">{text.score}</th>
                        <th className="px-3 py-3 text-center">{text.setScore}</th>
                        {showDuration && <th className="px-3 py-3 text-center">{text.durationMinutes}</th>}
                        <th className="px-3 py-3">{text.competition}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => {
                        const opponent = isEstonian ? row.opponent : (row.opponentEn ?? row.opponent);
                        const competition = isEstonian
                            ? row.competition
                            : (row.competitionEn ?? row.competition);
                        const scoreStyle = getScoreStyle(row.estoniaSets, row.opponentSets);
                        const setResultStyle = getScoreStyle(row.estoniaPoints, row.opponentPoints);
                        const scoreTarget = row.hasAdditionalSets
                            ? `/match/${row.matchId}/all`
                            : `/match/${row.matchId}`;

                        return (
                            <tr
                                key={`${row.matchId}-${row.setNumber}-${index}`}
                                className="border-b border-slate-100 last:border-b-0"
                            >
                                <td className="px-2 py-2 font-semibold text-slate-500">{index + 1}</td>
                                <td className="px-2 py-2">{new Date(row.matchDate).toLocaleDateString("en-GB")}</td>
                                <td className="px-2 py-2 font-medium text-slate-800">{opponent}</td>
                                <td className="px-2 py-2 text-center font-semibold">
                                    <a href={scoreTarget} className={`${scoreStyle} hover:underline`}>
                                        {row.estoniaSets}-{row.opponentSets}
                                    </a>
                                </td>
                                <td className="px-2 py-2 text-center font-semibold">
                                    <a href={scoreTarget} className={`${setResultStyle} hover:underline`}>
                                        {row.estoniaPoints}-{row.opponentPoints}
                                    </a>
                                </td>
                                {showDuration && (
                                    <td className="px-2 py-2 text-center font-semibold text-estonia-dark">
                                        {typeof row.setDuration === "number" ? row.setDuration : "-"}
                                    </td>
                                )}
                                <td className="px-2 py-2 text-slate-600">{competition ?? "-"}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function MatchDurationTable({
    rows,
    isEstonian,
    text,
}: {
    rows: TriviaMatchDurationRow[];
    isEstonian: boolean;
    text: TriviaText;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] border-collapse text-sm">
                <thead className="bg-slate-50">
                    <tr className="text-left text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <th className="px-3 py-3">{text.rank}</th>
                        <th className="px-3 py-3">{text.date}</th>
                        <th className="px-3 py-3">{text.opponent}</th>
                        <th className="px-3 py-3 text-center">{text.score}</th>
                        <th className="px-3 py-3 text-center">{text.durationMinutes}</th>
                        <th className="px-3 py-3">{text.competition}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => {
                        const opponent = isEstonian ? row.opponent : (row.opponentEn ?? row.opponent);
                        const competition = isEstonian
                            ? row.competition
                            : (row.competitionEn ?? row.competition);
                        const scoreTarget = row.hasAdditionalSets
                            ? `/match/${row.matchId}/all`
                            : `/match/${row.matchId}`;
                        const scoreStyle = getScoreStyle(row.estoniaSets, row.opponentSets);

                        return (
                            <tr
                                key={`${row.matchId}-${index}`}
                                className="border-b border-slate-100 last:border-b-0"
                            >
                                <td className="px-2 py-2 font-semibold text-slate-500">{index + 1}</td>
                                <td className="px-2 py-2">{new Date(row.matchDate).toLocaleDateString("en-GB")}</td>
                                <td className="px-2 py-2 font-medium text-slate-800">{opponent}</td>
                                <td className="px-2 py-2 text-center font-semibold">
                                    <a href={scoreTarget} className={`${scoreStyle} hover:underline`}>
                                        {row.estoniaSets}-{row.opponentSets}
                                    </a>
                                </td>
                                <td className="px-2 py-2 text-center font-semibold text-estonia-dark">
                                    {row.durationMinutes}
                                </td>
                                <td className="px-2 py-2 text-slate-600">{competition ?? "-"}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
