import React from 'react';
import { UserProfile } from '../utils/userUtils';

interface IncomingCallNotificationProps {
  caller: UserProfile;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallNotification: React.FC<IncomingCallNotificationProps> = ({
  caller,
  callType,
  onAccept,
  onReject,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex flex-col items-center">
          {/* Caller's Profile Picture */}
          <div className="w-24 h-24 rounded-full overflow-hidden mb-4">
            <img
              src={caller.photoURL || '/default-avatar.png'}
              alt={caller.displayName}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Caller's Name */}
          <h2 className="text-xl font-semibold mb-2">{caller.displayName}</h2>

          {/* Call Type */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Incoming {callType} call...
          </p>

          {/* Call Controls */}
          <div className="flex space-x-4">
            {/* Accept Button */}
            <button
              onClick={onAccept}
              className="p-4 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.517l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </button>

            {/* Reject Button */}
            <button
              onClick={onReject}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification; 