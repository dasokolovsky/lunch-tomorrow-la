import React from 'react';
import { useRouter } from 'next/router';

interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

// Generic section error fallback
export function SectionErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div className="mb-4">
        <svg
          className="mx-auto w-12 h-12 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-medium text-red-800 mb-2">
        Unable to load this section
      </h3>

      <p className="text-red-600 mb-4">
        {error?.message || 'An unexpected error occurred while loading this content.'}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// Menu-specific error fallback
export function MenuErrorFallback({ onRetry }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="min-h-96 bg-orange-50 border border-orange-200 rounded-lg p-8 text-center">
      <div className="mb-6">
        <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-orange-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-orange-800 mb-3">
        Menu Temporarily Unavailable
      </h2>

      <p className="text-orange-700 mb-6 max-w-md mx-auto">
        We&apos;re having trouble loading today&apos;s menu. This might be a temporary issue.
      </p>

      <div className="space-y-3 max-w-xs mx-auto">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition duration-200"
          >
            Reload Menu
          </button>
        )}

        <button
          onClick={() => router.push('/')}
          className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-200"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

// Cart-specific error fallback
export function CartErrorFallback({ onRetry }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
      <div className="mb-4">
        <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"
            />
          </svg>
        </div>
      </div>

      <h3 className="text-lg font-medium text-yellow-800 mb-2">
        Cart Error
      </h3>

      <p className="text-yellow-700 mb-4">
        There was an issue with your cart. Your items might still be saved.
      </p>

      <div className="space-y-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="block w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition duration-200"
          >
            Reload Cart
          </button>
        )}

        <button
          onClick={() => router.push('/menu')}
          className="block w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition duration-200"
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}

// Admin-specific error fallback
export function AdminErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
      <div className="mb-6">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-xl font-bold text-red-800 mb-3">
        Admin Panel Error
      </h2>

      <p className="text-red-700 mb-6">
        There was an error loading the admin interface. Please check your permissions and try again.
      </p>

      <div className="space-y-3 max-w-xs mx-auto">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition duration-200"
          >
            Retry
          </button>
        )}

        <button
          onClick={() => router.push('/')}
          className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition duration-200"
        >
          Go to Main Site
        </button>
      </div>

      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-sm text-red-500 hover:text-red-700">
            Error Details
          </summary>
          <pre className="mt-2 p-3 bg-red-100 rounded text-xs text-red-800 overflow-auto max-h-32">
            {error.toString()}
          </pre>
        </details>
      )}
    </div>
  );
}

// Payment-specific error fallback
export function PaymentErrorFallback({ onRetry }: ErrorFallbackProps) {
  const router = useRouter();

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div className="mb-4">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
      </div>

      <h3 className="text-lg font-medium text-red-800 mb-2">
        Payment System Error
      </h3>

      <p className="text-red-700 mb-4">
        We encountered an issue processing your payment. Your order has not been charged.
      </p>

      <div className="space-y-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="block w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200"
          >
            Try Payment Again
          </button>
        )}

        <button
          onClick={() => router.push('/cart')}
          className="block w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition duration-200"
        >
          Back to Cart
        </button>
      </div>
    </div>
  );
}
