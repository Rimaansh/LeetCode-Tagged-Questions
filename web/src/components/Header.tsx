"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/brand";

const links = [
  { href: "/questions", label: "Questions" },
  { href: "/profile", label: "Profile" },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <Link href="/questions" style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 26,
                letterSpacing: "-0.02em",
              }}
            >
              {SITE_NAME}
            </span>
            <span style={{ color: "var(--faint)", fontSize: 13 }}>{SITE_TAGLINE}</span>
          </div>
        </Link>
        <nav style={{ display: "flex", gap: 8 }}>
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  textDecoration: "none",
                  padding: "8px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 14,
                  fontWeight: 500,
                  color: active ? "var(--accent-contrast)" : "var(--text)",
                  background: active ? "var(--accent)" : "transparent",
                  border: active ? "1px solid var(--accent)" : "1px solid transparent",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
