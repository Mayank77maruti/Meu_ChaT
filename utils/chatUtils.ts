import { db, auth } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  getDoc
} from 'firebase/firestore';
import { encryptMessage, decryptMessage } from './crypto';
import CryptoJS from 'crypto-js';

// Types
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  encryptedText?: string;
  timestamp: number;
  read: boolean;
  pinned?: boolean;
  reactions?: { [emoji: string]: string[] };
  attachment?: {
    type: 'image' | 'file' | 'voice' | 'video';
    url: string;
    name?: string;
    size?: number;
    duration?: number;
  };
  replyTo?: {
    messageId: string;
    senderId: string;
    text: string;
  };
  linkPreview?: {
    url: string;
    title: string;
    description?: string;
    image?: string;
    siteName?: string;
  };
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Date;
  isGroup?: boolean;
  name?: string;
  createdBy?: string;
  createdAt?: Date;
  pinnedMessage?: string;
  pinnedAt?: Date;
}

export interface UserProfile {
  uid: string;
  displayName?: string;
  photoURL?: string;
  online?: boolean;
  email?: string;
}

// Create a new chat...................................
export const createChat = async (participantId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No user logged in');

  const chatRef = await addDoc(collection(db, 'chats'), {
    participants: [currentUser.uid, participantId],
    createdAt: serverTimestamp(),
  });

  return chatRef.id;
};


export const getChats = (callback: (chats: Chat[]) => void) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', currentUser.uid)
  );

  return onSnapshot(q, (snapshot) => {
    const chats: Chat[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      chats.push({
        id: doc.id,
        participants: data.participants,
        lastMessage: data.lastMessage,
        lastMessageTime: data.lastMessageTime?.toDate(),
        isGroup: data.isGroup || false,
        name: data.name,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate(),
        pinnedMessage: data.pinnedMessage,
        pinnedAt: data.pinnedAt?.toDate(),
      });
    });
    // Sort chats client-side
    chats.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
    });
    callback(chats);
  });
};


export const sendMessage = async (chatId: string, text: string, attachment?: {
  type: 'image' | 'file' | 'voice' | 'video';
  url: string;
  name?: string;
  size?: number;
  duration?: number;
}, replyToInfo?: {
  messageId: string;
  senderId: string;
  text: string;
}) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No user logged in');

  // Get chat participants
  const chatDoc = await getDoc(doc(db, 'chats', chatId));
  if (!chatDoc.exists()) throw new Error('Chat not found');

  const chatData = chatDoc.data();
  const participants = chatData.participants;
  const isGroup = chatData.isGroup || false;

  // Check for URLs in the message
  const urls = extractUrls(text);
  let linkPreview = null;
  
  if (urls.length > 0) {
    // Get preview for the first URL found
    linkPreview = await fetchLinkPreview(urls[0]);
  }

  let messageData: any = {
    text: text,
    senderId: currentUser.uid,
    timestamp: serverTimestamp(),
    read: false,
    reactions: {},
  };

  if (linkPreview) {
    messageData.linkPreview = linkPreview;
  }

  // Only encrypt for direct messages (not group chats)
  if (!isGroup) {
    const otherParticipantId = participants.find((id: string) => id !== currentUser.uid);
    
    // Get other participant's public key
    const otherUserDoc = await getDoc(doc(db, 'users', otherParticipantId));
    if (!otherUserDoc.exists()) throw new Error('Recipient not found');

    const recipientPublicKey = otherUserDoc.data().publicKey;
    if (!recipientPublicKey) throw new Error('Recipient has no public key');

    // Get our public key
    const ourUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!ourUserDoc.exists()) throw new Error('Sender not found');

    const ourPublicKey = ourUserDoc.data().publicKey;
    if (!ourPublicKey) throw new Error('Sender has no public key');

    // Encrypt the message for both sender and recipient
    const encryptedForRecipient = await encryptMessage(text, recipientPublicKey);
    const encryptedForSender = await encryptMessage(text, ourPublicKey);

    messageData = {
      text: '', // Store empty text for backward compatibility
      encryptedText: encryptedForRecipient,
      senderEncryptedText: encryptedForSender,
      senderId: currentUser.uid,
      timestamp: serverTimestamp(),
      read: false,
      reactions: {},
    };

    if (linkPreview) {
      messageData.linkPreview = linkPreview;
    }
  }

  if (attachment) {
    messageData.attachment = attachment;
  }

  if (replyToInfo) {
    messageData.replyTo = replyToInfo;
  }

  const messageRef = await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: text || (attachment ? `Sent ${attachment.type}` : ''),
    lastMessageTime: serverTimestamp(),
  });

  return messageRef.id;
};


export const getMessages = (chatId: string, callback: (messages: Message[]) => void) => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(
    messagesRef,
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(q, async (snapshot) => {
    const messages: Message[] = [];
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Get chat data to check if it's a group chat
    const chatDoc = await getDoc(doc(db, 'chats', chatId));
    if (!chatDoc.exists()) return;

    const isGroup = chatDoc.data().isGroup || false;

    // Only get private key for direct messages
    let privateKeyJwk = null;
    if (!isGroup) {
      // Get private key from localStorage
      const privateKey = localStorage.getItem('privateKey');
      if (!privateKey) {
        console.error('No private key found');
        return;
      }

      // Parse the private key from localStorage string to JWK object
      try {
        privateKeyJwk = JSON.parse(privateKey);
        
        // Ensure the private key has all required JWK properties
        if (!privateKeyJwk.kty || !privateKeyJwk.n || !privateKeyJwk.e || !privateKeyJwk.d) {
          throw new Error('Invalid private key format');
        }
      } catch (error) {
        console.error('Error parsing private key:', error);
        return;
      }
    }

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let decryptedText = '';

      if (!isGroup && data.encryptedText) {
        try {
          // Use the appropriate encrypted text based on whether we're the sender or receiver
          const encryptedText = data.senderId === currentUser.uid 
            ? data.senderEncryptedText 
            : data.encryptedText;
            
          if (!encryptedText) {
            decryptedText = '[Encrypted Message]';
          } else {
            decryptedText = await decryptMessage(encryptedText, privateKeyJwk);
          }
        } catch (error) {
          console.error('Error decrypting message:', error);
          decryptedText = '[Encrypted Message]';
        }
      } else {
        decryptedText = data.text || '';
      }

      messages.push({
        id: doc.id,
        chatId,
        text: decryptedText,
        senderId: data.senderId,
        timestamp: data.timestamp?.toDate().getTime() || Date.now(),
        read: data.read || false,
        pinned: data.pinned || false,
        reactions: data.reactions || {},
        attachment: data.attachment,
        replyTo: data.replyTo,
        linkPreview: data.linkPreview
      });
    }
    callback(messages);
  });
};

// Mark message as read...................................
export const markMessageAsRead = async (messageId: string) => {
  await updateDoc(doc(db, 'messages', messageId), {
    read: true,
  });
};

// Get user profile...................................
export const getUserProfile = async (userId: string) => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  return userDoc.data();
};

export const addReaction = async (chatId: string, messageId: string, emoji: string, userId: string) => {
  const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
  const messageDoc = await getDoc(messageRef);

  if (!messageDoc.exists()) return;

  const message = messageDoc.data();
  const reactions = message.reactions || {};
  const userReactions = reactions[emoji] || [];

  // If user already reacted with this emoji, remove their reaction
  if (userReactions.includes(userId)) {
    const updatedReactions = userReactions.filter((id: string) => id !== userId);
    if (updatedReactions.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = updatedReactions;
    }
  } else {
    // Add user's reaction
    reactions[emoji] = [...userReactions, userId];
  }

  await updateDoc(messageRef, { reactions });
};

export const searchMessages = async (searchTerm: string): Promise<{ 
  message: Message; 
  chatId: string; 
  chatName?: string; 
  isGroup: boolean;
  participantInfo?: UserProfile;
}[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  // First get all chats the user is part of
  const chatsQuery = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', currentUser.uid)
  );
  const chatsSnapshot = await getDocs(chatsQuery);
  
  const searchResults: { 
    message: Message; 
    chatId: string; 
    chatName?: string; 
    isGroup: boolean;
    participantInfo?: UserProfile;
  }[] = [];
  
  // Search through each chat's messages
  for (const chatDoc of chatsSnapshot.docs) {
    const chatData = chatDoc.data();
    const chatId = chatDoc.id;
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      where('text', '>=', searchTerm),
      where('text', '<=', searchTerm + '\uf8ff')
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    
    // If it's not a group chat, get the other participant's info
    let participantInfo: UserProfile | undefined;
    if (!chatData.isGroup) {
      const otherParticipantId = chatData.participants.find((id: string) => id !== currentUser.uid);
      if (otherParticipantId) {
        const userDoc = await getDoc(doc(db, 'users', otherParticipantId));
        if (userDoc.exists()) {
          participantInfo = { uid: otherParticipantId, ...userDoc.data() } as UserProfile;
        }
      }
    }

    messagesSnapshot.forEach((doc) => {
      const data = doc.data();
      searchResults.push({
        message: {
          id: doc.id,
          chatId,
          text: data.text,
          senderId: data.senderId,
          timestamp: data.timestamp?.toDate().getTime() || Date.now(),
          read: data.read || false,
          reactions: data.reactions || {},
          attachment: data.attachment
        },
        chatId,
        chatName: chatData.isGroup ? chatData.name : participantInfo?.displayName,
        isGroup: chatData.isGroup || false,
        participantInfo
      });
    });
  }
  
  // Sort results by timestamp
  searchResults.sort((a, b) => b.message.timestamp - a.message.timestamp);
  return searchResults;
};

export const searchGroups = async (searchTerm: string): Promise<Chat[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  const chatsQuery = query(
    collection(db, 'chats'),
    where('isGroup', '==', true),
    where('participants', 'array-contains', currentUser.uid)
  );
  const chatsSnapshot = await getDocs(chatsQuery);
  const lowerSearch = searchTerm.toLowerCase();
  const groups: Chat[] = [];
  chatsSnapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.name && data.name.toLowerCase().includes(lowerSearch)) {
      groups.push({
        id: docSnap.id,
        participants: data.participants,
        lastMessage: data.lastMessage,
        lastMessageTime: data.lastMessageTime?.toDate(),
        isGroup: data.isGroup || false,
        name: data.name,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate(),
        pinnedMessage: data.pinnedMessage,
        pinnedAt: data.pinnedAt?.toDate(),
      });
    }
  });
  return groups;
};

export const pinMessage = async (chatId: string, messageId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No user logged in');

  // First, unpin any existing pinned message
  const chatRef = doc(db, 'chats', chatId);
  const chatDoc = await getDoc(chatRef);
  const chatData = chatDoc.data();
  
  if (chatData?.pinnedMessage) {
    // Unpin the existing message
    await updateDoc(doc(db, 'chats', chatId, 'messages', chatData.pinnedMessage), {
      pinned: false
    });
  }

  // Pin the new message
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    pinned: true
  });

  // Update the chat document with the new pinned message
  await updateDoc(chatRef, {
    pinnedMessage: messageId,
    pinnedAt: serverTimestamp()
  });
};

export const unpinMessage = async (chatId: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No user logged in');

  const chatRef = doc(db, 'chats', chatId);
  const chatDoc = await getDoc(chatRef);
  const chatData = chatDoc.data();

  if (chatData?.pinnedMessage) {
    // Unpin the message
    await updateDoc(doc(db, 'chats', chatId, 'messages', chatData.pinnedMessage), {
      pinned: false
    });

    // Remove pinned message reference from chat
    await updateDoc(chatRef, {
      pinnedMessage: null,
      pinnedAt: null
    });
  }
};

// Function to extract URLs from text
const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

// Function to fetch link preview data
const fetchLinkPreview = async (url: string) => {
  try {
    const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        url: data.data.url,
        title: data.data.title,
        description: data.data.description,
        image: data.data.image?.url,
        siteName: data.data.publisher
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching link preview:', error);
    return null;
  }
}; 