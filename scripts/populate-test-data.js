/* eslint-env node */
// Script to populate the database with 100 test submissions
// Run with: node populate-test-data.js
// Make sure your .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadEnv() {
  try {
    const envContent = readFileSync(join(__dirname, '.env'), 'utf-8')
    const env = {}
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        env[match[1].trim()] = match[2].trim()
      }
    })
    return env
  } catch (error) {
    console.error('Error reading .env file:', error.message)
    return {}
  }
}

const env = loadEnv()
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  'Midnight Drive', 'Sunset Boulevard', 'City Lights', 'Ocean Deep', 'Mountain Peak',
  'Desert Storm', 'Rain Dance', 'Thunder Strike', 'Lightning Bolt', 'Fire Walk',
  'Ice Cold', 'Hot Summer', 'Winter Chill', 'Spring Bloom', 'Autumn Leaves',
  'Night Vision', 'Day Break', 'Twilight Zone', 'Dawn Chorus', 'Evening Star',
  'Morning Rush', 'Afternoon Breeze', 'Midnight Hour', 'Golden Hour', 'Blue Hour',
  'Electric Pulse', 'Magnetic Field', 'Gravity Well', 'Solar Wind', 'Cosmic Dust',
  'Stellar Core', 'Black Hole', 'Nebula Cloud', 'Galaxy Spin', 'Universe Expand',
  'Time Warp', 'Space Jump', 'Quantum Leap', 'Dimension Shift', 'Reality Check',
  'Dream State', 'Awake Now', 'Mind Trip', 'Soul Search', 'Heart Beat',
  'Body Move', 'Feet Dance', 'Hand Clap', 'Voice Echo', 'Sound Wave',
  'Frequency Shift', 'Amplitude Rise', 'Resonance Peak', 'Harmony Blend', 'Rhythm Flow',
  'Beat Drop', 'Bass Line', 'Melody Rise', 'Chord Progression', 'Scale Climb',
  'Note Perfect', 'Tone Set', 'Pitch Shift', 'Tempo Change', 'Groove Lock',
  'Vibe Check', 'Mood Swing', 'Energy Boost', 'Power Surge', 'Force Field',
  'Wave Length', 'Signal Strength', 'Connection Lost', 'Link Found', 'Path Clear',
  'Road Ahead', 'Journey Start', 'Destination Reach', 'Arrival Time', 'Departure Gate',
  'Flight Path', 'Landing Zone', 'Take Off', 'Touch Down', 'Cruise Mode',
  'Speed Limit', 'Full Throttle', 'Brake Check', 'U Turn', 'Straight Line',
  'Curve Ball', 'Home Run', 'Touch Down', 'Goal Post', 'Finish Line',
]

// BPM ranges by genre
const BPM_RANGES = {
  'Tech House': { min: 125, max: 130 },
  'Deep House': { min: 120, max: 125 },
  'Classic House': { min: 118, max: 125 },
  'Piano House': { min: 115, max: 122 },
  'Progressive House': { min: 128, max: 132 },
}

// SoundCloud link templates
const SC_LINKS = [
  'https://soundcloud.com/artist/track-1',
  'https://soundcloud.com/artist/track-2',
  'https://soundcloud.com/artist/track-3',
  'https://soundcloud.com/artist/track-4',
  'https://soundcloud.com/artist/track-5',
]

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
  return date.toISOString()
}

async function createArtist(name) {
  // Check if artist exists
  const { data: existing } = await supabase
    .from('artists')
    .select('id')
    .eq('name', name)
    .maybeSingle()

  if (existing) {
    return existing.id
  }

  // Create new artist
  const { data, error } = await supabase
    .from('artists')
    .insert({ name })
    .select()
    .single()

  if (error) {
    console.error(`Error creating artist ${name}:`, error)
    throw error
  }

  return data.id
}

async function createTrack(artistId, artistName, title, genre, bpm, scLink) {
  const { data, error } = await supabase
    .from('tracks')
    .insert({
      artist_id: artistId,
      artist_name: artistName,
      title,
      genre,
      bpm,
      sc_link: scLink,
      status: 'inbox',
      column: 'inbox',
      energy: 0, // Energy is set in Second Listen phase
      votes: 0,
      contract_signed: false,
      archived: false,
      watched: false,
      created_at: getRandomDate(30), // Random date within last 30 days
    })
    .select()
    .single()

  if (error) {
    console.error(`Error creating track ${title}:`, error)
    throw error
  }

  return data
}

async function populateDatabase() {
  console.log('🚀 Starting database population...\n')

  const tracks = []
  let trackCount = 0

  // Create all artists first
  console.log('📝 Creating artists...')
  const artistMap = new Map()
  for (const artist of ARTISTS) {
    try {
      const artistId = await createArtist(artist.name)
      artistMap.set(artist.name, artistId)
      console.log(`  ✅ ${artist.name}`)
    } catch (error) {
      console.error(`  ❌ Failed to create artist ${artist.name}:`, error.message)
    }
  }

  console.log(`\n📀 Creating tracks...\n`)

  // Create tracks for each artist
  for (const artist of ARTISTS) {
    const artistId = artistMap.get(artist.name)
    if (!artistId) continue

    // Distribute genres across this artist's tracks
    const genreDistribution = []
    for (let i = 0; i < artist.count; i++) {
      // Ensure variety - each artist gets a mix of genres
      const genreIndex = i % GENRES.length
      genreDistribution.push(GENRES[genreIndex])
    }
    // Shuffle for more randomness
    genreDistribution.sort(() => Math.random() - 0.5)

    for (let i = 0; i < artist.count; i++) {
      const genre = genreDistribution[i]
      const title = getRandomElement(TRACK_TITLES)
      const bpm = getRandomBPM(genre)
      const scLink = `https://soundcloud.com/${artist.name.toLowerCase().replace(/\s+/g, '-')}/${title.toLowerCase().replace(/\s+/g, '-')}`

      try {
        const track = await createTrack(artistId, artist.name, title, genre, bpm, scLink)
        tracks.push(track)
        trackCount++
        process.stdout.write(`  ${trackCount}/100 tracks created...\r`)
      } catch (error) {
        console.error(`\n  ❌ Failed to create track:`, error.message)
      }
    }
  }

  console.log(`\n\n✅ Successfully created ${trackCount} tracks!`)
  console.log(`\n📊 Summary:`)
  console.log(`   - Artists: ${ARTISTS.length}`)
  console.log(`   - Tracks: ${trackCount}`)
  console.log(`   - Genres: ${GENRES.join(', ')}`)
  console.log(`\n🎉 Database population complete!`)
}

// Run the script
populateDatabase().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})
