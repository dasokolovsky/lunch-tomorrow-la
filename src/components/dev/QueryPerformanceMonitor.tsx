import React, { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface QueryStats {
  totalQueries: number;
  staleQueries: number;
  fetchingQueries: number;
  errorQueries: number;
  successQueries: number;
  cacheHitRate: number;
  averageQueryTime: number;
}

export default function QueryPerformanceMonitor() {
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<QueryStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const updateStats = () => {
      const cache = queryClient.getQueryCache();
      const queries = cache.getAll();

      const totalQueries = queries.length;
      const staleQueries = queries.filter(q => q.isStale()).length;
      const fetchingQueries = queries.filter(q => q.state.fetchStatus === 'fetching').length;
      const errorQueries = queries.filter(q => q.state.status === 'error').length;
      const successQueries = queries.filter(q => q.state.status === 'success').length;

      // Calculate cache hit rate (approximate)
      const cacheHitRate = totalQueries > 0 ? (successQueries / totalQueries) * 100 : 0;

      // Calculate average query time (from successful queries)
      const queryTimes = queries
        .filter(q => q.state.status === 'success' && q.state.dataUpdatedAt)
        .map(q => q.state.dataUpdatedAt - (q.state.fetchFailureCount > 0 ? 0 : q.state.dataUpdatedAt));

      const averageQueryTime = queryTimes.length > 0
        ? queryTimes.reduce((sum, time) => sum + time, 0) / queryTimes.length
        : 0;

      setStats({
        totalQueries,
        staleQueries,
        fetchingQueries,
        errorQueries,
        successQueries,
        cacheHitRate,
        averageQueryTime,
      });
    };

    // Update stats every 2 seconds
    const interval = setInterval(updateStats, 2000);
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, [queryClient]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development' || !stats) {
    return null;
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 z-[9999] bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg transition-colors"
        title="Toggle Query Performance Monitor"
      >
        📊 RQ Stats
      </button>

      {/* Stats panel */}
      {isVisible && (
        <div className="fixed bottom-16 left-4 z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-4 text-xs font-mono max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-purple-600">React Query Stats</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Total Queries:</span>
              <span className="font-bold">{stats.totalQueries}</span>
            </div>

            <div className="flex justify-between">
              <span>Success:</span>
              <span className="text-green-600 font-bold">{stats.successQueries}</span>
            </div>

            <div className="flex justify-between">
              <span>Fetching:</span>
              <span className="text-blue-600 font-bold">{stats.fetchingQueries}</span>
            </div>

            <div className="flex justify-between">
              <span>Stale:</span>
              <span className="text-yellow-600 font-bold">{stats.staleQueries}</span>
            </div>

            <div className="flex justify-between">
              <span>Errors:</span>
              <span className="text-red-600 font-bold">{stats.errorQueries}</span>
            </div>

            <div className="flex justify-between">
              <span>Cache Hit Rate:</span>
              <span className="font-bold">{stats.cacheHitRate.toFixed(1)}%</span>
            </div>

            <div className="border-t pt-2 mt-2">
              <div className="text-center text-gray-500">
                Performance Indicators
              </div>

              <div className="mt-1">
                <div className="flex justify-between">
                  <span>Cache Health:</span>
                  <span className={`font-bold ${
                    stats.cacheHitRate > 80 ? 'text-green-600' :
                    stats.cacheHitRate > 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stats.cacheHitRate > 80 ? '🟢 Good' :
                     stats.cacheHitRate > 60 ? '🟡 Fair' : '🔴 Poor'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Error Rate:</span>
                  <span className={`font-bold ${
                    stats.errorQueries === 0 ? 'text-green-600' :
                    stats.errorQueries < 3 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stats.errorQueries === 0 ? '🟢 None' :
                     stats.errorQueries < 3 ? '🟡 Low' : '🔴 High'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t pt-2 mt-2">
              <button
                onClick={() => {
                  queryClient.clear();
                  console.log('🗑️ Query cache cleared');
                }}
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded text-xs transition-colors"
              >
                Clear Cache
              </button>

              <button
                onClick={() => {
                  queryClient.invalidateQueries();
                  console.log('🔄 All queries invalidated');
                }}
                className="w-full mt-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs transition-colors"
              >
                Invalidate All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
