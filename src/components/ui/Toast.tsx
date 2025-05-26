import React, { useEffect } from 'react';
import { HiCheckCircle } from 'react-icons/hi';
import { Card, CardContent } from './index';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, onClose, duration = 1500 }: ToastProps) {
  useEffect(() => {
    const timeout = setTimeout(onClose, duration);
    return () => clearTimeout(timeout);
  }, [onClose, duration]);

  return (
    <div className="fixed left-1/2 bottom-24 -translate-x-1/2 z-[2000] animate-slide-up">
      <Card className="bg-success-500 border-success-600 text-white shadow-large">
        <CardContent className="flex items-center gap-3 px-6 py-3">
          <HiCheckCircle className="text-xl flex-shrink-0" />
          <span className="font-semibold">{message}</span>
        </CardContent>
      </Card>
    </div>
  );
}
