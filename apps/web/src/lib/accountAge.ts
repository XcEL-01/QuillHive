export function formatAccountAge(createdAt: string | Date | null | undefined): string {
  if (!createdAt) return "Unknown";
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
  if (ageDays < 1) return "today";
  if (ageDays < 30) return `${ageDays} day${ageDays === 1 ? "" : "s"}`;
  const ageMonths = Math.floor(ageDays / 30.4375);
  if (ageMonths < 12) return `${ageMonths} month${ageMonths === 1 ? "" : "s"}`;
  const ageYears = Math.floor(ageMonths / 12);
  return `${ageYears} year${ageYears === 1 ? "" : "s"}`;
}
