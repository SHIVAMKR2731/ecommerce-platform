import { useQuery } from 'react-query'
import { FiPlus, FiMinus } from 'react-icons/fi'
import api from '../../lib/api'

interface Product {
  id: string
  name: string
  description?: string
  price: number
  discountPrice?: number
  imageUrl?: string
  category: string
  inStock: boolean
  stockQuantity: number
  shop: {
    name: string
  }
}

interface ProductGridProps {
  shopId: string
  onAddToCart: (product: Product, quantity?: number) => void
}

export default function ProductGrid({ shopId, onAddToCart }: ProductGridProps) {
  const { data: products, isLoading } = useQuery(
    ['products', shopId],
    async () => {
      const response = await api.get(`/api/products/shop/${shopId}`)
      return response.data.data
    }
  )

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow animate-pulse">
            <div className="h-48 bg-gray-200 rounded-t-lg"></div>
            <div className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products?.map((product: Product) => (
        <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}

          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
            {product.description && (
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                {product.description}
              </p>
            )}

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {product.discountPrice ? (
                  <>
                    <span className="text-lg font-bold text-primary-600">
                      ₹{product.discountPrice}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      ₹{product.price}
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-bold text-primary-600">
                    ₹{product.price}
                  </span>
                )}
              </div>

              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {product.category}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-sm ${product.inStock ? 'text-green-600' : 'text-red-600'}`}>
                {product.inStock ? `${product.stockQuantity} in stock` : 'Out of stock'}
              </span>

              {product.inStock && (
                <button
                  onClick={() => onAddToCart(product)}
                  className="btn-primary text-sm px-3 py-1"
                >
                  Add to Cart
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {products?.length === 0 && (
        <div className="col-span-full text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No products available
          </h3>
          <p className="text-gray-500">
            This shop doesn't have any products listed yet
          </p>
        </div>
      )}
    </div>
  )
}