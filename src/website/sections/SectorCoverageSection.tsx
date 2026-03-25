import { Building2, GraduationCap, Construction, Factory } from 'lucide-react';

export function SectorCoverageSection() {
  const sectors = [
    {
      icon: GraduationCap,
      title: 'Education',
      description: 'Schools, universities, and educational facilities requiring compliant fire protection and coating inspection.',
    },
    {
      icon: Building2,
      title: 'Commercial',
      description: 'Office buildings, retail developments, and commercial construction projects across New Zealand.',
    },
    {
      icon: Construction,
      title: 'Infrastructure',
      description: 'Bridges, civil structures, and public infrastructure requiring protective coating verification.',
    },
    {
      icon: Factory,
      title: 'Industrial',
      description: 'Manufacturing facilities, processing plants, and industrial environments with corrosion protection requirements.',
    },
  ];

  return (
    <section className="py-24 bg-[#121821]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#F5F7FA] mb-4">
            Multi-Sector Experience
          </h2>
          <p className="text-xl text-[#D1D5DB] max-w-3xl mx-auto">
            Independent inspection support across education, commercial, infrastructure, and industrial sectors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sectors.map((sector, index) => (
            <div
              key={index}
              className="group bg-[#0B0F14] border border-slate-800 hover:border-[#C8102E] rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-[#C8102E]/10"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#C8102E]/20 to-[#A60E25]/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <sector.icon className="w-6 h-6 text-[#C8102E]" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F7FA] mb-2">
                {sector.title}
              </h3>
              <p className="text-sm text-[#D1D5DB] leading-relaxed">
                {sector.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
