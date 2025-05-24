"use client";
import { Suspense } from "react";
import { auth } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { SunIcon, MoonIcon, Cog6ToothIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Chat, Message, getChats, getMessages, sendMessage, getUserProfile } from '../../utils/chatUtils';
import UserSearch from '../../components/UserSearch';
import Settings from '../../components/Settings';
import { listenToUserStatus } from '../../utils/userUtils';
import { UserProfile } from '../../utils/userUtils';
import Sidebar from '../../components/Sidebar';

const ChatPage = () => {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(searchParams.get('chatId'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatParticipants, setChatParticipants] = useState<{[key: string]: any}>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [onlineUsers, setOnlineUsers] = useState<{[key: string]: boolean}>({});
  const [selectedChatUser, setSelectedChatUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Check localStorage first, then system preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setIsDarkMode(savedMode === 'true');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    }

    // Apply dark mode class to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isDarkMode]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to chats
    const unsubscribeChats = getChats((updatedChats) => {
      setChats(updatedChats);
      
      // Fetch participant profiles
      updatedChats.forEach(chat => {
        chat.participants.forEach(participantId => {
          if (participantId !== user.uid && !chatParticipants[participantId]) {
            getUserProfile(participantId).then(profile => {
              setChatParticipants(prev => ({
                ...prev,
                [participantId]: profile
              }));
            });
          }
        });
      });
    });

    return () => {
      unsubscribeChats?.();
    };
  }, [user]);

  useEffect(() => {
    if (!selectedChat) return;

    // Subscribe to messages
    const unsubscribeMessages = getMessages(selectedChat, (updatedMessages) => {
      setMessages(updatedMessages);
      scrollToBottom();
    });

    return () => {
      unsubscribeMessages();
    };
  }, [selectedChat]);

  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];

    // Listen to status of all chat participants
    chats.forEach(chat => {
      chat.participants.forEach(participantId => {
        if (participantId !== user.uid) {
          const unsubscribe = listenToUserStatus(participantId, (profile) => {
            setOnlineUsers(prev => ({
              ...prev,
              [participantId]: profile.online
            }));
          });
          unsubscribers.push(unsubscribe);
        }
      });
    });

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [chats, user]);

  useEffect(() => {
    if (!selectedChat || !user) return;

    const currentChat = chats.find(c => c.id === selectedChat);
    if (!currentChat) return;

    if (currentChat.isGroup) {
      // For group chats, we don't need to fetch a single user profile
      setSelectedChatUser(null);
    } else {
      const otherParticipantId = currentChat.participants.find(id => id !== user.uid);
      if (!otherParticipantId) return;

      // Get initial user profile
      getUserProfile(otherParticipantId).then(profile => {
        setSelectedChatUser(profile as UserProfile);
      });

      // Listen to user status changes
      const unsubscribe = listenToUserStatus(otherParticipantId, (profile) => {
        setSelectedChatUser(profile);
        setOnlineUsers(prev => ({
          ...prev,
          [otherParticipantId]: profile.online
        }));
      });

      return () => {
        unsubscribe();
      };
    }
  }, [selectedChat, chats, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat || !newMessage.trim()) return;

    try {
      await sendMessage(selectedChat, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Add this function to format timestamps
  const formatTimestamp = (timestamp: Date | undefined) => {
    if (!timestamp) return '';
    const now = new Date();
    const messageDate = new Date(timestamp);
    
    // If message is from today, show time only
    if (messageDate.toDateString() === now.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If message is from this year, show date and time
    if (messageDate.getFullYear() === now.getFullYear()) {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
             messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If message is from a different year, show full date and time
    return messageDate.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' +
           messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Chat Area */}
      <div className="flex-1 flex">
        {/* Chat List */}
        <div className={`w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
          ${isMobile ? 'hidden' : 'block'} flex flex-col`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">MeuChat</h2>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <SunIcon className="h-5 w-5 text-gray-200" />
                ) : (
                  <MoonIcon className="h-5 w-5 text-gray-600" />
                )}
              </button>
            </div>
            <UserSearch />
          </div>
          <div className="flex-1 overflow-y-auto">
            {chats.map((chat) => {
              const isGroupChat = chat.isGroup;
              const otherParticipantId = !isGroupChat ? chat.participants.find(id => id !== user?.uid) : null;
              const otherParticipant = !isGroupChat ? chatParticipants[otherParticipantId || ''] : null;
              const isOnline = !isGroupChat ? onlineUsers[otherParticipantId || ''] : false;
              
              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                    selectedChat === chat.id ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600">
                        {isGroupChat ? (
                          <UserGroupIcon className="w-10 h-10 p-2 text-gray-500 dark:text-gray-400" />
                        ) : otherParticipant?.photoURL ? (
                          <img
                            src={otherParticipant.photoURL}
                            alt={otherParticipant.displayName || 'User'}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : null}
                      </div>
                      {!isGroupChat && isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {isGroupChat ? chat.name : otherParticipant?.displayName || 'Unknown User'}
                      </p>
                      {!isGroupChat && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {isOnline ? 'Online' : 'Offline'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600">
                      {selectedChatUser?.photoURL ? (
                        <img
                          src={selectedChatUser.photoURL}
                          alt={selectedChatUser.displayName || 'User'}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <UserGroupIcon className="w-10 h-10 p-2 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                    {selectedChatUser?.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedChatUser ? selectedChatUser.displayName : chats.find(c => c.id === selectedChat)?.name || 'Chat'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedChatUser ? (selectedChatUser.online ? 'Online' : 'Offline') : 'Group Chat'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isGroupChat = chats.find(c => c.id === selectedChat)?.isGroup;
                  const sender = chatParticipants[message.senderId];
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="flex flex-col max-w-[70%]">
                        {isGroupChat && message.senderId !== user?.uid && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {sender?.displayName || 'Unknown User'}
                          </p>
                        )}
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            message.senderId === user?.uid
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {formatTimestamp(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Select a chat to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <ChatPage />
    </Suspense>
  );
}