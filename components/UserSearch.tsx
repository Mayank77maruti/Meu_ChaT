"use client";
import { useState, useEffect, useRef } from 'react';
import { UserProfile, searchUsers } from '../utils/userUtils';
import { createChat } from '../utils/chatUtils';
import { useRouter } from 'next/navigation';

export default function UserSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    if (searchTerm.trim()) {
      setIsSearching(true);
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      searchTimeout.current = setTimeout(async () => {
        const results = await searchUsers(searchTerm);
        setSearchResults(results);
        setIsSearching(false);
      }, 300);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchTerm]);

  const handleStartChat = async (userId: string) => {
    try {
      const chatId = await createChat(userId);
      setSearchTerm('');
      setShowResults(false);
      router.push(`/chat?chatId=${chatId}`);
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search users..."
          className="w-full p-2 pl-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <svg
          className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {showResults && (searchTerm.trim() || isSearching) && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              {searchResults.map((user) => (
                <button
                  key={user.uid}
                  onClick={() => handleStartChat(user.uid)}
                  className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg text-gray-500 dark:text-gray-400">
                        {user.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.displayName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
} 