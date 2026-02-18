import { FiMapPin, FiStar, FiClock } from 'react-icons/fi'

interface Shop {
  id: string
  name: string
  description: string
  latitude: number
  longitude: number
  distance: number
  isOpen: boolean
  averageRating: number
}

interface ShopListProps {
  shops: Shop[]
  onShopSelect: (shop: Shop) => void
}

export default function ShopList({ shops, onShopSelect }: ShopListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {shops.map((shop) => (
        <div
          key={shop.id}
          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onShopSelect(shop)}
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{shop.name}</h3>
              <div className="flex items-center">
                <FiStar className="h-4 w-4 text-yellow-400 fill-current" />
                <span className="text-sm text-gray-600 ml-1">
                  {shop.averageRating.toFixed(1)}
                </span>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {shop.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-500">
                <FiMapPin className="h-4 w-4 mr-1" />
                <span>{shop.distance.toFixed(1)} km away</span>
              </div>

              <div className="flex items-center text-sm">
                <FiClock className="h-4 w-4 mr-1" />
                <span className={shop.isOpen ? 'text-green-600' : 'text-red-600'}>
                  {shop.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {shops.length === 0 && (
        <div className="col-span-full text-center py-12">
          <FiMapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No shops found nearby
          </h3>
          <p className="text-gray-500">
            Try adjusting your location or search radius
          </p>
        </div>
      )}
    </div>
  )
}