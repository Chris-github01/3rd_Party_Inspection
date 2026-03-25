import { Shield, Flame, CheckCircle, ClipboardCheck, FileText, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Services() {
  const services = [
    {
      icon: Shield,
      title: 'Protective Coatings Inspection',
      description: 'AMPP-certified inspection of protective coating systems across industrial, infrastructure, and commercial projects. Coverage includes surface preparation verification, coating application monitoring, dry film thickness measurement, and compliance reporting in accordance with project specifications and relevant standards.',
      capabilities: [
        'Surface preparation inspection (AS/NZS 1627, ISO 8501, SSPC-SP standards)',
        'Coating application monitoring and DFT verification',
        'Adhesion testing and quality assurance checks',
        'Compliance reporting aligned with project specifications',
      ],
    },
    {
      icon: Flame,
      title: 'Intumescent Coatings Inspection',
      description: 'Specialist inspection of intumescent coating applications for structural fire protection. Services include verification of substrate preparation, intumescent coating application rates, dry film thickness measurement, and documentation of compliance with fire rating requirements and project specifications.',
      capabilities: [
        'Substrate preparation verification',
        'Intumescent coating application rate monitoring',
        'DFT measurement across critical structural members',
        'Fire rating compliance documentation',
      ],
    },
    {
      icon: CheckCircle,
      title: 'Passive Fire Protection Inspection',
      description: 'NZQA Level 4 certified passive fire protection inspection covering fire-rated systems, penetration seals, and compliance verification. Inspection support includes documentation of installed systems, verification against approved product listings, and reporting aligned with Building Code compliance requirements.',
      capabilities: [
        'Fire-rated system installation verification',
        'Penetration seal inspection and documentation',
        'Compliance verification against approved product listings',
        'Building Code compliance reporting support',
      ],
    },
    {
      icon: ClipboardCheck,
      title: 'QA Verification Support',
      description: 'Independent quality assurance, defect identification, and verification support for construction and infrastructure projects. Services include review of coating system documentation, verification of work package completion, and independent reporting to support project handover and compliance objectives.',
      capabilities: [
        'Coating system documentation review',
        'Work package completion verification',
        'Defect identification and reporting',
        'Project handover support',
      ],
    },
    {
      icon: AlertTriangle,
      title: 'Corrosion & Condition Inspection',
      description: 'Assessment of existing protective coating systems, corrosion condition evaluation, and recommendation development for maintenance or remediation projects. Inspection services support asset management, maintenance planning, and coating system life extension across infrastructure and industrial environments.',
      capabilities: [
        'Coating condition assessment and classification',
        'Corrosion severity evaluation',
        'Remediation strategy recommendations',
        'Asset management support',
      ],
    },
    {
      icon: FileText,
      title: 'Specification Review & Compliance Verification',
      description: 'Technical review of coating specifications, verification of specification compliance throughout project execution, and independent reporting to support quality outcomes. Services include specification adequacy assessment, material approval verification, and alignment with relevant standards.',
      capabilities: [
        'Coating specification technical review',
        'Material approval verification',
        'Specification compliance monitoring',
        'Standards alignment verification',
      ],
    },
  ];

  return (
    <div className="bg-[#0B0F14]">
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 bg-[#121821] border border-slate-800 rounded-full mb-6">
              <span className="text-sm font-semibold text-[#C8102E]">SERVICES</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-[#F5F7FA] mb-6">
              Specialist Inspection<br />Services
            </h1>
            <p className="text-xl text-[#D1D5DB] max-w-3xl mx-auto leading-relaxed">
              Certified inspection capability across protective coatings, intumescent coatings, and passive fire protection systems.
            </p>
          </div>

          <div className="space-y-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="bg-[#121821] border border-slate-800 hover:border-[#C8102E] rounded-xl p-8 transition-all"
              >
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#C8102E] to-[#A60E25] rounded-lg flex items-center justify-center flex-shrink-0">
                    <service.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-[#F5F7FA] mb-4">
                      {service.title}
                    </h2>
                    <p className="text-[#D1D5DB] leading-relaxed mb-6">
                      {service.description}
                    </p>
                    <div>
                      <h3 className="text-sm font-semibold text-[#C8102E] mb-3 uppercase tracking-wide">
                        Key Capabilities
                      </h3>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {service.capabilities.map((capability, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-[#D1D5DB]">
                            <span className="w-1.5 h-1.5 bg-[#C8102E] rounded-full mt-1.5 flex-shrink-0" />
                            {capability}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 bg-gradient-to-br from-[#121821] to-[#0B0F14] border border-[#C8102E] rounded-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-[#F5F7FA] mb-4">
              Ready to Discuss Your Inspection Requirements?
            </h2>
            <p className="text-[#D1D5DB] mb-6 max-w-2xl mx-auto">
              Contact P&R Consulting to discuss independent inspection support for your protective coatings, intumescent coatings, or passive fire protection project.
            </p>
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
