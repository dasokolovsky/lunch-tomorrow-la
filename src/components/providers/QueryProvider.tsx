import React, { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import QueryPerformanceMonitor from '@/components/dev/QueryPerformanceMonitor';

interface QueryProviderProps {
  children: React.ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development and on client side */}
      {isClient && process.env.NODE_ENV === 'development' && (
        <>
          <ReactQueryDevtools
            initialIsOpen={false}
          />
          <QueryPerformanceMonitor />
        </>
      )}
    </QueryClientProvider>
  );
}
