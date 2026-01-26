import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { Download, Loader2, Check, AlertCircle } from 'lucide-react'
import Toast from '../components/Toast'

const DataExport = () => {
  const { user, staffProfile, activeOrgId } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [exported, setExported] = useState(false)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })

  const exportUserData = async () => {
    if (!user || !staffProfile) {
      setToast({
        isVisible: true,
        message: 'You must be logged in to export your data',
        type: 'error'
      })
      return
    }

    setExporting(true)
    setExported(false)

    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at
        },
        staffProfile: {
          id: staffProfile.id,
          name: staffProfile.name,
          role: staffProfile.role,
          bio: staffProfile.bio,
          lastActiveAt: staffProfile.last_active_at
        }
      }

      // Export personal tracks (if any)
      if (activeOrgId === null) {
        const { data: personalTracks, error: tracksError } = await supabase
          .from('tracks')
          .select('*')
          .eq('recipient_user_id', staffProfile.id)
          .is('organization_id', null)

        if (!tracksError && personalTracks) {
          exportData.personalTracks = personalTracks
        }
      }

      // Export memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select(`
          *,
          organizations (
            id,
            name,
            slug,
            created_at
          )
        `)
        .eq('staff_member_id', staffProfile.id)

      if (!membershipsError && memberships) {
        exportData.memberships = memberships
      }

      // Export votes
      const { data: votes, error: votesError } = await supabase
        .from('votes')
        .select('*')
        .eq('staff_member_id', staffProfile.id)

      if (!votesError && votes) {
        exportData.votes = votes
      }

      // Create downloadable JSON file
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `soundpath-data-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExported(true)
      setToast({
        isVisible: true,
        message: 'Your data has been exported successfully',
        type: 'success'
      })
    } catch (error) {
      console.error('Error exporting data:', error)
      setToast({
        isVisible: true,
        message: 'Failed to export data. Please try again or contact support.',
        type: 'error'
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Data Export</h1>

        {toast.isVisible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, isVisible: false })}
          />
        )}

        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Download className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Export Your Data</h2>
              <p className="text-gray-400">
                Download a copy of all your personal data stored in SoundPath. This includes your profile
                information, tracks, memberships, and votes.
              </p>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="font-semibold mb-3 text-gray-200">What's included in the export:</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Your account information (email, profile)</li>
              <li>All tracks you've created or received</li>
              <li>Organization memberships</li>
              <li>Votes and activity history</li>
            </ul>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-yellow-400 mb-1">Note:</p>
                <p>
                  The export will only include data you have access to. Organization-level data (tracks
                  belonging to organizations you're a member of) may be limited based on your role and
                  permissions.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={exportUserData}
            disabled={exporting || exported}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {exporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Exporting...
              </>
            ) : exported ? (
              <>
                <Check className="w-5 h-5" />
                Data Exported
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Export My Data
              </>
            )}
          </button>

          {exported && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                ✓ Your data has been downloaded. Check your downloads folder for the JSON file.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DataExport
