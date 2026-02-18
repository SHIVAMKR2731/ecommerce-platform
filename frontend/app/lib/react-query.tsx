'use client'

import { QueryClient, QueryClientProvider as RQProvider } from 'react-query'
import { useState } from 'react'

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            cacheTime: 10 * 60 * 1000, // 10 minutes
          },
        },
      })
  )

  return <RQProvider client={queryClient}>{children}</RQProvider>
}