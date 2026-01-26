import { useState, useEffect } from 'react'

/**
 * Hook to detect mobile/tablet screens and manage mobile-specific state
 */
export const useMobile = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768) // Mobile: < 768px
      setIsTablet(width >= 768 && width < 1024) // Tablet: 768px - 1024px
    }

    // Check on mount
    checkScreenSize()

    // Listen for resize events
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet }
}
