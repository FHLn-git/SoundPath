import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const Diagnostics = () => {
  const [checks, setChecks] = useState({
    supabaseConfigured: false,
    envVars: false,
    databaseConnection: 'checking',
    authTable: 'checking',
    staffTable: 'checking',
  })

  useEffect(() => {
    const runDiagnostics = async () => {
      // Check if supabase is configured (it might be null initially)
      const isSupabaseConfigured = supabase !== null && supabase !== undefined
      const hasEnvVars = !!(
        import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
      )

      const results = {
        supabaseConfigured: isSupabaseConfigured,
        envVars: hasEnvVars,
        databaseConnection: 'checking',
        authTable: 'checking',
        staffTable: 'checking',
      }

      // Update immediately with what we know
      setChecks(results)

      if (supabase) {
        // Test database connection
        try {
          const { error } = await supabase.from('staff_members').select('count').limit(1)
          results.databaseConnection = error ? 'error' : 'ok'
        } catch (e) {
          results.databaseConnection = 'error'
        }

        // Check if auth.users is accessible (this will fail if RLS is too strict, but that's ok)
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          results.authTable = 'ok'
        } catch (e) {
          results.authTable = 'error'
        }

        // Check staff_members table
        try {
          const { error } = await supabase.from('staff_members').select('id').limit(1)
          results.staffTable = error ? 'error' : 'ok'
        } catch (e) {
          results.staffTable = 'error'
        }
      }

      setChecks(results)
    }

    runDiagnostics()
  }, [])

  const getStatusColor = status => {
    if (status === 'ok') return 'text-green-400'
    if (status === 'error') return 'text-red-400'
    if (status === 'checking') return 'text-yellow-400'
    return status ? 'text-green-400' : 'text-red-400'
  }

  const getStatusIcon = status => {
    if (status === 'ok' || status === true) return '✅'
    if (status === 'error' || status === false) return '❌'
    if (status === 'checking') return '⏳'
    return '❓'
  }

  return (
    <div className="p-6 bg-gray-900/80 border border-neon-purple/30 rounded-lg max-w-2xl mx-auto mt-8">
      <h2 className="text-xl font-bold text-white mb-4">System Diagnostics</h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Supabase Client Configured</span>
          <span className={getStatusColor(checks.supabaseConfigured)}>
            {getStatusIcon(checks.supabaseConfigured)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Environment Variables</span>
          <span className={getStatusColor(checks.envVars)}>{getStatusIcon(checks.envVars)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Database Connection</span>
          <span className={getStatusColor(checks.databaseConnection)}>
            {getStatusIcon(checks.databaseConnection)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Auth System</span>
          <span className={getStatusColor(checks.authTable)}>
            {getStatusIcon(checks.authTable)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Staff Members Table</span>
          <span className={getStatusColor(checks.staffTable)}>
            {getStatusIcon(checks.staffTable)}
          </span>
        </div>
      </div>

      {!checks.supabaseConfigured && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-sm">
          <p className="text-red-400 font-semibold mb-1">Supabase not configured</p>
          <p className="text-gray-300">
            Create a <code className="bg-gray-900 px-1 rounded">.env</code> file with:
          </p>
          <pre className="mt-2 text-xs bg-gray-900 p-2 rounded overflow-x-auto">
            VITE_SUPABASE_URL=your_url_here{'\n'}VITE_SUPABASE_ANON_KEY=your_key_here
          </pre>
        </div>
      )}

      {checks.databaseConnection === 'error' && (
        <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded text-sm">
          <p className="text-yellow-400 font-semibold mb-1">Database connection failed</p>
          <p className="text-gray-300">
            Check your Supabase URL and ensure the database is accessible. Run{' '}
            <code className="bg-gray-900 px-1 rounded">database/schemas/master-schema.sql</code> in
            Supabase SQL Editor.
          </p>
        </div>
      )}
    </div>
  )
}

export default Diagnostics
