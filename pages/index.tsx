import { useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";

export default function HomePage() {
  const router = useRouter();

  // Redirect to menu page after a short delay to show the landing page
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/menu");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen gradient-cool flex items-center justify-center p-4">
      <div className="text-center max-w-4xl mx-auto">
        {/* Logo */}
        <div className="mb-8 animate-bounce-soft">
          <div className="w-24 h-24 mx-auto gradient-primary rounded-full flex items-center justify-center shadow-large">
            <span className="text-white text-3xl font-bold">LT</span>
          </div>
        </div>

        {/* Main heading */}
        <div className="mb-12 animate-fade-in">
          <h1 className="text-6xl md:text-7xl font-extrabold text-neutral-900 mb-6 tracking-tight">
            Lunch Tomorrow
          </h1>

          <p className="text-xl md:text-2xl text-neutral-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            Order your lunch today for delivery tomorrow. Fresh, delicious meals delivered right to your door.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 animate-slide-up">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-medium hover:shadow-large transition-all duration-300 hover:-translate-y-1">
            <CardContent className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">🍽️</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Fresh Daily Menus</h3>
              <p className="text-neutral-600">Curated meals prepared fresh every day with locally sourced ingredients</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-medium hover:shadow-large transition-all duration-300 hover:-translate-y-1">
            <CardContent className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-secondary-100 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">📍</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Smart Delivery</h3>
              <p className="text-neutral-600">Geographic delivery zones with real-time availability checking</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-medium hover:shadow-large transition-all duration-300 hover:-translate-y-1">
            <CardContent className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-brand-100 rounded-2xl flex items-center justify-center">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-3">Secure Payments</h3>
              <p className="text-neutral-600">Safe checkout with saved payment methods and instant confirmation</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 animate-slide-up">
          <Link href="/menu">
            <Button size="lg" className="gradient-primary text-white font-semibold px-8 py-4 rounded-2xl shadow-large hover:shadow-xl transform hover:scale-105 transition-all duration-300">
              View Today&apos;s Menu
            </Button>
          </Link>

          <Link href="/login">
            <Button variant="outline" size="lg" className="bg-white/90 backdrop-blur-sm text-neutral-700 font-semibold px-8 py-4 rounded-2xl border-neutral-200 hover:bg-white hover:shadow-large transform hover:scale-105 transition-all duration-300">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Auto-redirect notice */}
        <div className="animate-fade-in">
          <p className="text-neutral-500 text-sm">
            Redirecting to menu in a few seconds...
          </p>
        </div>
      </div>
    </div>
  );
}
