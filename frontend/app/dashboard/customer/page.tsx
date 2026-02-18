'use client'

import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { useAuth } from '../../lib/auth'
import api from '../../lib/api'
import ShopList from '../../components/ShopList'
import ProductGrid from '../../components/ProductGrid'
import Cart from '../../components/Cart'
import LocationSelector from '../../components/LocationSelector'
import Recommendations from '../../components/Recommendations'
import { FiMapPin, FiShoppingCart, FiUser } from 'react-icons/fi'

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

interface Product {
  id: string
  name: string
  price: number
  discountPrice?: number
  imageUrl?: string
  shop: {
    name: string
  }
}

export default function CustomerDashboard() {
  const { user, logout } = useAuth()
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [cart, setCart] = useState<any[]>([])
  const [showCart, setShowCart] = useState(false)

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }, [])

  // Fetch nearby shops
  const { data: shops, isLoading: shopsLoading } = useQuery(
    ['shops', userLocation],
    async () => {
      if (!userLocation) return []
      const response = await api.get('/api/shops/nearby', {
        params: {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          radius: 5000, // 5km
        },
      })
      return response.data.data
    },
    {
      enabled: !!userLocation,
    }
  )

  // Fetch recommendations
  const { data: recommendations } = useQuery(
    ['recommendations', user?.userId, userLocation],
    async () => {
      if (!userLocation) return []
      const response = await api.get(`/api/recommendations/${user?.userId}`, {
        params: {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          limit: 10,
        },
      })
      return response.data.data
    },
    {
      enabled: !!userLocation && !!user,
    }
  )

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.productId === product.id)
      if (existingItem) {
        return prevCart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      } else {
        return [
          ...prevCart,
          {
            productId: product.id,
            name: product.name,
            price: product.discountPrice || product.price,
            quantity,
            shopName: product.shop.name,
          },
        ]
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">BazaarLink</h1>
            </div>

            <div className="flex items-center space-x-4">
              <LocationSelector
                location={userLocation}
                onLocationChange={setUserLocation}
              />

              <button
                onClick={() => setShowCart(true)}
                className="relative p-2 text-gray-600 hover:text-primary-600"
              >
                <FiShoppingCart className="h-6 w-6" />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>

              <div className="flex items-center space-x-2">
                <FiUser className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-700">{user?.firstName}</span>
              </div>

              <button
                onClick={logout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Recommended for You</h2>
                <Recommendations
                  recommendations={recommendations}
                  onAddToCart={addToCart}
                />
              </div>
            )}

            {/* Shop Selection */}
            {!selectedShop ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">Shops Near You</h2>
                {shopsLoading ? (
                  <div className="text-center py-8">Loading shops...</div>
                ) : (
                  <ShopList
                    shops={shops || []}
                    onShopSelect={setSelectedShop}
                  />
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">
                    Products from {selectedShop.name}
                  </h2>
                  <button
                    onClick={() => setSelectedShop(null)}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    ← Back to shops
                  </button>
                </div>
                <ProductGrid
                  shopId={selectedShop.id}
                  onAddToCart={addToCart}
                />
              </div>
            )}
          </div>

          {/* Sidebar - Cart Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sticky top-4">
              <h3 className="font-semibold mb-4">Your Cart</h3>
              {cart.length === 0 ? (
                <p className="text-gray-500 text-sm">Your cart is empty</p>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="truncate">{item.name}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>
                        ₹{cart.reduce((total, item) => total + item.price * item.quantity, 0)}
                      </span>
                    </div>
                  </div>
                  <button className="w-full btn-primary mt-4">
                    Proceed to Checkout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cart Modal */}
      {showCart && (
        <Cart
          cart={cart}
          onClose={() => setShowCart(false)}
          onUpdateCart={setCart}
        />
      )}
    </div>
  )
}