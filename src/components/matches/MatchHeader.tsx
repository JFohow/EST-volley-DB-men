import { useTranslation } from "react-i18next";
import { bySetNumber, formatSetScore } from "@/lib/set-scores";

type MatchHeaderProps = {
    match: any;
    showAdditionalSets?: boolean;
};

type MatchSet = {
    set_number: number;
    estonia_points: number | null;
    opponent_points: number | null;
};

export function MatchHeader({
    match,
    showAdditionalSets = false,
}: MatchHeaderProps) {
    const { i18n } = useTranslation();

    const currentLanguage =
        i18n.language?.startsWith("et") ? "et" : "en";

    const opponent =
        currentLanguage === "et"
            ? match.opponent
            : match.opponent_en ?? match.opponent;

    const competition =
        currentLanguage === "et"
            ? match.competition
            : match.competition_en ?? match.competition;

    const city =
        currentLanguage === "et"
            ? match.city
            : match.city_en ?? match.city;

    const setsInOrder = [...(match.match_sets ?? [])].sort(bySetNumber);

    const officialSetScores = setsInOrder
        .filter((set: MatchSet) => set.set_number <= 5)
        .map(formatSetScore)
        .join(" • ");

    const additionalSetScores = setsInOrder
        .filter((set: MatchSet) => set.set_number > 5)
        .map(formatSetScore)
        .join(" • ");

    return (
        <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-center">
                <h1 className="font-display text-4xl uppercase italic">
                    Estonia {match.estonia_sets}–{match.opponent_sets} {opponent}
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                    {new Date(match.match_date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                    })}
                </p>

                <p className="mt-1 text-sm text-slate-600">
                    {competition}
                    {city ? ` • ${city}` : ""}
                </p>

                {officialSetScores && (
                    <div className="mt-4 text-sm text-slate-700">
                        {officialSetScores}
                    </div>
                )}

                {showAdditionalSets && additionalSetScores && (
                    <div className="mt-2 text-sm italic text-amber-700">
                        {additionalSetScores}
                    </div>
                )}

            </div>
        </header>
    );
}