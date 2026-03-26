import { Link } from 'react-router-dom';
import { Shield, Mail, MapPin, Phone } from 'lucide-react';

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0B0F14] border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#C8102E] to-[#A60E25] rounded flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[#F5F7FA] font-bold text-lg">
                  P&R Consulting Limited
                </span>
                <span className="text-[#D1D5DB] text-sm">
                  Independent Inspection Authority
                </span>
              </div>
            </div>
            <p className="text-[#D1D5DB] text-sm leading-relaxed max-w-md">
              Specialist third-party inspection services for protective coatings, intumescent coatings, and passive fire protection systems across New Zealand.
            </p>
          </div>

          <div>
            <h3 className="text-[#F5F7FA] font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/services"
                  className="text-[#D1D5DB] text-sm hover:text-[#C8102E] transition-colors"
                >
                  Protective Coatings Inspection
                </Link>
              </li>
              <li>
                <Link
                  to="/services"
                  className="text-[#D1D5DB] text-sm hover:text-[#C8102E] transition-colors"
                >
                  Intumescent Coatings Inspection
                </Link>
              </li>
              <li>
                <Link
                  to="/services"
                  className="text-[#D1D5DB] text-sm hover:text-[#C8102E] transition-colors"
                >
                  Passive Fire Protection
                </Link>
              </li>
              <li>
                <Link
                  to="/services"
                  className="text-[#D1D5DB] text-sm hover:text-[#C8102E] transition-colors"
                >
                  QA Verification Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[#F5F7FA] font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/about"
                  className="text-[#D1D5DB] text-sm hover:text-[#C8102E] transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  to="/projects"
                  className="text-[#D1D5DB] text-sm hover:text-[#C8102E] transition-colors"
                >
                  Project Experience
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-[#D1D5DB] text-sm hover:text-[#C8102E] transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-[#D1D5DB] text-sm hover:text-[#C8102E] transition-colors"
                >
                  Inspector Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[#D1D5DB] text-sm">
              © {currentYear} P&R Consulting Limited. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="text-[#D1D5DB] text-sm">
                Nationwide Coverage
              </span>
              <span className="text-[#D1D5DB] text-sm">
                New Zealand
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
