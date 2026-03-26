import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ClientLogo {
  id: string;
  name: string;
  logo_url: string;
  display_order: number;
  preserve_colors: boolean;
}

export function ClientLogosSection() {
  const [logos, setLogos] = useState<ClientLogo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogos();
  }, []);

  async function fetchLogos() {
    try {
      const { data, error } = await supabase
        .from('client_logos')
        .select('*')
        .eq('active', true)
        .order('display_order');

      if (error) throw error;
      setLogos(data || []);
    } catch (error) {
      console.error('Error fetching logos:', error);
      setLogos([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  // If no logos, don't render the section
  if (logos.length === 0) {
    return null;
  }

  // Duplicate logos array enough times for seamless infinite scrolling
  // We need at least 2 full sets for the animation to loop seamlessly
  const allLogos = [...logos, ...logos];

  // Dynamic animation duration based on number of logos (8 seconds per logo for smooth scrolling)
  const animationDuration = Math.max(30, logos.length * 8);

  return (
    <section className="bg-[#0B0F14] border-t border-slate-800 py-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#F5F7FA] mb-2">
            Trusted By Leading Organizations
          </h2>
          <p className="text-[#D1D5DB] text-sm">
            Delivering independent inspection services across New Zealand
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0B0F14] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0B0F14] to-transparent z-10 pointer-events-none" />

        <div
          className="flex animate-scroll-logos will-change-transform"
          style={{ animationDuration: `${animationDuration}s` }}
        >
          {allLogos.map((logo, index) => (
            <div
              key={`${logo.id}-${index}`}
              className="flex-shrink-0 w-72 h-36 mx-10 flex items-center justify-center"
            >
              <div className="w-full h-full bg-white/5 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 flex items-center justify-center hover:border-[#C8102E]/50 hover:bg-white/10 transition-all duration-300 group shadow-lg hover:shadow-[#C8102E]/20">
                <img
                  src={logo.logo_url}
                  alt={logo.name}
                  className={`max-w-full max-h-full object-contain transition-all duration-300 drop-shadow-lg ${
                    logo.preserve_colors
                      ? 'opacity-90 group-hover:opacity-100'
                      : 'filter brightness-0 invert opacity-90 group-hover:opacity-100'
                  }`}
                  style={{ imageRendering: 'high-quality' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `<span class="text-white text-lg font-semibold tracking-wide">${logo.name}</span>`;
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
