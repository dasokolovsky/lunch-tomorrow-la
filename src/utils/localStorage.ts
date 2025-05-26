import type { CartItem } from '@/types';

// Generic localStorage utility functions
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key} to localStorage:`, error);
  }
}

export function removeStorageItem(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove ${key} from localStorage:`, error);
  }
}

// Specific cart utilities
export function loadCart(): CartItem[] {
  return getStorageItem<CartItem[]>("cart", []);
}

export function saveCart(cart: CartItem[]): void {
  setStorageItem("cart", cart);
}

// Specific delivery window utilities
export function loadDeliveryWindow(): string | null {
  return getStorageItem<string | null>("delivery_window", null);
}

export function saveDeliveryWindow(window: string | null): void {
  if (window) {
    setStorageItem("delivery_window", window);
  } else {
    removeStorageItem("delivery_window");
  }
}

// User preferences utilities
export function getUserPreference<T>(key: string, defaultValue: T): T {
  return getStorageItem(`user_pref_${key}`, defaultValue);
}

export function setUserPreference<T>(key: string, value: T): void {
  setStorageItem(`user_pref_${key}`, value);
}
