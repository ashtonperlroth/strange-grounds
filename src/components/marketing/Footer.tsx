import Link from 'next/link';
import { Mountain } from 'lucide-react';

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#E8E3DB] bg-[#FFF8F0] py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2 font-semibold text-[#1a1a1a]">
              <Mountain className="size-5 text-[#2d5016]" />
              <span>Strange Grounds</span>
            </Link>
            <p className="text-sm leading-relaxed text-[#6b6b5a]">
              AI-powered backcountry conditions intelligence for serious adventurers.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#1a1a1a]">Product</h4>
            <ul className="space-y-2 text-sm text-[#4a4a3a]">
              <li><Link href="#features" className="transition-colors hover:text-[#1a1a1a]">Features</Link></li>
              <li><Link href="#routes" className="transition-colors hover:text-[#1a1a1a]">Popular Routes</Link></li>
              <li><Link href="/app" className="transition-colors hover:text-[#1a1a1a]">Open App</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#1a1a1a]">Resources</h4>
            <ul className="space-y-2 text-sm text-[#4a4a3a]">
              <li><Link href="#how-it-works" className="transition-colors hover:text-[#1a1a1a]">How it works</Link></li>
              <li><Link href="/conditions" className="transition-colors hover:text-[#1a1a1a]">Conditions</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#1a1a1a]">Legal</h4>
            <ul className="space-y-2 text-sm text-[#4a4a3a]">
              <li><Link href="/privacy" className="transition-colors hover:text-[#1a1a1a]">Privacy Policy</Link></li>
              <li><Link href="/terms" className="transition-colors hover:text-[#1a1a1a]">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[#E8E3DB] pt-8 text-center text-xs text-[#6b6b5a]">
          &copy; {new Date().getFullYear()} Strange Grounds. Built for the backcountry.
        </div>
      </div>
    </footer>
  );
}
