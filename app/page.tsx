"use client"
import Image from "next/image";
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useRouter } from 'next/navigation';
import Link from "next/link";

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
      router.push('/chat');
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
  };

  return (
    <>
      <Navbar onGoogleSignIn={handleGoogleSignIn} />
      
      {/* Enhanced animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 overflow-hidden z-0">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-80 h-80 bg-violet-600 rounded-full mix-blend-soft-light filter blur-3xl animate-float-slow"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-600 rounded-full mix-blend-soft-light filter blur-3xl animate-float-medium"></div>
          <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-indigo-600 rounded-full mix-blend-soft-light filter blur-3xl animate-float-fast"></div>
        </div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10"></div> 
      </div>

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center py-24 px-4">
        {user ? (
          <div className="text-center space-y-8 animate-fade-in max-w-md mx-auto">
            <div className="relative">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-6 tracking-tight">
                Welcome Back
              </h1>
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-violet-500 rounded-full animate-ping"></div>
              <div className="absolute -bottom-2 -right-2 w-3 h-3 bg-purple-500 rounded-full animate-ping delay-300"></div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl transition-all hover:shadow-violet-500/20 hover:border-white/20">
              <div className="flex flex-col items-center space-y-4 mb-6">
                {user.photoURL && (
                  <div className="relative">
                    <Image
                      src={user.photoURL}
                      alt="Profile"
                      width={80}
                      height={80}
                      className="rounded-full border-2 border-violet-400/50 hover:border-violet-400 transition-all"
                    />
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-900"></div>
                  </div>
                )}
                <div>
                  <p className="text-2xl font-semibold text-white">
                    {user.displayName || 'User'}
                  </p>
                  <p className="text-violet-300 text-sm">Ready to chat</p>
                </div>
              </div>
              
              <button
                onClick={() => router.push('/chat')}
                className="group relative w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/20 flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>Enter Chat Room</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-16 animate-fade-in max-w-6xl px-4">
            {/* Hero Section */}
            <div className="relative space-y-6">
              <div className="inline-flex items-center bg-violet-900/30 text-violet-300 px-4 py-1.5 rounded-full text-sm mb-4 border border-violet-800/50">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
                Realtime messaging now available
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-violet-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent mb-4 tracking-tighter">
                Connect <span className="text-white">Seamlessly</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Experience lightning-fast messaging with end-to-end encryption and global connectivity.
              </p>
              
              <div className="flex justify-center space-x-4 mt-8">
                  <Link href="/login" className="group relative bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium py-3 px-8 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/20 flex items-center space-x-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Continue with Google</span>
                  </Link>
                
                <button className="group relative bg-transparent hover:bg-white/5 text-white font-medium py-3 px-8 rounded-xl transition-all duration-300 hover:scale-[1.02] border border-white/10 hover:border-white/20 flex items-center space-x-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Watch Demo</span>
                </button>
              </div>
              
              <div className="mt-12 relative">
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl w-full max-w-4xl mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 to-purple-900/30 backdrop-blur-sm"></div>
                  <div className="relative h-80 bg-gray-800/50 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-600/20 rounded-full mb-4 border border-violet-500/30">
                        <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Chat Interface Preview</h3>
                      <p className="text-gray-400">Experience our sleek and intuitive messaging platform</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-violet-600 rounded-full animate-bounce opacity-60"></div>
                <div className="absolute -top-4 -right-4 w-6 h-6 bg-purple-600 rounded-full animate-bounce opacity-60 delay-200"></div>
              </div>
            </div>

            {/* Features Section */}
            <div className="py-16">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center">
                  Why choose <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">our platform</span>
                </h2>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:border-white/20 group">
                    <div className="w-14 h-14 bg-gradient-to-br from-violet-600/30 to-purple-600/30 rounded-xl mb-6 flex items-center justify-center border border-white/10 group-hover:border-violet-400/30 transition-all">
                      <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Instant Delivery</h3>
                    <p className="text-gray-400">Messages arrive in real-time with our optimized infrastructure, ensuring no delays in your conversations.</p>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:border-white/20 group">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-600/30 to-indigo-600/30 rounded-xl mb-6 flex items-center justify-center border border-white/10 group-hover:border-purple-400/30 transition-all">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Military-Grade Security</h3>
                    <p className="text-gray-400">End-to-end encryption protects your messages from prying eyes, with regular security audits.</p>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:border-white/20 group">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-600/30 to-violet-600/30 rounded-xl mb-6 flex items-center justify-center border border-white/10 group-hover:border-indigo-400/30 transition-all">
                      <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Cloud Sync</h3>
                    <p className="text-gray-400">Access your conversations from any device, with seamless synchronization across all platforms.</p>
                  </div>
                  
                  <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-300 hover:border-white/20 group">
                    <div className="w-14 h-14 bg-gradient-to-br from-violet-600/30 to-indigo-600/30 rounded-xl mb-6 flex items-center justify-center border border-white/10 group-hover:border-violet-400/30 transition-all">
                      <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">Expressive Communication</h3>
                    <p className="text-gray-400">Rich media support, reactions, and typing indicators make conversations more engaging.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Final CTA */}
            <div className="max-w-3xl mx-auto bg-gradient-to-br from-gray-900 to-purple-900/50 rounded-2xl p-8 border border-white/10 shadow-2xl">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
                <p className="text-gray-300 mb-8 max-w-2xl mx-auto">Join thousands of happy users who are already enjoying seamless communication.</p>
                
                  <Link
                    href="/login"
                    className="group relative bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium py-3 px-8 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/20 flex items-center space-x-3 mx-auto"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <g transform="matrix(1, 0, 0, 1, 0, 0)">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </g>
                    </svg>
                    <span>Sign up with Google</span>
                  </Link>
                
                <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    No credit card required
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Get started in 30 seconds
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-20px) translateX(10px);
          }
        }
        
        @keyframes float-medium {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(15px) translateX(-15px);
          }
        }
        
        @keyframes float-fast {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-10px) translateX(5px);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        
        .animate-float-medium {
          animation: float-medium 6s ease-in-out infinite;
        }
        
        .animate-float-fast {
          animation: float-fast 4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}