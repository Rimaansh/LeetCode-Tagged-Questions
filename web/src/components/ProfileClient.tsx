"use client";

import { useCallback, useEffect, useState } from "react";
import { SITE_NAME } from "@/lib/brand";
import {
  exportProfileJson,
  loadProfile,
  parseProfileImport,
  saveProfile,
} from "@/lib/profile";
import type { ProfileV1 } from "@/lib/types";

export function ProfileClient() {
  const [profile, setProfile] = useState<ProfileV1>(() => loadProfile());
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const onExport = useCallback(() => {
    const json = exportProfileJson(profile);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${SITE_NAME.toLowerCase()}-profile-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Profile exported.");
  }, [profile]);

  const onImport = useCallback(() => {
    setMessage(null);
    try {
      const next = parseProfileImport(importText);
      if (!next) {
        setMessage("Invalid file: expected version 1 profile JSON.");
        return;
      }
      setProfile(next);
      setImportText("");
      setMessage("Profile imported and saved in this browser.");
    } catch {
      setMessage("Could not parse JSON.");
    }
  }, [importText]);

  const onFile = useCallback(async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setImportText(text);
  }, []);

  const reset = useCallback(() => {
    if (!confirm("Clear all solved and attempted marks in this browser?")) return;
    setProfile({ version: 1, solvedIds: [], attemptedIds: [] });
    setMessage("Profile cleared.");
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 64px" }}>
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: 32,
          fontWeight: 400,
          margin: "0 0 8px",
          letterSpacing: "-0.02em",
        }}
      >
        Profile
      </h1>
      <p style={{ margin: "0 0 28px", color: "var(--muted)", fontSize: 15 }}>
        Progress is stored in your browser (localStorage). Use export to back up, or import
        to restore on another device.
      </p>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          background: "var(--surface)",
          padding: 22,
          boxShadow: "var(--shadow)",
          marginBottom: 20,
        }}
      >
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Summary</h2>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 15 }}>
          Solved: <strong style={{ color: "var(--text)" }}>{profile.solvedIds.length}</strong>
          {" · "}
          Attempted:{" "}
          <strong style={{ color: "var(--text)" }}>{profile.attemptedIds.length}</strong>
        </p>
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          background: "var(--surface)",
          padding: 22,
          boxShadow: "var(--shadow)",
          marginBottom: 20,
        }}
      >
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Export JSON</h2>
        <p style={{ margin: "0 0 14px", color: "var(--muted)", fontSize: 14 }}>
          Downloads a JSON file with your solved and attempted question IDs.
        </p>
        <button
          type="button"
          onClick={onExport}
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--accent)",
            background: "var(--accent)",
            color: "var(--accent-contrast)",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Download profile
        </button>
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          background: "var(--surface)",
          padding: 22,
          boxShadow: "var(--shadow)",
          marginBottom: 20,
        }}
      >
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Import JSON</h2>
        <p style={{ margin: "0 0 14px", color: "var(--muted)", fontSize: 14 }}>
          Paste exported JSON or choose a file. This replaces your current profile in this
          browser.
        </p>
        <input type="file" accept="application/json,.json" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='{"version":1,"solvedIds":[],"attemptedIds":[]}'
          rows={10}
          style={{
            width: "100%",
            marginTop: 14,
            padding: 12,
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            resize: "vertical",
            fontFamily: "ui-monospace, monospace",
            fontSize: 13,
          }}
        />
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onImport}
            style={{
              padding: "10px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-2)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Apply import
          </button>
        </div>
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          background: "var(--surface)",
          padding: 22,
          boxShadow: "var(--shadow)",
        }}
      >
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>Reset</h2>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-strong)",
            background: "transparent",
            color: "var(--hard)",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          Clear local profile
        </button>
      </section>

      {message && (
        <p style={{ marginTop: 18, color: "var(--muted)", fontSize: 14 }}>{message}</p>
      )}
    </main>
  );
}
