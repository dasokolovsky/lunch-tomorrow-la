// Core application types

export interface MenuItem {
  id: number;
  menu_id: number;
  name: string;
  description: string;
  price_cents: number;
  image_url: string | null;
  position: number;
}

export interface CartItem extends MenuItem {
  quantity: number;
  delivery_date?: string; // ISO date string (YYYY-MM-DD)
}

export interface Menu {
  id: number;
  date: string;
  created_at?: string;
}

export interface MenuItemWithMenu extends MenuItem {
  menus: Menu[];
}

// User and Profile types
export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  stripe_customer_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Order types
export interface Order {
  id: number;
  user_id: string;
  menu_items: CartItem[];
  order_date: string; // NOTE: This is actually the delivery date (YYYY-MM-DD format)
  delivery_window: string;
  address: string;
  tip_amount?: number;
  delivery_fee?: number;
  service_fee?: number;
  tax_amount?: number;
  total_amount?: number;
  status: 'pending' | 'paid' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded';
  stripe_payment_id: string;
  created_at: string; // Actual order creation timestamp
  updated_at?: string;
  lat?: string;
  lon?: string;
  delivery_notes?: string;
}

// Delivery Zone types
export interface DeliveryWindow {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

export interface DeliveryZone {
  id?: string;
  name: string;
  geojson: GeoJSON.Feature | GeoJSON.FeatureCollection | GeoJSON.Geometry;
  windows: Record<string, DeliveryWindow[]>; // day of week -> time windows
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Geographic types
export interface Coordinates {
  lat: number;
  lon: number;
}

export interface UserLocation extends Coordinates {
  address?: string;
}

// Component prop types
export interface LeafletMapUserProps {
  zones: DeliveryZone[];
  userLoc?: UserLocation | null;
  highlightZone?: string | null;
}

export interface ZoneFormProps {
  editingZone?: DeliveryZone | null;
  onDone: () => void;
  existingZones: DeliveryZone[];
}

// API Response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success?: boolean;
}

export interface StripePaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

// Form types
export interface CheckoutForm {
  address: string;
  deliveryWindow: string;
  tipAmount: number;
  saveCard: boolean;
}

export interface LoginForm {
  phone: string;
  otp: string;
}

// SMS types
export interface SMSBlastRequest {
  phones: string[];
  message: string;
}

export interface SMSBlastResponse {
  success: boolean;
  count?: number;
  error?: string;
}

// Error types
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
}
