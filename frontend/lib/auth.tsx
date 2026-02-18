'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api from './api'

interface User {
  userId: string
  email: string
  firstName: string
  lastName: string
  role: 'customer' | 'vendor' | 'admin' | 'delivery_agent'
  phoneNumber?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => void
  isLoading: boolean
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phoneNumber: string
  role: 'customer' | 'vendor' | 'admin' | 'delivery_agent'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for existing auth token on mount
    const token = localStorage.getItem('authToken')
    const savedUser = localStorage.getItem('user')

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
      }
    }

    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { email, password })
      const { token, user: userData } = response.data.data

      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)

      // Redirect based on role
      switch (userData.role) {
        case 'customer':
          router.push('/dashboard/customer')
          break
        case 'vendor':
          router.push('/dashboard/vendor')
          break
        case 'admin':
          router.push('/dashboard/admin')
          break
        case 'delivery_agent':
          router.push('/dashboard/delivery')
          break
        default:
          router.push('/dashboard')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login failed')
    }
  }

  const register = async (userData: RegisterData) => {
    try {
      const response = await api.post('/api/auth/register', userData)
      const { token, user: newUser } = response.data.data

      localStorage.setItem('authToken', token)
      localStorage.setItem('user', JSON.stringify(newUser))
      setUser(newUser)

      // Redirect based on role
      switch (newUser.role) {
        case 'customer':
          router.push('/dashboard/customer')
          break
        case 'vendor':
          router.push('/dashboard/vendor')
          break
        case 'admin':
          router.push('/dashboard/admin')
          break
        case 'delivery_agent':
          router.push('/dashboard/delivery')
          break
        default:
          router.push('/dashboard')
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed')
    }
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/auth/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}