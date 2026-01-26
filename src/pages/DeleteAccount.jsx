import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import Toast from '../components/Toast'
import ConfirmationModal from '../components/ConfirmationModal'

const DeleteAccount = () => {
  const { user, staffProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })

  const requiredText = 'DELETE MY ACCOUNT'

  const handleDeleteAccount = async () => {
    if (confirmText !== requiredText) {
      setToast({
        isVisible: true,
        message: `Please type "${requiredText}" to confirm`,
        type: 'error'
      })
      return
    }

    setDeleting(true)

    try {
      // Delete staff profile (this will cascade to memberships, votes, etc. based on RLS)
      if (staffProfile) {
        const { error: staffError } = await supabase
          .from('staff_members')
          .delete()
          .eq('id', staffProfile.id)

        if (staffError) {
          throw new Error(`Failed to delete staff profile: ${staffError.message}`)
        }
      }

      // Delete auth user
      if (user) {
        const { error: authError } = await supabase.auth.admin.deleteUser(user.id)
        
        // If admin API not available, try regular delete
        if (authError && authError.message?.includes('admin')) {
          // Fallback: Sign out and let user contact support
          console.warn('Admin API not available, signing out user')
          await signOut()
          setToast({
            isVisible: true,
            message: 'Account deletion initiated. Please contact support to complete the process.',
            type: 'info'
          })
          setTimeout(() => navigate('/'), 2000)
          return
        } else if (authError) {
          throw new Error(`Failed to delete auth user: ${authError.message}`)
        }
      }

      // Sign out
      await signOut()

      setToast({
        isVisible: true,
        message: 'Your account has been deleted successfully',
        type: 'success'
      })

      // Redirect to landing page
      setTimeout(() => {
        navigate('/')
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error('Error deleting account:', error)
      setToast({
        isVisible: true,
        message: error.message || 'Failed to delete account. Please contact support.',
        type: 'error'
      })
      setDeleting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Delete Account</h1>

        {toast.isVisible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, isVisible: false })}
          />
        )}

        <div className="bg-gray-900 rounded-lg p-8 border border-red-500/30 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2 text-red-400">Permanent Account Deletion</h2>
              <p className="text-gray-400">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-semibold text-red-400 mb-2">Warning: This action is irreversible</p>
                <p className="mb-3">Deleting your account will permanently remove:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Your profile and account information</li>
                  <li>All tracks you've created (unless they belong to an organization)</li>
                  <li>Your votes and activity history</li>
                  <li>All organization memberships</li>
                  <li>Access to all organizations you were part of</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="font-semibold mb-3 text-gray-200">Before you delete:</h3>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>Export your data if you want to keep a copy</li>
              <li>Cancel any active subscriptions</li>
              <li>Notify team members if you're an organization owner</li>
              <li>Download any important tracks or data</li>
            </ul>
          </div>

          <button
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            Delete My Account
          </button>
        </div>

        <ConfirmationModal
          isOpen={showConfirm}
          onClose={() => {
            setShowConfirm(false)
            setConfirmText('')
          }}
          onConfirm={handleDeleteAccount}
          title="Confirm Account Deletion"
          message={
            <div className="space-y-4">
              <p className="text-gray-300">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type <strong className="text-red-400">{requiredText}</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={requiredText}
                  disabled={deleting}
                />
              </div>
            </div>
          }
          confirmText="Delete Account"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
          isLoading={deleting}
        />
      </div>
    </div>
  )
}

export default DeleteAccount
