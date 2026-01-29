import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity,
  TrendingUp,
  Users,
  Building2,
  Zap,
  BarChart3,
  AlertTriangle,
  Eye,
  Heart,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const GlobalPulse = () => {
  const navigate = useNavigate()
  const { staffProfile, switchOrganization } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrganization, setSelectedOrganization] = useState(null)
  const [isImpersonating, setIsImpersonating] = useState(false)

  // Market Velocity Data
  const [marketVelocity, setMarketVelocity] = useState({
    last24h: 0,
    last7d: 0,
    last30d: 0,
  })

  // Genre Heatmap Data
  const [genreHeatmap, setGenreHeatmap] = useState([])

  // Staff Efficiency Data
  const [staffEfficiency, setStaffEfficiency] = useState([])

  // Trend Data
  const [trends, setTrends] = useState([])

  // Hot Artists
  const [hotArtists, setHotArtists] = useState([])

  // Organization Metrics
  const [organizationMetrics, setOrganizationMetrics] = useState([])

  // Organizations List (for switcher)
  const [organizations, setOrganizations] = useState([])

  // Check if user is SystemAdmin
  const isSystemAdmin = staffProfile?.role === 'SystemAdmin'

  useEffect(() => {
    if (!isSystemAdmin) {
      navigate('/launchpad')
      return
    }

    loadAllData()
    const interval = setInterval(loadAllData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [isSystemAdmin, navigate])

  const loadAllData = async () => {
    if (!supabase || !isSystemAdmin) return

    setIsLoading(true)
    try {
      // Load Market Velocity
      const [count24h, count7d, count30d] = await Promise.all([
        supabase.rpc('get_global_demo_count', { hours_back: 24 }),
        supabase.rpc('get_global_demo_count', { hours_back: 168 }), // 7 days
        supabase.rpc('get_global_demo_count', { hours_back: 720 }), // 30 days
      ])

      setMarketVelocity({
        last24h: count24h.data || 0,
        last7d: count7d.data || 0,
        last30d: count30d.data || 0,
      })

      // Load Genre Heatmap
      const { data: genreData } = await supabase.rpc('get_genre_sign_rates')
      setGenreHeatmap(genreData || [])

      // Load Staff Efficiency
      const { data: staffData } = await supabase.rpc('get_global_staff_efficiency')
      setStaffEfficiency(staffData || [])

      // Load Trends
      const { data: trendData } = await supabase.rpc('get_genre_trends')
      setTrends(trendData || [])

      // Load Hot Artists
      const { data: artistsData } = await supabase.rpc('get_hot_artists')
      setHotArtists(artistsData || [])

      // Load Organization Metrics
      const { data: orgData } = await supabase.rpc('get_all_organizations_metrics')
      setOrganizationMetrics(orgData || [])

      // Load Organizations for switcher
      const { data: orgsList } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .order('name')
      setOrganizations(orgsList || [])
    } catch (error) {
      console.error('Error loading global pulse data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImpersonate = orgId => {
    if (!orgId) {
      setIsImpersonating(false)
      setSelectedOrganization(null)
      // Reload to show global view
      loadAllData()
      return
    }

    setSelectedOrganization(orgId)
    setIsImpersonating(true)
    // Navigate to dashboard with impersonation context
    navigate(`/labels/${orgId}`, { state: { impersonatingOrgId: orgId } })
  }

  if (!isSystemAdmin) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-center">
          <Activity className="w-8 h-8 text-neon-purple animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Global Pulse...</p>
        </div>
      </div>
    )
  }

  const hotTrends = trends.filter(t => t.is_hot)
  const topGenres = genreHeatmap.slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/launchpad')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Launchpad</span>
        </button>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Global Pulse</h1>
          <p className="text-gray-400">System-wide analytics and monitoring</p>
        </div>

        {/* Label Switcher */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={selectedOrganization || ''}
              onChange={e => handleImpersonate(e.target.value || null)}
              className="appearance-none bg-gray-950/50 border border-neon-purple/50 rounded-lg px-4 py-2 pr-10 text-white focus:outline-none focus:border-neon-purple cursor-pointer"
            >
              <option value="">View All (Global)</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
              size={18}
            />
          </div>
        </div>
      </div>

      {/* Market Velocity Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-morphism rounded-lg p-6 border border-neon-purple/20 mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Activity size={24} className="text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Market Velocity</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-1">Last 24 Hours</p>
            <p className="text-3xl font-bold text-white">{marketVelocity.last24h}</p>
            <p className="text-xs text-gray-500 mt-1">demos</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-1">Last 7 Days</p>
            <p className="text-3xl font-bold text-white">{marketVelocity.last7d}</p>
            <p className="text-xs text-gray-500 mt-1">demos</p>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-1">Last 30 Days</p>
            <p className="text-3xl font-bold text-white">{marketVelocity.last30d}</p>
            <p className="text-xs text-gray-500 mt-1">demos</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Genre Heatmap Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-morphism rounded-lg p-6 border border-neon-purple/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <BarChart3 size={24} className="text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Genre Heatmap</h2>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {topGenres.length === 0 ? (
              <p className="text-gray-400 text-sm">No genre data available</p>
            ) : (
              topGenres.map((genre, index) => (
                <div
                  key={genre.genre}
                  className="flex items-center justify-between p-3 bg-gray-950/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-8">#{index + 1}</span>
                    <span className="text-white font-semibold">{genre.genre || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-white font-bold">{genre.sign_rate?.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">
                        {genre.total_signed}/{genre.total_submissions}
                      </p>
                    </div>
                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600"
                        style={{ width: `${Math.min(genre.sign_rate || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Staff Efficiency Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-morphism rounded-lg p-6 border border-neon-purple/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users size={24} className="text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Staff Efficiency Leaderboard</h2>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {staffEfficiency.length === 0 ? (
              <p className="text-gray-400 text-sm">No staff data available</p>
            ) : (
              staffEfficiency.slice(0, 10).map((staff, index) => (
                <div
                  key={staff.staff_id}
                  className="flex items-center justify-between p-3 bg-gray-950/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-8">#{index + 1}</span>
                    <div>
                      <p className="text-white font-semibold">{staff.staff_name}</p>
                      <p className="text-xs text-gray-500">{staff.organization_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{staff.hit_rate?.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">
                      {staff.total_signed}/{staff.total_advanced} hit rate
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Trend Detector Widget */}
      {hotTrends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-morphism rounded-lg p-6 border border-amber-500/50 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <AlertTriangle size={24} className="text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white">🔥 Hot Trends Detected</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hotTrends.map(trend => (
              <div
                key={trend.genre}
                className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">{trend.genre}</span>
                  <span className="text-amber-400 font-bold">
                    +{trend.change_percentage?.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  <p>This week: {trend.current_week_count}</p>
                  <p>Last week: {trend.previous_week_count}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Hot Artists Widget */}
      {hotArtists.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-morphism rounded-lg p-6 border border-neon-purple/20 mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Heart size={24} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Hot Artists</h2>
            <span className="text-gray-400 text-sm">(Watched by multiple labels)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hotArtists.map(artist => (
              <div
                key={artist.artist_name}
                className="p-4 bg-gray-950/30 rounded-lg border border-neon-purple/20"
              >
                <p className="text-white font-semibold mb-2">{artist.artist_name}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-blue-400" />
                    <span className="text-gray-400">{artist.organization_count} labels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye size={14} className="text-purple-400" />
                    <span className="text-gray-400">{artist.total_watches} watches</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart size={14} className="text-red-400" />
                    <span className="text-gray-400">{artist.total_likes} likes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Label Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-morphism rounded-lg p-6 border border-neon-purple/20"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Building2 size={24} className="text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Label Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Label</th>
                <th className="text-left py-3 px-4 text-gray-400 font-semibold">Slug</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Staff</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Total Tracks</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Signed</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Health Score</th>
                <th className="text-right py-3 px-4 text-gray-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizationMetrics.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-400">
                    No organization data available
                  </td>
                </tr>
              ) : (
                organizationMetrics.map(org => (
                  <tr
                    key={org.organization_id}
                    className="border-b border-gray-800/50 hover:bg-gray-950/30"
                  >
                    <td className="py-3 px-4 text-white font-semibold">{org.organization_name}</td>
                    <td className="py-3 px-4 text-gray-400 text-sm">{org.slug}</td>
                    <td className="py-3 px-4 text-right text-white">{org.staff_count}</td>
                    <td className="py-3 px-4 text-right text-white">{org.total_tracks}</td>
                    <td className="py-3 px-4 text-right text-green-400">{org.signed_tracks}</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-bold ${
                          org.company_health_score >= 70
                            ? 'text-green-400'
                            : org.company_health_score >= 50
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        }`}
                      >
                        {org.company_health_score?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleImpersonate(org.organization_id)}
                        className="px-3 py-1 bg-neon-purple/20 hover:bg-neon-purple/30 border border-neon-purple/50 rounded text-neon-purple text-sm transition-all"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}

export default GlobalPulse
