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
      // Fallback to hardcoded logos if database fails
      setLogos([
        { id: '1', name: 'LT McGuinness', logo_url: '/images/clients/LT-McGuinness-Logo-Colour-with-black.png', display_order: 1, preserve_colors: false },
        { id: '2', name: 'Kalmar', logo_url: '/images/clients/Kalmar-Logo@2x.png', display_order: 2, preserve_colors: false },
        { id: '3', name: 'Naylor Love', logo_url: '/images/clients/naylor-love-logo.png', display_order: 3, preserve_colors: false },
        { id: '4', name: 'Watts & Hughes', logo_url: '/images/clients/wh.png', display_order: 4, preserve_colors: false },
        { id: '5', name: 'Cook Brothers Construction', logo_url: '/images/clients/CookBrothersConstructionBlockLogo_CMYK.jpg', display_order: 5, preserve_colors: false },
        { id: '6', name: 'Hawkins', logo_url: '/images/clients/hawk.png', display_order: 6, preserve_colors: true },
        { id: '7', name: 'Cassidy Construction', logo_url: '/images/clients/cass.png', display_order: 7, preserve_colors: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return null;
  }

  // Duplicate logos array multiple times for seamless scrolling
  const allLogos = [...logos, ...logos, ...logos];

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
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0B0F14] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0B0F14] to-transparent z-10" />

        <div className="flex animate-scroll-logos">
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
