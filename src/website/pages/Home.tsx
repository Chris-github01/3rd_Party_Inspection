import { HeroSection } from '../sections/HeroSection';
import { ServicesOverviewSection } from '../sections/ServicesOverviewSection';
import { CredentialsSection } from '../sections/CredentialsSection';
import { SectorCoverageSection } from '../sections/SectorCoverageSection';
import { CTASection } from '../sections/CTASection';
import { ClientLogosSection } from '../sections/ClientLogosSection';

export function Home() {
  return (
    <>
      <HeroSection />
      <ServicesOverviewSection />
      <CredentialsSection />
      <SectorCoverageSection />
      <CTASection />
      <ClientLogosSection />
    </>
  );
}
