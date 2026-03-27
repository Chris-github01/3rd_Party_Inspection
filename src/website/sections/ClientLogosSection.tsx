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

  // Duplicate logos array for seamless infinite scrolling
  const duplicatedLogos = [...logos, ...logos];

  // Animation speed - 40 seconds for smooth scrolling (0.5x speed)
  const animationDuration = 40;

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

        <div className="flex">
          <div
            className="flex gap-12 pr-12"
            style={{
              animation: `scroll-logos ${animationDuration}s linear infinite`,
              willChange: 'transform',
            }}
          >
            {duplicatedLogos.map((logo, index) => (
              <div
                key={`${logo.id}-${index}`}
                className="flex-shrink-0 w-64 h-32 flex items-center justify-center"
              >
                <div className="w-full h-full bg-white/5 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 flex items-center justify-center hover:border-[#C8102E]/50 hover:bg-white/10 transition-all duration-300 group shadow-lg hover:shadow-[#C8102E]/20">
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <img
                      src={logo.logo_url}
                      alt={logo.name}
                      className="filter brightness-0 invert opacity-90 group-hover:opacity-100 transition-all duration-300 drop-shadow-lg"
                      style={{
                        width: 'auto',
                        height: 'auto',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        imageRendering: 'high-quality',
                      }}
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
