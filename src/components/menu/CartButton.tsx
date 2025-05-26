import React from 'react';
import type { CartItem } from '@/types';

interface CartButtonProps {
  cart: CartItem[];
  hasMounted: boolean;
  onGoToCart: () => void;
}

export default function CartButton({ cart, hasMounted, onGoToCart }: CartButtonProps) {
  if (!hasMounted || cart.length === 0) {
    return null;
  }

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Full-width Cart Button - Mobile Design */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={onGoToCart}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>View Cart ({cart.length} items)</span>
            <span className="bg-white text-red-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
              {totalItems}
            </span>
          </button>
        </div>
      </div>

      {/* Add bottom padding when cart button is visible */}
      <div className="h-20"></div>
    </>
  );
}
