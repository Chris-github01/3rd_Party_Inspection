import { Link, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';

export function PublicNavbar() {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/services', label: 'Services' },
    { path: '/projects', label: 'Projects' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0F14]/95 backdrop-blur-sm border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#C8102E] to-[#A60E25] rounded flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[#F5F7FA] font-bold text-lg tracking-tight">
                P&R Consulting
              </span>
              <span className="text-[#D1D5DB] text-xs tracking-wide">
                Independent Inspection Authority
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors relative ${
                  isActive(link.path)
                    ? 'text-[#C8102E]'
                    : 'text-[#D1D5DB] hover:text-[#F5F7FA]'
                }`}
              >
                {link.label}
                {isActive(link.path) && (
                  <div className="absolute -bottom-[29px] left-0 right-0 h-0.5 bg-[#C8102E]" />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-[#D1D5DB] hover:text-[#F5F7FA] transition-colors"
            >
              Client Login
            </Link>
            <Link
              to="/contact"
              className="px-6 py-2.5 bg-[#C8102E] hover:bg-[#A60E25] text-white text-sm font-semibold rounded transition-colors"
            >
              Request Assessment
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
