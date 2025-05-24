"use client";

import CryptoJS from 'crypto-js';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import Link from 'next/link';
import { generateKeyPair } from '../../utils/crypto';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
        await signInWithEmailAndPassword(auth, email, password);
        const user = auth.currentUser;
        if (user) {
          const uid = user.uid;
          // Load public key from Firestore
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const publicKeyString = userData.publicKey;
            if (publicKeyString) {
              // Decrypt private key
              const encryptedPrivateKey = localStorage.getItem('privateKey');
              if (encryptedPrivateKey) {
                const decryptedPrivateKey = CryptoJS.AES.decrypt(encryptedPrivateKey, password).toString(CryptoJS.enc.Utf8);
                console.log("Decrypted private key:", decryptedPrivateKey);
              }
            }
          }
        }
        router.push('/chat');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        setError('User not found. Please check your email or sign up.');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else {
        setError(error.message);
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user) {
        const uid = user.uid;
        // Check if public key exists in Firestore
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);
        let publicKeyBase64 = null;
        if (!userDocSnap.exists() || !userDocSnap.data()?.publicKey) {
          // Generate key pair
          const { publicKey, privateKey } = await generateKeyPair();
          const publicKeyString = await window.crypto.subtle.exportKey("spki", publicKey);
          publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyString)));

          // Store private key in local storage (encrypted)
          const encryptedPrivateKey = CryptoJS.AES.encrypt(JSON.stringify(privateKey), password).toString();
          localStorage.setItem('privateKey', encryptedPrivateKey);

          // Store public key in Firestore
          await fetch('/api/updateUserPublicKey', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uid: uid, publicKey: publicKeyBase64 }),
          });
        } else {
          publicKeyBase64 = userDocSnap.data().publicKey;
        }
      }
      router.push('/chat');
    } catch (error: any) {
      setError('Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
          <form onSubmit={handleAction} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? (isLogin ? 'Logging in...' : 'Signing up...') : isLogin ? 'Login' : 'Signup'}
            </button>
          </form>
          <p className="text-center">
          Don't have an account? <Link href="/signup" className="text-blue-500 hover:text-blue-800">SignUp</Link>
        </p>
        <button
          onClick={handleGoogleSignIn}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default Login;