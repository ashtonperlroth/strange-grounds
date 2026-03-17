import Link from "next/link";
import { Mountain } from "lucide-react";

const NAV_LINKS = [
  { label: "About", href: "#" },
  { label: "Data Sources", href: "/app/sources" },
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
];

/**
 * Minimal site footer with logo, nav links, and copyright.
 * Sourced from 21st.dev "Footer 2" pattern (left-right layout),
 * adapted to Strange Grounds design system.
 */
export function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <Mountain size={18} className="text-accent" />
          <span className="text-sm font-semibold text-foreground">
            Strange Grounds
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="text-xs text-muted-foreground">
          &copy; 2026 Strange Grounds
        </p>
      </div>
    </footer>
  );
}
