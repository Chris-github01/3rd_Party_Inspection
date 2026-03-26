import { Award, ShieldCheck, FileCheck } from 'lucide-react';

export function CredentialsSection() {
  const credentials = [
    {
      icon: Award,
      title: 'AMPP Certified Coatings Inspection (Level 1 & Level 2)',
      description: 'Recognised coatings inspection capability through the Association for Materials Protection and Performance (AMPP), covering both foundational and advanced inspection practices.',
    },
    {
      icon: ShieldCheck,
      title: 'ACA Coating Selection & Specification',
      description: 'Professional achievement through the Australasian Corrosion Association (ACA) in coating system selection and specification.',
    },
    {
      icon: FileCheck,
      title: 'Passive Fire Protection Inspection – Level 4 (NZQA)',
      description: 'National Certificate in Passive Fire Protection (Building Construction Inspections), supporting compliant inspection of fire-rated systems.',
    },
  ];

  return (
    <section className="py-24 bg-[#0B0F14] relative overflow-hidden">
      {/* Optional support image */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-full hidden lg:block opacity-10">
        <img
          src="/images/credentials-support-image.jpg"
          alt="Credentials support"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F14] via-[#0B0F14]/90 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-6">
          <div className="inline-block px-4 py-1.5 bg-[#121821] border border-slate-800 rounded-full mb-6">
            <span className="text-sm font-semibold text-[#C8102E]">CREDENTIALS</span>
          </div>
        </div>

        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-[#F5F7FA] mb-6">
            Technical Credentials &<br />Certified Capability
          </h2>
          <p className="text-lg text-[#D1D5DB] max-w-4xl mx-auto leading-relaxed">
            P&R Consulting's inspection capability is supported by recognised professional achievement across protective coatings, coating specification, and passive fire protection inspection. These qualifications underpin a rigorous, compliance-focused approach to inspection across high-value construction and infrastructure projects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {credentials.map((credential, index) => (
            <div
              key={index}
              className="bg-gradient-to-br from-[#121821] to-[#0B0F14] border border-slate-800 rounded-xl p-8 hover:border-[#C8102E] transition-all"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#C8102E] to-[#A60E25] rounded-lg flex items-center justify-center mb-6">
                <credential.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F7FA] mb-4">
                {credential.title}
              </h3>
              <p className="text-[#D1D5DB] text-sm leading-relaxed">
                {credential.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-[#D1D5DB] text-sm max-w-4xl mx-auto leading-relaxed border-t border-slate-800 pt-8">
            These qualifications support inspection activities across intumescent coatings, protective coatings, and passive fire protection systems in accordance with relevant standards and project specifications.
          </p>
        </div>
      </div>
    </section>
  );
}
