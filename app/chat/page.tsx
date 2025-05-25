"use client";
import { Suspense } from "react";
import { auth, db } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { SunIcon, MoonIcon, Cog6ToothIcon, UserGroupIcon, PaperClipIcon, MicrophoneIcon, StopIcon, PlayIcon, PauseIcon, PhoneIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { Chat, Message, getChats, getMessages, sendMessage, getUserProfile, addReaction, pinMessage, unpinMessage } from '../../utils/chatUtils';
import UserSearch from '../../components/UserSearch';
import Settings from '../../components/Settings';
import { listenToUserStatus } from '../../utils/userUtils';
import { UserProfile } from '../../utils/userUtils';
import Sidebar from '../../components/Sidebar';
import EmojiPicker from '../../components/EmojiPicker';
import { Theme } from 'emoji-picker-react';
import { CldUploadWidget } from 'next-cloudinary';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getDatabase, ref, onValue, set, remove } from 'firebase/database';
import CallInterface from '../../components/CallInterface';
import CallNotification from '../../components/CallNotification';

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
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [onlineUsers, setOnlineUsers] = useState<{[key: string]: boolean}>({});
  const [selectedChatUser, setSelectedChatUser] = useState<UserProfile | null>(null);
  const [selectedReactions, setSelectedReactions] = useState<{messageId: string, reactions: {[emoji: string]: string[]}} | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentChatRef = useRef<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{[key: string]: boolean}>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const rtdb = getDatabase();
  const [isInCall, setIsInCall] = useState(false);
  const [isCallIncoming, setIsCallIncoming] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    caller: UserProfile;
    type: 'audio' | 'video';
    chatId: string;
  } | null>(null);
  const [messageToScroll, setMessageToScroll] = useState<string | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [isPinnedMessageDropdownOpen, setIsPinnedMessageDropdownOpen] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);

  // Close pinned message dropdown when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          // Check if the click was outside the dropdown and its trigger
          // This requires adding refs to the dropdown and trigger if needed for precise detection
          // For simplicity, we'll close on any click outside for now.
          setIsPinnedMessageDropdownOpen(false);
      };

      if (isPinnedMessageDropdownOpen) {
          document.addEventListener('click', handleClickOutside);
      }

      return () => {
          document.removeEventListener('click', handleClickOutside);
      };
  }, [isPinnedMessageDropdownOpen]);

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

  // Add new effect to load participant info for replied-to messages
  useEffect(() => {
    if (!user || !messages.length) return;

    // Get unique sender IDs from replied-to messages
    const repliedToSenderIds = messages
      .filter(message => message.replyTo)
      .map(message => message.replyTo!.senderId)
      .filter((id, index, self) => id !== user.uid && self.indexOf(id) === index);

    // Load profiles for replied-to message senders
    repliedToSenderIds.forEach(senderId => {
      if (!chatParticipants[senderId]) {
        getUserProfile(senderId).then(profile => {
          setChatParticipants(prev => ({
            ...prev,
            [senderId]: profile
          }));
        });
      }
    });
  }, [messages, user, chatParticipants]);

  useEffect(() => {
    const chatId = searchParams.get('chatId');
    if (chatId !== selectedChat) {
      setSelectedChat(chatId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedChat) return;

    const unsubscribeMessages = getMessages(selectedChat, (updatedMessages) => {
      setMessages(updatedMessages);
      scrollToBottom();
    });

    return () => {
      unsubscribeMessages();
    };
  }, [selectedChat]);

  // Separate effect for message scrolling
  useEffect(() => {
    const messageId = searchParams.get('messageId');
    if (messageId && selectedChat && messages.length > 0) {
      // Wait for messages to be loaded and rendered
      const scrollToMessage = () => {
        const messageElement = messageRefs.current[messageId];
        if (messageElement) {
          messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          messageElement.classList.add('bg-blue-50', 'dark:bg-blue-900');
          setTimeout(() => {
            messageElement.classList.remove('bg-blue-50', 'dark:bg-blue-900');
            // Clear messageId from URL
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('messageId');
            window.history.replaceState({}, '', newUrl.toString());
          }, 2000);
        } else {
          // If message element is not found, try again after a short delay
          setTimeout(scrollToMessage, 100);
        }
      };

      // Start the scrolling process
      scrollToMessage();
    }
  }, [searchParams, selectedChat, messages]);

  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];

    // Listen to status of all chat participants
    chats.forEach(chat => {
      chat.participants.forEach(participantId => {
        if (participantId !== user.uid) {
          const unsubscribe = listenToUserStatus(participantId, (profile) => {
            if (profile) {  // Add null check for profile
            setOnlineUsers(prev => ({
              ...prev,
                [participantId]: profile.online || false  // Provide default value
            }));
            }
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
        if (profile) {  // Add null check for profile
      setSelectedChatUser(profile as UserProfile);
        }
    });

    // Listen to user status changes
    const unsubscribe = listenToUserStatus(otherParticipantId, (profile) => {
        if (profile) {  // Add null check for profile
      setSelectedChatUser(profile);
      setOnlineUsers(prev => ({
        ...prev,
            [otherParticipantId]: profile.online || false  // Provide default value
          }));
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, [selectedChat, chats, user]);

  useEffect(() => {
    currentChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    // Listen to typing status
    if (!selectedChat || !user) return;

    const typingRef = ref(rtdb, `typing/${selectedChat}`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      const data = snapshot.val() || {};
      const typingStatus: {[key: string]: boolean} = {};
      
      Object.entries(data).forEach(([userId, isTyping]) => {
        if (userId !== user.uid) {
          typingStatus[userId] = isTyping as boolean;
        }
      });
      
      setTypingUsers(typingStatus);
    });

    return () => {
      unsubscribe();
      // Clear typing status when leaving chat
      if (user) {
        set(ref(rtdb, `typing/${selectedChat}/${user.uid}`), false);
      }
    };
  }, [selectedChat, user]);

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
    if (!selectedChat || (!newMessage.trim() && !replyingToMessage)) return; // Allow sending empty message if it's a reply

    const replyToInfo = replyingToMessage ? {
      messageId: replyingToMessage.id,
      senderId: replyingToMessage.senderId,
      text: replyingToMessage.text,
    } : undefined;

    // Store the reply info and message before clearing states
    const currentReplyInfo = replyToInfo;
    const messageToSend = newMessage.trim();
    
    // Clear states immediately
    setReplyingToMessage(null);
    setNewMessage('');

    try {
      await sendMessage(selectedChat, messageToSend, undefined, currentReplyInfo);
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!selectedChat || !user) return;
    await addReaction(selectedChat, messageId, emoji, user.uid);
    // Close the popup if it's open
    if (selectedReactions?.messageId === messageId) {
      setSelectedReactions(null);
    }
  };

  const handleReactionClick = (messageId: string, reactions: {[emoji: string]: string[]}) => {
    setSelectedReactions({ messageId, reactions });
  };

  const handleCloseReactions = () => {
    setSelectedReactions(null);
  };

  const setMessageRef = useCallback((messageId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      messageRefs.current[messageId] = el;
    }
  }, []);

  const handlePinMessage = async (messageId: string) => {
    try {
      console.log('Pinning message:', messageId);
      await pinMessage(selectedChat!, messageId);
      // Update the message in local state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, pinned: true }
            : { ...msg, pinned: false }
        )
      );
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };

  const handleUnpinMessage = async () => {
    try {
      console.log('Unpinning message');
      await unpinMessage(selectedChat!);
      // Update the message in local state
      setMessages(prevMessages => 
        prevMessages.map(msg => ({ ...msg, pinned: false }))
      );
    } catch (error) {
      console.error('Error unpinning message:', error);
    }
  };

  const renderPinnedMessage = () => {
    if (!selectedChat || !messages.length) return null;

    const pinnedMessage = messages.find(m => m.pinned);
    console.log('Pinned message:', pinnedMessage);
    if (!pinnedMessage) return null;

    const handlePinnedMessageClick = () => {
      const messageElement = messageRefs.current[pinnedMessage.id];
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElement.classList.add('bg-blue-50', 'dark:bg-blue-900');
        setTimeout(() => {
          messageElement.classList.remove('bg-blue-50', 'dark:bg-blue-900');
        }, 2000);
      }
    };

    const handlePinnedMessageDropdownToggle = (event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent triggering the main click handler
        setIsPinnedMessageDropdownOpen(prev => !prev);
    };

    const handleUnpinClick = (event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent triggering the main click handler
        handleUnpinMessage();
        setIsPinnedMessageDropdownOpen(false); // Close dropdown after unpinning
    };

    const renderMediaIcon = () => {
      if (!pinnedMessage.attachment) return null;

      switch (pinnedMessage.attachment.type) {
        case 'image':
          return (
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-400">Image</span>
            </div>
          );
        case 'video':
          return (
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-400">Video</span>
            </div>
          );
        case 'file':
          return (
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-gray-400">File</span>
            </div>
          );
        case 'voice':
          return (
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="text-xs text-gray-400">Voice</span>
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div className="bg-gray-800 border-b border-gray-700 text-white relative z-10">
        <div className="px-4 py-2 flex items-center justify-between">
          <button
            onClick={handlePinnedMessageClick}
            className="flex items-center space-x-2 flex-1 min-w-0 text-left"
          >
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-300 truncate">
                {chats.find(c => c.id === selectedChat)?.isGroup ? chats.find(c => c.id === selectedChat)?.name : selectedChatUser?.displayName || 'Unknown User'}
              </p>
              <div className="text-xs text-gray-400 truncate">
                {pinnedMessage.text || renderMediaIcon()}
              </div>
            </div>
          </button>

          <div className="relative">
            {/* Dropdown Trigger */}
            <button
              className="p-1 rounded-full hover:bg-gray-700 text-gray-400"
              onClick={handlePinnedMessageDropdownToggle}
              aria-expanded={isPinnedMessageDropdownOpen}
              aria-haspopup="true"
            >
              <svg className={`w-4 h-4 transition-transform duration-200 ${isPinnedMessageDropdownOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isPinnedMessageDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 origin-top-right bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                <div className="py-1" role="none">
                  <button
                    onClick={handleUnpinClick}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700" role="menuitem"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Unpin
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMessageContent = (message: Message) => {
    const isCurrentUser = message.senderId === user?.uid;
    const messageRef = (el: HTMLDivElement | null) => {
      if (el && message.id === messageId) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          el.classList.add('highlight-message');
          setTimeout(() => el.classList.remove('highlight-message'), 2000);
        }, 100);
      }
      messageRefs.current[message.id] = el;
    };

    return (
      <div
        ref={messageRef}
        key={message.id}
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-1.5 group`}
      >
        <div className={`flex flex-col max-w-[60%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center space-x-1.5 mb-0.5">
            {!isCurrentUser && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {chatParticipants[message.senderId]?.displayName || 'Unknown User'}
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <div className={`flex ${isCurrentUser ? 'flex-row' : 'flex-row-reverse'} items-start gap-2`}>
            {/* Emoji Reaction Button - Only show for received messages */}
            {!isCurrentUser && (
              <div className="relative invisible group-hover:visible">
                <EmojiPicker
                  onSelect={(emoji) => handleReaction(message.id, emoji)}
                  position="right"
                  theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
                />
              </div>
            )}

            <div className={`rounded-lg p-3 text-sm ${
              isCurrentUser 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
            } min-w-[80px] min-h-[32px] flex items-center flex-col items-start`}>
              {/* Display replied-to message preview inside the bubble */}
              {message.replyTo && (
                <div className={`border-l-2 ${isCurrentUser ? 'border-blue-300' : 'border-green-500'} pl-2 pb-2 mb-2 w-full`}>
                  <p className={`text-xs font-medium ${isCurrentUser ? 'text-blue-200' : 'text-green-600'} mb-0.5`}>
                    {message.replyTo.senderId === user?.uid 
                      ? user.displayName || 'You'
                      : chatParticipants[message.replyTo.senderId]?.displayName || 'Unknown User'}
                  </p>
                  <p className={`text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'} truncate`}>
                    {message.replyTo.text}
                  </p>
                </div>
              )}
              <div className="w-full">
                {message.text}
                {message.attachment && (
                  <div className="mt-2">
                    {message.attachment.type === 'image' && (
                      <img 
                        src={message.attachment.url} 
                        alt={message.attachment.name || 'Image'} 
                        className="max-w-[250px] rounded-lg"
                      />
                    )}
                    {message.attachment.type === 'video' && (
                      <video 
                        src={message.attachment.url} 
                        controls
                        className="max-w-[250px] rounded-lg"
                      />
                    )}
                    {message.attachment.type === 'file' && (
                      <div className="flex items-center space-x-1 text-xs">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        <span>{message.attachment.name || 'File'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Display Reactions */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className={`flex items-center space-x-1 mt-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(message.reactions).map(([emoji, userIds]) => (
                <button
                  key={emoji}
                  onClick={() => handleReactionClick(message.id, message.reactions!)}
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    userIds.includes(user?.uid || '')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {emoji} {userIds.length}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-1 mt-0.5">
             {/* Reply Button */}
             <button
                onClick={() => handleReplyClick(message)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 invisible group-hover:visible"
                title="Reply"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l3 3m-3-3l3-3" />
                </svg>
              </button>
            {!message.pinned && (
              <button
                onClick={() => handlePinMessage(message.id)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 invisible group-hover:visible"
                title="Pin message"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            )}
            {message.pinned && (
              <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                <svg className="w-3 h-3 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Pinned
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleUploadSuccess = async (result: any) => {
    const chatId = currentChatRef.current;
    if (!chatId) return;

    try {
      // Send message with file attachment
      await sendMessage(chatId, '', {
        type: result.info.format === 'pdf'
          ? 'file'
          : result.info.resource_type === 'video'
            ? 'video'
            : result.info.resource_type === 'image'
              ? 'image'
              : 'file',
        url: result.info.secure_url,
        name: result.info.original_filename,
        size: result.info.bytes,
      });
    } catch (error) {
      console.error('Error sending message with attachment:', error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const startRecording = async () => {
    if (!selectedChat) return;
    const currentChatId = selectedChat; // Capture the current chat ID

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setAudioChunks(chunks);

        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'voice-message.webm');
          formData.append('upload_preset', 'chat_attachments');

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
            {
              method: 'POST',
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error('Failed to upload voice message');
          }

          const data = await response.json();
          
          if (!data.secure_url) {
            throw new Error('No URL returned from upload');
          }

          // Send voice message to the captured chat ID
          await sendMessage(currentChatId, '', {
            type: 'voice',
            url: data.secure_url,
            duration: Math.round(audioBlob.size / 16000), // Approximate duration in seconds
          });
        } catch (error) {
          console.error('Error uploading voice message:', error);
          alert(`Failed to upload voice message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handlePlayAudio = (url: string) => {
    if (playingAudio === url) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingAudio(url);
      }
    }
  };

  // Handle typing status
  const handleTyping = () => {
    if (!selectedChat || !user) return;

    // Set typing status to true
    set(ref(rtdb, `typing/${selectedChat}/${user.uid}`), true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to clear typing status
    typingTimeoutRef.current = setTimeout(() => {
      set(ref(rtdb, `typing/${selectedChat}/${user.uid}`), false);
    }, 3000);
  };

  // Update message input to trigger typing status
  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  // Get typing users display text
  const getTypingText = () => {
    const typingUserIds = Object.entries(typingUsers)
      .filter(([_, isTyping]) => isTyping)
      .map(([userId]) => userId);

    if (typingUserIds.length === 0) return null;

    const typingNames = typingUserIds.map(userId => {
      const user = chatParticipants[userId];
      return user?.displayName || 'Someone';
    });

    if (typingNames.length === 1) {
      return `${typingNames[0]} is typing...`;
    } else if (typingNames.length === 2) {
      return `${typingNames[0]} and ${typingNames[1]} are typing...`;
    } else {
      return 'Several people are typing...';
    }
  };

  // Add call listeners
  useEffect(() => {
    if (!user) return;

    const callsRef = ref(rtdb, 'calls');
    onValue(callsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      // Check for incoming calls
      Object.entries(data).forEach(([chatId, callData]: [string, any]) => {
        if (callData.type === 'offer' && callData.to === user.uid) {
          // Get caller's profile
          getUserProfile(callData.from).then((profile) => {
            if (profile) {
              setIncomingCall({
                caller: {
                  uid: callData.from,
                  displayName: profile.displayName || 'Unknown User',
                  photoURL: profile.photoURL,
                  online: profile.online || false
                },
                type: callData.callType || 'video',
                chatId,
              });
              // Set the call status in realtime database
              set(ref(rtdb, `calls/${chatId}/status`), 'ringing');
            }
          });
        } else if (callData.type === 'end-call') {
          // Clear incoming call if it's for this chat
          if (incomingCall && incomingCall.chatId === chatId) {
            setIncomingCall(null);
          }
          // Remove the call data
          remove(ref(rtdb, `calls/${chatId}`));
        }
      });
    });

    return () => {
      // Cleanup
      if (incomingCall) {
        remove(ref(rtdb, `calls/${incomingCall.chatId}`));
      }
    };
  }, [user, incomingCall]);

  const handleStartCall = (type: 'audio' | 'video') => {
    if (!selectedChat || !user || !selectedChatUser) return;
    
    // Set call data in realtime database
    set(ref(rtdb, `calls/${selectedChat}`), {
      type: 'offer',
      from: user.uid,
      to: selectedChatUser.uid,
      callType: type,
      status: 'ringing',
      timestamp: Date.now()
    });

    setCallType(type);
    setIsInCall(true);
  };

  const handleAcceptCall = () => {
    if (!incomingCall) return;
    
    // Update call status in realtime database
    set(ref(rtdb, `calls/${incomingCall.chatId}`), {
      type: 'accepted',
      from: incomingCall.caller.uid,
      to: user?.uid,
      callType: incomingCall.type,
      status: 'connected',
      timestamp: Date.now()
    });

    setSelectedChat(incomingCall.chatId);
    setCallType(incomingCall.type);
    setIsInCall(true);
    setIncomingCall(null);
  };

  const handleRejectCall = () => {
    if (!incomingCall) return;
    
    // Update call status in realtime database
    set(ref(rtdb, `calls/${incomingCall.chatId}`), {
      type: 'end-call',
      from: incomingCall.caller.uid,
      to: user?.uid,
      callType: incomingCall.type,
      status: 'rejected',
      timestamp: Date.now()
    });

    setIncomingCall(null);
  };

  const handleEndCall = () => {
    if (!selectedChat) return;
    
    // Update call status in realtime database
    set(ref(rtdb, `calls/${selectedChat}`), {
      type: 'end-call',
      from: user?.uid,
      to: selectedChatUser?.uid,
      callType: callType,
      status: 'ended',
      timestamp: Date.now()
    });

    setIsInCall(false);
    setCallType(null);
  };

  const handleReplyClick = (message: Message) => {
    setReplyingToMessage(message);
  };

  const handleCancelReply = () => {
    setReplyingToMessage(null);
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
      <Sidebar hideMobileNav={isMobile && !!selectedChat} />

      {/* Main Chat Area */}
      <div className="flex-1 flex">
        {/* Chat List */}
        <div className={`w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
          ${isMobile ? (selectedChat ? 'hidden' : 'block') : 'block'} flex flex-col`}>
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
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg text-gray-500 dark:text-gray-400">
                            {otherParticipant?.displayName?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      {!isGroupChat && (
                        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
                          isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {isGroupChat ? chat.name : otherParticipant?.displayName || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {incomingCall && incomingCall.chatId === chat.id ? (
                          <span className="flex items-center text-blue-500 font-medium animate-pulse">
                            {incomingCall.type === 'video' ? (
                              <VideoCameraIcon className="w-4 h-4 mr-1" />
                            ) : (
                              <PhoneIcon className="w-4 h-4 mr-1" />
                            )}
                            Incoming {incomingCall.type} call...
                          </span>
                        ) : (
                          chat.lastMessage || 'No messages yet'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Messages */}
        <div className={`flex-1 flex flex-col ${isMobile ? (selectedChat ? 'block' : 'hidden') : 'block'} max-h-screen overflow-hidden relative`}>
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sticky top-0 z-10">
                <div className="flex items-center space-x-3">
                  {isMobile && (
                    <button 
                      onClick={() => setSelectedChat(null)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600">
                      {selectedChatUser?.photoURL ? (
                        <img
                          src={selectedChatUser.photoURL}
                          alt={selectedChatUser.displayName || 'User'}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg text-gray-500 dark:text-gray-400">
                          {selectedChatUser?.displayName?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    {selectedChatUser && selectedChatUser.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {selectedChatUser ? selectedChatUser.displayName : chats.find(c => c.id === selectedChat)?.name || 'Chat'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getTypingText() || (selectedChatUser ? (selectedChatUser.online ? 'Online' : 'Offline') : 'Group Chat')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleStartCall('audio')}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <PhoneIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleStartCall('video')}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <VideoCameraIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Pinned Message */}
              {renderPinnedMessage()}

              {/* Messages and Input Container */}
              <div className="flex-1 flex flex-col justify-end overflow-hidden">
                {/* Messages */}
                <div className="overflow-y-auto pt-4 px-6 space-y-4 scrollbar-hide pb-4 h-[calc(100vh-8rem)]">
                  {messages.map(renderMessageContent)}
                  <div ref={messagesEndRef} />
                  <audio ref={audioRef} className="hidden" />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky bottom-0">
                  {/* Reply Preview */}
                  {replyingToMessage && (
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded-t-lg border-b border-gray-200 dark:border-gray-600 -mt-4 mx-4">
                      <div className="border-l-2 border-blue-500 pl-2 text-sm text-gray-700 dark:text-gray-300 flex-1">
                        <p className="font-medium text-blue-600 dark:text-blue-400">{chatParticipants[replyingToMessage.senderId]?.displayName || 'Unknown User'}</p>
                        <p className="truncate">{replyingToMessage.text}</p>
                      </div>
                      <button onClick={handleCancelReply} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <div className="flex space-x-4">
                    <CldUploadWidget
                      uploadPreset="chat_attachments"
                      onSuccess={handleUploadSuccess}
                      options={{
                        resourceType: "auto",
                        clientAllowedFormats: ["image", "video", "pdf", "audio"],
                        maxFileSize: 10000000, // 10MB
                        showPoweredBy: false,
                        showSkipCropButton: true,
                        sources: ["local", "camera", "url"],
                        multiple: false,
                      }}
                    >
                      {({ open }) => (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (currentChatRef.current) {
                              open();
                            }
                          }}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <PaperClipIcon className="w-6 h-6" />
                        </button>
                      )}
                    </CldUploadWidget>
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`p-2 ${
                        isRecording 
                          ? 'text-red-500 hover:text-red-600' 
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                    >
                      {isRecording ? (
                        <StopIcon className="w-6 h-6" />
                      ) : (
                        <MicrophoneIcon className="w-6 h-6" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleMessageChange}
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
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Select a chat to start messaging
            </div>
          )}
        </div>
      </div>

      {/* Add CallInterface */}
      {isInCall && selectedChat && (
        <CallInterface
          chatId={selectedChat}
          currentUser={user}
          otherUser={selectedChatUser}
          onEndCall={handleEndCall}
          callType={callType!}
        />
      )}

      {incomingCall && (
        <CallNotification
          caller={incomingCall.caller}
          callType={incomingCall.type}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
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