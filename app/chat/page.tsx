"use client";
import { auth } from '../../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';

const Chat = () => {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div>
      <h1>Chat</h1>
      <p>Welcome, {user.displayName}</p>
    </div>
  );
};

export default Chat;