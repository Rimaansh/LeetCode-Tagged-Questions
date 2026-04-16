import type { Dataset, Difficulty, PeriodKey, Question } from "./types";

export type StatusFilter = "all" | "solved" | "attempted" | "none";

export type SortKey = "freq" | "acceptance" | "title" | "id";

export type FilterState = {
  difficulties: Set<Difficulty>;
  companySlugs: Set<string>;
  topicNames: Set<string>;
  /** Period used when reading company frequency scores */
  frequencyPeriod: PeriodKey;
  status: StatusFilter;
  search: string;
  sort: SortKey;
  sortDir: "asc" | "desc";
};

export const defaultFilterState = (): FilterState => ({
  difficulties: new Set<Difficulty>(["EASY", "MEDIUM", "HARD"]),
  companySlugs: new Set(),
  topicNames: new Set(),
  frequencyPeriod: "all",
  status: "all",
  search: "",
  sort: "freq",
  sortDir: "desc",
});

function frequencyForPeriod(q: Question, period: PeriodKey): number {
  let max = 0;
  for (const c of q.companies) {
    const v = c.frequencies[period];
    if (typeof v === "number" && v > max) max = v;
  }
  return max;
}

/** Question appears in this period's CSV for at least one relevant company */
export function matchesPeriodWindow(
  q: Question,
  period: PeriodKey,
  companySlugs: Set<string>,
): boolean {
  for (const c of q.companies) {
    if (typeof c.frequencies[period] !== "number") continue;
    if (companySlugs.size === 0 || companySlugs.has(c.slug)) return true;
  }
  return false;
}

export function getDisplayFrequency(q: Question, period: PeriodKey): number {
  return frequencyForPeriod(q, period);
}

export function filterQuestions(
  dataset: Dataset,
  filters: FilterState,
  profile: { solvedIds: number[]; attemptedIds: number[] },
): Question[] {
  const solved = new Set(profile.solvedIds);
  const attempted = new Set(profile.attemptedIds);
  const qLower = filters.search.trim().toLowerCase();

  let list = dataset.questions.filter((q) => {
    if (filters.difficulties.size > 0 && !filters.difficulties.has(q.difficulty)) {
      return false;
    }
    if (!matchesPeriodWindow(q, filters.frequencyPeriod, filters.companySlugs)) {
      return false;
    }
    if (filters.topicNames.size > 0) {
      const topics = new Set(q.topics);
      let topicHit = false;
      for (const t of filters.topicNames) {
        if (topics.has(t)) {
          topicHit = true;
          break;
        }
      }
      if (!topicHit) return false;
    }
    if (filters.status !== "all") {
      const st = solved.has(q.id)
        ? "solved"
        : attempted.has(q.id)
          ? "attempted"
          : "none";
      if (st !== filters.status) return false;
    }
    if (qLower) {
      if (
        !q.title.toLowerCase().includes(qLower) &&
        !String(q.id).includes(qLower)
      ) {
        return false;
      }
    }
    return true;
  });

  const dir = filters.sortDir === "asc" ? 1 : -1;
  list = [...list].sort((a, b) => {
    if (filters.sort === "id") return dir * (a.id - b.id);
    if (filters.sort === "title") return dir * a.title.localeCompare(b.title);
    if (filters.sort === "acceptance") {
      const av = a.acceptance ?? -1;
      const bv = b.acceptance ?? -1;
      return dir * (av - bv);
    }
    const af = getDisplayFrequency(a, filters.frequencyPeriod);
    const bf = getDisplayFrequency(b, filters.frequencyPeriod);
    if (af !== bf) return dir * (af - bf);
    return a.id - b.id;
  });

  return list;
}

export function collectTopics(dataset: Dataset): string[] {
  const s = new Set<string>();
  for (const q of dataset.questions) for (const t of q.topics) s.add(t);
  return [...s].sort((a, b) => a.localeCompare(b));
}
