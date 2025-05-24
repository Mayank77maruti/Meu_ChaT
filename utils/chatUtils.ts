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
  text: string;
  senderId: string;
  timestamp: Date;
  read: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: Date;
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


export const sendMessage = async (chatId: string, text: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No user logged in');

  const messageRef = await addDoc(collection(db, 'messages'), {
    chatId,
    text,
    senderId: currentUser.uid,
    timestamp: serverTimestamp(),
    read: false,
  });


  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: text,
    lastMessageTime: serverTimestamp(),
  });

  return messageRef.id;
};


export const getMessages = (chatId: string, callback: (messages: Message[]) => void) => {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('chatId', '==', chatId)
  );

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        text: data.text,
        senderId: data.senderId,
        timestamp: data.timestamp?.toDate(),
        read: data.read,
      });
    });
    // Sort messages by timestamp on the client side
    messages.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return a.timestamp.getTime() - b.timestamp.getTime();
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