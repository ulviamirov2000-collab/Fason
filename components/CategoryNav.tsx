'use client'

import { useState, useEffect, useRef } from 'react'
import { SUBCATEGORIES } from '@/lib/sizes'

// Reverse lookup: subcategory name → underlying filterCategory key
const SUB_TO_FILTER_CAT: Record<string, string> = {}
Object.entries(SUBCATEGORIES).forEach(([cat, subs]) => {
  subs.forEach((sub) => { SUB_TO_FILTER_CAT[sub] = cat })
})

// ─── Static mega menu data ────────────────────────────────────────────────────

const TABS = [
  { key: 'qadin', label: 'Qadın' },
  { key: 'kisi',  label: 'Kişi'  },
  { key: 'usaq',  label: 'Uşaq'  },
  { key: 'el',    label: 'Əl işi' },
]

const MEGA_LEFT = [
  { label: 'Geyim',                filterKey: null as string | null },
  { label: 'Ayaqqabı',             filterKey: 'Ayaqqabı' },
  { label: 'Çanta',                filterKey: 'Çanta' },
  { label: 'Aksesuar',             filterKey: 'Aksesuar' },
  { label: 'İdman geyimi',         filterKey: 'İdman geyimi' },
  { label: 'Alt paltarı',          filterKey: 'Alt paltarı və ev geyimi' },
]

const MEGA_SUBS: Record<string, { col1: string[]; col2: string[] }> = {
  Geyim: {
    col1: ['Qısaqol köynək', 'Köynək', 'Qadın köynəyi', 'Papaqlı üst', 'Toxunma üst', 'Düyməli toxunma üst', 'Kürdə', 'Pencək'],
    col2: ['Gödəkçə', 'Palto', 'Yağmurluq', 'İncə üstlük', 'Şalvar', 'Cins şalvar', 'Qısa şalvar', 'Ətək', 'Dar şalvar', 'Don', 'Ziyafət libası', 'Bütöv geyim', 'Dəst şalvar-pencək'],
  },
  Ayaqqabı: {
    col1: ['İdman ayaqqabısı', 'Kətan ayaqqabı', 'Mokasin', 'Klassik ayaqqabı'],
    col2: ['Hündürdaban ayaqqabı', 'Uzunboğaz ayaqqabı', 'Sandal', 'Ev ayaqqabısı'],
  },
  Çanta: {
    col1: ['Əl çantası', 'Sırt çantası'],
    col2: ['Kiçik əl çantası', 'Çətir'],
  },
  Aksesuar: {
    col1: ['Qurşaq', 'Qalstuk', 'Şərf', 'Şal', 'Əlcək'],
    col2: ['Papaq', 'Günəş eynəyi', 'Qol saatı', 'Pul qabı', 'Zinət əşyaları'],
  },
  'İdman geyimi': {
    col1: ['İdman üstü', 'İdman şalvarı'],
    col2: ['İdman dəsti', 'İdman ayaqqabısı'],
  },
  'Alt paltarı': {
    col1: ['Alt paltarı', 'Döşlük', 'Yataq geyimi'],
    col2: ['Gecəlik', 'Hamam geyimi', 'Corab', 'İncə corab'],
  },
}

const EL_SUBS = {
  col1: ['Toxunma geyim', 'Tikilmiş paltar', 'Bəzək əşyaları', 'Əl işi çanta'],
  col2: ['Əl işi aksesuar', 'Əl işi corab', 'Xüsusi sifariş', 'Digər əl işi'],
}

// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  onSelect: (category: string | null, subcategory: string | null) => void
}

export default function CategoryNav({ onSelect }: Props) {
  const [activeTab, setActiveTab]     = useState('qadin')
  const [hoveredLeft, setHoveredLeft] = useState('Geyim')
  const [megaOpen, setMegaOpen]       = useState(false)
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [mobileCat, setMobileCat]     = useState<string | null>(null)
  const navRef = useRef<HTMLDivElement>(null)

  // Close mega on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMegaOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isEl = activeTab === 'el'

  function close() {
    setMegaOpen(false)
    setMobileOpen(false)
    setMobileCat(null)
  }

  function handleSubClick(sub: string) {
    const cat = isEl ? 'Əl işi' : (SUB_TO_FILTER_CAT[sub] ?? null)
    onSelect(cat, sub)
    close()
  }

  function handleShowAll(filterKey: string | null) {
    onSelect(filterKey, null)
    close()
  }

  const currentSubs = isEl ? null : MEGA_SUBS[hoveredLeft]

  // ── Sub-button shared styles ──────────────────────────────────────────────
  const subBtn =
    'text-left text-sm py-1.5 transition-colors hover:text-[#FF2D78] whitespace-nowrap'

  return (
    <>
      <style>{`
        @keyframes megaFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mega-fade { animation: megaFadeIn 150ms ease forwards; }
      `}</style>

      <div ref={navRef} className="relative w-full" style={{ backgroundColor: '#1a1040' }}>

        {/* ── Tab bar ────────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 flex items-center overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className="flex-shrink-0 px-5 py-3 text-sm font-semibold relative transition-colors"
              style={{ color: activeTab === tab.key ? 'white' : 'rgba(255,255,255,0.55)' }}
              onMouseEnter={() => {
                setActiveTab(tab.key)
                setMegaOpen(true)
                setHoveredLeft(tab.key === 'el' ? 'Əl işi' : 'Geyim')
              }}
              onClick={() => {
                const same = activeTab === tab.key
                setActiveTab(tab.key)
                setHoveredLeft(tab.key === 'el' ? 'Əl işi' : 'Geyim')
                // Desktop: toggle; Mobile: open drawer
                setMegaOpen(!same || !megaOpen)
                setMobileOpen(true)
                setMobileCat(null)
              }}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ backgroundColor: '#FF2D78' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Desktop mega dropdown ──────────────────────────────────────── */}
        {megaOpen && (
          <div
            className="mega-fade absolute left-0 right-0 top-full z-50 hidden sm:block"
            style={{
              backgroundColor: 'white',
              boxShadow: '0 12px 40px rgba(0,0,0,0.13)',
              borderTop: '1px solid #f0f0f0',
            }}
            onMouseLeave={() => setMegaOpen(false)}
          >
            <div className="max-w-7xl mx-auto px-4 py-6">
              {isEl ? (
                /* Əl işi — no left column, just 2-col grid */
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-4"
                    style={{ color: '#FF2D78' }}
                  >
                    Əl işi məhsulları
                  </p>
                  <div className="flex gap-16">
                    <div className="flex flex-col gap-0.5">
                      {EL_SUBS.col1.map((sub) => (
                        <button key={sub} onClick={() => handleSubClick(sub)} className={subBtn} style={{ color: '#1a1040' }}>
                          {sub}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {EL_SUBS.col2.map((sub) => (
                        <button key={sub} onClick={() => handleSubClick(sub)} className={subBtn} style={{ color: '#1a1040' }}>
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleShowAll('Əl işi')}
                    className="mt-5 text-xs font-bold hover:underline"
                    style={{ color: '#FF2D78' }}
                  >
                    Hamısını göstər →
                  </button>
                </div>
              ) : (
                /* Regular tabs: left column + right 2-col grid */
                <div className="flex">
                  {/* Left column */}
                  <div className="w-52 flex-shrink-0 border-r border-gray-100 pr-2">
                    {MEGA_LEFT.map((item) => (
                      <button
                        key={item.label}
                        onMouseEnter={() => setHoveredLeft(item.label)}
                        onClick={() => handleShowAll(item.filterKey)}
                        className="w-full text-left px-4 py-2.5 text-sm transition-all"
                        style={{
                          color:       hoveredLeft === item.label ? '#FF2D78' : '#1a1040',
                          fontWeight:  hoveredLeft === item.label ? 700 : 500,
                          borderLeft: `3px solid ${hoveredLeft === item.label ? '#FF2D78' : 'transparent'}`,
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Right area — 2-col grid of subcategories */}
                  <div className="flex-1 pl-10">
                    {currentSubs && (
                      <>
                        <div className="flex gap-16">
                          <div className="flex flex-col gap-0.5">
                            {currentSubs.col1.map((sub) => (
                              <button key={sub} onClick={() => handleSubClick(sub)} className={subBtn} style={{ color: '#1a1040' }}>
                                {sub}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {currentSubs.col2.map((sub) => (
                              <button key={sub} onClick={() => handleSubClick(sub)} className={subBtn} style={{ color: '#1a1040' }}>
                                {sub}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const item = MEGA_LEFT.find((i) => i.label === hoveredLeft)
                            handleShowAll(item?.filterKey ?? null)
                          }}
                          className="mt-5 text-xs font-bold hover:underline"
                          style={{ color: '#FF2D78' }}
                        >
                          Hamısını göstər →
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile drawer (outside navRef so overlay can close it) ─────────── */}
      {mobileOpen && (
        <div
          className="sm:hidden fixed inset-0 z-[60]"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => { setMobileOpen(false); setMobileCat(null) }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl flex flex-col overflow-hidden"
            style={{ backgroundColor: 'white', maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              {mobileCat ? (
                <button
                  onClick={() => setMobileCat(null)}
                  className="flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: '#1a1040', minHeight: '44px' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Geri
                </button>
              ) : (
                <p className="text-sm font-bold" style={{ color: '#1a1040' }}>
                  {TABS.find((t) => t.key === activeTab)?.label ?? 'Kateqoriyalar'}
                </p>
              )}
              <button
                onClick={() => { setMobileOpen(false); setMobileCat(null) }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Bağla"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer body */}
            <div className="overflow-y-auto flex-1 pb-8">
              {isEl ? (
                /* Əl işi — flat list */
                <div className="px-5 py-3">
                  {[...EL_SUBS.col1, ...EL_SUBS.col2].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => handleSubClick(sub)}
                      className="w-full text-left text-sm font-medium py-3.5 border-b border-gray-50"
                      style={{ color: '#1a1040', minHeight: '48px' }}
                    >
                      {sub}
                    </button>
                  ))}
                  <button
                    onClick={() => handleShowAll('Əl işi')}
                    className="w-full text-left text-sm font-bold py-3.5 mt-1"
                    style={{ color: '#FF2D78' }}
                  >
                    Hamısını göstər →
                  </button>
                </div>
              ) : mobileCat ? (
                /* Level 2: subcategories */
                <div className="px-5 py-3">
                  {[
                    ...(MEGA_SUBS[mobileCat]?.col1 ?? []),
                    ...(MEGA_SUBS[mobileCat]?.col2 ?? []),
                  ].map((sub) => (
                    <button
                      key={sub}
                      onClick={() => handleSubClick(sub)}
                      className="w-full text-left text-sm font-medium py-3.5 border-b border-gray-50"
                      style={{ color: '#1a1040', minHeight: '48px' }}
                    >
                      {sub}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      const item = MEGA_LEFT.find((i) => i.label === mobileCat)
                      handleShowAll(item?.filterKey ?? null)
                    }}
                    className="w-full text-left text-sm font-bold py-3.5 mt-1"
                    style={{ color: '#FF2D78' }}
                  >
                    Hamısını göstər →
                  </button>
                </div>
              ) : (
                /* Level 1: main category list */
                <div className="px-5 py-3">
                  {MEGA_LEFT.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => setMobileCat(item.label)}
                      className="w-full flex items-center justify-between text-sm font-medium py-3.5 border-b border-gray-50"
                      style={{ color: '#1a1040', minHeight: '48px' }}
                    >
                      <span>{item.label}</span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
