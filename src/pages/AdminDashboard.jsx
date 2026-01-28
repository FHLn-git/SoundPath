import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { 
  Building2, Users, DollarSign, TrendingUp, AlertCircle, 
  CheckCircle, XCircle, Activity, CreditCard, BarChart3,
  Search, Filter, Download, Bug, Eye, EyeOff, RefreshCw, ArrowLeft, Mail
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ContactInbox from '../components/ContactInbox'

const AdminDashboard = () => {
  const { staffProfile, isSystemAdmin } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    mrr: 0,
    trialOrganizations: 0,
    pastDueOrganizations: 0,
  })
  const [organizations, setOrganizations] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('subscriptions') // 'subscriptions' or 'errors'
  const [errorLogs, setErrorLogs] = useState([])
  const [errorStats, setErrorStats] = useState({
    totalErrors: 0,
    unresolvedErrors: 0,
    errorsLast24h: 0,
    errorsLast7d: 0,
    mostCommonError: null
  })
  const [errorFilter, setErrorFilter] = useState('all') // 'all', 'unresolved', 'resolved'
  const [errorSeverity, setErrorSeverity] = useState('all') // 'all', 'error', 'warning', 'info'
  const [selectedError, setSelectedError] = useState(null)
  const [showContactInbox, setShowContactInbox] = useState(false)

  useEffect(() => {
    if (!isSystemAdmin) {
      navigate('/launchpad')
      return
    }

    loadData()
    const interval = setInterval(() => {
      loadData()
      if (activeTab === 'errors') {
        loadErrorLogs()
      }
    }, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [isSystemAdmin, navigate, activeTab])

  const loadData = async () => {
    if (!supabase) return

    try {
      setLoading(true)

      // Load organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, slug, created_at')
        .order('created_at', { ascending: false })

      if (orgsError) throw orgsError
      setOrganizations(orgsData || [])

      // Load subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          organizations:organization_id (id, name, slug),
          plans:plan_id (id, name, price_monthly, price_yearly)
        `)
        .order('created_at', { ascending: false })

      if (subsError) throw subsError
      setSubscriptions(subsData || [])

      // Calculate stats
      const activeSubs = (subsData || []).filter(s => s.status === 'active' || s.status === 'trialing')
      const trialSubs = (subsData || []).filter(s => s.status === 'trialing')
      const pastDueSubs = (subsData || []).filter(s => s.status === 'past_due')

      // Calculate MRR (Monthly Recurring Revenue)
      const mrr = activeSubs.reduce((sum, sub) => {
        const plan = sub.plans
        if (!plan) return sum
        const price = sub.billing_interval === 'year' 
          ? (plan.price_yearly || 0) / 12 
          : (plan.price_monthly || 0)
        return sum + price
      }, 0)

      // Calculate total revenue (from invoices)
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid')

      const totalRevenue = (invoicesData || []).reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0)

      setStats({
        totalOrganizations: orgsData?.length || 0,
        activeSubscriptions: activeSubs.length,
        totalRevenue,
        mrr,
        trialOrganizations: trialSubs.length,
        pastDueOrganizations: pastDueSubs.length,
      })

      // Load error logs
      await loadErrorLogs()
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadErrorLogs = async (filter = errorFilter, severity = errorSeverity) => {
    if (!supabase) return

    try {
      // Load error logs
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('last_seen_at', { ascending: false })
        .limit(100)

      if (filter === 'unresolved') {
        query = query.eq('resolved', false)
      } else if (filter === 'resolved') {
        query = query.eq('resolved', true)
      }

      if (severity !== 'all') {
        query = query.eq('severity', severity)
      }

      const { data: logsData, error: logsError } = await query

      if (logsError) throw logsError
      setErrorLogs(logsData || [])

      // Get error stats
      const { data: statsData, error: statsError } = await supabase.rpc('get_error_stats')
      if (!statsError && statsData && statsData.length > 0) {
        setErrorStats(statsData[0])
      }
    } catch (error) {
      console.error('Error loading error logs:', error)
    }
  }

  const markErrorResolved = async (errorId, note = '') => {
    if (!supabase) return

    try {
      const { error } = await supabase
        .from('error_logs')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: staffProfile?.id,
          resolved_note: note
        })
        .eq('id', errorId)

      if (error) throw error
      await loadErrorLogs()
    } catch (error) {
      console.error('Error marking error as resolved:', error)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'text-green-400 bg-green-500/20'
      case 'trialing':
        return 'text-yellow-400 bg-yellow-500/20'
      case 'past_due':
        return 'text-red-400 bg-red-500/20'
      case 'canceled':
        return 'text-gray-400 bg-gray-500/20'
      default:
        return 'text-gray-400 bg-gray-500/20'
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const org = sub.organizations
    const matchesSearch = !searchTerm || 
      org?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org?.slug?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || sub.status === filterStatus

    return matchesSearch && matchesFilter
  })

  if (!isSystemAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <div className="max-w-7xl mx-auto">
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
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>
              <p className="text-gray-400 text-lg">
                Manage organizations, subscriptions, and monitor system health. Use this dashboard to help customers and manage the platform.
              </p>
            </div>
            <button
              onClick={() => setShowContactInbox(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Contact Inbox
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Activity className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-2xl font-bold mb-1">{stats.totalOrganizations}</div>
                <div className="text-sm text-gray-400">Total Organizations</div>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-2xl font-bold mb-1">{stats.activeSubscriptions}</div>
                <div className="text-sm text-gray-400">Active Subscriptions</div>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-gray-400" />
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-2xl font-bold mb-1">{formatCurrency(stats.mrr)}</div>
                <div className="text-sm text-gray-400">Monthly Recurring Revenue</div>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-2xl font-bold mb-1">{formatCurrency(stats.totalRevenue)}</div>
                <div className="text-sm text-gray-400">Total Revenue</div>
              </div>
            </div>

            {/* Alerts */}
            {(stats.trialOrganizations > 0 || stats.pastDueOrganizations > 0) && (
              <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-gray-800">
                <h2 className="text-xl font-bold mb-4">Alerts</h2>
                <div className="space-y-3">
                  {stats.trialOrganizations > 0 && (
                    <div className="flex items-center gap-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <div>
                        <div className="font-semibold text-yellow-400">
                          {stats.trialOrganizations} organization{stats.trialOrganizations !== 1 ? 's' : ''} on trial
                        </div>
                        <div className="text-sm text-gray-300">
                          Monitor trial conversions and send upgrade reminders
                        </div>
                      </div>
                    </div>
                  )}
                  {stats.pastDueOrganizations > 0 && (
                    <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <div>
                        <div className="font-semibold text-red-400">
                          {stats.pastDueOrganizations} organization{stats.pastDueOrganizations !== 1 ? 's' : ''} past due
                        </div>
                        <div className="text-sm text-gray-300">
                          Payment required - follow up with these organizations
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-800">
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === 'subscriptions'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Subscriptions
              </button>
              <button
                onClick={() => {
                  setActiveTab('errors')
                  loadErrorLogs()
                }}
                className={`px-4 py-2 font-semibold transition-colors flex items-center gap-2 ${
                  activeTab === 'errors'
                    ? 'text-white border-b-2 border-red-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Bug className="w-4 h-4" />
                Error Logs
                {errorStats.unresolvedErrors > 0 && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                    {errorStats.unresolvedErrors}
                  </span>
                )}
              </button>
            </div>

            {activeTab === 'subscriptions' ? (
              /* Subscriptions Table */
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Subscriptions</h2>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search organizations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-600"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="past_due">Past Due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Organization</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Plan</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Period End</th>
                      <th className="text-left py-3 px-4 text-gray-400 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscriptions.map((sub) => {
                      const org = sub.organizations
                      const plan = sub.plans
                      return (
                        <tr key={sub.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="py-3 px-4">
                            <div className="font-semibold">{org?.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-400">{org?.slug || 'N/A'}</div>
                          </td>
                          <td className="py-3 px-4">{plan?.name || sub.plan_id}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(sub.status)}`}>
                              {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {plan && formatCurrency(
                              sub.billing_interval === 'year' 
                                ? (plan.price_yearly || 0) / 12 
                                : (plan.price_monthly || 0)
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-400">{formatDate(sub.current_period_end)}</td>
                          <td className="py-3 px-4 text-gray-400">{formatDate(sub.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filteredSubscriptions.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    No subscriptions found
                  </div>
                )}
              </div>
            </div>
            ) : (
              /* Error Logs Section */
              <div className="space-y-6">
                {/* Error Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                    <div className="text-sm text-gray-400 mb-1">Total Errors</div>
                    <div className="text-2xl font-bold">{errorStats.totalErrors || 0}</div>
                  </div>
                  <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
                    <div className="text-sm text-red-400 mb-1">Unresolved</div>
                    <div className="text-2xl font-bold text-red-400">{errorStats.unresolvedErrors || 0}</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                    <div className="text-sm text-gray-400 mb-1">Last 24h</div>
                    <div className="text-2xl font-bold">{errorStats.errorsLast24h || 0}</div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                    <div className="text-sm text-gray-400 mb-1">Last 7 Days</div>
                    <div className="text-2xl font-bold">{errorStats.errorsLast7d || 0}</div>
                  </div>
                </div>

                {/* Error Logs Table */}
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Error Logs</h2>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={loadErrorLogs}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <select
                        value={errorFilter}
                        onChange={(e) => {
                          const newFilter = e.target.value
                          setErrorFilter(newFilter)
                          loadErrorLogs(newFilter, errorSeverity)
                        }}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
                      >
                        <option value="all">All Errors</option>
                        <option value="unresolved">Unresolved</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      <select
                        value={errorSeverity}
                        onChange={(e) => {
                          const newSeverity = e.target.value
                          setErrorSeverity(newSeverity)
                          loadErrorLogs(errorFilter, newSeverity)
                        }}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
                      >
                        <option value="all">All Severities</option>
                        <option value="error">Errors</option>
                        <option value="warning">Warnings</option>
                        <option value="info">Info</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">Error</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">Component</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">Severity</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">Occurrences</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">First Seen</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">Last Seen</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errorLogs.map((error) => (
                          <tr key={error.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="py-3 px-4">
                              <div className="font-semibold max-w-md truncate" title={error.error_message}>
                                {error.error_message}
                              </div>
                              {error.error_url && (
                                <div className="text-xs text-gray-500 mt-1">{error.error_url}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-sm">
                              {error.error_component || 'N/A'}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs ${
                                error.severity === 'error' ? 'text-red-400 bg-red-500/20' :
                                error.severity === 'warning' ? 'text-yellow-400 bg-yellow-500/20' :
                                'text-blue-400 bg-blue-500/20'
                              }`}>
                                {error.severity}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-400">
                              {error.occurrence_count || 1}
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-sm">
                              {formatDate(error.first_seen_at)}
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-sm">
                              {formatDate(error.last_seen_at)}
                            </td>
                            <td className="py-3 px-4">
                              {error.resolved ? (
                                <span className="px-2 py-1 rounded text-xs text-green-400 bg-green-500/20">
                                  Resolved
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs text-red-400 bg-red-500/20">
                                  Unresolved
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelectedError(error)}
                                  className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {!error.resolved && (
                                  <button
                                    onClick={() => markErrorResolved(error.id)}
                                    className="p-1.5 bg-green-500/20 hover:bg-green-500/30 rounded border border-green-500/50 transition-colors"
                                    title="Mark Resolved"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {errorLogs.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        No errors found
                      </div>
                    )}
                  </div>
                </div>

                {/* Error Detail Modal */}
                {selectedError && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-lg border border-gray-800 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                      <div className="p-6 border-b border-gray-800">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-bold">Error Details</h3>
                          <button
                            onClick={() => setSelectedError(null)}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Error Message</div>
                          <div className="bg-gray-800 rounded p-3 font-mono text-sm">{selectedError.error_message}</div>
                        </div>
                        {selectedError.error_stack && (
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Stack Trace</div>
                            <pre className="bg-gray-800 rounded p-3 text-xs overflow-x-auto max-h-64">
                              {selectedError.error_stack}
                            </pre>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Component</div>
                            <div>{selectedError.error_component || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Severity</div>
                            <div>{selectedError.severity}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Occurrences</div>
                            <div>{selectedError.occurrence_count || 1}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Status</div>
                            <div>{selectedError.resolved ? 'Resolved' : 'Unresolved'}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">First Seen</div>
                            <div>{formatDate(selectedError.first_seen_at)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Last Seen</div>
                            <div>{formatDate(selectedError.last_seen_at)}</div>
                          </div>
                        </div>
                        {selectedError.error_context && (
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Context</div>
                            <pre className="bg-gray-800 rounded p-3 text-xs overflow-x-auto">
                              {JSON.stringify(selectedError.error_context, null, 2)}
                            </pre>
                          </div>
                        )}
                        {selectedError.browser_info && (
                          <div>
                            <div className="text-sm text-gray-400 mb-1">Browser Info</div>
                            <pre className="bg-gray-800 rounded p-3 text-xs overflow-x-auto">
                              {JSON.stringify(selectedError.browser_info, null, 2)}
                            </pre>
                          </div>
                        )}
                        {!selectedError.resolved && (
                          <div className="pt-4 border-t border-gray-800">
                            <button
                              onClick={() => {
                                markErrorResolved(selectedError.id)
                                setSelectedError(null)
                              }}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                            >
                              Mark as Resolved
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Contact Inbox Modal */}
      {showContactInbox && (
        <ContactInbox onClose={() => setShowContactInbox(false)} />
      )}
    </div>
  )
}

export default AdminDashboard
