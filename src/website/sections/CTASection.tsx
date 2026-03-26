import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-24 bg-[#0B0F14] relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #C8102E 1px, transparent 0)',
          backgroundSize: '3rem 3rem'
        }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-[#F5F7FA] mb-6">
          Ready to Discuss Your<br />Inspection Requirements?
        </h2>
        <p className="text-xl text-[#D1D5DB] mb-12 max-w-3xl mx-auto">
          Contact P&R Consulting to discuss independent inspection support for your protective coatings, intumescent coatings, or passive fire protection project.
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
            className="px-8 py-4 bg-transparent hover:bg-[#121821] text-[#F5F7FA] font-semibold rounded-lg border-2 border-[#C8102E] transition-all"
          >
            View Services
          </Link>
        </div>

        <div className="mt-12 pt-12 border-t border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div>
              <h4 className="text-[#C8102E] font-semibold mb-2">Coverage</h4>
              <p className="text-[#D1D5DB] text-sm">Nationwide service across all regions of New Zealand</p>
            </div>
            <div>
              <h4 className="text-[#C8102E] font-semibold mb-2">Response Time</h4>
              <p className="text-[#D1D5DB] text-sm">Rapid assessment and project mobilisation capability</p>
            </div>
            <div>
              <h4 className="text-[#C8102E] font-semibold mb-2">Reporting</h4>
              <p className="text-[#D1D5DB] text-sm">Detailed, compliance-focused inspection documentation</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
