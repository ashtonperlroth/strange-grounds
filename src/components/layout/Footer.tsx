import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="shrink-0 border-t border-stone-200 bg-white px-4 py-2"
      role="contentinfo"
    >
      <div className="flex items-center justify-center gap-4 text-xs text-stone-500">
        <Link
          href="/privacy"
          className="transition-colors hover:text-stone-700"
        >
          Privacy
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className="transition-colors hover:text-stone-700">
          Terms
        </Link>
      </div>
    </footer>
  );
}
