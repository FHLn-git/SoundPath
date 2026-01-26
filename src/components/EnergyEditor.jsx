import { Zap } from 'lucide-react'

const EnergyEditor = ({ energy = 0, maxEnergy = 5, onEnergyChange, readOnly = false }) => {
  const segments = Array.from({ length: maxEnergy }, (_, i) => i + 1)

  if (readOnly) {
    return (
      <div className="flex items-center gap-1">
        <Zap size={14} className="text-yellow-400" />
        {segments.map((segment) => (
          <div
            key={segment}
            className={`h-3 w-3 rounded-sm transition-all duration-200 ${
              segment <= energy
                ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Zap size={14} className="text-yellow-400" />
      {segments.map((segment) => (
        <button
          key={segment}
          onClick={() => onEnergyChange(segment)}
          className={`h-3 w-3 rounded-sm transition-all duration-200 ${
            segment <= energy
              ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)] hover:bg-yellow-300'
              : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={`Set energy to ${segment}`}
        />
      ))}
    </div>
  )
}

export default EnergyEditor
