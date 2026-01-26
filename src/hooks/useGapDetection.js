import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Hook to detect gaps in the release schedule for the next 90 days
 * Returns information about which months have no scheduled releases
 */
export const useGapDetection = () => {
  const [gaps, setGaps] = useState({
    month1: { count: 0, monthName: '', hasGap: false },
    month2: { count: 0, monthName: '', hasGap: false },
    month3: { count: 0, monthName: '', hasGap: false },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkGaps = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }

      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Calculate three 30-day windows
        const month1Start = new Date(today)
        const month1End = new Date(today)
        month1End.setDate(month1End.getDate() + 30)

        const month2Start = new Date(today)
        month2Start.setDate(month2Start.getDate() + 31)
        const month2End = new Date(today)
        month2End.setDate(month2End.getDate() + 60)

        const month3Start = new Date(today)
        month3Start.setDate(month3Start.getDate() + 61)
        const month3End = new Date(today)
        month3End.setDate(month3End.getDate() + 90)

        // Format dates for Supabase query (YYYY-MM-DD)
        const formatDate = (date) => date.toISOString().split('T')[0]

        // Query all tracks in 'contracting' or 'upcoming' status
        const { data: tracks, error } = await supabase
          .from('tracks')
          .select('release_date, target_release_date, status')
          .in('status', ['contracting', 'upcoming'])

        if (error) {
          console.error('Error checking release gaps:', error)
          setLoading(false)
          return
        }

        // Combine release_date and target_release_date
        // For 'upcoming': use release_date
        // For 'contracting': use target_release_date (or release_date if target is not set)
        const allReleaseDates = []
        
        tracks?.forEach(track => {
          let releaseDate = null
          
          if (track.status === 'upcoming' && track.release_date) {
            releaseDate = new Date(track.release_date)
          } else if (track.status === 'contracting') {
            // Prefer target_release_date for contracting, fallback to release_date
            releaseDate = track.target_release_date 
              ? new Date(track.target_release_date)
              : (track.release_date ? new Date(track.release_date) : null)
          }
          
          if (releaseDate && !isNaN(releaseDate.getTime())) {
            allReleaseDates.push(releaseDate)
          }
        })

        // Count releases in each window
        const countInWindow = (start, end) => {
          return allReleaseDates.filter(date => {
            const dateOnly = new Date(date)
            dateOnly.setHours(0, 0, 0, 0)
            return dateOnly >= start && dateOnly <= end
          }).length
        }

        const month1Count = countInWindow(month1Start, month1End)
        const month2Count = countInWindow(month2Start, month2End)
        const month3Count = countInWindow(month3Start, month3End)

        // Get month names
        const getMonthName = (date) => {
          return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }

        setGaps({
          month1: {
            count: month1Count,
            monthName: getMonthName(month1Start),
            hasGap: month1Count === 0,
          },
          month2: {
            count: month2Count,
            monthName: getMonthName(month2Start),
            hasGap: month2Count === 0,
          },
          month3: {
            count: month3Count,
            monthName: getMonthName(month3Start),
            hasGap: month3Count === 0,
          },
        })
      } catch (error) {
        console.error('Error in gap detection:', error)
      } finally {
        setLoading(false)
      }
    }

    checkGaps()

    // Set up real-time subscription for immediate updates
    let tracksChannel = null
    if (supabase) {
      try {
        tracksChannel = supabase
          .channel('gap-detection-changes')
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'tracks' },
            () => {
              checkGaps() // Re-check immediately on any track change
            }
          )
          .subscribe()
      } catch (error) {
        console.warn('Could not set up real-time subscription for gap detection:', error)
      }
    }

    // Re-check every 2 minutes as a fallback
    const interval = setInterval(checkGaps, 2 * 60 * 1000)

    return () => {
      clearInterval(interval)
      if (tracksChannel && supabase) {
        supabase.removeChannel(tracksChannel)
      }
    }
  }, [])

  // Check if any gaps exist
  const hasGaps = gaps.month1.hasGap || gaps.month2.hasGap || gaps.month3.hasGap

  // Get list of months with gaps
  const gapMonths = []
  if (gaps.month1.hasGap) gapMonths.push(gaps.month1.monthName)
  if (gaps.month2.hasGap) gapMonths.push(gaps.month2.monthName)
  if (gaps.month3.hasGap) gapMonths.push(gaps.month3.monthName)

  return {
    gaps,
    hasGaps,
    gapMonths,
    loading,
  }
}
