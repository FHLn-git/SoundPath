import React from 'react'

/**
 * SoundPath logo (brand mark + wordmark + superscript ALPHA badge).
 *
 * - collapsed: hides the wordmark smoothly (keeps the brand mark visible).
 * - name: optional wordmark text (defaults to SoundPath).
 * - showAlpha: show superscript ALPHA tag.
 */
export default function SoundPathLogo({
  collapsed = false,
  name = 'SoundPath',
  showAlpha = true,
  className = '',
  markClassName = '',
  textClassName = '',
  onClick,
  href,
  title = 'SoundPath',
}) {
  const isSoundPath = String(name).trim().toLowerCase() === 'soundpath'

  const content = (
    <div
      className={[
        'soundpath-logo group flex items-center',
        collapsed ? 'justify-center' : 'gap-3',
        className,
      ].join(' ')}
    >
      <span
        className={[
          'soundpath-mark relative grid place-items-center w-10 h-10 rounded-lg',
          // Subtle "DAW glass" treatment without clutter.
          'bg-white/[0.03] border border-white/[0.08]',
          'backdrop-blur-md',
          markClassName,
        ].join(' ')}
        aria-hidden="true"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="block"
        >
          <defs>
            <linearGradient id="spPathGradient" x1="3" y1="4" x2="30" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#a855f7" />
              <stop offset="0.62" stopColor="#00F0FF" />
              <stop offset="1" stopColor="#B9FFFF" />
            </linearGradient>
          </defs>

          {/* Minimal lightning "S" bolt (energy / signal path) */}
          <path
            d="M6 7 L19 7 L12 14 L26 14 L14 25 L28 25"
            stroke="url(#spPathGradient)"
            strokeWidth="2.6"
            strokeLinejoin="miter"
            strokeLinecap="square"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d="M6 10 L19 10 L12 17 L26 17 L14 28 L28 28"
            stroke="url(#spPathGradient)"
            strokeWidth="2.6"
            strokeLinejoin="miter"
            strokeLinecap="square"
            opacity="0.95"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </span>

      {/* Wordmark (smoothly collapses away) */}
      <div
        className={[
          'overflow-hidden',
          'transition-[max-width,opacity,transform] duration-300 ease-out',
          collapsed ? 'max-w-0 opacity-0 -translate-x-1' : 'max-w-[220px] opacity-100 translate-x-0',
        ].join(' ')}
        aria-hidden={collapsed ? 'true' : 'false'}
      >
        <div className="flex items-start">
          <div
            className={[
              // High-end sans with luxury-tech tracking.
              'font-sans uppercase tracking-[0.14em]',
              'text-white',
              'leading-none',
              textClassName,
            ].join(' ')}
          >
            {isSoundPath ? (
              <>
                <span className="font-black">SOUND</span>
                <span className="font-semibold text-white/75">PATH</span>
              </>
            ) : (
              <span className="font-black">{name}</span>
            )}
          </div>

          {showAlpha && (
            <span
              className={[
                'ml-2 relative -top-2',
                'font-mono text-[10px] uppercase tracking-[0.22em]',
                'text-[#00F0FF]/90',
                'border border-[#00F0FF]/25 bg-[#00F0FF]/[0.06]',
                'rounded px-1.5 py-0.5',
                'select-none',
              ].join(' ')}
            >
              ALPHA
            </span>
          )}
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} onClick={onClick} aria-label={title} title={title} className="inline-flex">
        {content}
      </a>
    )
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={title} title={title} className="inline-flex">
        {content}
      </button>
    )
  }

  return content
}

