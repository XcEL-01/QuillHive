export type BoostStateLike = {
  status?: string | null;
  boostStartsAt?: Date | string | null;
  boostEndsAt?: Date | string | null;
};

export function isBoostActive(boost: BoostStateLike | null | undefined, now = new Date()): boolean {
  if (!boost) return false;
  const status = (boost.status ?? "").toLowerCase();
  if (status !== "approved") return false;
  const startsAt = boost.boostStartsAt ? new Date(boost.boostStartsAt) : null;
  const endsAt = boost.boostEndsAt ? new Date(boost.boostEndsAt) : null;
  if (!endsAt || Number.isNaN(endsAt.getTime())) return false;
  if (startsAt && !Number.isNaN(startsAt.getTime()) && startsAt > now) return false;
  return endsAt > now;
}

export function getBoostPlanMultiplier(boost: { reachMultiplier?: number | string | null } | null | undefined): number {
  const v = Number(boost?.reachMultiplier ?? 1);
  return Number.isFinite(v) && v > 0 ? v : 1;
}

export function getBoostPlacementPriority(boost: { placementPriority?: number | string | null } | null | undefined): number {
  const v = Number(boost?.placementPriority ?? 0);
  return Number.isFinite(v) ? v : 0;
}
