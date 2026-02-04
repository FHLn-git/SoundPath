import AppSwitcher from './AppSwitcher'

/**
 * Unified top header: [App switcher] [SoundPath | app label]. Same position and style across Label app, Launchpad, and mobile.
 */
export default function UnifiedAppHeader({ appLabel = 'LABEL', rightSlot = null, className = '' }) {
  return (
    <header
      className={
        className ||
        'sticky top-0 z-30 flex items-center h-14 px-4 gap-3 bg-gray-950/95 backdrop-blur-lg border-b border-gray-800 flex-shrink-0'
      }
    >
      <AppSwitcher variant="default" className="flex-shrink-0 p-1.5 rounded-lg bg-[#0B0E14] border border-gray-700 hover:border-gray-600 transition-colors" />
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-lg font-bold text-white truncate">SoundPath</span>
        <span className="text-gray-500 flex-shrink-0">|</span>
        <span className="text-sm font-semibold text-neon-purple/90 truncate">{appLabel}</span>
      </div>
      {rightSlot != null && <div className="flex items-center gap-2 flex-shrink-0">{rightSlot}</div>}
    </header>
  )
}
