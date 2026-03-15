import { Navbar } from '@/components/marketing/Navbar';
import { Hero } from '@/components/marketing/Hero';
import { Stats } from '@/components/marketing/Stats';
import { HowItWorks } from '@/components/marketing/HowItWorks';
import { FeatureSection, features } from '@/components/marketing/FeatureSection';
import { PopularRoutes } from '@/components/marketing/PopularRoutes';
import { CTASection } from '@/components/marketing/CTASection';
import { MarketingFooter } from '@/components/marketing/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF5]" data-testid="marketing-landing">
      <Navbar />
      <Hero />
      <Stats />
      <HowItWorks />
      {features.map((feature) => (
        <FeatureSection key={feature.label} feature={feature} />
      ))}
      <PopularRoutes />
      <CTASection />
      <MarketingFooter />
    </div>
  );
}
