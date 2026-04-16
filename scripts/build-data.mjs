#!/usr/bin/env node
/**
 * Merges company CSV folders under Questions Data into web/public/data/questions.json
 * and fetches topic tags from LeetCode GraphQL (paginated).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const QUESTIONS_DIR = path.join(ROOT, "Questions Data");
const OUT_DIR = path.join(ROOT, "web", "public", "data");
const OUT_FILE = path.join(OUT_DIR, "questions.json");

const PERIOD_FILES = [
  ["30d", "thirty-days.csv"],
  ["3m", "three-months.csv"],
  ["6m", "six-months.csv"],
  ["6m+", "more-than-six-months.csv"],
  ["all", "all.csv"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** ID,URL,Title,Difficulty,Acceptance %,Frequency % — title may contain commas */
function parseRow(line) {
  const m = line.match(
    /^(\d+),(https:\/\/leetcode\.com\/problems\/[^,]+),(.+),(Easy|Medium|Hard),([^,]+),([^,]+)$/i,
  );
  if (!m) return null;
  return {
    id: Number(m[1]),
    url: m[2],
    title: m[3],
    difficultyRaw: m[4],
    acceptanceStr: m[5],
    frequencyStr: m[6],
  };
}

function parsePercent(s) {
  if (!s) return null;
  const n = parseFloat(String(s).replace("%", "").trim());
  return Number.isFinite(n) ? n : null;
}

function slugFromUrl(url) {
  const m = String(url).match(/\/problems\/([^/?#]+)/);
  return m ? m[1] : "";
}

function normalizeDifficulty(d) {
  const u = String(d || "").trim().toUpperCase();
  if (u === "EASY" || u === "MEDIUM" || u === "HARD") return u;
  return "MEDIUM";
}

function formatCompanyName(slug) {
  const map = {
    "at-t": "AT&T",
    "jpmorgan": "J.P. Morgan",
    "goldman-sachs": "Goldman Sachs",
    "capital-one": "Capital One",
    "palo-alto-networks": "Palo Alto Networks",
    "bytedance": "ByteDance",
    "bookingcom": "Booking.com",
    "dassault-sysetmes": "Dassault Systèmes",
    "aqr-capital-management-llc": "AQR Capital Management",
  };
  if (map[slug]) return map[slug];
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

async function fetchAllTopicTags() {
  const query = `query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    questionList(categorySlug: $categorySlug limit: $limit skip: $skip filters: $filters) {
      totalNum
      data { questionFrontendId topicTags { name } }
    }
  }`;
  const byId = new Map();
  let skip = 0;
  const limit = 100;
  let totalNum = Infinity;
  while (skip < totalNum) {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { categorySlug: "", skip, limit, filters: {} },
      }),
    });
    if (!res.ok) {
      console.warn(`LeetCode HTTP ${res.status} at skip=${skip}; continuing without more topics.`);
      break;
    }
    const json = await res.json();
    if (json.errors) {
      console.warn("LeetCode GraphQL errors:", json.errors);
      break;
    }
    const ql = json.data?.questionList;
    if (!ql) break;
    totalNum = ql.totalNum ?? 0;
    for (const row of ql.data || []) {
      const id = Number(row.questionFrontendId);
      if (!Number.isFinite(id)) continue;
      byId.set(
        id,
        (row.topicTags || []).map((t) => t.name).filter(Boolean),
      );
    }
    skip += limit;
    await sleep(120);
  }
  return byId;
}

async function main() {
  const entries = await fs.readdir(QUESTIONS_DIR, { withFileTypes: true });
  const companyDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  /** @type {Map<number, { id: number, title: string, slug: string, url: string, difficulty: string, acceptance: number | null }>} */
  const base = new Map();
  /** @type {Map<number, Map<string, Map<string, number>>>} id -> companySlug -> periodKey -> frequency */
  const freq = new Map();

  for (const companySlug of companyDirs) {
    const dir = path.join(QUESTIONS_DIR, companySlug);
    for (const [periodKey, fileName] of PERIOD_FILES) {
      const fp = path.join(dir, fileName);
      let raw;
      try {
        raw = await fs.readFile(fp, "utf8");
      } catch {
        continue;
      }
      const lines = raw.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) continue;
      for (let li = 1; li < lines.length; li++) {
        const row = parseRow(lines[li]);
        if (!row) continue;
        const { id, url, title, difficultyRaw, acceptanceStr, frequencyStr } = row;
        if (!Number.isFinite(id)) continue;
        const difficulty = normalizeDifficulty(difficultyRaw);
        const acceptance = parsePercent(acceptanceStr);
        const frequency = parsePercent(frequencyStr);
        if (!base.has(id)) {
          base.set(id, {
            id,
            title,
            slug: slugFromUrl(url),
            url,
            difficulty,
            acceptance,
          });
        }
        if (!freq.has(id)) freq.set(id, new Map());
        const byCompany = freq.get(id);
        if (!byCompany.has(companySlug)) byCompany.set(companySlug, new Map());
        const byPeriod = byCompany.get(companySlug);
        if (frequency != null) byPeriod.set(periodKey, frequency);
      }
    }
  }

  console.log("Fetching topic tags from LeetCode…");
  const topicsById = await fetchAllTopicTags();
  console.log(`Topic map size: ${topicsById.size}`);

  const companies = companyDirs
    .map((slug) => ({ slug, name: formatCompanyName(slug) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const questions = [];
  for (const [id, b] of base) {
    const byCompany = freq.get(id) || new Map();
    const companiesOut = [];
    let maxFrequency = 0;
    for (const [cslug, pmap] of byCompany) {
      const frequencies = {};
      for (const [pk, val] of pmap) {
        frequencies[pk] = val;
        if (val > maxFrequency) maxFrequency = val;
      }
      companiesOut.push({
        slug: cslug,
        name: formatCompanyName(cslug),
        frequencies,
      });
    }
    companiesOut.sort((a, b) => a.name.localeCompare(b.name));
    const topics = topicsById.get(id) || [];
    questions.push({
      ...b,
      topics,
      companies: companiesOut,
      companyCount: companiesOut.length,
      maxFrequency,
    });
  }

  questions.sort((a, b) => a.id - b.id);

  await fs.mkdir(OUT_DIR, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    periods: PERIOD_FILES.map(([k]) => k),
    periodLabels: {
      "30d": "Last 30 days",
      "3m": "Last 3 months",
      "6m": "Last 6 months",
      "6m+": "More than 6 months",
      all: "All time",
    },
    companies,
    questions,
  };
  await fs.writeFile(OUT_FILE, JSON.stringify(payload), "utf8");
  console.log(`Wrote ${questions.length} questions to ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
