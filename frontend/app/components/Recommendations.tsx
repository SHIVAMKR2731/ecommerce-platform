import { FiPlus } from 'react-icons/fi'

interface Recommendation {
  id: string
  name: string
  price: number
  discountPrice?: number
  imageUrl?: string
  shop: {
    name: string
  }
  reason: string // e.g., "Based on your previous orders", "Popular in your area"
}

interface RecommendationsProps {
  recommendations: Recommendation[]
  onAddToCart: (product: any, quantity?: number) => void
}

export default function Recommendations({ recommendations, onAddToCart }: RecommendationsProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Recommended for You</h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {recommendations.map((product) => (
          <div key={product.id} className="group">
            <div className="relative bg-gray-50 rounded-lg p-3 hover:shadow-md transition-shadow">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-20 object-cover rounded mb-2"
                />
              ) : (
                <div className="w-full h-20 bg-gray-200 rounded mb-2 flex items-center justify-center">
                  <span className="text-xs text-gray-400">No image</span>
                </div>
              )}

              <h4 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                {product.name}
              </h4>

              <p className="text-xs text-gray-500 mb-2">{product.shop.name}</p>

              <div className="flex items-center justify-between mb-2">
                {product.discountPrice ? (
                  <div className="flex items-center space-x-1">
                    <span className="text-sm font-bold text-primary-600">
                      ₹{product.discountPrice}
                    </span>
                    <span className="text-xs text-gray-500 line-through">
                      ₹{product.price}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-primary-600">
                    ₹{product.price}
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-400 mb-2 italic">
                {product.reason}
              </p>

              <button
                onClick={() => onAddToCart(product)}
                className="w-full btn-primary text-xs py-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FiPlus className="h-3 w-3 inline mr-1" />
                Add
              </button>
            </div>
          </div>
        ))}
      </div>

      {recommendations.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
            No recommendations available yet. Start shopping to get personalized suggestions!
          </p>
        </div>
      )}
    </div>
  )
}