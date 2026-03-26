export function ClientLogosSection() {
  const logos = [
    { name: 'LT McGuinness', url: '/images/clients/LT-McGuinness-Logo-Colour-with-black.png' },
    { name: 'Kalmar', url: '/images/clients/Kalmar-Logo@2x.png' },
    { name: 'Naylor Love', url: '/images/clients/naylor-love-logo.png' },
    { name: 'Watts & Hughes', url: '/images/clients/wh.png' },
    { name: 'Cook Brothers Construction', url: '/images/clients/CookBrothersConstructionBlockLogo_CMYK.jpg' },
    { name: 'Hawkins', url: '/images/clients/hawk.png' },
    { name: 'Cassidy Construction', url: '/images/clients/cass.png' },
  ];

  const allLogos = [...logos, ...logos];

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
              key={`${logo.name}-${index}`}
              className="flex-shrink-0 w-72 h-36 mx-10 flex items-center justify-center"
            >
              <div className="w-full h-full bg-white/5 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 flex items-center justify-center hover:border-[#C8102E]/50 hover:bg-white/10 transition-all duration-300 group shadow-lg hover:shadow-[#C8102E]/20">
                <img
                  src={logo.url}
                  alt={logo.name}
                  className="max-w-full max-h-full object-contain filter brightness-0 invert opacity-90 group-hover:opacity-100 transition-all duration-300 drop-shadow-lg"
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
