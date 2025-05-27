import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Additional mobile optimizations */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Lunch Tomorrow" />

        {/* Prevent text size adjustment on iOS */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />

        {/* PWA theme colors */}
        <meta name="theme-color" content="#f97316" />
        <meta name="msapplication-TileColor" content="#f97316" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* PWA splash screens for iOS */}
        <meta name="apple-mobile-web-app-title" content="Lunch Tomorrow" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://js.stripe.com" />

        {/* Service Worker registration hint */}
        <meta name="service-worker" content="/sw.js" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
