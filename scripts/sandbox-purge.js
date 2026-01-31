/* eslint-env node */
/**
 * Purge Testing Sandbox data from the command line.
 * Run: node scripts/sandbox-purge.js
 *
 * Requires: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
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

const SANDBOX_EMAILS = [
  'free@soundpath.app',
  'starter@soundpath.app',
  'pro@soundpath.app',
  'agent@soundpath.app',
]

async function main() {
  console.log('🗑️ Purging Testing Sandbox data...\n')

  const { data: rpcResult, error: rpcError } = await supabase.rpc('purge_test_data')
  if (rpcError) {
    console.error('RPC error:', rpcError.message)
    process.exit(1)
  }
  console.log('DB purge result:', rpcResult)

  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const users = listData?.users || []
  let authDeleted = 0
  for (const email of SANDBOX_EMAILS) {
    const user = users.find((u) => u.email === email)
    if (user) {
      const { error: delError } = await supabase.auth.admin.deleteUser(user.id)
      if (!delError) {
        authDeleted += 1
        console.log('  Deleted auth user:', email)
      } else {
        console.warn('  Auth delete warning for', email, delError.message)
      }
    }
  }

  console.log('\n✅ Purge complete.')
  console.log('  Tracks deleted:', rpcResult?.tracks_deleted ?? 0)
  console.log('  Organizations deleted:', rpcResult?.organizations_deleted ?? 0)
  console.log('  Staff deleted:', rpcResult?.staff_deleted ?? 0)
  console.log('  Memberships deleted:', rpcResult?.memberships_deleted ?? 0)
  console.log('  Auth users deleted:', authDeleted)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
