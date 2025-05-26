import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/utils/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import type { CartItem } from '@/types';
import { loadCart, saveCart, loadDeliveryWindow, saveDeliveryWindow } from '@/utils/localStorage';
import { getSavedAddress } from '@/utils/addressStorage';
import { getBestAddressForDisplay } from '@/utils/addressDisplay';
import { parseUSAddress } from '@/utils/geolocation';
import { getDeliveryInfo } from '@/utils/zoneCheck';

export function useCartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedWindow, setSelectedWindow] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  // Load cart and session on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Load cart from localStorage
      const loadedCart = loadCart();
      const loadedWindow = loadDeliveryWindow();
      
      if (loadedCart.length > 0) {
        setCart(loadedCart);
      }
      if (loadedWindow) {
        setSelectedWindow(loadedWindow);
      }

      // Get session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setSessionLoading(false);
      setHasMounted(true);
    };

    loadInitialData();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setSessionLoading(false);
      }
    );

    return () => subscription.unsubscribe();
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

  const updateQuantity = useCallback((itemId: number, newQuantity: number, deliveryDate: string) => {
    setCart(prev => {
      if (newQuantity <= 0) {
        return prev.filter(item => !(item.id === itemId && item.delivery_date === deliveryDate));
      }
      return prev.map(item =>
        item.id === itemId && item.delivery_date === deliveryDate
          ? { ...item, quantity: newQuantity }
          : item
      );
    });
  }, []);

  const removeItem = useCallback((itemId: number, deliveryDate: string) => {
    setCart(prev => prev.filter(item => !(item.id === itemId && item.delivery_date === deliveryDate)));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const goToMenu = useCallback(() => {
    router.push('/menu');
  }, [router]);

  const updateSelectedWindow = useCallback((window: string | null) => {
    setSelectedWindow(window);
  }, []);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price_cents * item.quantity), 0);
  const total = subtotal; // Add fees/taxes here if needed

  return {
    cart,
    selectedWindow,
    session,
    sessionLoading,
    hasMounted,
    subtotal,
    total,
    updateQuantity,
    removeItem,
    clearCart,
    goToMenu,
    updateSelectedWindow,
  };
}
