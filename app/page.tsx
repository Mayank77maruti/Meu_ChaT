"use client"
import Image from "next/image";
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/chat'); // Redirect to chat page after successful login
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <>
      <Navbar onGoogleSignIn={handleGoogleSignIn} />
      <main className="min-h-screen flex flex-col items-center justify-center py-24 px-4">
        {user ? (
          <>
            <h1 className="text-4xl font-bold text-center mb-8">
              Welcome to Realtime Chat App
            </h1>
            <p className="text-center">Welcome, {user.displayName ? user.displayName : 'User'}!</p>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-bold text-center mb-8">
              Welcome to Realtime Chat App
            </h1>
            {/* <button
              onClick={handleGoogleSignIn}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Sign in with Google
            </button> */}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
