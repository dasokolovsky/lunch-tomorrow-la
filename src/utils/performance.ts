import React from 'react';

// Performance monitoring utilities

export function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();

  try {
    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => {
        const end = performance.now();
        console.log(`⚡ ${name} took ${(end - start).toFixed(2)}ms`);
      });
    } else {
      const end = performance.now();
      console.log(`⚡ ${name} took ${(end - start).toFixed(2)}ms`);
      return result;
    }
  } catch (error) {
    const end = performance.now();
    console.error(`❌ ${name} failed after ${(end - start).toFixed(2)}ms:`, error);
    throw error;
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Bundle size analyzer
export function logBundleSize() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        console.log('📦 Bundle Performance:', {
          'DOM Content Loaded': `${navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart}ms`,
          'Load Complete': `${navigation.loadEventEnd - navigation.loadEventStart}ms`,
          'Transfer Size': `${navigation.transferSize} bytes`,
          'Encoded Body Size': `${navigation.encodedBodySize} bytes`,
          'Decoded Body Size': `${navigation.decodedBodySize} bytes`
        });
      }
    });
  }
}

// Memory usage monitoring
export function logMemoryUsage() {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
    const memory = (performance as any).memory;
    console.log('🧠 Memory Usage:', {
      'Used JS Heap Size': `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
      'Total JS Heap Size': `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
      'JS Heap Size Limit': `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
    });
  }
}

// Component render tracking
export function useRenderCount(componentName: string) {
  const renderCount = React.useRef(0);
  renderCount.current++;

  React.useEffect(() => {
    console.log(`🔄 ${componentName} rendered ${renderCount.current} times`);
  });

  return renderCount.current;
}

// Lazy loading utility
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  const LazyComponent = React.lazy(importFn);

  return React.forwardRef<any, React.ComponentProps<T>>((props, ref) => (
    <React.Suspense fallback={fallback ? React.createElement(fallback) : <div>Loading...</div>}>
      <LazyComponent {...props} ref={ref} />
    </React.Suspense>
  ));
}
