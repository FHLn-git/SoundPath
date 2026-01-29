import { useEffect, useMemo, useRef, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, Copy, Plus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const ORIGIN = typeof window !== 'undefined' ? window.location.origin : ''

const copyToClipboard = async text => {
  if (!text) return
  await navigator.clipboard.writeText(text)
}

const buildUserSlugFallback = name => {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

const GlobalIntakeDropdown = ({
  onManualAdd,
  manualAddDisabled = false,
  manualAddDisabledReason = 'Limit reached',
  className = '',
  buttonLabel = 'Add submission',
}) => {
  const { staffProfile, memberships } = useAuth()
  const [open, setOpen] = useState(false)
  const [userSlug, setUserSlug] = useState('')
  const [orgSlugById, setOrgSlugById] = useState({})
  const [copiedKey, setCopiedKey] = useState(null)
  const copiedTimeoutRef = useRef(null)

  const personalSubmissionUrl = userSlug ? `${ORIGIN}/submit/user/${userSlug}` : ''

  const labelOrgs = useMemo(() => {
    const list = (memberships || [])
      .filter(m => Boolean(m?.organization_id))
      .map(m => ({
        organizationId: m.organization_id,
        organizationName: m.organization_name || 'Label',
      }))
    // stable-ish order: by name
    return list.sort((a, b) => (a.organizationName || '').localeCompare(b.organizationName || ''))
  }, [memberships])

  useEffect(() => {
    if (!staffProfile?.id || !supabase) return

    let cancelled = false
    const fetchUserSlug = async () => {
      try {
        const { data, error } = await supabase
          .from('staff_members')
          .select('slug')
          .eq('id', staffProfile.id)
          .single()

        if (cancelled) return

        if (!error && data?.slug) {
          setUserSlug(data.slug)
          return
        }

        const fallback = buildUserSlugFallback(staffProfile?.name)
        if (!fallback) return

        setUserSlug(fallback)
        // best-effort persist (ignore failures)
        await supabase.from('staff_members').update({ slug: fallback }).eq('id', staffProfile.id)
      } catch (_e) {
        // ignore
      }
    }

    fetchUserSlug()
    return () => {
      cancelled = true
    }
  }, [staffProfile?.id, staffProfile?.name])

  useEffect(() => {
    if (!supabase) return
    const orgIds = Array.from(new Set(labelOrgs.map(o => o.organizationId))).filter(Boolean)
    if (orgIds.length === 0) {
      setOrgSlugById({})
      return
    }

    let cancelled = false
    const loadOrgSlugs = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, slug')
          .in('id', orgIds)

        if (cancelled) return
        if (error) return

        const map = {}
        ;(data || []).forEach(row => {
          if (row?.id) map[row.id] = row?.slug || ''
        })
        setOrgSlugById(map)
      } catch (_e) {
        // ignore
      }
    }

    loadOrgSlugs()
    return () => {
      cancelled = true
    }
  }, [labelOrgs])

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current)
      }
    }
  }, [])

  const showCopied = key => {
    setCopiedKey(key)
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
    copiedTimeoutRef.current = setTimeout(() => setCopiedKey(null), 1200)
  }

  const handleCopy = async (key, text) => {
    try {
      await copyToClipboard(text)
      showCopied(key)
    } catch (_e) {
      // ignore
    }
  }

  const contentClass =
    'w-[360px] max-w-[92vw] rounded-xl border border-gray-800 bg-[#0B0E14]/95 p-2 text-sm shadow-2xl shadow-black/60 backdrop-blur-md'

  const sectionLabelClass =
    'px-2 pt-2 pb-1 text-[10px] font-semibold tracking-[0.18em] text-gray-500 uppercase'

  const rowClass =
    'flex items-center justify-between gap-3 rounded-lg px-2 py-2 border border-transparent hover:border-gray-800 hover:bg-white/[0.03]'

  const leftClass = 'min-w-0'
  const titleClass = 'text-gray-100 text-sm font-semibold leading-tight truncate'
  const subtitleClass = 'text-gray-500 text-xs leading-tight truncate'

  const copyBtnClass =
    'relative inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-800 bg-white/[0.02] text-gray-300 hover:text-white hover:bg-white/[0.04]'

  const copiedPillClass =
    'pointer-events-none absolute -top-8 right-0 rounded-md border border-gray-800 bg-[#0B0E14] px-2 py-1 text-[11px] text-gray-200 shadow-lg'

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={[
            'px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md',
            'flex items-center gap-1.5 transition-all duration-200 text-white',
            className,
          ].join(' ')}
        >
          <Plus size={16} />
          <span>{buttonLabel}</span>
          <ChevronDown size={14} className="text-gray-300" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className={contentClass}
          onCloseAutoFocus={e => e.preventDefault()}
        >
          <div className={sectionLabelClass}>PERSONAL INBOX</div>
          <div className={rowClass}>
            <div className={leftClass}>
              <div className={titleClass}>Personal Submission Portal</div>
              <div className={subtitleClass}>{personalSubmissionUrl || 'Generating link…'}</div>
            </div>
            <button
              type="button"
              className={copyBtnClass}
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                handleCopy('user', personalSubmissionUrl)
              }}
              aria-label="Copy personal submission URL"
              disabled={!personalSubmissionUrl}
              title={!personalSubmissionUrl ? 'Generating…' : 'Copy'}
            >
              <Copy size={14} />
              {copiedKey === 'user' && <span className={copiedPillClass}>Copied!</span>}
            </button>
          </div>

          <DropdownMenu.Separator className="my-2 h-px bg-gray-800" />

          <div className={sectionLabelClass}>LABEL PORTALS</div>
          {labelOrgs.length === 0 ? (
            <div className="px-2 py-2 text-xs text-gray-500">No labels yet.</div>
          ) : (
            <div className="max-h-[280px] overflow-auto">
              {labelOrgs.map(org => {
                const slug = orgSlugById[org.organizationId] || ''
                const url = slug ? `${ORIGIN}/submit/label/${slug}` : ''
                const key = `org-${org.organizationId}`

                return (
                  <div key={org.organizationId} className={rowClass}>
                    <div className={leftClass}>
                      <div className={titleClass}>{org.organizationName}</div>
                      <div className={subtitleClass}>{url || 'Portal not configured'}</div>
                    </div>
                    <button
                      type="button"
                      className={copyBtnClass}
                      onClick={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleCopy(key, url)
                      }}
                      aria-label={`Copy ${org.organizationName} submission URL`}
                      disabled={!url}
                      title={!url ? 'Missing label slug' : 'Copy'}
                    >
                      <Copy size={14} />
                      {copiedKey === key && <span className={copiedPillClass}>Copied!</span>}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          <DropdownMenu.Separator className="my-2 h-px bg-gray-800" />

          <div className={sectionLabelClass}>MANUAL ENTRY</div>
          <DropdownMenu.Item
            className={[
              'cursor-pointer select-none rounded-lg px-2 py-2 text-sm',
              'border border-gray-800 bg-white/[0.02] hover:bg-white/[0.04] text-gray-100',
              manualAddDisabled ? 'opacity-60 cursor-not-allowed' : '',
            ].join(' ')}
            onSelect={e => {
              if (manualAddDisabled) {
                e.preventDefault()
                return
              }
              onManualAdd?.()
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Plus size={16} className="text-gray-300" />
                <span>+ Manually Add Submission</span>
              </div>
              {manualAddDisabled && (
                <span className="text-[11px] text-gray-400">{manualAddDisabledReason}</span>
              )}
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export default GlobalIntakeDropdown
