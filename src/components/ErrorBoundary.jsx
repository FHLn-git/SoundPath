import React from 'react'
import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidUpdate(prevProps) {
    // If the route changes, automatically reset the boundary so SPA navigation
    // can recover without forcing a full reload.
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ hasError: false, error: null, errorInfo: null })
    }
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Store error details
    this.setState({
      error,
      errorInfo
    })

    // Report to custom error logger
    if (window.logError) {
      window.logError({
        message: error?.message || 'React Error Boundary caught an error',
        stack: error?.stack,
        component: errorInfo.componentStack?.split('\n')[1]?.trim() || 'Unknown Component',
        context: {
          componentStack: errorInfo.componentStack,
          errorName: error?.name,
          errorString: error?.toString()
        },
        severity: 'error'
      })
    } else {
      // Fallback if logger not initialized yet
      console.error('Error logger not available:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} />
    }

    return this.props.children
  }
}

function ErrorBoundaryWithReset({ children }) {
  // Works only inside Router; in this app we mount boundaries within Router.
  const location = useLocation()
  return <ErrorBoundary resetKey={location.key}>{children}</ErrorBoundary>
}

function ErrorFallback({ error, errorInfo }) {
  const navigate = useNavigate()
  const [showDetails, setShowDetails] = React.useState(false)

  const handleGoHome = () => {
    // Prefer SPA navigation; avoid forcing a full reload (stability).
    navigate('/launchpad', { replace: true })
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-900 rounded-lg border border-red-500/30 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-500/20 rounded-lg">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
            <p className="text-gray-400 mt-1">We encountered an unexpected error</p>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
          <p className="text-gray-300 text-sm">
            {error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
          </p>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={handleReload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </button>
          <button
            onClick={handleGoHome}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>

        {import.meta.env.DEV && errorInfo && (
          <div className="mt-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-gray-400 hover:text-gray-300 mb-2"
            >
              {showDetails ? 'Hide' : 'Show'} Error Details
            </button>
            {showDetails && (
              <div className="bg-gray-950 rounded-lg p-4 border border-gray-800">
                <pre className="text-xs text-red-400 overflow-auto max-h-96">
                  {error?.toString()}
                  {errorInfo.componentStack}
                </pre>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            If this problem persists, please contact support with the error details above.
          </p>
        </div>
      </div>
    </div>
  )
}

export default ErrorBoundaryWithReset
