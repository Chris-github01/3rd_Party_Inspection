import { Link } from 'react-router-dom';
import { Shield, Flame, CheckCircle, ClipboardCheck, ArrowRight } from 'lucide-react';

export function ServicesOverviewSection() {
  const services = [
    {
      icon: Shield,
      title: 'Protective Coatings Inspection',
      description: 'AMPP-certified inspection of protective coating systems across industrial, infrastructure, and commercial projects.',
      image: '/images/protective-coatings-inspection.jpg',
    },
    {
      icon: Flame,
      title: 'Intumescent Coatings Inspection',
      description: 'Specialist inspection of intumescent coating applications for structural fire protection in accordance with project specifications.',
      image: 'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      icon: CheckCircle,
      title: 'Passive Fire Protection Inspection',
      description: 'NZQA Level 4 certified passive fire protection inspection covering fire-rated systems and compliance verification.',
      image: 'https://images.pexels.com/photos/159358/construction-site-build-construction-work-159358.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
      icon: ClipboardCheck,
      title: 'QA Verification Support',
      description: 'Independent quality assurance, defect identification, and verification support for construction and infrastructure projects.',
      image: 'https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
  ];

  return (
    <section className="py-24 bg-[#121821] relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #C8102E 1px, transparent 0)',
          backgroundSize: '3rem 3rem'
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-[#F5F7FA] mb-4">
            Specialist Inspection Services
          </h2>
          <p className="text-xl text-[#D1D5DB] max-w-3xl mx-auto">
            Certified capability across protective coatings, intumescent coatings, and passive fire protection inspection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {services.map((service, index) => (
            <div
              key={index}
              className="group bg-[#0B0F14] border border-slate-800 hover:border-[#C8102E] rounded-xl overflow-hidden transition-all hover:shadow-xl hover:shadow-[#C8102E]/10"
            >
              <div className="relative h-56 overflow-hidden bg-slate-900">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/50 to-transparent" />
                <div className="absolute bottom-4 left-4 w-14 h-14 bg-gradient-to-br from-[#C8102E] to-[#A60E25] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <service.icon className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-xl font-bold text-[#F5F7FA] mb-3">
                  {service.title}
                </h3>
                <p className="text-[#D1D5DB] leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/services"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#C8102E] hover:bg-[#A60E25] text-white font-semibold rounded-lg transition-colors"
          >
            View All Services
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
