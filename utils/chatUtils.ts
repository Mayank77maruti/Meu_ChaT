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
  reactions?: { [emoji: string]: string[] };
  attachment?: {
    type: 'image' | 'file' | 'voice' | 'video';
    url: string;
    name?: string;
    size?: number;
    duration?: number;
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
        reactions: data.reactions || {},
        attachment: data.attachment
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