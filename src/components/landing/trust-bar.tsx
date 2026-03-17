/**
 * Data source trust bar for landing page.
 * Sourced from 21st.dev "Logo Cloud with title" pattern,
 * adapted for text-based data source names with monospace typography.
 */

const DATA_SOURCES = [
  "NWS",
  "USGS",
  "SNOTEL",
  "avalanche.org",
  "NIFC",
  "Sentinel-2",
  "SunCalc",
];

export function TrustBar() {
  return (
    <section className="py-12">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6">
        {DATA_SOURCES.map((source, i) => (
          <span key={source} className="flex items-center gap-8">
            <span className="font-mono text-sm tracking-wide text-muted-foreground">
              {source}
            </span>
            {i < DATA_SOURCES.length - 1 && (
              <span className="text-muted-foreground/30">&middot;</span>
            )}
          </span>
        ))}
      </div>
    </section>
  );
}
