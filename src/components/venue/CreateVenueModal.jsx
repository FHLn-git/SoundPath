import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, MapPin, AlertCircle } from 'lucide-react'
import { createVenue } from '../../lib/venueApi'
import { COUNTRIES } from '../../lib/countries'
import { formatOperationError } from '../../lib/formatVenueError'

export default function CreateVenueModal({ open, onOpenChange, onCreated }) {
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [street1, setStreet1] = useState('')
  const [street2, setStreet2] = useState('')
  const [city, setCity] = useState('')
  const [stateRegion, setStateRegion] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [country, setCountry] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const resetForm = () => {
    setName('')
    setCapacity('')
    setStreet1('')
    setStreet2('')
    setCity('')
    setStateRegion('')
    setPostalCode('')
    setCountry('')
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (
      !name.trim() ||
      !street1.trim() ||
      !city.trim() ||
      !postalCode.trim() ||
      !country.trim() ||
      !capacity.trim()
    ) {
      setError('Please fill in all required fields.')
      return
    }
    const capacityNum = parseInt(capacity, 10)
    if (isNaN(capacityNum) || capacityNum < 1) {
      setError('Please enter a valid capacity (1 or more).')
      return
    }
    setSaving(true)
    try {
      const venue = await createVenue({
        name: name.trim(),
        capacity: capacityNum,
        address_street_1: street1.trim(),
        address_street_2: street2.trim() || null,
        address_city: city.trim(),
        address_state_region: stateRegion.trim() || null,
        address_postal_code: postalCode.trim(),
        address_country: country.trim(),
      })
      if (venue) {
        resetForm()
        await Promise.resolve(onCreated(venue.id))
        onOpenChange(false)
      } else {
        setError(
          formatOperationError(null, {
            operation: 'Create venue',
            fallbackReason:
              "The server didn't return the new venue. It may still have been created—check your venue list.",
          })
        )
      }
    } catch (err) {
      setError(
        formatOperationError(err, {
          operation: 'Create venue',
          fallbackReason:
            'Check your connection and try again, or run the database migration if you added new address fields.',
        })
      )
    } finally {
      setSaving(false)
    }
  }

  const canSubmit =
    name.trim() &&
    street1.trim() &&
    city.trim() &&
    postalCode.trim() &&
    country.trim() &&
    capacity.trim()

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto z-50 bg-[#0B0E14] border border-gray-700 rounded-xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Create New Venue</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Add a performance space. All address data is stored for reporting and Global Pulse.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="venue-name" className="block text-sm font-medium text-gray-300 mb-1">
              Venue name
            </label>
            <input
              id="venue-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. The Roxy Theatre"
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-neon-purple/50 focus:border-neon-purple"
              required
            />
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              Address
            </div>
            <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-800/50 p-3">
              <div>
                <label htmlFor="venue-street1" className="block text-sm text-gray-400 mb-1">
                  Street address
                </label>
                <input
                  id="venue-street1"
                  type="text"
                  value={street1}
                  onChange={(e) => setStreet1(e.target.value)}
                  placeholder="123 Main St"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-neon-purple/50"
                  required
                />
              </div>
              <div>
                <label htmlFor="venue-street2" className="block text-sm text-gray-400 mb-1">
                  Apartment, suite, etc. (optional)
                </label>
                <input
                  id="venue-street2"
                  type="text"
                  value={street2}
                  onChange={(e) => setStreet2(e.target.value)}
                  placeholder="Suite 100"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-neon-purple/50"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="venue-city" className="block text-sm text-gray-400 mb-1">
                    City
                  </label>
                  <input
                    id="venue-city"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Los Angeles"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-neon-purple/50"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="venue-state" className="block text-sm text-gray-400 mb-1">
                    State / Region
                  </label>
                  <input
                    id="venue-state"
                    type="text"
                    value={stateRegion}
                    onChange={(e) => setStateRegion(e.target.value)}
                    placeholder="CA"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-neon-purple/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="venue-postal" className="block text-sm text-gray-400 mb-1">
                    ZIP / Postal code
                  </label>
                  <input
                    id="venue-postal"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="90028"
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-neon-purple/50"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="venue-country" className="block text-sm text-gray-400 mb-1">
                    Country
                  </label>
                  <select
                    id="venue-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:ring-2 focus:ring-neon-purple/50"
                    required
                  >
                    <option value="">Select country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="venue-capacity" className="block text-sm font-medium text-gray-300 mb-1">
              Capacity
            </label>
            <input
              id="venue-capacity"
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="e.g. 500"
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-neon-purple/50"
              required
            />
          </div>

          {error && (
            <div className="flex gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Couldn't create venue</p>
                <p className="text-sm text-red-300/90">{error}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="px-4 py-2 rounded-lg bg-neon-purple text-white hover:bg-neon-purple/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                'Create Venue'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  )
}
