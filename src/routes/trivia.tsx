import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import {
    triviaOptions,
    type TriviaCityRow,
    type TriviaMatchDurationRow,
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
    intro: string;
    rank: string;
    city: string;
    matches: string;
    date: string;
    opponent: string;
    score: string;
    competition: string;
    estoniaPoints: string;
    opponentPoints: string;
    setScore: string;
    durationMinutes: string;
    matchType: string;
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
    const [expandedSection, setExpandedSection] = useState<string | null>("topCities");

    const isEstonian = i18n.language?.startsWith("et") ?? false;

    const text: TriviaText = isEstonian
        ? {
            intro: "Siit saab leida triviaalseid statistilisi noppeid Eesti meeste koondise kohta.",
            rank: "#",
            city: "Linn",
            matches: "Mange",
            date: "Kuupaev",
            opponent: "Vastane",
            score: "Skor",
            competition: "Voistlus",
            estoniaPoints: "Eesti punktid",
            opponentPoints: "Vastase punktid",
            setScore: "Geimi skoor",
            durationMinutes: "Minutid",
            matchType: "Mangu tuup",
            sections: {
                topCities: "Linnad, kus Eesti on koige rohkem manginud",
                topAbroadCities: "Linnad, kus Eesti on valismaal koige rohkem manginud",
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
            intro:
                "Here one can find trivial statistical slices about Estonian Men's National Volleyball Team.",
            rank: "#",
            city: "City",
            matches: "Matches",
            date: "Date",
            opponent: "Opponent",
            score: "Score",
            competition: "Competition",
            estoniaPoints: "Estonia points",
            opponentPoints: "Opponent points",
            setScore: "Set Score",
            durationMinutes: "Minutes",
            matchType: "Match type",
            sections: {
                topCities: "Cities where Estonia has played the most",
                topAbroadCities: "Cities where Estonia has played the most abroad",
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

    const modeData = data[mode];

    const getSectionSummary = (sectionKey: string): string => {
        switch (sectionKey) {
            case "topCities": {
                const row = modeData.topCities[0];
                return row ? `${row.city} — ${row.count}` : "—";
            }
            case "topAbroadCities": {
                const row = modeData.topAbroadCities[0];
                return row ? `${row.city} — ${row.count}` : "—";
            }
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
        <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 sm:py-10 lg:px-14">
            <header className="rounded-2xl bg-estonia-dark p-6 text-white shadow-sm md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                            {t("nav.trivia")}
                        </div>
                        <h1 className="mt-2 font-display text-4xl uppercase italic leading-tight sm:text-5xl md:text-6xl">
                            {t("nav.trivia")}
                        </h1>
                        <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">{text.intro}</p>
                    </div>

                    <div className="w-full max-w-[520px] rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
                            {text.matchType}
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {(["official", "competitive", "nonCompetitive", "all"] as TriviaMode[]).map(
                                (currentMode) => (
                                    <button
                                        key={currentMode}
                                        type="button"
                                        onClick={() => setMode(currentMode)}
                                        className={`rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${mode === currentMode
                                            ? "border-estonia-blue bg-estonia-blue text-white"
                                            : "border-white/20 bg-white/10 text-white/90 hover:bg-white/20"
                                            }`}
                                    >
                                        {t(`statistics.filters.${currentMode}`)}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <section className="mt-8 space-y-3">
                {sections.map((section) => {
                    const isExpanded = expandedSection === section.key;
                    const summary = getSectionSummary(section.key);

                    return (
                        <article
                            key={section.key}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setExpandedSection((current) => (current === section.key ? null : section.key))
                                }
                                className="flex w-full items-center gap-4 px-4 py-3 text-left sm:px-5"
                            >
                                <div className="w-8 shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                    #1
                                </div>
                                <h2 className="min-w-0 flex-1 truncate font-display text-lg uppercase italic text-slate-900 sm:text-xl">
                                    {section.title}
                                </h2>
                                <div className="shrink-0 text-sm font-semibold text-estonia-dark">{summary}</div>
                                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-slate-300 bg-white text-base font-bold text-slate-800">
                                    {isExpanded ? "▴" : "▾"}
                                </div>
                            </button>
                            {isExpanded && (
                                <div className="border-t border-slate-100 p-4 sm:p-5">{section.content}</div>
                            )}
                        </article>
                    );
                })}
            </section>
        </main>
    );
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
                <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-2">{text.rank}</th>
                        <th className="px-2 py-2">{text.city}</th>
                        <th className="px-2 py-2 text-right">{text.matches}</th>
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
                                <td className="px-2 py-2 text-right font-semibold text-estonia-dark">
                                    {row.count}
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
                <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-2">{text.rank}</th>
                        <th className="px-2 py-2">{text.date}</th>
                        <th className="px-2 py-2">{text.opponent}</th>
                        <th className="px-2 py-2 text-center">{text.score}</th>
                        <th className="px-2 py-2 text-right">
                            {pointsKey === "estoniaPoints" ? text.estoniaPoints : text.opponentPoints}
                        </th>
                        <th className="px-2 py-2">{text.competition}</th>
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

                        return (
                            <tr
                                key={`${row.matchId}-${index}`}
                                className="border-b border-slate-100 last:border-b-0"
                            >
                                <td className="px-2 py-2 font-semibold text-slate-500">{index + 1}</td>
                                <td className="px-2 py-2">{new Date(row.matchDate).toLocaleDateString("en-GB")}</td>
                                <td className="px-2 py-2 font-medium text-slate-800">{opponent}</td>
                                <td className="px-2 py-2 text-center font-semibold">
                                    <a href={scoreTarget} className="text-estonia-blue hover:underline">
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
                <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-2">{text.rank}</th>
                        <th className="px-2 py-2">{text.date}</th>
                        <th className="px-2 py-2">{text.opponent}</th>
                        <th className="px-2 py-2 text-center">{text.score}</th>
                        <th className="px-2 py-2 text-center">{text.setScore}</th>
                        {showDuration && <th className="px-2 py-2 text-right">{text.durationMinutes}</th>}
                        <th className="px-2 py-2">{text.competition}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => {
                        const opponent = isEstonian ? row.opponent : (row.opponentEn ?? row.opponent);
                        const competition = isEstonian
                            ? row.competition
                            : (row.competitionEn ?? row.competition);
                        const setResultStyle =
                            row.estoniaPoints > row.opponentPoints
                                ? "text-estonia-blue"
                                : row.estoniaPoints === row.opponentPoints
                                    ? "text-green-700"
                                    : "text-red-700";
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
                                    {row.estoniaSets}-{row.opponentSets}
                                </td>
                                <td className="px-2 py-2 text-center font-semibold">
                                    <a href={scoreTarget} className={`${setResultStyle} hover:underline`}>
                                        {row.estoniaPoints}-{row.opponentPoints}
                                    </a>
                                </td>
                                {showDuration && (
                                    <td className="px-2 py-2 text-right font-semibold text-estonia-dark">
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
                <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-2">{text.rank}</th>
                        <th className="px-2 py-2">{text.date}</th>
                        <th className="px-2 py-2">{text.opponent}</th>
                        <th className="px-2 py-2 text-center">{text.score}</th>
                        <th className="px-2 py-2 text-right">{text.durationMinutes}</th>
                        <th className="px-2 py-2">{text.competition}</th>
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

                        return (
                            <tr
                                key={`${row.matchId}-${index}`}
                                className="border-b border-slate-100 last:border-b-0"
                            >
                                <td className="px-2 py-2 font-semibold text-slate-500">{index + 1}</td>
                                <td className="px-2 py-2">{new Date(row.matchDate).toLocaleDateString("en-GB")}</td>
                                <td className="px-2 py-2 font-medium text-slate-800">{opponent}</td>
                                <td className="px-2 py-2 text-center font-semibold">
                                    <a href={scoreTarget} className="text-estonia-blue hover:underline">
                                        {row.estoniaSets}-{row.opponentSets}
                                    </a>
                                </td>
                                <td className="px-2 py-2 text-right font-semibold text-estonia-dark">
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
