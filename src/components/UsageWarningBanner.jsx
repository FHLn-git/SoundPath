import { useState } from 'react'
import { AlertTriangle, X, Trash2, ArrowUpRight } from 'lucide-react'
import { useBilling } from '../context/BillingContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Toast from './Toast'

const UsageWarningBanner = () => {
  const { plan, usage, getUsagePercentage, refresh } = useBilling()
  const { activeOrgId, isOwner } = useAuth()
  const navigate = useNavigate()
  const [showBanner, setShowBanner] = useState(true)
  const [isErasing, setIsErasing] = useState(false)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })

  if (!plan || !usage || !activeOrgId || !isOwner) return null

  // Check if any limit is within 10% (90% or more usage)
  const checkLimits = () => {
    const limits = [
      { key: 'max_tracks', label: 'Tracks', type: 'tracks' },
      { key: 'max_contacts', label: 'Artist Directory Contacts', type: 'contacts' },
      { key: 'max_vault_tracks', label: 'Vault Tracks', type: 'vault_tracks' },
    ]

    const warnings = []
    for (const limit of limits) {
      const limitValue = plan.limits?.[limit.key]
      if (limitValue && limitValue !== -1) {
        const percentage = getUsagePercentage(limit.key)
        if (percentage >= 90) {
          warnings.push({
            ...limit,
            percentage,
            current: usage[`${limit.type}_count`] || 0,
            max: limitValue,
          })
        }
      }
    }
    return warnings
  }

  const warnings = checkLimits()

  if (warnings.length === 0 || !showBanner) return null

  const handleEraseOldest = async () => {
    if (!confirm('This will erase the oldest 20% of your data. The data will still be kept in our logs for your records. Continue?')) {
      return
    }

    setIsErasing(true)
    try {
      // For each warning, erase oldest 20% of data
      for (const warning of warnings) {
        const eraseCount = Math.ceil(warning.current * 0.2)

        if (warning.type === 'tracks') {
          // Erase oldest tracks (by created_at)
          const { data: tracksToErase } = await supabase
            .from('tracks')
            .select('id')
            .eq('organization_id', activeOrgId)
            .order('created_at', { ascending: true })
            .limit(eraseCount)

          if (tracksToErase && tracksToErase.length > 0) {
            const trackIds = tracksToErase.map(t => t.id)
            // Archive instead of delete to keep in logs
            await supabase
              .from('tracks')
              .update({ archived: true })
              .in('id', trackIds)
          }
        } else if (warning.type === 'contacts') {
          // For contacts, we need to find oldest artists and remove their tracks
          // Get oldest unique artists
          const { data: oldestArtists } = await supabase
            .from('tracks')
            .select('artist, MIN(created_at) as oldest_date')
            .eq('organization_id', activeOrgId)
            .eq('archived', false)
            .group('artist')
            .order('oldest_date', { ascending: true })
            .limit(eraseCount)

          if (oldestArtists && oldestArtists.length > 0) {
            const artistNames = oldestArtists.map(a => a.artist).filter(Boolean)
            // Archive tracks from these artists
            await supabase
              .from('tracks')
              .update({ archived: true })
              .eq('organization_id', activeOrgId)
              .in('artist', artistNames)
          }
        } else if (warning.type === 'vault_tracks') {
          // Erase oldest vault tracks
          const { data: vaultTracksToErase } = await supabase
            .from('tracks')
            .select('id')
            .eq('organization_id', activeOrgId)
            .or('status.eq.vault,column.eq.vault')
            .eq('archived', false)
            .order('created_at', { ascending: true })
            .limit(eraseCount)

          if (vaultTracksToErase && vaultTracksToErase.length > 0) {
            const trackIds = vaultTracksToErase.map(t => t.id)
            await supabase
              .from('tracks')
              .update({ archived: true })
              .in('id', trackIds)
          }
        }
      }

      setToast({
        isVisible: true,
        message: 'Oldest 20% of data has been archived. Data is still available in logs.',
        type: 'success'
      })

      // Refresh billing/usage data without a full reload (stability + avoids losing state).
      refresh?.()
    } catch (error) {
      console.error('Error erasing data:', error)
      setToast({
        isVisible: true,
        message: 'Failed to erase data. Please try again.',
        type: 'error'
      })
    } finally {
      setIsErasing(false)
    }
  }

  return (
    <>
      {toast.isVisible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, isVisible: false })}
        />
      )}
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-400 font-semibold mb-1">Approaching Usage Limit</h3>
              <p className="text-gray-300 text-sm mb-2">
                You are within 10% of your plan limits:
              </p>
              <ul className="text-sm text-gray-400 space-y-1 mb-3">
                {warnings.map((warning) => (
                  <li key={warning.key}>
                    • {warning.label}: {warning.current} / {warning.max} ({Math.round(warning.percentage)}% used)
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleEraseOldest}
                  disabled={isErasing}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  {isErasing ? 'Erasing...' : 'Erase Oldest 20%'}
                </button>
                <button
                  onClick={() => navigate('/billing')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  Upgrade Plan
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  )
}

export default UsageWarningBanner
