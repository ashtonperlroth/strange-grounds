import Link from 'next/link';
import { Mountain } from 'lucide-react';

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-[#E8E3DB] bg-[#FFFBF5]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-[#1a1a1a]">
          <Mountain className="size-5 text-[#2d5016]" />
          <span className="text-base tracking-tight">Strange Grounds</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm text-[#4a4a3a] transition-colors hover:text-[#1a1a1a]">Features</Link>
          <Link href="#routes" className="text-sm text-[#4a4a3a] transition-colors hover:text-[#1a1a1a]">Popular Routes</Link>
          <Link href="#how-it-works" className="text-sm text-[#4a4a3a] transition-colors hover:text-[#1a1a1a]">About</Link>
        </div>

        <Link
          href="/app"
          className="rounded-full bg-[#1a1a1a] px-5 py-2 text-sm font-medium text-[#FFFBF5] transition-colors hover:bg-gray-800"
          data-testid="nav-try-it-now"
        >
          Try it now
        </Link>
      </div>
    </nav>
  );
}
