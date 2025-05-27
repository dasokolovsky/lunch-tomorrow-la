import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { cleanAddressForDisplay } from "@/utils/addressDisplay";

interface Order {
  id: number;
  user_id: string;
  order_date: string; // This is actually the delivery date
  delivery_window: string;
  menu_items: Array<{
    name: string;
    quantity: number;
    price_cents: number;
  }>;
  total_amount: number;
  tip_amount?: number;
  delivery_fee?: number;
  service_fee?: number;
  tax_amount?: number;
  address: string;
  delivery_notes?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface DeliveryWindow {
  start: string;
  end: string;
}

export default function OrderPage() {
  const router = useRouter();
  const { orderId } = router.query;
  const [order, setOrder] = useState<Order | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableWindows, setAvailableWindows] = useState<DeliveryWindow[]>([]);
  const [editingWindow, setEditingWindow] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<string>("");
  const [cancelling, setCancelling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (orderId && session) {
      fetchOrder();
    }
  }, [orderId, session]);

  const fetchOrder = async () => {
    if (!orderId || !session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching order:", error);
        setMessage({ type: 'error', text: 'Order not found or access denied.' });
        return;
      }

      setOrder(data);
      setSelectedWindow(data.delivery_window);

      // Fetch available delivery windows for the order date
      if (data.order_date) {
        fetchAvailableWindows(data.order_date);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage({ type: 'error', text: 'Failed to load order details.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableWindows = async (deliveryDate: string) => {
    try {
      const response = await fetch(`/api/delivery-windows?date=${deliveryDate}`);
      const data = await response.json();
      if (data.windows) {
        setAvailableWindows(data.windows);
      }
    } catch (error) {
      console.error("Error fetching delivery windows:", error);
    }
  };

  const canEditOrder = () => {
    if (!order) return false;

    // Can't edit if status is out_for_delivery, delivered, cancelled, or refunded
    const nonEditableStatuses = ['out_for_delivery', 'delivered', 'cancelled', 'refunded'];
    if (nonEditableStatuses.includes(order.status)) return false;

    // Check if we're before the cutoff time for the delivery date
    // For now, allow editing if status allows it - cutoff validation happens on the server
    return true;
  };

  const canCancelOrder = () => {
    if (!order) return false;

    // Can't cancel if already out for delivery, delivered, cancelled, or refunded
    const nonCancellableStatuses = ['out_for_delivery', 'delivered', 'cancelled', 'refunded'];
    return !nonCancellableStatuses.includes(order.status);
  };

  const handleUpdateWindow = async () => {
    if (!order || !selectedWindow) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_window: selectedWindow })
      });

      const result = await response.json();

      if (result.success) {
        setOrder({ ...order, delivery_window: selectedWindow });
        setEditingWindow(false);
        setMessage({ type: 'success', text: 'Delivery window updated successfully!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update delivery window.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update delivery window.' });
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !confirm('Are you sure you want to cancel this order?')) return;

    setCancelling(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (result.success) {
        setOrder({ ...order, status: 'cancelled' });
        setMessage({
          type: 'success',
          text: result.refunded ? 'Order cancelled and refund processed!' : 'Order cancelled. Refund pending admin approval.'
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to cancel order.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel order.' });
    } finally {
      setCancelling(false);
    }
  };

  const calculateSubtotal = () => {
    if (!order) return 0;
    return order.menu_items.reduce((sum, item) => sum + (item.price_cents * item.quantity), 0) / 100;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'paid': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'preparing': 'bg-yellow-100 text-yellow-800',
      'ready': 'bg-purple-100 text-purple-800',
      'out_for_delivery': 'bg-orange-100 text-orange-800',
      'delivered': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'refunded': 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'paid': 'Confirmed',
      'confirmed': 'Confirmed',
      'preparing': 'Preparing',
      'ready': 'Ready',
      'out_for_delivery': 'Out for Delivery',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled',
      'refunded': 'Refunded'
    };
    return labels[status as keyof typeof labels] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to view your order.</p>
          <button
            onClick={() => router.push('/menu')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg"
          >
            Go to Menu
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Order not found.</p>
          <button
            onClick={() => router.push('/menu')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg"
          >
            Go to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
              <p className="text-gray-600">
                Placed on {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Status</div>
              <div className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Delivery Info */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3">Delivery Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{new Date(order.order_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Time Window:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{order.delivery_window}</span>
                  {canEditOrder() && (
                    <button
                      onClick={() => setEditingWindow(true)}
                      className="text-orange-600 hover:text-orange-800 text-xs underline"
                    >
                      Edit
                    </button>
                  )}
                </div>
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
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              {order.delivery_fee && (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>${order.delivery_fee.toFixed(2)}</span>
                </div>
              )}
              {order.service_fee && (
                <div className="flex justify-between">
                  <span>Service Fee</span>
                  <span>${order.service_fee.toFixed(2)}</span>
                </div>
              )}
              {order.tip_amount && order.tip_amount > 0 && (
                <div className="flex justify-between">
                  <span>Tip</span>
                  <span>${order.tip_amount.toFixed(2)}</span>
                </div>
              )}
              {order.tax_amount && (
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${order.tax_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-semibold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>${order.total_amount ? order.total_amount.toFixed(2) : calculateSubtotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {canCancelOrder() && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Order Actions</h3>
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          </div>
        )}

        {/* Contact Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-medium text-blue-900 mb-1">Questions about your order?</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div>📧 Email: <a href="mailto:help@lunchtomorrow.la" className="underline">help@lunchtomorrow.la</a></div>
                <div>📱 Text: <a href="sms:3239005110" className="underline">(323) 900-5110</a></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Window Modal */}
      {editingWindow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Change Delivery Window</h3>
            <div className="space-y-3 mb-6">
              {availableWindows.map((window, index) => (
                <label key={index} className="flex items-center">
                  <input
                    type="radio"
                    name="window"
                    value={`${window.start}-${window.end}`}
                    checked={selectedWindow === `${window.start}-${window.end}`}
                    onChange={(e) => setSelectedWindow(e.target.value)}
                    className="mr-3"
                  />
                  <span>{window.start} - {window.end}</span>
                </label>
              ))}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleUpdateWindow}
                disabled={updating || selectedWindow === order.delivery_window}
                className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {updating ? 'Updating...' : 'Update Window'}
              </button>
              <button
                onClick={() => {
                  setEditingWindow(false);
                  setSelectedWindow(order.delivery_window);
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
