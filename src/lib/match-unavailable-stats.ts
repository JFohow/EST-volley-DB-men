export const unavailableStatFields = [
    "points",
    "block_points",
    "plus_minus",
    "break_points",
    "serve_total",
    "serve_aces",
    "serve_errors",
    "reception_total",
    "reception_errors",
    "reception_positive_pct",
    "reception_excellent_pct",
    "attack_total",
    "attack_errors",
    "attack_blocked",
    "attack_kills",
] as const;

export type UnavailableStatField = (typeof unavailableStatFields)[number];

export type MatchUnavailableStatRow = Partial<
    Record<`${UnavailableStatField}_unavailable`, boolean | null>
>;

export type StatCoverage = Record<UnavailableStatField, number>;

export function createStatCoverage(): StatCoverage {
    return Object.fromEntries(unavailableStatFields.map((field) => [field, 0])) as StatCoverage;
}

export function addStatCoverage(
    coverage: StatCoverage,
    stats: Record<string, unknown>,
    unavailableStats: ReadonlySet<string>,
) {
    for (const field of unavailableStatFields) {
        if (!unavailableStats.has(field) && typeof stats[field] === "number") {
            coverage[field] += 1;
        }
    }
}

export function getUnavailableStatSet(
    value: MatchUnavailableStatRow | MatchUnavailableStatRow[] | null | undefined,
): ReadonlySet<string> {
    const rows = Array.isArray(value) ? value : value ? [value] : [];
    return new Set<string>(
        rows.flatMap((row) =>
            unavailableStatFields.filter((field) => row[`${field}_unavailable`] === true),
        ),
    );
}

// Covers derived stats (attack efficiency, kill %, reception %) whose value depends on flagged fields.
export function isStatUnavailable(field: string, unavailableStats: ReadonlySet<string>): boolean {
    if (unavailableStats.has(field)) return true;
    if (field === "attack_kill_pct") {
        return ["attack_total", "attack_kills"].some((f) => unavailableStats.has(f));
    }
    if (field === "attack_efficiency") {
        return ["attack_total", "attack_kills", "attack_blocked", "attack_errors"].some((f) =>
            unavailableStats.has(f),
        );
    }
    if (field === "reception_positive_pct" || field === "reception_excellent_pct") {
        return unavailableStats.has("reception_total");
    }
    return false;
}

const recordedStatFields = [
    "points",
    "block_points",
    "plus_minus",
    "serve_total",
    "serve_aces",
    "serve_errors",
    "reception_total",
    "reception_errors",
    "attack_total",
    "attack_errors",
    "attack_blocked",
    "attack_kills",
    "break_points",
] as const;

// Used for matches without set positions: a non-zero stat is the only evidence the player took part.
export function hasRecordedStat(
    stats: Record<string, unknown>,
    unavailableStats: ReadonlySet<string>,
): boolean {
    return recordedStatFields.some((field) => {
        if (unavailableStats.has(field)) return false;
        const value = stats[field];
        return typeof value === "number" && value !== 0;
    });
}

export function maskUnavailableStatValues<T extends Record<string, unknown>>(
    stats: T,
    unavailableStats: ReadonlySet<string>,
): T {
    const masked: Record<string, unknown> = { ...stats };

    for (const field of unavailableStatFields) {
        if (unavailableStats.has(field) && field in masked) {
            masked[field] = null;
        }
    }

    if (unavailableStats.has("attack_total") || unavailableStats.has("attack_kills")) {
        if ("attack_kill_pct" in masked) masked.attack_kill_pct = null;
    }

    if (
        unavailableStats.has("attack_total") ||
        unavailableStats.has("attack_kills") ||
        unavailableStats.has("attack_blocked") ||
        unavailableStats.has("attack_errors")
    ) {
        if ("attack_efficiency" in masked) masked.attack_efficiency = null;
    }

    if (unavailableStats.has("reception_total")) {
        if ("reception_positive_pct" in masked) masked.reception_positive_pct = null;
        if ("reception_excellent_pct" in masked) masked.reception_excellent_pct = null;
    }

    return masked as T;
}
