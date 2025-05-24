"use client";
import { Suspense } from "react";
import { auth } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { SunIcon, MoonIcon, Cog6ToothIcon, UserGroupIcon, PaperClipIcon, MicrophoneIcon, StopIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import { Chat, Message, getChats, getMessages, sendMessage, getUserProfile, addReaction } from '../../utils/chatUtils';
import UserSearch from '../../components/UserSearch';
import Settings from '../../components/Settings';
import { listenToUserStatus } from '../../utils/userUtils';
import { UserProfile } from '../../utils/userUtils';
import Sidebar from '../../components/Sidebar';
import EmojiPicker from '../../components/EmojiPicker';
import { Theme } from 'emoji-picker-react';
import { CldUploadWidget } from 'next-cloudinary';

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
  const [selectedReactions, setSelectedReactions] = useState<{messageId: string, reactions: {[emoji: string]: string[]}} | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentChatRef = useRef<string | null>(null);

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

  const renderMessageContent = (message: Message) => {
    if (message.attachment) {
      const attachment = message.attachment;
      switch (attachment.type) {
        case 'image':
          return (
            <div className="mt-2">
              <img
                src={attachment.url}
                alt="Shared image"
                className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(attachment.url, '_blank')}
              />
            </div>
          );
        case 'file':
          return (
            <div className="mt-2 flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <PaperClipIcon className="w-5 h-5 text-gray-500" />
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {attachment.name || 'Download file'}
              </a>
              {attachment.size && (
                <span className="text-sm text-gray-500">
                  ({(attachment.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>
          );
        case 'video':
          return (
            <div className="mt-2">
              <video
                controls
                className="max-w-sm rounded-lg"
                src={attachment.url}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          );
        case 'voice':
          return (
            <div className="mt-2 flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <button
                onClick={() => handlePlayAudio(attachment.url)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {playingAudio === attachment.url ? (
                  <PauseIcon className="w-5 h-5 text-gray-500" />
                ) : (
                  <PlayIcon className="w-5 h-5 text-gray-500" />
                )}
              </button>
              <div className="flex-1">
                <div className="h-1 bg-gray-300 dark:bg-gray-600 rounded-full">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: audioRef.current
                        ? `${(audioRef.current.currentTime / audioRef.current.duration) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
                {attachment.duration && (
                  <span className="text-sm text-gray-500">
                    {attachment.duration}s
                  </span>
                )}
              </div>
            </div>
          );
        default:
          return null;
      }
    }

    // Check for URLs in the message text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.text.match(urlRegex);
    
    if (urls) {
      return (
        <div>
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
          {urls.map((url, index) => (
            <div key={index} className="mt-2 max-w-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="p-3">
                  <p className="text-sm font-medium text-blue-500 truncate">{url}</p>
                  <p className="text-xs text-gray-500 mt-1">Click to open link</p>
                </div>
              </a>
            </div>
          ))}
        </div>
      );
    }

    return <p className="text-sm whitespace-pre-wrap">{message.text}</p>;
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
                        {chat.lastMessage || 'No messages yet'}
                      </p>
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
                      {selectedChatUser ? (selectedChatUser.online ? 'Online' : 'Offline') : 'Group Chat'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {messages.map((message) => {
                  const isGroupChat = chats.find(c => c.id === selectedChat)?.isGroup;
                  const sender = chatParticipants[message.senderId];
                  const reactions = message.reactions || {};
                  const reactionCount = Object.values(reactions).reduce((acc, users) => acc + users.length, 0);
                  const lastEmoji = Object.keys(reactions).pop();
                  const isOwnMessage = message.senderId === user?.uid;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="flex flex-col max-w-[85%] group">
                        {isGroupChat && !isOwnMessage && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {sender?.displayName || 'Unknown User'}
                          </p>
                        )}
                        <div className="relative">
                          <div
                            className={`rounded-lg px-4 py-2 break-words ${
                              isOwnMessage
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                            }`}
                          >
                            {renderMessageContent(message)}
                            <p className="text-xs mt-1 opacity-70">
                              {formatTimestamp(message.timestamp)}
                            </p>
                          </div>
                          
                          {/* Reaction Button */}
                          {!isOwnMessage && (
                            <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <EmojiPicker
                                onSelect={(emoji) => handleReaction(message.id, emoji)}
                                theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
                                position="bottom"
                              />
                            </div>
                          )}
                        </div>

                        {/* Compact Reactions Display */}
                        {reactionCount > 0 && (
                          <div className="mt-1 flex justify-end">
                            <button
                              onClick={() => handleReactionClick(message.id, reactions)}
                              className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                            >
                              {lastEmoji} {reactionCount}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
                <audio ref={audioRef} className="hidden" />
              </div>

              {/* Reactions Popup */}
              {selectedReactions && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseReactions}>
                  <div 
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-sm w-full mx-4"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Reactions</h3>
                      <button
                        onClick={handleCloseReactions}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(selectedReactions.reactions).map(([emoji, userIds]) => (
                        <div key={emoji} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{emoji}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {userIds.length} {userIds.length === 1 ? 'reaction' : 'reactions'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleReaction(selectedReactions.messageId, emoji)}
                            className={`px-2 py-1 rounded-full text-xs ${
                              userIds.includes(user?.uid || '')
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {userIds.includes(user?.uid || '') ? 'Remove' : 'Add'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
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