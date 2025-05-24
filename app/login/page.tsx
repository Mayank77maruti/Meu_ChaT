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
          const userDocRef = doc(db, 'users', uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const publicKeyString = userData.publicKey;
            if (publicKeyString) {
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
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);
        let publicKeyBase64 = null;
        if (!userDocSnap.exists() || !userDocSnap.data()?.publicKey) {
          const { publicKey, privateKey } = await generateKeyPair();
          const publicKeyString = await window.crypto.subtle.exportKey("spki", publicKey);
          publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyString)));

          const encryptedPrivateKey = CryptoJS.AES.encrypt(JSON.stringify(privateKey), password).toString();
          localStorage.setItem('privateKey', encryptedPrivateKey);

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
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-10 w-80 h-80 bg-violet-600 rounded-full mix-blend-soft-light filter blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-600 rounded-full mix-blend-soft-light filter blur-3xl animate-float-medium"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-indigo-600 rounded-full mix-blend-soft-light filter blur-3xl animate-float-fast"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="flex justify-center mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleAction} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-violet-200 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-violet-200 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/20 flex items-center justify-center"
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : null}
                {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : isLogin ? 'Sign In' : 'Sign Up'}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-violet-300">Or continue with</span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center px-4 py-3 border border-white/10 rounded-lg shadow-sm text-sm font-medium text-white bg-white/5 hover:bg-white/10 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-violet-300">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <Link 
                  href={isLogin ? "/signup" : "/login"} 
                  className="font-medium text-white transition-colors"
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(15px) translateX(-15px); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-10px) translateX(5px); }
        }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
        .animate-float-fast { animation: float-fast 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default Login;