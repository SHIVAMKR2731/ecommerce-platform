import { useState } from 'react'
import { FiX, FiPlus, FiMinus, FiTrash2 } from 'react-icons/fi'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  shopName: string
}

interface CartProps {
  cart: CartItem[]
  onClose: () => void
  onUpdateCart: (cart: CartItem[]) => void
}

export default function Cart({ cart, onClose, onUpdateCart }: CartProps) {
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId)
      return
    }

    onUpdateCart(
      cart.map((item) =>
        item.productId === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }

  const removeItem = (productId: string) => {
    onUpdateCart(cart.filter((item) => item.productId !== productId))
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = total > 500 ? 0 : 40 // Free delivery above ₹500
  const finalTotal = total + deliveryFee

  const handleCheckout = async () => {
    setIsCheckingOut(true)
    // TODO: Implement checkout logic
    setTimeout(() => {
      setIsCheckingOut(false)
      alert('Checkout functionality will be implemented')
    }, 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Your Cart</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 max-h-96">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{item.name}</h3>
                    <p className="text-xs text-gray-500">{item.shopName}</p>
                    <p className="text-sm font-semibold text-primary-600">
                      ₹{item.price}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <FiMinus className="h-4 w-4" />
                    </button>

                    <span className="w-8 text-center text-sm">{item.quantity}</span>

                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <FiPlus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.productId)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t p-4">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee</span>
                <span>₹{deliveryFee}</span>
              </div>
              {deliveryFee > 0 && (
                <p className="text-xs text-gray-500">
                  Free delivery on orders above ₹500
                </p>
              )}
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total</span>
                <span>₹{finalTotal}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut}
              className="w-full btn-primary disabled:opacity-50"
            >
              {isCheckingOut ? 'Processing...' : 'Proceed to Checkout'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}