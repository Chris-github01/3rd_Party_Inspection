import { HeroSection } from '../sections/HeroSection';
import { PromoVideoSection } from '../sections/PromoVideoSection';
import { ServicesOverviewSection } from '../sections/ServicesOverviewSection';
import { CredentialsSection } from '../sections/CredentialsSection';
import { SectorCoverageSection } from '../sections/SectorCoverageSection';
import { CTASection } from '../sections/CTASection';
import { ClientLogosSection } from '../sections/ClientLogosSection';

export function Home() {
  return (
    <>
      <HeroSection />
      <PromoVideoSection />
      <ServicesOverviewSection />
      <CredentialsSection />
      <SectorCoverageSection />
      <CTASection />
      <ClientLogosSection />
    </>
  );
}
