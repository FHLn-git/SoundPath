/**
 * Venue (ShowCheck) – full-viewport embed. No sidebar or Label chrome; just the Venue app.
 *
 * Dev: run ShowCheck with `npm run dev -- -p 3001` and set VITE_VENUE_APP_URL=http://localhost:3001 (optional).
 * Prod: set VITE_VENUE_APP_URL to your deployed Venue app URL.
 */
export default function VenueApp() {
  const venueUrl =
    (typeof import.meta.env.VITE_VENUE_APP_URL === 'string' && import.meta.env.VITE_VENUE_APP_URL.trim())
      ? import.meta.env.VITE_VENUE_APP_URL.trim()
      : 'http://localhost:3001'

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-950">
      <iframe
        title="Venue"
        src={venueUrl}
        className="flex-1 w-full min-h-0 border-0"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  )
}
