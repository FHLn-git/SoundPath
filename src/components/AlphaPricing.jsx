import React from 'react'

export const AlphaOnlyTag = ({ className = '', text = 'ALPHA ONLY' }) => {
  return (
    <div
      className={[
        'absolute top-3 right-3 z-10',
        'px-2 py-1 rounded-md',
        'bg-[#FFB800] text-black',
        'font-mono text-[10px] font-bold tracking-[0.2em] uppercase',
        'shadow-[0_0_0_1px_rgba(0,0,0,0.55),0_8px_18px_-10px_rgba(255,184,0,0.55)]',
        className,
      ].join(' ')}
    >
      {text}
    </div>
  )
}

export const AlphaStatusBanner = ({
  className = '',
  title = 'SoundPath Alpha: Early Access Pricing for A&R Agents & Music Executives.',
  subtext = "Beta-test the world's most advanced scouting pipeline. Use our specialized personal inbox and A&R agent workflow at introductory rates.",
}) => {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-xl border border-amber-400/40',
        'bg-gradient-to-br from-amber-500/10 via-gray-900/40 to-gray-950/40',
        'px-5 py-4',
        'shadow-[0_0_0_1px_rgba(255,184,0,0.08),0_18px_40px_-26px_rgba(255,184,0,0.55)]',
        className,
      ].join(' ')}
    >
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-amber-500/15 blur-2xl" />
        <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-amber-500/10 blur-2xl" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2">
              <span className="px-2 py-1 rounded-md bg-[#FFB800]/15 border border-[#FFB800]/40 text-[#FFB800] font-mono text-[11px] tracking-[0.22em] uppercase">
                Alpha status
              </span>
              <span className="text-xs text-gray-500 font-mono tracking-wide">TEMPORARY PRICING</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{title}</h2>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">{subtext}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export const AlphaPricingContainer = ({ className = '', children }) => {
  return (
    <div
      className={[
        'relative rounded-xl',
        'border border-dashed border-amber-400/45',
        'shadow-[0_0_0_1px_rgba(255,184,0,0.06),0_18px_40px_-28px_rgba(255,184,0,0.5)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

