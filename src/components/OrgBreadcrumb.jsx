import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

/**
 * High-tech industrial breadcrumb: "Parent Label > Subsidiary Label" or "Main Venue > Stage A".
 * Shown when user is in a child org (activeOrgId has a parent). Fetches chain via get_org_breadcrumb.
 */
export default function OrgBreadcrumb({ orgId, className = '' }) {
  const [chain, setChain] = useState([])
  const [loading, setLoading] = useState(!!orgId)

  useEffect(() => {
    if (!orgId || !supabase) {
      setChain([])
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    supabase
      .rpc('get_org_breadcrumb', { org_id_param: orgId })
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) {
          setChain([])
          return
        }
        setChain(Array.isArray(data) ? data : [])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [orgId])

  if (loading || chain.length <= 1) return null
  // Only show when there's a parent (chain has 2+ items = parent > current)
  if (chain.length < 2) return null

  return (
    <nav
      aria-label="Organization hierarchy"
      className={`flex items-center gap-1 text-xs text-gray-400 truncate max-w-[280px] sm:max-w-[360px] ${className}`}
    >
      {chain.map((item, i) => (
        <span key={item.id} className="flex items-center gap-1 min-w-0">
          {i > 0 && (
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-gray-600" aria-hidden />
          )}
          <span className="truncate" title={item.name}>
            {item.name}
          </span>
        </span>
      ))}
    </nav>
  )
}
