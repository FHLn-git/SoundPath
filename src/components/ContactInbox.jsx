import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import {
  Mail,
  X,
  CheckCircle,
  Archive,
  Reply,
  Search,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
  Clock,
  User,
  MessageSquare,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const ContactInbox = ({ onClose }) => {
  const { staffProfile } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'unread', 'read', 'replied', 'archived'
  const [searchTerm, setSearchTerm] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [replying, setReplying] = useState(false)

  useEffect(() => {
    loadSubmissions()
  }, [filter])

  const loadSubmissions = async () => {
    if (!supabase) return

    try {
      setLoading(true)
      let query = supabase
        .from('contact_form_submissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setSubmissions(data || [])
    } catch (error) {
      console.error('Error loading contact submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async id => {
    if (!supabase || !staffProfile) return

    try {
      const { error } = await supabase
        .from('contact_form_submissions')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
          read_by: staffProfile.id,
        })
        .eq('id', id)

      if (error) throw error
      await loadSubmissions()
      if (selectedSubmission?.id === id) {
        setSelectedSubmission({
          ...selectedSubmission,
          status: 'read',
          read_at: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAsReplied = async (id, replyText) => {
    if (!supabase || !staffProfile) return

    try {
      setReplying(true)
      const { error } = await supabase
        .from('contact_form_submissions')
        .update({
          status: 'replied',
          replied_at: new Date().toISOString(),
          replied_by: staffProfile.id,
          reply_message: replyText,
        })
        .eq('id', id)

      if (error) throw error
      setReplyMessage('')
      await loadSubmissions()
      if (selectedSubmission?.id === id) {
        setSelectedSubmission({
          ...selectedSubmission,
          status: 'replied',
          replied_at: new Date().toISOString(),
          reply_message: replyText,
        })
      }
    } catch (error) {
      console.error('Error marking as replied:', error)
    } finally {
      setReplying(false)
    }
  }

  const archiveSubmission = async id => {
    if (!supabase || !staffProfile) return

    try {
      const { error } = await supabase
        .from('contact_form_submissions')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_by: staffProfile.id,
        })
        .eq('id', id)

      if (error) throw error
      await loadSubmissions()
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null)
      }
    } catch (error) {
      console.error('Error archiving submission:', error)
    }
  }

  const formatDate = dateString => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = status => {
    switch (status) {
      case 'unread':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      case 'read':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
      case 'replied':
        return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'archived':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const filteredSubmissions = submissions.filter(sub => {
    const matchesSearch =
      !searchTerm ||
      sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.message?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const unreadCount = submissions.filter(s => s.status === 'unread').length

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 rounded-lg border border-gray-800 w-full max-w-6xl h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Contact Form Inbox</h2>
              <p className="text-sm text-gray-400">
                {unreadCount > 0 && (
                  <span className="text-blue-400 font-semibold">{unreadCount} unread</span>
                )}
                {unreadCount === 0 && 'All caught up!'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSubmissions}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Submission List */}
          <div className="w-1/3 border-r border-gray-800 flex flex-col">
            {/* Filters and Search */}
            <div className="p-4 border-b border-gray-800 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search submissions..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-600 text-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['all', 'unread', 'read', 'replied', 'archived'].map(status => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      filter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Submission List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No submissions found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {filteredSubmissions.map(submission => (
                    <button
                      key={submission.id}
                      onClick={() => {
                        setSelectedSubmission(submission)
                        if (submission.status === 'unread') {
                          markAsRead(submission.id)
                        }
                      }}
                      className={`w-full p-4 text-left hover:bg-gray-800/50 transition-colors ${
                        selectedSubmission?.id === submission.id ? 'bg-gray-800/70' : ''
                      } ${submission.status === 'unread' ? 'border-l-4 border-blue-500' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">{submission.name}</div>
                          <div className="text-sm text-gray-400 truncate">{submission.email}</div>
                        </div>
                        {submission.status === 'unread' && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-300 mb-1 truncate">
                        {submission.subject}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {formatDate(submission.created_at)}
                      </div>
                      <div className="mt-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(submission.status)}`}
                        >
                          {submission.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Submission Details */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedSubmission ? (
              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="p-6 border-b border-gray-800">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {selectedSubmission.subject}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {selectedSubmission.name}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {selectedSubmission.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatDate(selectedSubmission.created_at)}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-sm border ${getStatusColor(selectedSubmission.status)}`}
                    >
                      {selectedSubmission.status}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                      <h4 className="font-semibold text-gray-300">Message</h4>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4 text-gray-300 whitespace-pre-wrap">
                      {selectedSubmission.message}
                    </div>
                  </div>

                  {selectedSubmission.reply_message && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Reply className="w-5 h-5 text-green-400" />
                        <h4 className="font-semibold text-gray-300">Your Reply</h4>
                        <span className="text-xs text-gray-500">
                          {formatDate(selectedSubmission.replied_at)}
                        </span>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-gray-300 whitespace-pre-wrap">
                        {selectedSubmission.reply_message}
                      </div>
                    </div>
                  )}

                  {selectedSubmission.status !== 'replied' && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Add Reply Note
                      </label>
                      <textarea
                        value={replyMessage}
                        onChange={e => setReplyMessage(e.target.value)}
                        placeholder="Add a reply note (internal use only)..."
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-gray-800 flex items-center gap-3">
                  {selectedSubmission.status !== 'replied' && (
                    <button
                      onClick={() => markAsReplied(selectedSubmission.id, replyMessage)}
                      disabled={replying || !replyMessage.trim()}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      {replying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Mark as Replied
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => archiveSubmission(selectedSubmission.id)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a submission to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default ContactInbox
