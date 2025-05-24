import React from 'react';
import { UserProfile } from '../utils/userUtils';

interface CallNotificationProps {
  caller: UserProfile;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

const CallNotification: React.FC<CallNotificationProps> = ({
  caller,
  callType,
  onAccept,
  onReject,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            {caller.photoURL ? (
              <img
                src={caller.photoURL}
                alt={caller.displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl text-gray-500 dark:text-gray-400">
                {caller.displayName?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Incoming {callType === 'video' ? 'Video' : 'Audio'} Call
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {caller.displayName} is calling...
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={onReject}
              className="p-3 rounded-full bg-red-500 hover:bg-red-600"
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
                  d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                />
              </svg>
            </button>
            <button
              onClick={onAccept}
              className="p-3 rounded-full bg-green-500 hover:bg-green-600"
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallNotification; 