import { Building2, GraduationCap, Construction, Factory } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ProjectsPage() {
  const projectHighlights = [
    {
      icon: GraduationCap,
      sector: 'Education',
      title: 'Educational Facilities',
      description: 'Passive fire protection and intumescent coating inspection across multiple educational facilities, supporting Building Code compliance and fire rating verification.',
      scope: [
        'Intumescent coating inspection on structural steel',
        'Passive fire protection verification',
        'Compliance documentation and reporting',
      ],
    },
    {
      icon: Building2,
      sector: 'Commercial',
      title: 'Commercial Developments',
      description: 'Independent inspection support across office buildings and commercial construction projects, covering protective coating systems and fire protection compliance.',
      scope: [
        'Protective coating system inspection',
        'Fire-rated system verification',
        'QA documentation support',
      ],
    },
    {
      icon: Construction,
      sector: 'Infrastructure',
      title: 'Infrastructure Projects',
      description: 'Protective coating inspection and corrosion protection verification across bridges, civil structures, and public infrastructure assets.',
      scope: [
        'Surface preparation verification',
        'Coating application monitoring',
        'Compliance reporting to project specifications',
      ],
    },
    {
      icon: Factory,
      sector: 'Industrial',
      title: 'Industrial Facilities',
      description: 'Protective coating inspection and condition assessment across manufacturing facilities and processing plants with corrosion protection requirements.',
      scope: [
        'Coating system inspection and verification',
        'Corrosion condition assessment',
        'Maintenance planning support',
      ],
    },
  ];

  return (
    <div className="bg-[#0B0F14]">
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 bg-[#121821] border border-slate-800 rounded-full mb-6">
              <span className="text-sm font-semibold text-[#C8102E]">PROJECT EXPERIENCE</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-[#F5F7FA] mb-6">
              Multi-Sector<br />Project Experience
            </h1>
            <p className="text-xl text-[#D1D5DB] max-w-3xl mx-auto leading-relaxed">
              Independent inspection support across education, commercial, infrastructure, and industrial sectors throughout New Zealand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {projectHighlights.map((project, index) => (
              <div
                key={index}
                className="bg-[#121821] border border-slate-800 hover:border-[#C8102E] rounded-xl p-8 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#C8102E] to-[#A60E25] rounded-lg flex items-center justify-center">
                    <project.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#C8102E] uppercase tracking-wide">
                      {project.sector}
                    </div>
                    <h2 className="text-xl font-bold text-[#F5F7FA]">
                      {project.title}
                    </h2>
                  </div>
                </div>
                <p className="text-[#D1D5DB] leading-relaxed mb-6">
                  {project.description}
                </p>
                <div>
                  <h3 className="text-sm font-semibold text-[#C8102E] mb-3 uppercase tracking-wide">
                    Inspection Scope
                  </h3>
                  <ul className="space-y-2">
                    {project.scope.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-[#D1D5DB]">
                        <span className="w-1.5 h-1.5 bg-[#C8102E] rounded-full mt-1.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-[#121821] to-[#0B0F14] border border-slate-800 rounded-xl p-12">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-[#F5F7FA] mb-4">
                Project Experience Across New Zealand
              </h2>
              <p className="text-[#D1D5DB] leading-relaxed mb-8">
                P&R Consulting has provided independent inspection services across education, commercial, infrastructure, and industrial sectors throughout New Zealand. Our project experience spans protective coating systems, intumescent coatings, and passive fire protection compliance across both new construction and asset maintenance environments.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#0B0F14] border border-slate-800 rounded-lg p-6">
                  <div className="text-3xl font-bold text-[#C8102E] mb-2">Multiple</div>
                  <div className="text-sm text-[#D1D5DB]">Regions Covered</div>
                </div>
                <div className="bg-[#0B0F14] border border-slate-800 rounded-lg p-6">
                  <div className="text-3xl font-bold text-[#C8102E] mb-2">4</div>
                  <div className="text-sm text-[#D1D5DB]">Sectors Served</div>
                </div>
                <div className="bg-[#0B0F14] border border-slate-800 rounded-lg p-6">
                  <div className="text-3xl font-bold text-[#C8102E] mb-2">Certified</div>
                  <div className="text-sm text-[#D1D5DB]">Inspection Capability</div>
                </div>
              </div>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#C8102E] hover:bg-[#A60E25] text-white font-semibold rounded-lg transition-colors"
              >
                Discuss Your Project
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
