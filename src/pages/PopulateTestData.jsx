import { useState } from 'react'
import { useApp } from '../context/AppContext'

const GENRES = ['Tech House', 'Deep House', 'Classic House', 'Piano House', 'Progressive House']

// Artist names with varying submission counts
const ARTISTS = [
  // Artists with many submissions (for conversion rate testing)
  { name: 'Midnight Pulse', count: 8 },
  { name: 'Neon Waves', count: 7 },
  { name: 'Deep Resonance', count: 6 },
  { name: 'Studio Echo', count: 6 },
  // Artists with medium submissions
  { name: 'Electric Dreams', count: 5 },
  { name: 'Urban Groove', count: 5 },
  { name: 'Crystal Beats', count: 4 },
  { name: 'Shadow Frequency', count: 4 },
  { name: 'Luminous Sound', count: 4 },
  { name: 'Digital Horizon', count: 4 },
  // Artists with few submissions
  { name: 'Cosmic Rhythm', count: 3 },
  { name: 'Void Music', count: 3 },
  { name: 'Aurora Mix', count: 3 },
  { name: 'Phantom Bass', count: 3 },
  { name: 'Solar Flare', count: 3 },
  { name: 'Tidal Wave', count: 3 },
  { name: 'Stellar Vibes', count: 3 },
  { name: 'Quantum Beat', count: 3 },
  { name: 'Nova Sound', count: 3 },
  { name: 'Eclipse Music', count: 3 },
  { name: 'Galaxy Groove', count: 2 },
  { name: 'Meteor Mix', count: 2 },
  { name: 'Orbit Sound', count: 2 },
  { name: 'Zenith Audio', count: 2 },
  { name: 'Polaris Beats', count: 2 },
]

// Track title templates
const TRACK_TITLES = [
  'Midnight Drive',
  'Sunset Boulevard',
  'City Lights',
  'Ocean Deep',
  'Mountain Peak',
  'Desert Storm',
  'Rain Dance',
  'Thunder Strike',
  'Lightning Bolt',
  'Fire Walk',
  'Ice Cold',
  'Hot Summer',
  'Winter Chill',
  'Spring Bloom',
  'Autumn Leaves',
  'Night Vision',
  'Day Break',
  'Twilight Zone',
  'Dawn Chorus',
  'Evening Star',
  'Morning Rush',
  'Afternoon Breeze',
  'Midnight Hour',
  'Golden Hour',
  'Blue Hour',
  'Electric Pulse',
  'Magnetic Field',
  'Gravity Well',
  'Solar Wind',
  'Cosmic Dust',
  'Stellar Core',
  'Black Hole',
  'Nebula Cloud',
  'Galaxy Spin',
  'Universe Expand',
  'Time Warp',
  'Space Jump',
  'Quantum Leap',
  'Dimension Shift',
  'Reality Check',
  'Dream State',
  'Awake Now',
  'Mind Trip',
  'Soul Search',
  'Heart Beat',
  'Body Move',
  'Feet Dance',
  'Hand Clap',
  'Voice Echo',
  'Sound Wave',
  'Frequency Shift',
  'Amplitude Rise',
  'Resonance Peak',
  'Harmony Blend',
  'Rhythm Flow',
  'Beat Drop',
  'Bass Line',
  'Melody Rise',
  'Chord Progression',
  'Scale Climb',
  'Note Perfect',
  'Tone Set',
  'Pitch Shift',
  'Tempo Change',
  'Groove Lock',
  'Vibe Check',
  'Mood Swing',
  'Energy Boost',
  'Power Surge',
  'Force Field',
  'Wave Length',
  'Signal Strength',
  'Connection Lost',
  'Link Found',
  'Path Clear',
  'Road Ahead',
  'Journey Start',
  'Destination Reach',
  'Arrival Time',
  'Departure Gate',
  'Flight Path',
  'Landing Zone',
  'Take Off',
  'Touch Down',
  'Cruise Mode',
  'Speed Limit',
  'Full Throttle',
  'Brake Check',
  'U Turn',
  'Straight Line',
  'Curve Ball',
  'Home Run',
  'Touch Down',
  'Goal Post',
  'Finish Line',
]

// BPM ranges by genre
const BPM_RANGES = {
  'Tech House': { min: 125, max: 130 },
  'Deep House': { min: 120, max: 125 },
  'Classic House': { min: 118, max: 125 },
  'Piano House': { min: 115, max: 122 },
  'Progressive House': { min: 128, max: 132 },
}

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)]
}

function getRandomBPM(genre) {
  const range = BPM_RANGES[genre] || { min: 120, max: 130 }
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
}

function getRandomDate(daysAgo) {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
  return date
}

const PopulateTestData = () => {
  const { addTrack } = useApp()
  const [isPopulating, setIsPopulating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 100 })
  const [status, setStatus] = useState('')

  const handlePopulate = async () => {
    setIsPopulating(true)
    setStatus('Starting population...')
    setProgress({ current: 0, total: 100 })

    let trackCount = 0
    const usedTitles = new Set()

    try {
      for (const artist of ARTISTS) {
        // Distribute genres across this artist's tracks
        const genreDistribution = []
        for (let i = 0; i < artist.count; i++) {
          const genreIndex = i % GENRES.length
          genreDistribution.push(GENRES[genreIndex])
        }
        // Shuffle for more randomness
        genreDistribution.sort(() => Math.random() - 0.5)

        for (let i = 0; i < artist.count; i++) {
          const genre = genreDistribution[i]
          let title = getRandomElement(TRACK_TITLES)

          // Ensure unique titles
          let attempts = 0
          while (usedTitles.has(title) && attempts < 100) {
            title = getRandomElement(TRACK_TITLES)
            attempts++
          }
          usedTitles.add(title)

          const bpm = getRandomBPM(genre)
          const scLink = `https://soundcloud.com/${artist.name.toLowerCase().replace(/\s+/g, '-')}/${title.toLowerCase().replace(/\s+/g, '-')}`

          try {
            await addTrack({
              artist: artist.name,
              title,
              genre,
              bpm: bpm.toString(),
              link: scLink,
            })

            trackCount++
            setProgress({ current: trackCount, total: 100 })
            setStatus(`Created ${trackCount}/100 tracks...`)

            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 50))
          } catch (error) {
            console.error(`Error creating track ${title}:`, error)
            setStatus(`Error creating track ${title}: ${error.message}`)
          }
        }
      }

      setStatus(`✅ Successfully created ${trackCount} tracks!`)
    } catch (error) {
      console.error('Error populating database:', error)
      setStatus(`❌ Error: ${error.message}`)
    } finally {
      setIsPopulating(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6">
      <div className="glass-morphism rounded-lg p-8 border border-neon-purple/20 max-w-md w-full">
        <h1 className="text-2xl font-bold text-white mb-4">Populate Test Data</h1>
        <p className="text-gray-400 text-sm mb-6">
          This will create 100 test submissions with a variety of artists, genres, and metadata.
        </p>

        {status && (
          <div className="mb-4 p-3 bg-gray-900/50 rounded-lg">
            <p className="text-white text-sm">{status}</p>
            {isPopulating && (
              <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-neon-purple h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        <button
          onClick={handlePopulate}
          disabled={isPopulating}
          className={`w-full px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
            isPopulating
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-neon-purple/30 hover:bg-neon-purple/40 text-neon-purple border border-neon-purple/50'
          }`}
        >
          {isPopulating ? 'Populating...' : 'Populate 100 Test Submissions'}
        </button>

        <div className="mt-6 text-xs text-gray-500">
          <p className="mb-2">This will create:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{ARTISTS.length} artists with varying submission counts</li>
            <li>100 tracks distributed across all genres</li>
            <li>Varied BPM ranges per genre</li>
            <li>Random creation dates (last 30 days)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default PopulateTestData
