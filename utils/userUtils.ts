import { auth, db } from '../firebase';
import { doc, setDoc, updateDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  online: boolean;
  lastSeen?: Date;
}

// Search users by display name
export const searchUsers = async (searchTerm: string): Promise<UserProfile[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('displayName', '>=', searchTerm),
    where('displayName', '<=', searchTerm + '\uf8ff')
  );

  const snapshot = await getDocs(q);
  const users: UserProfile[] = [];
  
  snapshot.forEach((doc) => {
    const data = doc.data() as UserProfile;
    // Don't include current user in search results
    if (data.uid !== currentUser.uid) {
      users.push(data);
    }
  });

  return users;
};

// Update user profile
export const updateUserProfile = async (profile: Partial<UserProfile>) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user logged in');

  // Update Firebase Auth profile
  if (profile.displayName) {
    await updateProfile(user, {
      displayName: profile.displayName,
    });
  }

  // Update Firestore user document
  const userRef = doc(db, 'users', user.uid);
  await setDoc(userRef, {
    ...profile,
    uid: user.uid,
  }, { merge: true });
};

// Set user online status
export const setUserOnlineStatus = async (online: boolean) => {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = doc(db, 'users', user.uid);
  await updateDoc(userRef, {
    online,
    lastSeen: new Date(),
  });
};

// Listen to user's online status
export const listenToUserStatus = (userId: string, callback: (profile: UserProfile) => void) => {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (doc) => {
    const data = doc.data() as UserProfile;
    callback(data);
  });
};

// Initialize user presence system
export const initializePresence = () => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Set user as online
      await setUserOnlineStatus(true);

      // Set up offline status when user disconnects
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        online: false,
        lastSeen: new Date(),
      });
    }
  });
}; 