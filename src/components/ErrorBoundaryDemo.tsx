import React, { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Component that can throw an error for testing
function BuggyComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('This is a test error to demonstrate error boundaries!');
  }

  return (
    <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
      <h3 className="text-green-800 font-semibold mb-2">✅ Component Working</h3>
      <p className="text-green-700">This component is working normally.</p>
    </div>
  );
}

// Demo component to test error boundaries
export default function ErrorBoundaryDemo() {
  const [shouldThrow, setShouldThrow] = useState(false);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Error Boundary Demo
        </h2>
        <p className="text-gray-600 mb-6">
          Click the button below to trigger an error and see how the error boundary handles it gracefully.
        </p>
      </div>

      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={() => setShouldThrow(false)}
          className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${
            !shouldThrow
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Normal State
        </button>

        <button
          onClick={() => setShouldThrow(true)}
          className={`px-4 py-2 rounded-lg font-medium transition duration-200 ${
            shouldThrow
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Trigger Error
        </button>
      </div>

      <ErrorBoundary
        onError={(error, errorInfo) => {
          console.log('Demo error caught:', error, errorInfo);
        }}
      >
        <BuggyComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-blue-800 font-semibold mb-2">How it works:</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• When &quot;Normal State&quot; is selected, the component renders successfully</li>
          <li>• When &quot;Trigger Error&quot; is clicked, the component throws an error</li>
          <li>• The ErrorBoundary catches the error and shows a fallback UI</li>
          <li>• Users can retry or refresh without the entire app crashing</li>
          <li>• In development, you&apos;ll see error details for debugging</li>
        </ul>
      </div>
    </div>
  );
}
