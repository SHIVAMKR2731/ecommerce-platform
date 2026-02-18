'use client'

import { QueryClient, QueryClientProvider as RQProvider } from 'react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401) return false
        return failureCount < 3
      },
    },
  },
})

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  return <RQProvider client={queryClient}>{children}</RQProvider>
}