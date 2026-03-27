import { Play, Pause } from 'lucide-react';
import { useState, useRef } from 'react';

export function PromoVideoSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <section className="relative py-24 bg-gradient-to-b from-[#0B0F14] via-[#121821] to-[#0B0F14] overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
          backgroundSize: '4rem 4rem'
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-[#F5F7FA] mb-4">
            See Our Expertise in
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C8102E] to-[#A60E25]"> Action</span>
          </h2>
          <p className="text-xl text-[#D1D5DB] max-w-3xl mx-auto">
            Watch how we deliver precision inspection services across New Zealand
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-2xl border border-slate-800">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              poster="/images/video-poster.jpg"
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            >
              <source
                src="https://customer-XXXXXX.cloudflarestream.com/YOUR_VIDEO_ID/manifest/video.m3u8"
                type="application/x-mpegURL"
              />
              <source
                src="https://customer-XXXXXX.cloudflarestream.com/YOUR_VIDEO_ID/downloads/default.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>

            {!isPlaying && (
              <div
                className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60 flex items-center justify-center cursor-pointer group"
                onClick={togglePlay}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-[#C8102E] blur-3xl opacity-40 group-hover:opacity-60 transition-opacity" />
                  <button
                    className="relative w-20 h-20 md:w-24 md:h-24 bg-[#C8102E] hover:bg-[#A60E25] rounded-full flex items-center justify-center transition-all transform group-hover:scale-110 shadow-2xl"
                    aria-label="Play video"
                  >
                    <Play className="w-10 h-10 md:w-12 md:h-12 text-white ml-2" fill="currentColor" />
                  </button>
                </div>
              </div>
            )}

            {isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute top-4 right-4 w-12 h-12 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center transition-all z-20"
                aria-label="Pause video"
              >
                <Pause className="w-6 h-6 text-white" />
              </button>
            )}
          </div>

          <div className="absolute -inset-4 bg-gradient-to-r from-[#C8102E]/20 via-transparent to-[#C8102E]/20 blur-3xl -z-10" />
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-[#D1D5DB]/70">
            Learn more about our comprehensive inspection capabilities and industry-leading expertise
          </p>
        </div>
      </div>
    </section>
  );
}
