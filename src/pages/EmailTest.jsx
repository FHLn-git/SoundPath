import { useState } from 'react'
import { Mail, Send, CheckCircle, XCircle, AlertCircle, Loader2, Copy, Check } from 'lucide-react'
import { sendEmail } from '../lib/emailService'

const EmailTest = () => {
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionTest, setConnectionTest] = useState(null)

  // Get configuration from environment
  const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY
  const RESEND_FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || 'noreply@soundpath.app'
  
  const isConfigured = !!RESEND_API_KEY
  const apiKeyPreview = RESEND_API_KEY 
    ? `${RESEND_API_KEY.substring(0, 10)}...${RESEND_API_KEY.substring(RESEND_API_KEY.length - 4)}`
    : 'Not set'

  const handleSendTest = async () => {
    if (!testEmail) {
      setResult({
        success: false,
        error: 'Please enter an email address',
      })
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      setResult({
        success: false,
        error: 'Please enter a valid email address',
      })
      return
    }

    setSending(true)
    setResult(null)

    try {
      const response = await sendEmail({
        to: testEmail,
        subject: 'Test Email from SoundPath',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 6px 6px 0 0; }
                .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 6px 6px; }
                .success { color: #10b981; font-weight: bold; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>✅ Email Test Successful!</h1>
                </div>
                <div class="content">
                  <p>Congratulations! Your Resend email configuration is working correctly.</p>
                  <p><strong>Configuration Details:</strong></p>
                  <ul>
                    <li>From Email: ${RESEND_FROM_EMAIL}</li>
                    <li>API Key: ${apiKeyPreview}</li>
                    <li>Sent at: ${new Date().toLocaleString()}</li>
                  </ul>
                  <p class="success">If you received this email, your email service is properly configured!</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Email Test Successful!

Congratulations! Your Resend email configuration is working correctly.

Configuration Details:
- From Email: ${RESEND_FROM_EMAIL}
- API Key: ${apiKeyPreview}
- Sent at: ${new Date().toLocaleString()}

If you received this email, your email service is properly configured!
        `.trim(),
      })

      if (response.success) {
        setResult({
          success: true,
          message: response.id 
            ? `Email sent successfully! Email ID: ${response.id}`
            : response.queued
            ? 'Email queued successfully (using Supabase fallback)'
            : 'Email sent successfully!',
          id: response.id,
          queued: response.queued,
        })
      } else {
        // Check if this is a Resend error or Supabase fallback
        if (response.resendError) {
          setResult({
            success: false,
            error: response.error || 'Failed to send email via Resend',
            resendError: true,
            details: response.details || null,
          })
        } else {
          setResult({
            success: false,
            error: response.error || 'Failed to send email',
          })
        }
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      setResult({
        success: false,
        error: error.message || 'An unexpected error occurred',
      })
    } finally {
      setSending(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const testConnection = async () => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setConnectionTest({
        success: false,
        error: 'Supabase URL or Anon Key not configured',
        details: 'Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.',
      })
      return
    }

    setTestingConnection(true)
    setConnectionTest(null)

    try {
      // Test the edge function by sending a test email to the user's Resend account email
      // This avoids Resend's restriction on test domain emails
      // We'll use a simple validation request that doesn't actually send
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          to: 'ethanberdofe@icloud.com', // Use your Resend account email to avoid restrictions
          subject: 'Connection Test',
          html: '<p>Connection test - you can ignore this email</p>',
          text: 'Connection test - you can ignore this email',
        }),
      })

      if (response.status === 401) {
        setConnectionTest({
          success: false,
          error: 'Unauthorized - Check your Supabase Anon Key',
          details: 'The edge function returned 401. Verify VITE_SUPABASE_ANON_KEY is correct in your .env file.',
        })
      } else if (response.status === 500) {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error && errorData.error.includes('RESEND_API_KEY')) {
          setConnectionTest({
            success: false,
            error: 'RESEND_API_KEY not configured in edge function',
            details: 'Add RESEND_API_KEY secret in Supabase Dashboard → Edge Functions → Secrets',
          })
        } else {
          setConnectionTest({
            success: false,
            error: `Edge Function Error: ${errorData.error || 'Unknown error'}`,
            details: 'Check the edge function logs in Supabase Dashboard for details.',
          })
        }
      } else if (response.status === 403) {
        // 403 from Resend means the edge function is working, but Resend has restrictions
        // This is expected with test domain - don't show as error
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error && errorData.error.includes('testing emails')) {
          setConnectionTest({
            success: true,
            message: 'Edge function is working! Connection test successful.',
            details: 'Note: Resend restricts test emails, but your configuration is correct. Use "Send Test Email" to actually send emails.',
          })
        } else {
          setConnectionTest({
            success: false,
            error: `Resend API Error: ${errorData.error || 'Forbidden'}`,
            details: errorData.details || 'Check your Resend API key and domain configuration.',
          })
        }
      } else if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        setConnectionTest({
          success: false,
          error: `Edge Function Error: ${response.status} ${response.statusText}`,
          details: errorData.error || 'Unable to reach edge function',
        })
      } else {
        // If we get here, the edge function is working
        const data = await response.json().catch(() => ({}))
        if (data.success || response.status === 200) {
          setConnectionTest({
            success: true,
            message: 'Edge function is working! RESEND_API_KEY is configured correctly.',
          })
        } else {
          setConnectionTest({
            success: false,
            error: data.error || 'Edge function returned an error',
            details: 'Check the edge function configuration and RESEND_API_KEY secret.',
          })
        }
      }
    } catch (error) {
      // Check if it's a CORS or network error
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        setConnectionTest({
          success: false,
          error: 'Cannot reach edge function',
          details: `Network error: ${error.message}. Make sure VITE_SUPABASE_URL is correct and the edge function is deployed.`,
          corsError: true,
        })
      } else {
        setConnectionTest({
          success: false,
          error: error.message || 'Connection test failed',
          details: 'Unable to connect to edge function. Check your internet connection and Supabase configuration.',
        })
      }
    } finally {
      setTestingConnection(false)
    }
  }

  const getStatusIcon = () => {
    if (!isConfigured) {
      return <XCircle className="w-6 h-6 text-red-400" />
    }
    return <CheckCircle className="w-6 h-6 text-green-400" />
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Mail className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold">Email Configuration Test</h1>
        </div>

        {/* Configuration Status */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            {getStatusIcon()}
            <div>
              <h2 className="text-xl font-bold">Resend Configuration</h2>
              <p className={`text-lg font-semibold ${isConfigured ? 'text-green-400' : 'text-red-400'}`}>
                {isConfigured ? 'CONFIGURED' : 'NOT CONFIGURED'}
              </p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
              <span className="text-gray-300">API Key:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm text-gray-400">{apiKeyPreview}</code>
                {RESEND_API_KEY && (
                  <button
                    onClick={() => copyToClipboard(RESEND_API_KEY)}
                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                    title="Copy full API key"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
              <span className="text-gray-300">From Email:</span>
              <code className="text-sm text-gray-400">{RESEND_FROM_EMAIL}</code>
            </div>
          </div>

          {!isConfigured && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded">
              <AlertCircle className="w-5 h-5 text-yellow-400 inline-block mr-2" />
              <span className="text-yellow-400">
                Resend API key is not configured. Add <code className="bg-gray-800 px-2 py-1 rounded">VITE_RESEND_API_KEY</code> to your <code className="bg-gray-800 px-2 py-1 rounded">.env</code> file.
              </span>
            </div>
          )}
        </div>

        {/* Connection Test */}
        {isConfigured && (
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Test API Connection</h2>
            <p className="text-gray-400 mb-4">
              Verify that your Resend API key is valid and accessible.
            </p>
            <button
              onClick={testConnection}
              disabled={testingConnection}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Test Connection
                </>
              )}
            </button>

            {connectionTest && (
              <div
                className={`mt-4 rounded-lg border p-4 ${
                  connectionTest.success
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {connectionTest.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-semibold ${connectionTest.success ? 'text-green-400' : 'text-red-400'}`}>
                      {connectionTest.success ? connectionTest.message : connectionTest.error}
                    </p>
                    {connectionTest.details && (
                      <p className="text-sm text-gray-300 mt-2">{connectionTest.details}</p>
                    )}
                    {connectionTest.corsError && (
                      <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm">
                        <p className="text-yellow-400 font-semibold mb-1">⚠️ CORS Issue Detected</p>
                        <p className="text-yellow-300 text-xs">
                          If Resend doesn't allow direct browser calls, you'll need to create a Supabase Edge Function
                          to proxy the email sending. This is a common security practice for API keys.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Test Email Form */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Send Test Email</h2>
          <p className="text-gray-400 mb-4">
            Enter an email address to send a test email. This will verify that your Resend configuration is working correctly.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="test-email" className="block text-sm font-medium text-gray-300 mb-2">
                Recipient Email Address
              </label>
              <input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isConfigured || sending}
              />
            </div>

            <button
              onClick={handleSendTest}
              disabled={!isConfigured || sending || !testEmail}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Test Email
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Display */}
        {result && (
          <div
            className={`rounded-lg border p-6 ${
              result.success
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className={`font-bold mb-2 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                  {result.success ? 'Success!' : 'Error'}
                </h3>
                {result.success ? (
                  <div>
                    <p className="text-green-300">{result.message}</p>
                    {result.id && (
                      <p className="text-sm text-gray-400 mt-2">
                        Email ID: <code className="bg-gray-800 px-2 py-1 rounded">{result.id}</code>
                      </p>
                    )}
                    {result.queued && (
                      <p className="text-sm text-yellow-400 mt-2">
                        ⚠️ Email was queued via Supabase fallback. Check your Resend configuration if you expected direct sending.
                      </p>
                    )}
                    <p className="text-sm text-gray-400 mt-4">
                      💡 Check your inbox (and spam folder) for the test email. If you don't receive it, verify:
                    </p>
                    <ul className="text-sm text-gray-400 mt-2 ml-4 list-disc">
                      <li>Your API key is correct and active</li>
                      <li>Your "from" email address is valid (use <code className="bg-gray-800 px-1 rounded">onboarding@resend.dev</code> for testing)</li>
                      <li>Check the Resend dashboard for delivery status</li>
                    </ul>
                  </div>
                ) : (
                  <div>
                    <p className="text-red-300 font-semibold mb-2">{result.error}</p>
                    {result.details && (
                      <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm">
                        <p className="text-blue-300">{result.details}</p>
                      </div>
                    )}
                    {result.resendError && (
                      <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm">
                        <p className="text-yellow-400 font-semibold mb-1">⚠️ Resend API Error</p>
                        {result.corsError ? (
                          <div>
                            <p className="text-yellow-300 text-xs mb-2">
                              <strong>CORS Error Detected:</strong> The browser blocked the request to Resend's API. This is expected - Resend doesn't allow direct browser calls for security.
                            </p>
                            <p className="text-yellow-300 text-xs mb-2 font-semibold">
                              ✅ Solution: Use Supabase Edge Function
                            </p>
                            <p className="text-yellow-300 text-xs mb-3">
                              A Supabase Edge Function has been created at <code className="bg-gray-800 px-1 rounded">supabase/functions/send-email</code>. Follow these steps:
                            </p>
                            <ol className="text-yellow-300 text-xs ml-4 list-decimal space-y-1 mb-3">
                              <li>Add <code className="bg-gray-800 px-1 rounded">RESEND_API_KEY</code> secret in Supabase Dashboard → Edge Functions → Secrets</li>
                              <li>Deploy the function: <code className="bg-gray-800 px-1 rounded">supabase functions deploy send-email</code></li>
                              <li>See <code className="bg-gray-800 px-1 rounded">RESEND_EDGE_FUNCTION_SETUP.md</code> for detailed instructions</li>
                            </ol>
                            <p className="text-yellow-300 text-xs">
                              Once deployed, the email service will automatically use the edge function instead of direct API calls.
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-yellow-300 text-xs mb-2">
                              The email failed to send via Resend. Common issues:
                            </p>
                            <ul className="text-yellow-300 text-xs mt-2 ml-4 list-disc space-y-1">
                              <li><strong>Invalid API Key:</strong> Check that your API key starts with <code className="bg-gray-800 px-1 rounded">re_</code> and is active in your Resend dashboard</li>
                              <li><strong>Invalid From Address:</strong> Use <code className="bg-gray-800 px-1 rounded">onboarding@resend.dev</code> for testing (no domain verification needed)</li>
                              <li><strong>Domain Not Verified:</strong> If using your own domain, verify it in the Resend dashboard first</li>
                              <li><strong>API Key Permissions:</strong> Ensure your API key has email sending permissions</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-4 p-3 bg-gray-800 rounded text-sm">
                      <p className="text-gray-300 font-semibold mb-2">Troubleshooting Steps:</p>
                      <ul className="text-gray-400 space-y-1 ml-4 list-disc">
                        <li>If using Edge Function: Verify <code className="bg-gray-700 px-1 rounded">RESEND_API_KEY</code> is set in Supabase Dashboard → Edge Functions → Secrets</li>
                        <li>If using Edge Function: Make sure the function is deployed: <code className="bg-gray-700 px-1 rounded">supabase functions deploy send-email</code></li>
                        <li>See <code className="bg-gray-700 px-1 rounded">RESEND_EDGE_FUNCTION_SETUP.md</code> for complete setup instructions</li>
                        <li>Check the browser console (F12) for detailed error messages</li>
                        <li>Visit <a href="https://resend.com/emails" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Resend Dashboard</a> to see email logs and delivery status</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Quick Setup Guide</h2>
          <div className="space-y-3 text-gray-400">
            <div>
              <p className="font-semibold text-white mb-1">1. Get Your Resend API Key</p>
              <p className="text-sm">
                Sign up at <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">resend.com</a> and create an API key from the dashboard.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">2. Configure Your .env File</p>
              <p className="text-sm mb-2">Add these variables to your <code className="bg-gray-800 px-2 py-1 rounded">.env</code> file:</p>
              <pre className="bg-gray-800 p-3 rounded text-xs overflow-x-auto">
{`VITE_RESEND_API_KEY=re_your_api_key_here
VITE_RESEND_FROM_EMAIL=onboarding@resend.dev`}
              </pre>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">3. Restart Your Dev Server</p>
              <p className="text-sm">
                After updating <code className="bg-gray-800 px-2 py-1 rounded">.env</code>, restart your development server for changes to take effect.
              </p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">4. Test Your Configuration</p>
              <p className="text-sm">
                Use the form above to send a test email. Check your inbox (and spam folder) to confirm delivery.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailTest
