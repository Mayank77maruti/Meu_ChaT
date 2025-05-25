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

// Types
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
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

  const messageData: any = {
    text,
    senderId: currentUser.uid,
    timestamp: serverTimestamp(),
    read: false,
    reactions: {},
  };

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

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        chatId,
        text: data.text,
        senderId: data.senderId,
        timestamp: data.timestamp?.toDate().getTime() || Date.now(),
        read: data.read || false,
        pinned: data.pinned || false,
        reactions: data.reactions || {},
        attachment: data.attachment,
        replyTo: data.replyTo
      });
    });
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