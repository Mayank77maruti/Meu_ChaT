"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../firebase';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import Link from 'next/link';
import { generateKeyPair } from '../../utils/crypto';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import CryptoJS from 'crypto-js';


const Signup = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const { publicKey, privateKey } = await generateKeyPair();
      const publicKeyString = await window.crypto.subtle.exportKey("spki", publicKey);
      const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyString)));

      // Store private key in local storage (encrypted)
      const encryptedPrivateKey = CryptoJS.AES.encrypt(JSON.stringify(privateKey), password).toString();
      localStorage.setItem('privateKey', encryptedPrivateKey);

      // Update user profile with public key
      if (userCredential.user) {
        await updateProfile(auth.currentUser!, {
          displayName: email, // Or any other default display name
        });
        await fetch('/api/updateUserPublicKey', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid: userCredential.user.uid, publicKey: publicKeyBase64 }),
        });
      }
      router.push('/chat');
    } catch (error: any) {
      setError(error.message);
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
        <h2 className="text-2xl font-bold text-center mb-6">Signup</h2>
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}
        <form onSubmit={handleSignup} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
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
            {loading ? 'Signing up...' : 'Signup'}
          </button>
        </form>
        <button
          onClick={handleGoogleSignIn}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
        >
          Sign in with Google
        </button>
        <p className="text-center">
          Already have an account? <Link href="/login" className="text-blue-500 hover:text-blue-800">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;