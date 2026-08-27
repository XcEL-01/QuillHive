import { useQuery } from "@tanstack/react-query";

export type FeatureFlags = Record<string, boolean>;

export function useFeatureFlags(): FeatureFlags {
  const { data } = useQuery<FeatureFlags>({
    queryKey: ["feature-flags"],
    queryFn: async () => {
      const res = await fetch("/api/features");
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
  return data ?? {};
}

export function useFeature(flag: string): boolean {
  const flags = useFeatureFlags();
  return flags[flag] ?? true;
}
