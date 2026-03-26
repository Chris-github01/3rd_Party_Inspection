import { Link } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0F14] via-[#121821] to-[#0B0F14]" />

      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/80" />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src="/images/P&R_Logo.png"
          alt="Background Logo"
          className="w-[800px] max-w-none opacity-[0.08] blur-[0.5px] grayscale transform scale-110"
        />
      </div>

      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
          backgroundSize: '4rem 4rem'
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#121821] border border-slate-800 rounded-full mb-8">
          <Shield className="w-4 h-4 text-[#C8102E]" />
          <span className="text-[#D1D5DB] text-sm font-medium">
            AMPP & NZQA Certified Inspection Capability
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-[#F5F7FA] mb-6 leading-tight">
          Independent Inspection
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C8102E] to-[#A60E25]">
            Authority
          </span>{' '}
          Across New Zealand
        </h1>

        <p className="text-xl md:text-2xl text-[#D1D5DB] max-w-3xl mx-auto mb-12 leading-relaxed">
          Specialist third-party inspection services for protective coatings, intumescent coatings, and passive fire protection systems.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/contact"
            className="group px-8 py-4 bg-[#C8102E] hover:bg-[#A60E25] text-white font-semibold rounded-lg transition-all flex items-center gap-2"
          >
            Request Technical Assessment
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/services"
            className="px-8 py-4 bg-[#121821] hover:bg-slate-800 text-[#F5F7FA] font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            View Services
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {[
            { label: 'Nationwide Coverage', value: 'All Regions' },
            { label: 'Specialist Capability', value: 'Certified' },
            { label: 'Compliance Focused', value: 'Standards Based' },
            { label: 'Multi-Sector', value: 'Experience' },
          ].map((metric, index) => (
            <div key={index} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-[#C8102E] mb-1">
                {metric.value}
              </div>
              <div className="text-sm text-[#D1D5DB]">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
