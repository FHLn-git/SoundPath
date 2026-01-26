import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

const HealthCheck = () => {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const checkHealth = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const healthUrl = `${supabaseUrl}/functions/v1/health`
      
      const response = await fetch(healthUrl, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      })

      const data = await response.json()
      setHealth(data)
    } catch (error) {
      setHealth({
        status: 'unhealthy',
        error: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6 text-green-400" />
      case 'degraded':
        return <AlertCircle className="w-6 h-6 text-yellow-400" />
      case 'unhealthy':
        return <XCircle className="w-6 h-6 text-red-400" />
      default:
        return <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400'
      case 'degraded':
        return 'text-yellow-400'
      case 'unhealthy':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  if (loading && !health) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">System Health</h1>

        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {getStatusIcon(health?.status)}
            <div>
              <h2 className="text-xl font-bold">Overall Status</h2>
              <p className={`text-lg font-semibold ${getStatusColor(health?.status)}`}>
                {health?.status?.toUpperCase() || 'UNKNOWN'}
              </p>
            </div>
          </div>

          {health?.timestamp && (
            <p className="text-sm text-gray-400">
              Last checked: {new Date(health.timestamp).toLocaleString()}
            </p>
          )}
        </div>

        {health?.services && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Services</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Database</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.services.database)}
                  <span className={getStatusColor(health.services.database)}>
                    {health.services.database?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">API</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.services.api)}
                  <span className={getStatusColor(health.services.api)}>
                    {health.services.api?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {health?.error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 font-semibold">Error:</p>
            <p className="text-red-300 text-sm mt-1">{health.error}</p>
          </div>
        )}

        <button
          onClick={checkHealth}
          className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Refresh Status
        </button>
      </div>
    </div>
  )
}

export default HealthCheck
