# SoundPath: The A&R Command Center

A comprehensive React application for managing record label demos through the A&R pipeline with advanced analytics and team collaboration features.

## Features

### Navigation & Layout
- **Sidebar Navigation**: Permanent left-hand navigation with Dashboard, Artist Directory, and Staff Admin tabs
- **Browser-Style List View**: High-density Rekordbox-style track browser with slim rows and monospace fonts
- **Interactive Phase Views**: Click phase titles to show full-screen detailed lists for that phase

### Track Management
- **Track Browser**: High-density list view with columns for Artist, Title, Genre, BPM, Energy, Votes, and Links
- **Energy Meter**: 5-segment lightning bolt indicator (neon yellow) showing track energy level
- **Link Shield**: SoundCloud link validator with green glow for active links, red for broken/invalid
- **Phase-Specific Controls**:
  - **Second Listen**: +1/-1 voting buttons with one vote per staff member limit
  - **Contracting**: Target Release Date picker and Contract Signed checkbox
  - **Vault**: Total Earnings display and Release Date

### Analytics & Profiles
- **Artist Directory**: 
  - Conversion Rate percentage
  - Total Signed and Total Submitted counts
  - Filtered list of all tracks by artist
- **Staff Admin Dashboard** (Admin Only):
  - Activity Meter gauge (Sleeping → Active → Fatigued)
  - Monthly Listens metric
  - Average Listens per Week
  - Upvote/Downvote Ratio

### Search & Filtering
- **Global Search**: Search bar at the top to instantly filter tracks by Artist or Title
- **Phase Filtering**: Click phase buttons to filter by pipeline stage

## Tech Stack

- React 18 with React Router DOM
- Vite
- Tailwind CSS
- Framer Motion (animations and transitions)
- @dnd-kit (drag-and-drop)
- Lucide React (icons)
- Context API for state management
- LocalStorage for data persistence

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Usage

### Dashboard
- View all tracks in a high-density browser-style list
- Use the search bar to filter by artist or title
- Click phase buttons to view tracks in a specific phase
- Add new demos with the "Add Demo" button

### Artist Directory
- Browse all artists with their conversion metrics
- Click an artist card to view their detailed profile
- See all tracks by that artist in a filtered list

### Staff Admin
- View team activity metrics and performance
- Monitor activity meter (Sleeping/Active/Fatigued)
- Track monthly listens and voting patterns

### Track Management
- **Move Tracks**: Use arrow buttons to move tracks between phases
- **Vote**: In Second Listen phase, use +1/-1 buttons (one vote per staff member)
- **Contracting**: Set target release dates and mark contracts as signed
- **Vault**: View earnings and release dates for completed tracks

## Project Structure

```
SoundPath/
  ├── src/                    # React application source code
  │   ├── components/         # Reusable React components
  │   ├── pages/              # Page components
  │   ├── context/            # React context providers
  │   ├── hooks/              # Custom React hooks
  │   └── lib/                # Utility libraries
  ├── database/               # Database SQL files
  │   ├── schemas/            # Main database schemas
  │   ├── migrations/         # Feature migrations
  │   └── archive/            # Archived fixes/updates
  ├── docs/                   # Project documentation
  ├── scripts/                # Utility scripts
  ├── supabase/               # Supabase edge functions
  └── public/                 # Static assets
```

### Database Setup

For new installations, run the schema files in this order:
1. `database/schemas/master-schema.sql` - Core database schema
2. `database/schemas/saas-schema.sql` - Billing and subscriptions
3. `database/schemas/rbac-schema.sql` - Access control

See `database/README.md` for detailed database documentation.

### Documentation

All project documentation is in the `docs/` directory. See `docs/README.md` for an index of available documentation.

## Data Persistence

All track data, votes, and metadata are automatically saved to Supabase and persist across browser sessions.
