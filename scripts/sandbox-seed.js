/* eslint-env node */
/**
 * Testing Sandbox Seed: creates 4 test accounts and realistic demo data.
 *
 * Prerequisites:
 * 1. Run migrations in Supabase SQL Editor (in order):
 *    - database/migrations/testing-sandbox-schema.sql
 *    - database/migrations/nullable-organization-id-and-personal-workspace.sql
 * 2. Set in .env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server-only; do not commit)
 *
 * Run: node scripts/sandbox-seed.js
 *
 * Accounts (password: Test2026!):
 *   free@soundpath.app (Tier: free)
 *   starter@soundpath.app (Tier: starter)
 *   pro@soundpath.app (Tier: pro)
 *   agent@soundpath.app (Tier: agent)
 *
 * Purge test data: POST /api/admin/purge-test-data with header X-Purge-Secret: <PURGE_SECRET>
 * Or run: node scripts/sandbox-purge.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadEnv() {
  const env = { ...process.env }
  try {
    const envPath = join(__dirname, '..', '.env')
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const key = match[1].trim().replace(/\r$/, '')
        const value = match[2].trim().replace(/\r$/, '').replace(/^["']|["']$/g, '')
        env[key] = value
      }
    })
  } catch (e) {
    // .env missing or unreadable; process.env may still have values
  }
  return env
}

const env = loadEnv()
const supabaseUrl = env.VITE_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })

const TEST_PASSWORD = 'Test2026!'

const ACCOUNTS = [
  { email: 'free@soundpath.app', tier: 'free' },
  { email: 'starter@soundpath.app', tier: 'starter' },
  { email: 'pro@soundpath.app', tier: 'pro' },
  { email: 'agent@soundpath.app', tier: 'agent' },
]

const ARTIST_NAMES = [
  'Luna Grey',
  'The Midnight Loop',
  'Jace Parker',
  'Violet Echo',
  'Nova Signal',
  'Sienna Drive',
  'Cobalt 9',
  'Maya Stone',
  'River Phase',
  'Aria Flux',
]

const TRACK_TITLES = [
  'Midnight Drive',
  'Sunset Boulevard',
  'City Lights',
  'Ocean Deep',
  'Desert Storm',
  'Rain Dance',
  'Thunder Strike',
  'Lightning Bolt',
  'Night Vision',
  'Dawn Chorus',
  'Golden Hour',
  'Electric Pulse',
  'Magnetic Field',
  'Solar Wind',
  'Stellar Core',
  'Time Warp',
  'Dream State',
  'Soul Search',
  'Beat Drop',
  'Resonance Peak',
]

const GENRES = ['Tech House', 'Deep House', 'Classic House', 'Piano House', 'Progressive House']
const STATUSES = ['inbox', 'pitched', 'denied', 'signed']
const CRATES = ['submissions', 'submissions', 'pitched', 'signed'] // weight toward submissions

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo))
  return d.toISOString()
}

async function ensureArtist(name, organizationId) {
  const q = supabase.from('artists').select('id').eq('name', name)
  if (organizationId) q.eq('organization_id', organizationId)
  else q.is('organization_id', null)
  const { data: existing } = await q.maybeSingle()
  if (existing) return existing.id
  const insert = { name, organization_id: organizationId || null }
  const { data: created, error } = await supabase.from('artists').insert(insert).select('id').single()
  if (error) throw error
  return created.id
}

async function createPersonalTracks(recipientUserId, count = 10) {
  const created = []
  for (let i = 0; i < count; i++) {
    const artistName = pick(ARTIST_NAMES)
    const artistId = await ensureArtist(artistName, null)
    const status = pick(STATUSES)
    const crate = pick(CRATES)
    const title = pick(TRACK_TITLES)
    const { data: track, error } = await supabase
      .from('tracks')
      .insert({
        artist_id: artistId,
        artist_name: artistName,
        title,
        genre: pick(GENRES),
        bpm: 118 + Math.floor(Math.random() * 18),
        sc_link: `https://soundcloud.com/${artistName.toLowerCase().replace(/\s+/g, '-')}/${title.toLowerCase().replace(/\s+/g, '-')}`,
        status,
        column: status === 'inbox' ? 'inbox' : status,
        energy: 0,
        votes: 0,
        contract_signed: status === 'signed',
        archived: false,
        watched: false,
        organization_id: null,
        recipient_user_id: recipientUserId,
        crate: status === 'signed' ? 'signed' : status === 'pitched' ? 'pitched' : 'submissions',
        created_at: randomDate(30),
        metadata: { is_test_data: true },
      })
      .select('id')
      .single()
    if (error) throw error
    created.push(track.id)
  }
  return created
}

async function createLabelTracks(organizationId, count = 15) {
  const created = []
  for (let i = 0; i < count; i++) {
    const artistName = pick(ARTIST_NAMES)
    const artistId = await ensureArtist(artistName, organizationId)
    const status = pick(STATUSES)
    const title = pick(TRACK_TITLES)
    const { data: track, error } = await supabase
      .from('tracks')
      .insert({
        artist_id: artistId,
        artist_name: artistName,
        title,
        genre: pick(GENRES),
        bpm: 118 + Math.floor(Math.random() * 18),
        sc_link: `https://soundcloud.com/${artistName.toLowerCase().replace(/\s+/g, '-')}/${title.toLowerCase().replace(/\s+/g, '-')}`,
        status,
        column: status === 'inbox' ? 'inbox' : status,
        energy: 0,
        votes: 0,
        contract_signed: status === 'signed',
        archived: false,
        watched: false,
        organization_id: organizationId,
        recipient_user_id: null,
        crate: status === 'signed' ? 'signed' : status === 'pitched' ? 'pitched' : 'submissions',
        created_at: randomDate(30),
        metadata: { is_test_data: true },
      })
      .select('id')
      .single()
    if (error) throw error
    created.push(track.id)
  }
  return created
}

async function main() {
  console.log('🌱 Testing Sandbox Seed\n')

  const staffIds = {}

  for (const { email, tier } of ACCOUNTS) {
    console.log(`Creating account: ${email} (${tier})`)
    const { data: user, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    })
    if (authError) {
      if (authError.message?.includes('already been registered')) {
        console.log('  User exists, fetching...')
        const { data: existing } = await supabase.auth.admin.listUsers()
        const u = existing?.users?.find((x) => x.email === email)
        if (!u) {
          console.error('  Could not find existing user:', authError.message)
          continue
        }
        staffIds[email] = { authUserId: u.id }
      } else {
        console.error('  Auth error:', authError.message)
        if (authError.message?.includes('Database error')) {
          console.error('  Full error (for debugging):', JSON.stringify(authError, null, 2))
          console.error('  → Fix: run database/migrations/nullable-organization-id-and-personal-workspace.sql in Supabase SQL Editor.')
          console.error('  → Or check Supabase Dashboard → Logs → Postgres for the actual trigger error.')
        }
        continue
      }
    } else {
      staffIds[email] = { authUserId: user.user.id }
    }

    const authUserId = staffIds[email].authUserId
    const staffId = `staff_${authUserId.substring(0, 8)}_${Date.now()}`

    const { data: existingStaff } = await supabase
      .from('staff_members')
      .select('id')
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    let sid = staffId
    if (existingStaff) {
      sid = existingStaff.id
      console.log('  Staff member exists:', sid)
    } else {
      const { error: staffErr } = await supabase.from('staff_members').insert({
        id: staffId,
        name: email.split('@')[0],
        role: tier === 'pro' || tier === 'agent' ? 'Manager' : 'Scout',
        auth_user_id: authUserId,
        organization_id: null,
        tier,
        user_status: 'active',
        trial_ends_at: null,
        paid_tier: null,
      })
      if (staffErr) {
        console.error('  Staff insert error:', staffErr.message)
        continue
      }
      sid = staffId
    }
    staffIds[email].staffId = sid

    const trackIds = await createPersonalTracks(sid, 10)
    console.log(`  ✅ 10 personal tracks created`)
  }

  console.log('\nCreating label organizations...')
  const orgNames = ['Neon Records', 'Basement Tapes']
  const orgSlugs = ['neon-records', 'basement-tapes']
  const orgOwners = [staffIds['pro@soundpath.app']?.staffId, staffIds['agent@soundpath.app']?.staffId]
  const orgIds = {}

  for (let i = 0; i < orgNames.length; i++) {
    const name = orgNames[i]
    const slug = orgSlugs[i]
    const ownerId = orgOwners[i]
    if (!ownerId) {
      console.log(`  Skip ${name}: no owner (pro/agent)`)
      continue
    }
    const { data: existingOrg } = await supabase.from('organizations').select('id').eq('slug', slug).maybeSingle()
    let orgId
    if (existingOrg) {
      orgId = existingOrg.id
      console.log(`  Org exists: ${name}`)
    } else {
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .insert({ name, slug, require_rejection_reason: true })
        .select('id')
        .single()
      if (orgErr) {
        console.error('  Org insert error:', orgErr.message)
        continue
      }
      orgId = org.id
      console.log(`  ✅ ${name} created`)
    }
    orgIds[name] = orgId

    const { data: existingMem } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', ownerId)
      .eq('organization_id', orgId)
      .maybeSingle()
    if (!existingMem) {
      const { error: memErr } = await supabase.from('memberships').insert({
        user_id: ownerId,
        organization_id: orgId,
        role: 'Owner',
        active: true,
      })
      if (memErr) console.error('  Membership error:', memErr.message)
      else console.log(`  ✅ Membership: ${name} → Owner`)
    }

    const labelTracks = await createLabelTracks(orgId, 15)
    console.log(`  ✅ 15 label tracks for ${name}`)
  }

  console.log('\n✅ Sandbox seed complete.')
  console.log('\nAccounts (password: Test2026!):')
  ACCOUNTS.forEach(({ email, tier }) => console.log(`  ${email} (${tier})`))
  console.log('\nPersonal Office: /personal/dashboard')
  console.log('Label Workspace: /labels/<orgId> (Manage tab)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
