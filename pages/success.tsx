import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { cleanAddressForDisplay } from "@/utils/addressDisplay";

interface Order {
  id: number;
  order_date: string; // This is actually the delivery date
  delivery_window: string;
  menu_items: Array<{
    name: string;
    quantity: number;
    price_cents: number;
  }>;
  total_amount: number;
  tip_amount?: number;
  address: string;
  delivery_notes?: string;
  status: string;
  created_at: string;
}

export default function SuccessPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session
  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    }
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchLatestOrder() {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get the most recent order for this user
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error('Error fetching order:', error);
        } else {
          setOrder(data);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLatestOrder();
  }, [session]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateSubtotal = () => {
    if (!order?.menu_items) return 0;
    return order.menu_items.reduce((sum, item) => sum + (item.price_cents * item.quantity), 0) / 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center animate-spin">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-400 to-green-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
            <p className="text-lg opacity-90">
              Thank you for your order. We'll prepare your fresh lunch for delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {order ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Order Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Order #{order.id}</h2>
                  <p className="text-sm text-gray-600">
                    Placed on {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    {order.status === 'paid' ? 'Confirmed' : order.status}
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Delivery Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Date:</span>
                  <span className="font-medium">{formatDate(order.order_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time Window:</span>
                  <span className="font-medium">{order.delivery_window}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Address:</span>
                  <span className="font-medium text-right">{cleanAddressForDisplay(order.address)}</span>
                </div>
                {order.delivery_notes && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Notes:</span>
                    <span className="font-medium text-right">{order.delivery_notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">Order Items</h3>
              <div className="space-y-3">
                {order.menu_items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-600">Quantity: {item.quantity}</div>
                    </div>
                    <div className="font-medium">
                      ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Total */}
            <div className="px-6 py-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                {order.tip_amount && order.tip_amount > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tip</span>
                    <span>${order.tip_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>${order.total_amount ? order.total_amount.toFixed(2) : calculateSubtotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg font-medium">No recent order found</p>
              <p className="text-sm">Your order details may take a moment to appear.</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push('/menu')}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Order Again
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>

        {/* Additional Information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• We'll prepare your fresh lunch on the delivery date</li>
                <li>• You&apos;ll receive updates about your order status</li>
                <li>• Our delivery team will arrive during your selected time window</li>
                <li>• Enjoy your delicious meal!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
