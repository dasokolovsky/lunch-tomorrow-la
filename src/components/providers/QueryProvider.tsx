import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import QueryPerformanceMonitor from '@/components/dev/QueryPerformanceMonitor';

interface QueryProviderProps {
  children: React.ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && (
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
