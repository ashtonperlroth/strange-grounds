'use client';

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';
import type { ConditionCardData } from '@/stores/briefing-store';
import type {
  RouteWalkthroughSegment,
  CriticalSection,
  AlternativeRoute,
} from '@/lib/types/route-briefing';

// ── Colors ────────────────────────────────────────────────────────────────
const COLORS = {
  stone50: '#fafaf9',
  stone100: '#f5f5f4',
  stone200: '#e7e5e4',
  stone400: '#a8a29e',
  stone500: '#78716c',
  stone600: '#57534e',
  stone700: '#44403c',
  stone800: '#292524',
  stone900: '#1c1917',
  emerald600: '#059669',
  emerald700: '#047857',
  emerald50: '#ecfdf5',
  amber50: '#fefce8',
  amber600: '#d97706',
  red50: '#fef2f2',
  red600: '#dc2626',
  blue50: '#eff6ff',
  blue600: '#2563eb',
  orange600: '#ea580c',
};

const READINESS = {
  green: { bg: COLORS.emerald50, text: COLORS.emerald700, label: 'GO' },
  yellow: { bg: COLORS.amber50, text: COLORS.amber600, label: 'CAUTION' },
  red: { bg: COLORS.red50, text: COLORS.red600, label: 'CONCERN' },
};

const STATUS_COLOR: Record<string, string> = {
  good: COLORS.emerald600,
  caution: COLORS.amber600,
  concern: COLORS.red600,
  unknown: COLORS.stone400,
  unavailable: COLORS.stone400,
};

const HAZARD_COLOR: Record<string, string> = {
  low: COLORS.emerald600,
  moderate: COLORS.amber600,
  considerable: '#f97316',
  high: COLORS.red600,
  extreme: '#7c3aed',
};

// ── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    backgroundColor: COLORS.stone50,
    paddingTop: 48,
    paddingBottom: 60,
    paddingHorizontal: 48,
    fontSize: 10,
    color: COLORS.stone800,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stone200,
  },
  logoText: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.stone800,
  },
  logoSubtext: {
    fontSize: 9,
    color: COLORS.stone500,
    marginTop: 2,
  },
  readinessBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
  },
  readinessBadgeText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  // Location
  locationName: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.stone900,
    marginBottom: 4,
    lineHeight: 1.2,
  },
  locationMeta: {
    fontSize: 11,
    color: COLORS.stone500,
    marginBottom: 16,
  },
  // Bottom line
  bottomLineBox: {
    backgroundColor: COLORS.stone100,
    borderRadius: 6,
    padding: 12,
    marginBottom: 18,
  },
  bottomLineLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.stone400,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bottomLineText: {
    fontSize: 12,
    color: COLORS.stone800,
    lineHeight: 1.5,
  },
  // Section headers
  sectionHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.stone400,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.stone200,
    marginVertical: 12,
  },
  // Condition cards
  conditionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: COLORS.stone200,
  },
  conditionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 2,
    marginRight: 10,
  },
  conditionCategory: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.stone700,
    marginBottom: 2,
  },
  conditionSummary: {
    fontSize: 10,
    color: COLORS.stone500,
    lineHeight: 1.4,
  },
  // Route walkthrough
  segmentRow: {
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.stone200,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  segmentTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.stone800,
  },
  segmentMile: {
    fontSize: 9,
    color: COLORS.stone400,
  },
  segmentNarrative: {
    fontSize: 10,
    color: COLORS.stone600,
    lineHeight: 1.5,
  },
  hazardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  hazardBadgeText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'capitalize',
  },
  // Critical sections
  criticalBox: {
    backgroundColor: COLORS.red50,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.red600,
  },
  criticalTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.red600,
    marginBottom: 3,
  },
  criticalWhy: {
    fontSize: 10,
    color: COLORS.stone700,
    marginBottom: 3,
    lineHeight: 1.4,
  },
  criticalRec: {
    fontSize: 10,
    color: COLORS.stone600,
    fontFamily: 'Helvetica-Oblique',
    lineHeight: 1.4,
  },
  // Gear checklist
  gearRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  checkBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.stone400,
    marginRight: 8,
    marginTop: 1,
  },
  gearText: {
    fontSize: 10,
    color: COLORS.stone700,
    flex: 1,
  },
  // Alternative routes
  altBox: {
    backgroundColor: COLORS.blue50,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  altDesc: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.blue600,
    marginBottom: 3,
  },
  altBenefit: {
    fontSize: 10,
    color: COLORS.stone600,
    lineHeight: 1.4,
  },
  // Narrative
  narrativeText: {
    fontSize: 11,
    color: COLORS.stone700,
    lineHeight: 1.6,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 8,
    color: COLORS.stone400,
  },
  disclaimer: {
    fontSize: 8,
    color: COLORS.stone400,
    textAlign: 'center',
    marginTop: 4,
  },
});

// ── Sub-components ────────────────────────────────────────────────────────

function ConditionCardRow({ card }: { card: ConditionCardData }) {
  const dotColor = STATUS_COLOR[card.status] ?? COLORS.stone400;
  return (
    <View style={s.conditionCard}>
      <View style={[s.conditionDot, { backgroundColor: dotColor }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.conditionCategory}>{card.category}</Text>
        <Text style={s.conditionSummary}>{card.summary}</Text>
      </View>
    </View>
  );
}

function SegmentRow({ seg }: { seg: RouteWalkthroughSegment }) {
  const hazardColor = HAZARD_COLOR[seg.hazardLevel.toLowerCase()] ?? COLORS.stone400;
  return (
    <View style={[s.segmentRow, { borderLeftColor: hazardColor }]}>
      <View style={s.segmentHeader}>
        <Text style={s.segmentTitle}>{seg.title}</Text>
        <Text style={s.segmentMile}>{seg.mileRange}</Text>
      </View>
      <View style={[s.hazardBadge, { backgroundColor: `${hazardColor}20` }]}>
        <Text style={[s.hazardBadgeText, { color: hazardColor }]}>
          {seg.hazardLevel}
        </Text>
      </View>
      <Text style={s.segmentNarrative}>{seg.narrative}</Text>
      {seg.timingAdvice && (
        <Text style={[s.segmentNarrative, { color: COLORS.stone400, marginTop: 3 }]}>
          Timing: {seg.timingAdvice}
        </Text>
      )}
    </View>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────

export interface BriefingPDFProps {
  locationName: string | null;
  activity: string;
  dateRange: { start: Date; end: Date };
  readiness: 'green' | 'yellow' | 'red' | null;
  bottomLine: string | null;
  narrative: string | null;
  conditionCards: ConditionCardData[];
  routeWalkthrough: RouteWalkthroughSegment[] | null;
  criticalSections: CriticalSection[] | null;
  alternativeRoutes: AlternativeRoute[] | null;
  gearChecklist: string[] | null;
}

// ── Main PDF Component ────────────────────────────────────────────────────

export function BriefingPDF({
  locationName,
  activity,
  dateRange,
  readiness,
  bottomLine,
  narrative,
  conditionCards,
  routeWalkthrough,
  criticalSections,
  alternativeRoutes,
  gearChecklist,
}: BriefingPDFProps) {
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const readinessConfig = readiness ? READINESS[readiness] : null;
  const isRoute = (routeWalkthrough?.length ?? 0) > 0;
  const generatedAt = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Document
      title={`${locationName ?? 'Briefing'} — Conditions`}
      author="Strange Grounds"
      subject="Backcountry Conditions Briefing"
    >
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.logoText}>Strange Grounds</Text>
            <Text style={s.logoSubtext}>Backcountry Conditions Intelligence</Text>
          </View>
          {readinessConfig && (
            <View style={[s.readinessBadge, { backgroundColor: readinessConfig.bg }]}>
              <Text style={[s.readinessBadgeText, { color: readinessConfig.text }]}>
                {readinessConfig.label}
              </Text>
            </View>
          )}
        </View>

        {/* Trip info */}
        <Text style={s.locationName}>{locationName ?? 'Backcountry Trip'}</Text>
        <Text style={s.locationMeta}>
          {activity} · {formatDate(dateRange.start)} – {formatDate(dateRange.end)}
        </Text>

        {/* Bottom line */}
        {bottomLine && (
          <View style={s.bottomLineBox}>
            <Text style={s.bottomLineLabel}>Bottom Line</Text>
            <Text style={s.bottomLineText}>{bottomLine}</Text>
          </View>
        )}

        {/* Route Walkthrough */}
        {isRoute && routeWalkthrough && routeWalkthrough.length > 0 && (
          <View>
            <Text style={s.sectionHeader}>Route Walkthrough</Text>
            {routeWalkthrough.map((seg) => (
              <SegmentRow key={seg.segmentOrder} seg={seg} />
            ))}
          </View>
        )}

        {/* Critical Sections */}
        {criticalSections && criticalSections.length > 0 && (
          <View>
            <Text style={s.sectionHeader}>Critical Sections</Text>
            {criticalSections.map((cs, i) => (
              <View key={i} style={s.criticalBox}>
                <Text style={s.criticalTitle}>{cs.title}</Text>
                <Text style={s.criticalWhy}>{cs.whyCritical}</Text>
                <Text style={s.criticalRec}>Recommendation: {cs.recommendation}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Gear Checklist */}
        {gearChecklist && gearChecklist.length > 0 && (
          <View>
            <Text style={s.sectionHeader}>Gear Checklist</Text>
            {gearChecklist.map((item, i) => (
              <View key={i} style={s.gearRow}>
                <View style={s.checkBox} />
                <Text style={s.gearText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Alternative Routes */}
        {alternativeRoutes && alternativeRoutes.length > 0 && (
          <View>
            <Text style={s.sectionHeader}>Alternative Routes</Text>
            {alternativeRoutes.map((alt, i) => (
              <View key={i} style={s.altBox}>
                <Text style={s.altDesc}>{alt.description}</Text>
                <Text style={s.altBenefit}>{alt.benefit}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.divider} />

        {/* Conditions */}
        {conditionCards.length > 0 && (
          <View>
            <Text style={s.sectionHeader}>Conditions</Text>
            {conditionCards.map((card) => (
              <ConditionCardRow key={card.category} card={card} />
            ))}
          </View>
        )}

        {/* Full narrative (point-based briefings) */}
        {!isRoute && narrative && (
          <View>
            <Text style={[s.sectionHeader, { marginTop: 12 }]}>Full Briefing</Text>
            <Text style={s.narrativeText}>{narrative}</Text>
          </View>
        )}

        <View style={s.divider} />

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Generated by Strange Grounds · {generatedAt}
          </Text>
          <Text style={s.footerText}>strange-grounds.vercel.app</Text>
        </View>

        <Text style={s.disclaimer}>
          Data from NWS, SNOTEL, avalanche.org, USGS. For informational purposes only.
          Always exercise independent judgement in the field. Conditions can change rapidly.
          This briefing is not a substitute for certified avalanche training or local expertise.
        </Text>
      </Page>
    </Document>
  );
}
