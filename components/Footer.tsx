import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#1a1040' }}>
      {/* Three-column grid */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10">

        {/* ── Left: Brand ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Image src="/fasonicon.png" alt="FASON" width={40} height={40} className="rounded-xl" />
            <span
              className="text-xl font-bold text-white"
              style={{ fontFamily: 'var(--font-unbounded)' }}
            >
              FASON
            </span>
          </div>
          <p className="text-sm font-semibold" style={{ color: '#FFE600' }}>
            Dolabını pula çevir
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Azərbaycanda ikinci əl geyim, ayaqqabı və aksesuar alqı-satqı platforması.
          </p>
        </div>

        {/* ── Middle: Links ── */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#FF2D78' }}>
            Keçidlər
          </p>
          <nav className="flex flex-col gap-3">
            {[
              { label: 'Ana səhifə', href: '/' },
              { label: 'Elan ver',   href: '/sell' },
              { label: 'Haqqımızda', href: '#about' },
              { label: 'Əlaqə',     href: '#contact' },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-sm transition-colors hover:text-white"
                style={{ color: 'rgba(255,255,255,0.55)' }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* ── Right: Social & Contact ── */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#FF2D78' }}>
            Bizi izləyin
          </p>
          <div className="flex flex-col gap-3">
            {/* TikTok — active */}
            <a
              href="https://www.tiktok.com/@fason.store"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group"
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-white/20"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                {/* TikTok icon */}
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.84 1.56V6.8a4.85 4.85 0 01-1.07-.11z" />
                </svg>
              </span>
              <span className="text-sm transition-colors group-hover:text-white" style={{ color: 'rgba(255,255,255,0.7)' }}>
                @fason.store
              </span>
            </a>

            {/* Instagram — coming soon */}
            <div className="flex items-center gap-3 cursor-not-allowed opacity-40">
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                {/* Instagram icon */}
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Instagram — Tezliklə...
              </span>
            </div>

            {/* Email */}
            <a
              href="mailto:fason.store@gmail.com"
              className="flex items-center gap-3 group"
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-white/20"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              >
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <span className="text-sm transition-colors group-hover:text-white" style={{ color: 'rgba(255,255,255,0.7)' }}>
                fason.store@gmail.com
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div
        className="max-w-7xl mx-auto px-6 py-4 text-center text-xs"
        style={{ borderTop: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }}
      >
        © 2026 FASON. Bütün hüquqlar qorunur.
      </div>
    </footer>
  )
}
