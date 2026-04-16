import type { ProfileV1 } from "./types";
import {
  PROFILE_LEGACY_STORAGE_KEYS,
  PROFILE_STORAGE_KEY,
} from "./types";

export function emptyProfile(): ProfileV1 {
  return { version: 1, solvedIds: [], attemptedIds: [] };
}

export function loadProfile(): ProfileV1 {
  if (typeof window === "undefined") return emptyProfile();
  try {
    let raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      for (const key of PROFILE_LEGACY_STORAGE_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
    }
    if (!raw) return emptyProfile();
    const data = JSON.parse(raw) as Partial<ProfileV1>;
    if (data.version !== 1) return emptyProfile();
    return {
      version: 1,
      solvedIds: Array.isArray(data.solvedIds)
        ? data.solvedIds.filter((n) => typeof n === "number")
        : [],
      attemptedIds: Array.isArray(data.attemptedIds)
        ? data.attemptedIds.filter((n) => typeof n === "number")
        : [],
    };
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(profile: ProfileV1) {
  if (typeof window === "undefined") return;
  const payload: ProfileV1 = {
    version: 1,
    solvedIds: [...new Set(profile.solvedIds)].sort((a, b) => a - b),
    attemptedIds: [...new Set(profile.attemptedIds)].sort((a, b) => a - b),
  };
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(payload));
  for (const key of PROFILE_LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
}

export function statusForId(
  profile: ProfileV1,
  id: number,
): "solved" | "attempted" | "none" {
  if (profile.solvedIds.includes(id)) return "solved";
  if (profile.attemptedIds.includes(id)) return "attempted";
  return "none";
}

export function exportProfileJson(profile: ProfileV1): string {
  const body: ProfileV1 = {
    version: 1,
    exportedAt: new Date().toISOString(),
    solvedIds: [...new Set(profile.solvedIds)].sort((a, b) => a - b),
    attemptedIds: [...new Set(profile.attemptedIds)]
      .filter((id) => !profile.solvedIds.includes(id))
      .sort((a, b) => a - b),
  };
  return JSON.stringify(body, null, 2);
}

export function parseProfileImport(raw: string): ProfileV1 | null {
  const data = JSON.parse(raw) as Partial<ProfileV1>;
  if (data.version !== 1) return null;
  const solved = new Set(
    Array.isArray(data.solvedIds)
      ? data.solvedIds.filter((n) => typeof n === "number")
      : [],
  );
  const attempted = new Set(
    Array.isArray(data.attemptedIds)
      ? data.attemptedIds.filter((n) => typeof n === "number")
      : [],
  );
  for (const id of solved) attempted.delete(id);
  return {
    version: 1,
    solvedIds: [...solved].sort((a, b) => a - b),
    attemptedIds: [...attempted].sort((a, b) => a - b),
  };
}
