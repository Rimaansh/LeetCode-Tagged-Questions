export type PeriodKey = "30d" | "3m" | "6m" | "6m+" | "all";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export type QuestionStatus = "solved" | "attempted" | "none";

export type CompanyRef = {
  slug: string;
  name: string;
  frequencies: Partial<Record<PeriodKey, number>>;
};

export type Question = {
  id: number;
  title: string;
  slug: string;
  url: string;
  difficulty: Difficulty;
  acceptance: number | null;
  topics: string[];
  companies: CompanyRef[];
  companyCount: number;
  maxFrequency: number;
};

export type CompanyOption = { slug: string; name: string };

export type Dataset = {
  generatedAt: string;
  periods: PeriodKey[];
  periodLabels: Record<PeriodKey, string>;
  companies: CompanyOption[];
  questions: Question[];
};

export type ProfileV1 = {
  version: 1;
  exportedAt?: string;
  solvedIds: number[];
  attemptedIds: number[];
};

export const PROFILE_STORAGE_KEY = "stride_profile_v1";

/** Previous keys — still read once so progress survives the rename */
export const PROFILE_LEGACY_STORAGE_KEYS = ["leettracker_profile_v1"] as const;
