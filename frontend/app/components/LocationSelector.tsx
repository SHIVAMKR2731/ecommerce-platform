import { useState } from 'react'
import { FiMapPin, FiSearch } from 'react-icons/fi'

interface LocationSelectorProps {
  location: { lat: number; lng: number } | null
  onLocationChange: (location: { lat: number; lng: number }) => void
}

export default function LocationSelector({ location, onLocationChange }: LocationSelectorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleLocationSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      // Using a simple geocoding approach - in production, use a proper geocoding service
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
          searchQuery
        )}&key=YOUR_API_KEY&limit=1`
      )
      const data = await response.json()

      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry
        onLocationChange({ lat, lng })
        setIsEditing(false)
        setSearchQuery('')
      }
    } catch (error) {
      console.error('Error searching location:', error)
      // Fallback: use current location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            onLocationChange({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
          }
        )
      }
    }
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onLocationChange({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Error getting current location:', error)
        }
      )
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsEditing(!isEditing)}
        className="flex items-center space-x-2 text-gray-600 hover:text-primary-600"
      >
        <FiMapPin className="h-5 w-5" />
        <span className="text-sm">
          {location ? 'Location set' : 'Set location'}
        </span>
      </button>

      {isEditing && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border p-4 z-10">
          <div className="space-y-3">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter your location"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch()}
              />
              <button
                onClick={handleLocationSearch}
                className="p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <FiSearch className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={getCurrentLocation}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              📍 Use current location
            </button>

            <div className="text-xs text-gray-500">
              {location ? (
                <span>
                  Current: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              ) : (
                <span>Please set your location to find nearby shops</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}