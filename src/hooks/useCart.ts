import { useState, useEffect, useCallback } from 'react';
import type { CartItem, MenuItem } from '@/types';
import { loadCart, saveCart, loadDeliveryWindow, saveDeliveryWindow } from '@/utils/localStorage';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Load cart and delivery window on client side
  useEffect(() => {
    const loadedCart = loadCart();
    const loadedWindow = loadDeliveryWindow();

    if (loadedCart.length > 0) {
      setCart(loadedCart);
    }
    if (loadedWindow) {
      setSelectedWindow(loadedWindow);
    }
    setHasMounted(true);
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (hasMounted) {
      saveCart(cart);
    }
  }, [cart, hasMounted]);

  // Save delivery window to localStorage whenever it changes
  useEffect(() => {
    if (hasMounted) {
      saveDeliveryWindow(selectedWindow);
    }
  }, [selectedWindow, hasMounted]);

  const addToCart = useCallback((item: MenuItem, deliveryDate: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.delivery_date === deliveryDate);
      const newCart = existing
        ? prev.map((i) =>
            i.id === item.id && i.delivery_date === deliveryDate
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        : [...prev, { ...item, quantity: 1, delivery_date: deliveryDate }];

      // Save immediately to prevent race condition
      saveCart(newCart);
      return newCart;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const updateSelectedWindow = useCallback((window: string | null) => {
    setSelectedWindow(window);
  }, []);

  return {
    cart,
    selectedWindow,
    hasMounted,
    addToCart,
    clearCart,
    updateSelectedWindow,
  };
}
