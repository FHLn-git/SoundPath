import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Mail, Send, Loader2, Check } from 'lucide-react'
import Toast from '../components/Toast'
import { sendEmail } from '../lib/emailService'
import { supabase } from '../lib/supabaseClient'
import { validateEmail } from '../lib/emailValidation'

const Contact = () => {
  const navigate = useNavigate()
  const { user, staffProfile } = useAuth()
  const [formData, setFormData] = useState({
    name: staffProfile?.name || user?.email || '',
    email: user?.email || '',
    subject: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' })
  const [emailError, setEmailError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    setEmailError('')

    // Validate email
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error)
      setToast({
        isVisible: true,
        message: emailValidation.error,
        type: 'error',
      })
      setSubmitting(false)
      return
    }

    try {
      // Save to database (internal mail service)
      const { error: dbError } = await supabase.from('contact_form_submissions').insert({
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
        status: 'unread',
        user_id: user?.id || null,
        staff_member_id: staffProfile?.id || null,
      })

      if (dbError) {
        console.error('Error saving contact form to database:', dbError)
        // Continue anyway - don't fail the whole submission
      }

      // Send confirmation email to user (optional - can be disabled)
      if (formData.email) {
        try {
          await sendEmail({
            to: formData.email,
            subject: 'We received your support request',
            html: `
              <h2>Thank you for contacting SoundPath Support</h2>
              <p>We've received your message and we'll get back to you.</p>
              <hr>
              <p><strong>Your message:</strong></p>
              <p>${formData.message.replace(/\n/g, '<br>')}</p>
            `,
            text: `
              Thank you for contacting SoundPath Support
              
              We've received your message and we'll get back to you.
              
              Your message:
              ${formData.message}
            `,
          })
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError)
          // Don't fail the whole submission if email fails
        }
      }

      setFormData({ name: '', email: '', subject: '', message: '' })
      setToast({
        isVisible: true,
        message: "Your message has been sent! We'll get back to you.",
        type: 'success',
      })

      // Redirect based on authentication status
      setTimeout(() => {
        if (user && staffProfile) {
          // Logged in: go to launchpad
          navigate('/launchpad')
        } else {
          // Logged out: go to home landing page
          navigate('/')
        }
      }, 1500)
    } catch (error) {
      console.error('Error submitting contact form:', error)
      setToast({
        isVisible: true,
        message: 'Failed to send message. Please try again.',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Mail className="w-8 h-8 text-blue-400" />
          <h1 className="text-4xl font-bold">Contact Support</h1>
        </div>

        {toast.isVisible && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ ...toast, isVisible: false })}
          />
        )}

        <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
          <div className="text-gray-400 mb-6 text-center space-y-2">
            <p>Have a question or need help?</p>
            <p>Fill out the form below and we'll get back to you.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => {
                  setFormData({ ...formData, email: e.target.value })
                  setEmailError('')
                }}
                onBlur={e => {
                  if (e.target.value) {
                    const validation = validateEmail(e.target.value)
                    if (!validation.valid) {
                      setEmailError(validation.error)
                    } else {
                      setEmailError('')
                    }
                  }
                }}
                required
                className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                  emailError
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-700 focus:ring-blue-500'
                }`}
                placeholder="your@email.com"
              />
              {emailError && <p className="mt-1 text-sm text-red-400">{emailError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                required
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What can we help you with?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
              <textarea
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                required
                rows={6}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Tell us more about your question or issue..."
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Message
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Contact
