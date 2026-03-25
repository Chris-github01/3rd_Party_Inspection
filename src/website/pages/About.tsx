import { Shield, Target, Award, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export function About() {
  return (
    <div className="bg-[#0B0F14]">
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-[#F5F7FA] mb-6">
              Independent Inspection<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C8102E] to-[#A60E25]">
                Authority
              </span>
            </h1>
            <p className="text-xl text-[#D1D5DB] max-w-3xl mx-auto leading-relaxed">
              P&R Consulting provides specialist third-party inspection services for protective coatings, intumescent coatings, and passive fire protection systems across New Zealand.
            </p>
          </div>

          <div className="prose prose-invert prose-lg max-w-none">
            <div className="bg-[#121821] border border-slate-800 rounded-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-[#F5F7FA] mb-4 flex items-center gap-3">
                <Shield className="w-6 h-6 text-[#C8102E]" />
                Who We Are
              </h2>
              <p className="text-[#D1D5DB] leading-relaxed mb-4">
                P&R Consulting Limited is a specialist inspection consultancy focused on protective coatings, intumescent coatings, and passive fire protection systems. Operating nationwide across New Zealand, we provide independent, compliance-focused inspection support to contractors, consultants, and project teams across education, commercial, infrastructure, and industrial sectors.
              </p>
              <p className="text-[#D1D5DB] leading-relaxed">
                Our capability is underpinned by recognised professional qualifications including AMPP Certified Coatings Inspection (Level 1 & Level 2), ACA Coating Selection & Specification, and NZQA Level 4 Passive Fire Protection Inspection.
              </p>
            </div>

            <div className="bg-[#121821] border border-slate-800 rounded-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-[#F5F7FA] mb-4 flex items-center gap-3">
                <Target className="w-6 h-6 text-[#C8102E]" />
                Inspection Philosophy
              </h2>
              <p className="text-[#D1D5DB] leading-relaxed mb-4">
                Our inspection approach is grounded in technical rigour, compliance verification, and independent reporting. We operate as an objective third party, focused on identifying non-conformances, verifying compliance with project specifications and relevant standards, and supporting quality outcomes across high-value construction and infrastructure projects.
              </p>
              <p className="text-[#D1D5DB] leading-relaxed">
                We do not supply materials, do not conduct application work, and maintain strict independence from coating manufacturers and applicators. This independence ensures our inspection findings and recommendations are objective, technically sound, and aligned with project requirements.
              </p>
            </div>

            <div className="bg-[#121821] border border-slate-800 rounded-xl p-8 mb-8">
              <h2 className="text-2xl font-bold text-[#F5F7FA] mb-4 flex items-center gap-3">
                <Award className="w-6 h-6 text-[#C8102E]" />
                Technical Credentials
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#F5F7FA] mb-2">
                    AMPP Certified Coatings Inspection (Level 1 & Level 2)
                  </h3>
                  <p className="text-[#D1D5DB] text-sm">
                    Recognised coatings inspection capability through the Association for Materials Protection and Performance (AMPP).
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#F5F7FA] mb-2">
                    ACA Coating Selection & Specification
                  </h3>
                  <p className="text-[#D1D5DB] text-sm">
                    Professional achievement through the Australasian Corrosion Association (ACA) in coating system selection and specification.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#F5F7FA] mb-2">
                    Passive Fire Protection Inspection – Level 4 (NZQA)
                  </h3>
                  <p className="text-[#D1D5DB] text-sm">
                    National Certificate in Passive Fire Protection (Building Construction Inspections).
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#121821] border border-slate-800 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-[#F5F7FA] mb-4 flex items-center gap-3">
                <Users className="w-6 h-6 text-[#C8102E]" />
                Why Clients Engage Us
              </h2>
              <ul className="space-y-3 text-[#D1D5DB]">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#C8102E] rounded-full mt-2 flex-shrink-0" />
                  <span>Independent, objective inspection with no affiliation to coating suppliers or applicators</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#C8102E] rounded-full mt-2 flex-shrink-0" />
                  <span>Recognised technical qualifications across protective coatings, intumescent coatings, and passive fire protection</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#C8102E] rounded-full mt-2 flex-shrink-0" />
                  <span>Compliance-focused reporting aligned with project specifications and relevant standards</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#C8102E] rounded-full mt-2 flex-shrink-0" />
                  <span>Nationwide coverage with rapid project mobilisation capability</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-[#C8102E] rounded-full mt-2 flex-shrink-0" />
                  <span>Multi-sector experience across education, commercial, infrastructure, and industrial projects</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#C8102E] hover:bg-[#A60E25] text-white font-semibold rounded-lg transition-colors"
            >
              Request Technical Assessment
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
