import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useGapDetection } from '../hooks/useGapDetection'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

const Calendar = () => {
  const { tracks } = useApp()
  const { gaps } = useGapDetection()
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get all tracks with release dates
  const tracksWithDates = useMemo(() => {
    const allTracks = []

    // Get upcoming tracks (with releaseDate)
    tracks
      .filter(t => t.column === 'upcoming' && !t.archived && t.releaseDate)
      .forEach(track => {
        allTracks.push({
          ...track,
          releaseDate: new Date(track.releaseDate),
          type: 'upcoming',
        })
      })

    // Get contracting tracks (with targetReleaseDate or releaseDate)
    tracks
      .filter(
        t => t.column === 'contracting' && !t.archived && (t.targetReleaseDate || t.releaseDate)
      )
      .forEach(track => {
        const date = track.targetReleaseDate
          ? new Date(track.targetReleaseDate)
          : new Date(track.releaseDate)
        allTracks.push({
          ...track,
          releaseDate: date,
          type: 'contracting',
        })
      })

    // Get vault tracks (released tracks with releaseDate)
    tracks
      .filter(t => t.column === 'vault' && !t.archived && t.releaseDate)
      .forEach(track => {
        allTracks.push({
          ...track,
          releaseDate: new Date(track.releaseDate),
          type: 'released',
        })
      })

    return allTracks
  }, [tracks])

  // Group tracks by date
  const tracksByDate = useMemo(() => {
    const grouped = {}
    tracksWithDates.forEach(track => {
      const dateKey = track.releaseDate.toISOString().split('T')[0]
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(track)
    })
    return grouped
  }, [tracksWithDates])

  // Check if current month has a gap
  const currentMonthHasGap = useMemo(() => {
    const currentMonthName = currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
    return (
      (gaps.month1.monthName === currentMonthName && gaps.month1.hasGap) ||
      (gaps.month2.monthName === currentMonthName && gaps.month2.hasGap) ||
      (gaps.month3.monthName === currentMonthName && gaps.month3.hasGap)
    )
  }, [currentDate, gaps])

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // Get first day of week (0 = Sunday, 6 = Saturday)
    const startDay = firstDay.getDay()

    // Create array of days
    const days = []
    const daysInMonth = lastDay.getDate()

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }, [currentDate])

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getDateKey = date => {
    if (!date) return null
    return date.toISOString().split('T')[0]
  }

  const getTracksForDate = date => {
    if (!date) return []
    const dateKey = getDateKey(date)
    return tracksByDate[dateKey] || []
  }

  const getTypeColor = type => {
    switch (type) {
      case 'upcoming':
        return 'bg-green-500/20 text-green-400 border-green-500/50'
      case 'contracting':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
      case 'released':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getTypeLabel = type => {
    switch (type) {
      case 'upcoming':
        return 'Upcoming'
      case 'contracting':
        return 'Scheduled'
      case 'released':
        return 'Released'
      default:
        return type
    }
  }

  const isToday = date => {
    if (!date) return false
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const handleTrackClick = track => {
    if (track.type === 'released') {
      navigate('/vault')
    } else if (track.type === 'contracting') {
      navigate('/phase/contracting')
    } else {
      navigate('/upcoming')
    }
  }

  return (
    <div className="flex flex-col bg-gray-950">
      {/* Premium Header with Legend */}
      <div className="pb-6 border-b border-gray-800/50 bg-gray-900/50 backdrop-blur-sm">
        {/* Title Row */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Release Calendar</h1>
        </div>

        {/* Navigation and Legend Row */}
        <div className="flex items-center justify-between gap-6">
          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            <motion.button
              onClick={goToPreviousMonth}
              className="p-2.5 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-800 rounded-lg transition-all group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft
                className="text-gray-500 group-hover:text-gray-400 transition-colors"
                size={20}
              />
            </motion.button>

            <div
              className={`px-6 py-2.5 border rounded-lg min-w-[240px] transition-all ${
                currentMonthHasGap
                  ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/20'
                  : 'bg-gray-900/50 border-gray-800'
              }`}
            >
              <h2 className="text-lg font-bold text-white text-center font-mono">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                {currentMonthHasGap && <span className="ml-2 text-amber-500 text-sm">⚠️</span>}
              </h2>
            </div>

            <motion.button
              onClick={goToNextMonth}
              className="p-2.5 bg-gray-900/50 hover:bg-gray-900/70 border border-gray-800 rounded-lg transition-all group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronRight
                className="text-gray-500 group-hover:text-gray-400 transition-colors"
                size={20}
              />
            </motion.button>

            <div className="h-8 w-px bg-gray-800/50"></div>

            <motion.button
              onClick={goToToday}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white transition-all text-sm font-mono font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Today
            </motion.button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 px-6 py-3 bg-gray-900/40 rounded-lg border border-gray-800">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
              Legend
            </div>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded border-2 bg-green-500/20 border-green-500/60 shadow-sm shadow-green-500/20"></div>
                <span className="text-xs text-gray-300 font-medium">Upcoming</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded border-2 bg-yellow-500/20 border-yellow-500/60 shadow-sm shadow-yellow-500/20"></div>
                <span className="text-xs text-gray-300 font-medium">Scheduled</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded border-2 bg-blue-500/20 border-blue-500/60 shadow-sm shadow-blue-500/20"></div>
                <span className="text-xs text-gray-300 font-medium">Released</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-y-auto p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-3 mb-4">
          {dayNames.map(day => (
            <div
              key={day}
              className="text-center text-xs font-bold text-gray-500 uppercase py-3 tracking-wider font-mono"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-3">
          {calendarDays.map((date, index) => {
            const dateTracks = getTracksForDate(date)
            const dateKey = getDateKey(date)

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.01 }}
                className={`min-h-[140px] p-3 rounded-lg border transition-all ${
                  date
                    ? isToday(date)
                      ? currentMonthHasGap
                        ? 'bg-amber-500/15 border-amber-500/70 shadow-lg shadow-amber-500/20'
                        : 'bg-gray-800/20 border-gray-700 shadow-lg shadow-gray-800/10'
                      : currentMonthHasGap
                        ? 'bg-gray-900/30 border-amber-500/40 hover:border-amber-500/60 hover:bg-amber-500/5 shadow-sm shadow-amber-500/10'
                        : 'bg-gray-900/30 border-gray-800 hover:border-gray-700 hover:bg-gray-900/40'
                    : 'bg-transparent border-transparent'
                }`}
              >
                {date && (
                  <>
                    <div
                      className={`text-sm font-bold mb-3 font-mono ${
                        isToday(date)
                          ? currentMonthHasGap
                            ? 'text-amber-400'
                            : 'text-gray-300'
                          : dateTracks.length > 0
                            ? currentMonthHasGap
                              ? 'text-amber-300'
                              : 'text-white'
                            : currentMonthHasGap
                              ? 'text-amber-500/60'
                              : 'text-gray-400'
                      }`}
                    >
                      {date.getDate()}
                    </div>
                    <div className="space-y-1.5">
                      {dateTracks.slice(0, 3).map(track => (
                        <motion.div
                          key={track.id}
                          onClick={() => handleTrackClick(track)}
                          className={`p-2 rounded-md text-xs border cursor-pointer transition-all truncate shadow-sm ${getTypeColor(
                            track.type
                          )} hover:shadow-md hover:scale-[1.02]`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          title={`${track.artist} - ${track.title} (${getTypeLabel(track.type)})`}
                        >
                          <div className="font-semibold truncate mb-0.5">{track.artist}</div>
                          <div className="text-xs opacity-80 truncate">{track.title}</div>
                        </motion.div>
                      ))}
                      {dateTracks.length > 3 && (
                        <div
                          className={`text-xs text-center pt-1.5 font-mono ${
                            currentMonthHasGap ? 'text-amber-400/60' : 'text-gray-500'
                          }`}
                        >
                          +{dateTracks.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Calendar
