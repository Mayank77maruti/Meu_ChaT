"use client";
import { useState, useEffect, useRef } from 'react';
import { UserProfile, searchUsers } from '../utils/userUtils';
import { createChat, searchMessages, Message, Chat, getChats, searchGroups } from '../utils/chatUtils';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase';

interface SearchResult {
  type: 'user' | 'message' | 'group';
  user?: UserProfile;
  message?: Message;
  chatId?: string;
  chatName?: string;
  isGroup?: boolean;
  participantInfo?: {
    uid: string;
    displayName: string;
    photoURL?: string;
    online?: boolean;
  };
}

export default function UserSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isRetrievingMessage, setIsRetrievingMessage] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const router = useRouter();
  const pathname = usePathname();
  const [user] = useAuthState(auth);
  const [chats, setChats] = useState<Chat[]>([]);

  // Subscribe to chats
  useEffect(() => {
    if (!user) return;

    const unsubscribeChats = getChats((updatedChats: Chat[]) => {
      setChats(updatedChats);
    });

    return () => {
      unsubscribeChats?.();
    };
  }, [user]);

  // Clear loading state when pathname changes
  useEffect(() => {
    setIsRetrievingMessage(false);
  }, [pathname]);

  useEffect(() => {
    if (searchTerm.trim()) {
      setIsSearching(true);
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      searchTimeout.current = setTimeout(async () => {
        const lowerSearch = searchTerm.toLowerCase();
        const [userResults, messageResults, groupResults] = await Promise.all([
          searchUsers(searchTerm),
          searchMessages(searchTerm),
          searchGroups(searchTerm)
        ]);

        // Filter users case-insensitively
        const filteredUsers = userResults.filter(user =>
          user.displayName && user.displayName.toLowerCase().includes(lowerSearch)
        );

        // Filter messages case-insensitively
        const filteredMessages = messageResults.filter(({ message }) =>
          message.text && message.text.toLowerCase().includes(lowerSearch)
        );

        // Map group results to SearchResult type
        const groupSearchResults: SearchResult[] = groupResults.map(group => ({
          type: 'group' as const,
          chatId: group.id,
          chatName: group.name,
          isGroup: true
        }));

        const combinedResults: SearchResult[] = [
          ...filteredUsers.map(user => ({ type: 'user' as const, user })),
          ...filteredMessages.map(({ message, chatId, chatName, isGroup, participantInfo }) => ({
            type: 'message' as const,
            message,
            chatId,
            chatName,
            isGroup,
            participantInfo
          })),
          ...groupSearchResults
        ];

        setSearchResults(combinedResults);
        setIsSearching(false);
      }, 300);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchTerm]);

  const handleMessageClick = async (chatId: string, messageId: string) => {
    console.log('Starting message click handler');
    try {
      console.log('Setting loading state to true');
      setIsRetrievingMessage(true);
      setSearchTerm('');
      setShowResults(false);
      
      console.log('Navigating to chat with messageId');
      // Navigate to chat with messageId in a single step
      await router.push(`/chat?chatId=${chatId}&messageId=${messageId}`);
      
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error navigating to message:', error);
    } finally {
      console.log('Setting loading state to false');
      setIsRetrievingMessage(false);
    }
  };

  const handleStartChat = async (selectedUser: UserProfile) => {
    if (!selectedUser || !selectedUser.uid || !user?.uid) return;
    setIsRetrievingMessage(true);
    setSearchTerm("");
    setShowResults(false);
    try {
      const existingChat = chats.find(chat =>
        !chat.isGroup &&
        chat.participants.includes(selectedUser.uid) &&
        chat.participants.includes(user.uid)
      );

      if (existingChat) {
        await router.push(`/chat?chatId=${existingChat.id}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return;
      }

      const chatId = await createChat(selectedUser.uid);
      if (chatId) {
        await router.push(`/chat?chatId=${chatId}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally {
      setIsRetrievingMessage(false);
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
          placeholder="Search users and messages..."
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

      {isRetrievingMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center space-x-3 shadow-lg">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
            <span className="text-gray-900 dark:text-white font-medium">Redirecting...</span>
          </div>
        </div>
      )}

      {showResults && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              {searchResults.map((result, index) => (
                result.type === 'user' ? (
                  <button
                    key={`user-${result.user?.uid}`}
                    onClick={() => handleStartChat(result.user!)}
                    className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                      {result.user?.photoURL ? (
                        <img
                          src={result.user.photoURL}
                          alt={result.user.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg text-gray-500 dark:text-gray-400">
                          {result.user?.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {result.user?.displayName}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {result.user?.online ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </button>
                ) : result.type === 'group' ? (
                  <button
                    key={`group-${result.chatId}`}
                    onClick={() => handleMessageClick(result.chatId!, '')}
                    className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {result.chatName || 'Group'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Group Chat
                      </p>
                    </div>
                  </button>
                ) : (
                  <button
                    key={`message-${result.message?.id}`}
                    onClick={() => {
                      console.log('Message result clicked:', result.message?.id);
                      handleMessageClick(result.chatId!, result.message!.id);
                    }}
                    className="w-full p-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 text-left"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                      {!result.isGroup && result.participantInfo?.photoURL ? (
                        <img
                          src={result.participantInfo.photoURL}
                          alt={result.participantInfo.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {result.isGroup ? (
                            <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          ) : (
                            <span className="text-lg text-gray-500 dark:text-gray-400">
                              {result.participantInfo?.displayName?.[0]?.toUpperCase() || '?'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {result.isGroup ? 'Group: ' : ''}{result.chatName || 'Unknown'}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(result.message?.timestamp || 0).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {result.message?.text}
                      </p>
                    </div>
                  </button>
                )
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
} 