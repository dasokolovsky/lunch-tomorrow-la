import "@/styles/globals.css";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import ErrorBoundary from "@/components/ErrorBoundary";
import QueryProvider from "@/components/providers/QueryProvider";
import OfflineIndicator, { PWAInstallPrompt, UpdatePrompt } from "@/components/ui/OfflineIndicator";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import type { AppProps } from "next/app";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Error logging function for production
function logError(error: Error, errorInfo: React.ErrorInfo) {
  console.error('Application Error:', error, errorInfo);

  // In production, you might want to send to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Sentry, LogRocket, etc.
    // Sentry.captureException(error, { contexts: { react: errorInfo } });
  }
}

// App wrapper component with service worker integration
function AppWrapper({ Component, pageProps, router }: AppProps) {
  const { canInstall, showUpdatePrompt, actions } = useServiceWorker();

  return (
    <>
      <Component {...pageProps} />

      {/* Offline/Online indicator */}
      <OfflineIndicator />

      {/* PWA install prompt */}
      {canInstall && (
        <PWAInstallPrompt
          onInstall={actions.installPWA}
          onDismiss={() => {/* Handle dismiss */}}
        />
      )}

      {/* Service worker update prompt */}
      {showUpdatePrompt && (
        <UpdatePrompt
          onUpdate={actions.activateUpdate}
          onDismiss={actions.dismissUpdate}
        />
      )}
    </>
  );
}

export default function App({ Component, pageProps, router }: AppProps) {
  const elementsOptions = {
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#f97316', // Orange-500
        colorBackground: '#ffffff',
        colorText: '#374151', // Gray-700
        colorDanger: '#ef4444', // Red-500
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <QueryProvider>
      <ErrorBoundary onError={logError}>
        <Elements stripe={stripePromise} options={elementsOptions}>
          <AppWrapper Component={Component} pageProps={pageProps} router={router} />
        </Elements>
      </ErrorBoundary>
    </QueryProvider>
  );
}