import Link from 'next/link';
import { MapPin, ArrowRight } from 'lucide-react';

interface Route {
  name: string;
  location: string;
  activity: string;
  slug: string;
}

const routes: Route[] = [
  { name: 'Teton Pass', location: 'Wyoming', activity: 'Ski Touring', slug: 'teton-pass' },
  { name: 'Mt Rainier', location: 'Washington', activity: 'Mountaineering', slug: 'mt-rainier' },
  { name: 'Tahoe Rim Trail', location: 'California/Nevada', activity: 'Backpacking', slug: 'tahoe-rim-trail' },
  { name: 'Rocky Mountain NP', location: 'Colorado', activity: 'Day Hike', slug: 'rocky-mountain-np' },
  { name: 'Cascade Pass', location: 'Washington', activity: 'Backpacking', slug: 'cascade-pass' },
  { name: 'Mt Whitney', location: 'California', activity: 'Mountaineering', slug: 'mt-whitney' },
];

export function PopularRoutes() {
  return (
    <section id="routes" className="border-t border-[#E8E3DB] bg-[#FFF8F0] py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-[#2d5016]">Destinations</p>
            <h2 className="text-4xl font-semibold text-[#1a1a1a]" style={{ fontFamily: 'var(--font-fraunces), serif' }}>
              Explore popular routes
            </h2>
          </div>
          <Link
            href="/app"
            className="hidden items-center gap-1.5 text-sm font-medium text-[#1a1a1a] underline-offset-4 hover:underline md:flex"
          >
            View all <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="popular-routes-grid">
          {routes.map((route) => (
            <Link
              key={route.slug}
              href={`/app?route=${route.slug}`}
              className="group rounded-lg border border-[#E8E3DB] bg-[#FFFBF5] p-5 transition-colors hover:border-[#1a1a1a]"
              data-testid={`route-card-${route.slug}`}
            >
              <div className="mb-3 aspect-[16/9] w-full rounded bg-[#F5F0E8]" />
              <h3 className="mb-1 font-semibold text-[#1a1a1a] transition-colors group-hover:text-[#2d5016]">
                {route.name}
              </h3>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-[#6b6b5a]">
                  <MapPin className="size-3" />
                  {route.location}
                </span>
                <span className="rounded-full bg-[#F5F0E8] px-2 py-0.5 text-[10px] font-medium text-[#4a4a3a]">
                  {route.activity}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
