import { useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { formatPhoneNumber, formatPhoneForAuth, isValidUSPhoneNumber } from '@/utils/phoneFormatter';

interface MenuUpdatesSignupProps {
  onSuccess?: () => void;
}

export default function MenuUpdatesSignup({ onSuccess }: MenuUpdatesSignupProps) {
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState<'phone' | 'verification' | 'success'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format as (XXX) XXX-XXXX
    if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else {
      return digits;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  // Remove the duplicate function since we're using the utility
  // const getCleanPhoneNumber = (formattedPhone: string) => {
  //   const digits = formattedPhone.replace(/\D/g, '');
  //   return digits.length === 10 ? `+1${digits}` : '';
  // };

  const handleSendCode = async () => {
    if (!isValidUSPhoneNumber(phone)) {
      setError('Please enter a valid US phone number');
      return;
    }

    const cleanPhone = formatPhoneForAuth(phone);

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: cleanPhone,
        options: {
          channel: 'sms'
        }
      });

      if (error) {
        setError(error.message);
      } else {
        setStep('verification');
      }
    } catch {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isValidUSPhoneNumber(phone) || !verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    const cleanPhone = formatPhoneForAuth(phone);

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: cleanPhone,
        token: verificationCode,
        type: 'sms'
      });

      if (error) {
        setError(error.message);
      } else {
        setStep('success');
        onSuccess?.();
      }
    } catch {
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  if (step === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-green-900 mb-2">You're all set!</h3>
        <p className="text-green-700">
          We&apos;ll send you a text message when new menus are available.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="text-center mb-4">
        <div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 3h16a1 1 0 011 1v12a1 1 0 01-1 1H5l-4 4V4a1 1 0 011-1z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Get notified when we're back!</h3>
        <p className="text-blue-700 text-sm">
          Sign up to receive a text message when new menus are available.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {step === 'phone' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              onKeyPress={(e) => handleKeyPress(e, handleSendCode)}
              placeholder="(555) 123-4567"
              maxLength={14}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleSendCode}
            disabled={loading || !phone}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </div>
            ) : (
              'Send Verification Code'
            )}
          </button>
        </div>
      )}

      {step === 'verification' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <p className="text-sm text-gray-600 mb-2">
              Enter the 6-digit code sent to {phone}
            </p>
            <input
              type="text"
              id="code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyPress={(e) => handleKeyPress(e, handleVerifyCode)}
              placeholder="123456"
              maxLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setStep('phone')}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleVerifyCode}
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </div>
              ) : (
                'Verify & Sign Up'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
