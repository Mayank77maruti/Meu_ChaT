"use client";
import { auth } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { SunIcon, MoonIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Chat, Message, getChats, getMessages, sendMessage, getUserProfile } from '../../utils/chatUtils';
import UserSearch from '../../components/UserSearch';
import Settings from '../../components/Settings';
import { listenToUserStatus } from '../../utils/userUtils';
import { UserProfile } from '../../utils/userUtils';

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

    const otherParticipantId = chats.find(c => c.id === selectedChat)?.participants.find(id => id !== user.uid);
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
      {/* Sidebar */}
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
            const otherParticipantId = chat.participants.find(id => id !== user?.uid);
            const otherParticipant = chatParticipants[otherParticipantId || ''];
            const isOnline = onlineUsers[otherParticipantId || ''];
            
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
                      {otherParticipant?.photoURL && (
                        <img
                          src={otherParticipant.photoURL}
                          alt={otherParticipant.displayName}
                          className="w-full h-full rounded-full"
                        />
                      )}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                      isOnline ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {otherParticipant?.displayName || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Settings Button */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center justify-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <Cog6ToothIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">Settings</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
              <div className="flex items-center space-x-3">
                {isMobile && (
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                )}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600">
                    {selectedChatUser?.photoURL && (
                      <img
                        src={selectedChatUser.photoURL}
                        alt={selectedChatUser.displayName}
                        className="w-full h-full rounded-full"
                      />
                    )}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                    selectedChatUser?.online ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800 dark:text-white">
                    {selectedChatUser?.displayName || 'Unknown User'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedChatUser?.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex flex-col max-w-[70%]">
                    <div
                      className={`rounded-lg p-3 shadow ${
                        message.senderId === user.uid
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-bl-none'
                      }`}
                    >
                      <p className="break-words">{message.text}</p>
                    </div>
                    <span className={`text-xs mt-1 px-1 ${
                      message.senderId === user.uid ? 'text-right text-gray-500 dark:text-gray-400' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default ChatPage;