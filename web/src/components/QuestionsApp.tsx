"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dataset, Difficulty, PeriodKey, Question } from "@/lib/types";
import {
  collectTopics,
  defaultFilterState,
  filterQuestions,
  getDisplayFrequency,
  type FilterState,
  type SortKey,
  type StatusFilter,
} from "@/lib/filter";
import { loadProfile, saveProfile, statusForId } from "@/lib/profile";
import type { ProfileV1 } from "@/lib/types";

const PAGE_SIZE = 20;

function diffStyle(d: Difficulty): React.CSSProperties {
  if (d === "EASY") return { color: "var(--easy)", fontWeight: 600, fontSize: 12 };
  if (d === "MEDIUM") return { color: "var(--medium)", fontWeight: 600, fontSize: 12 };
  return { color: "var(--hard)", fontWeight: 600, fontSize: 12 };
}

function pillStyle(): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--muted)",
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--muted)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

export function QuestionsApp() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileV1>(() => loadProfile());
  const [filters, setFilters] = useState<FilterState>(defaultFilterState);
  const [page, setPage] = useState(1);
  const [companyQuery, setCompanyQuery] = useState("");
  const [topicQuery, setTopicQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/data/questions.json");
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as Dataset;
        if (!cancelled) setDataset(json);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const topics = useMemo(
    () => (dataset ? collectTopics(dataset) : []),
    [dataset],
  );

  const filtered = useMemo(() => {
    if (!dataset) return [];
    return filterQuestions(dataset, filters, profile);
  }, [dataset, filters, profile]);

  useEffect(() => {
    setPage(1);
  }, [filters, profile.solvedIds, profile.attemptedIds]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const slice = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const counts = useMemo(() => {
    let e = 0,
      m = 0,
      h = 0;
    for (const q of filtered) {
      if (q.difficulty === "EASY") e++;
      else if (q.difficulty === "MEDIUM") m++;
      else h++;
    }
    return { e, m, h };
  }, [filtered]);

  const toggleDifficulty = (d: Difficulty) => {
    setFilters((f) => {
      const next = new Set(f.difficulties);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      if (next.size === 0) return { ...f, difficulties: new Set<Difficulty>([d]) };
      return { ...f, difficulties: next };
    });
  };

  const toggleCompany = (slug: string) => {
    setFilters((f) => {
      const next = new Set(f.companySlugs);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return { ...f, companySlugs: next };
    });
  };

  const toggleTopic = (name: string) => {
    setFilters((f) => {
      const next = new Set(f.topicNames);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return { ...f, topicNames: next };
    });
  };

  const markSolved = useCallback((id: number) => {
    setProfile((p) => {
      const attempted = p.attemptedIds.filter((x) => x !== id);
      const solved = new Set([...p.solvedIds, id]);
      return { ...p, solvedIds: [...solved].sort((a, b) => a - b), attemptedIds: attempted };
    });
  }, []);

  const markAttempted = useCallback((id: number) => {
    setProfile((p) => {
      if (p.solvedIds.includes(id)) return p;
      const attempted = new Set([...p.attemptedIds, id]);
      return { ...p, attemptedIds: [...attempted].sort((a, b) => a - b) };
    });
  }, []);

  const clearStatus = useCallback((id: number) => {
    setProfile((p) => ({
      ...p,
      solvedIds: p.solvedIds.filter((x) => x !== id),
      attemptedIds: p.attemptedIds.filter((x) => x !== id),
    }));
  }, []);

  const companyOptions = useMemo(() => {
    if (!dataset) return [];
    const q = companyQuery.trim().toLowerCase();
    return dataset.companies.filter(
      (c) => !q || c.name.toLowerCase().includes(q) || c.slug.includes(q),
    );
  }, [dataset, companyQuery]);

  const topicOptions = useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    return topics.filter((t) => !q || t.toLowerCase().includes(q));
  }, [topics, topicQuery]);

  if (loadError) {
    return (
      <main style={{ maxWidth: 720, margin: "48px auto", padding: 24 }}>
        <p>Could not load question data ({loadError}).</p>
      </main>
    );
  }

  if (!dataset) {
    return (
      <main style={{ maxWidth: 720, margin: "48px auto", padding: 24, color: "var(--muted)" }}>
        Loading questions…
      </main>
    );
  }

  const periodLabels = dataset.periodLabels;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <div className="lt-layout">
        <aside
          style={{
            position: "sticky",
            top: 12,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--surface)",
            padding: 20,
            boxShadow: "var(--shadow)",
          }}
        >
          <div style={{ marginBottom: 22 }}>
            <FieldLabel>Search</FieldLabel>
            <input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Title or ID"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface-2)",
              }}
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <FieldLabel>Status</FieldLabel>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value as StatusFilter }))
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              <option value="all">All statuses</option>
              <option value="solved">Solved</option>
              <option value="attempted">Attempted</option>
              <option value="none">Not attempted</option>
            </select>
          </div>

          <div style={{ marginBottom: 22 }}>
            <FieldLabel>Difficulty</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(["EASY", "MEDIUM", "HARD"] as const).map((d) => {
                const on = filters.difficulties.has(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDifficulty(d)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: `1px solid ${on ? "var(--accent)" : "var(--border)"}`,
                      background: on ? "var(--accent)" : "var(--surface-2)",
                      color: on ? "var(--accent-contrast)" : "var(--text)",
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <FieldLabel>Companies</FieldLabel>
            <input
              value={companyQuery}
              onChange={(e) => setCompanyQuery(e.target.value)}
              placeholder="Search companies"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                marginBottom: 8,
                background: "var(--surface-2)",
              }}
            />
            <div
              style={{
                maxHeight: 160,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-2)",
              }}
            >
              {companyOptions.slice(0, 80).map((c) => (
                <label
                  key={c.slug}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    fontSize: 13,
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={filters.companySlugs.has(c.slug)}
                    onChange={() => toggleCompany(c.slug)}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
            {filters.companySlugs.size > 0 && (
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, companySlugs: new Set() }))}
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  border: "none",
                  background: "none",
                  color: "var(--accent)",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Clear companies
              </button>
            )}
          </div>

          <div style={{ marginBottom: 22 }}>
            <FieldLabel>Time window</FieldLabel>
            <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--faint)", lineHeight: 1.4 }}>
              Only questions that appear in the CSV for this span (for example, thirty-days.csv
              for Last 30 days). If you checked companies above, only those companies are used;
              if none are checked, any company counts.
            </p>
            <select
              value={filters.frequencyPeriod}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  frequencyPeriod: e.target.value as PeriodKey,
                }))
              }
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
              }}
            >
              {dataset.periods.map((p) => (
                <option key={p} value={p}>
                  {periodLabels[p]}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 8 }}>
            <FieldLabel>Topics</FieldLabel>
            <input
              value={topicQuery}
              onChange={(e) => setTopicQuery(e.target.value)}
              placeholder="Search topics"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                marginBottom: 8,
                background: "var(--surface-2)",
              }}
            />
            <div
              style={{
                maxHeight: 140,
                overflowY: "auto",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-2)",
              }}
            >
              {topicOptions.slice(0, 60).map((t) => (
                <label
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    fontSize: 13,
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={filters.topicNames.has(t)}
                    onChange={() => toggleTopic(t)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
            {filters.topicNames.size > 0 && (
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, topicNames: new Set() }))}
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  border: "none",
                  background: "none",
                  color: "var(--accent)",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Clear topics
              </button>
            )}
          </div>
        </aside>

        <section>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 18,
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 28,
                  fontWeight: 400,
                  margin: "0 0 6px",
                  letterSpacing: "-0.02em",
                }}
              >
                Questions
              </h1>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                {filtered.length} found · Easy {counts.e} · Medium {counts.m} · Hard {counts.h}
              </p>
              <p style={{ margin: "6px 0 0", color: "var(--faint)", fontSize: 12 }}>
                Data generated {new Date(dataset.generatedAt).toLocaleString()}
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <label style={{ fontSize: 13, color: "var(--muted)", display: "flex", gap: 8 }}>
                Sort
                <select
                  value={filters.sort}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, sort: e.target.value as SortKey }))
                  }
                  style={{
                    padding: "8px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                  }}
                >
                  <option value="freq">Frequency</option>
                  <option value="acceptance">Acceptance</option>
                  <option value="title">Title</option>
                  <option value="id">ID</option>
                </select>
              </label>
              <select
                value={filters.sortDir}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    sortDir: e.target.value as "asc" | "desc",
                  }))
                }
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                }}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {slice.map((q) => (
              <QuestionRow
                key={q.id}
                q={q}
                profile={profile}
                frequencyPeriod={filters.frequencyPeriod}
                onSolved={() => markSolved(q.id)}
                onAttempted={() => markAttempted(q.id)}
                onClear={() => clearStatus(q.id)}
              />
            ))}
          </div>

          <Pager page={pageSafe} totalPages={totalPages} onPage={setPage} total={filtered.length} />
        </section>
      </div>
    </main>
  );
}

function QuestionRow({
  q,
  profile,
  frequencyPeriod,
  onSolved,
  onAttempted,
  onClear,
}: {
  q: Question;
  profile: ProfileV1;
  frequencyPeriod: PeriodKey;
  onSolved: () => void;
  onAttempted: () => void;
  onClear: () => void;
}) {
  const st = statusForId(profile, q.id);
  const freq = getDisplayFrequency(q, frequencyPeriod);
  const topicsShow = q.topics.slice(0, 5);
  const companiesShow = q.companies.slice(0, 8);

  return (
    <article
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--surface)",
        padding: "16px 18px",
        boxShadow: "var(--shadow)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <a href={q.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
              {q.title}
            </a>
            {st === "solved" && (
              <span style={pillStyle()}>Solved</span>
            )}
            {st === "attempted" && (
              <span style={pillStyle()}>Attempted</span>
            )}
            {st === "none" && (
              <span style={{ ...pillStyle(), opacity: 0.85 }}>Not attempted</span>
            )}
            <span style={diffStyle(q.difficulty)}>{q.difficulty}</span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)" }}>
            #{q.id} · Acceptance{" "}
            {q.acceptance != null ? `${q.acceptance.toFixed(1)}%` : "—"} · Freq{" "}
            {freq.toFixed(1)}% ({frequencyPeriod})
          </p>
          {topicsShow.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {topicsShow.map((t) => (
                <span key={t} style={pillStyle()}>
                  {t}
                </span>
              ))}
              {q.topics.length > topicsShow.length && (
                <span style={pillStyle()}>+{q.topics.length - topicsShow.length}</span>
              )}
            </div>
          )}
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {companiesShow.map((c) => (
              <span key={c.slug} style={pillStyle()}>
                {c.name}
              </span>
            ))}
            {q.companies.length > companiesShow.length && (
              <span style={pillStyle()}>+{q.companies.length - companiesShow.length}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={onSolved}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              fontSize: 13,
            }}
          >
            Mark solved
          </button>
          <button
            type="button"
            onClick={onAttempted}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              fontSize: 13,
            }}
          >
            Mark attempted
          </button>
          <button
            type="button"
            onClick={onClear}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px dashed var(--border-strong)",
              background: "transparent",
              fontSize: 13,
              color: "var(--muted)",
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </article>
  );
}

function Pager({
  page,
  totalPages,
  onPage,
  total,
}: {
  page: number;
  totalPages: number;
  onPage: (n: number) => void;
  total: number;
}) {
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  return (
    <div
      style={{
        marginTop: 22,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        justifyContent: "space-between",
        color: "var(--muted)",
        fontSize: 14,
      }}
    >
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          style={{
            padding: "8px 14px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            opacity: page <= 1 ? 0.45 : 1,
          }}
        >
          Previous
        </button>
        <span style={{ fontSize: 13 }}>
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          style={{
            padding: "8px 14px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            opacity: page >= totalPages ? 0.45 : 1,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
