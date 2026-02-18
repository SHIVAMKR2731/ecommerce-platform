'use client'

import { useAuth } from '../lib/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import CustomerDashboard from './customer/page'
import VendorDashboard from './vendor/page'
import AdminDashboard from './admin/page'
import DeliveryDashboard from './delivery/page'

export default function Dashboard() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  switch (user.role) {
    case 'customer':
      return <CustomerDashboard />
    case 'vendor':
      return <VendorDashboard />
    case 'admin':
      return <AdminDashboard />
    case 'delivery_agent':
      return <DeliveryDashboard />
    default:
      return <CustomerDashboard />
  }
}