import Link from 'next/link';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useState, useEffect } from 'react';

interface NavbarProps {
  onGoogleSignIn: () => Promise<void>;
}

const Navbar = ({ onGoogleSignIn }: NavbarProps) => {
  const [user, loading, error] = useAuthState(auth);
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    await auth.signOut();
  };

  return (
    <nav className={`fixed w-full z-50 top-0 left-0 transition-all duration-500 ${
      scrolled 
        ? 'backdrop-blur-2xl bg-black/40 border-b border-white/20 shadow-2xl shadow-black/50' 
        : 'backdrop-blur-xl bg-black/20 border-b border-white/10'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-violet-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="absolute -inset-1 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 blur transition-all duration-300"></div>
            </div>
            <div className="hidden sm:block">
              <span className="text-2xl font-black bg-gradient-to-r from-violet-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent group-hover:from-violet-200 group-hover:via-purple-200 group-hover:to-indigo-200 transition-all duration-300">
                Meu_chat
              </span>
              <div className="h-0.5 w-0 bg-gradient-to-r from-violet-400 to-purple-400 group-hover:w-full transition-all duration-300 rounded-full"></div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {user ? (
              <div className="flex items-center space-x-4">
                {/* User Profile */}
                <div className="flex items-center space-x-3 bg-white/5 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/10 hover:border-white/20 transition-all duration-300">
                  {user.photoURL && (
                    <div className="relative">
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-8 h-8 rounded-full border-2 border-violet-400/60 shadow-lg"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900"></div>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm text-white font-semibold leading-tight">
                      {user.displayName?.split(' ')[0] || 'User'}
                    </span>
                    <span className="text-xs text-gray-400 leading-tight">Online</span>
                  </div>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={handleSignOut}
                  className="group relative bg-gradient-to-r from-red-500/80 to-red-600/80 hover:from-red-500 hover:to-red-600 text-white font-semibold rounded-2xl px-5 py-2.5 transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-red-500/30 border border-red-400/30 backdrop-blur-sm"
                >
                  <span className="relative z-10 flex items-center space-x-2">
                    <svg className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-red-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                {/* Status Indicator */}
                <div className="flex items-center space-x-2 bg-green-500/10 backdrop-blur-sm rounded-full px-3 py-1.5 border border-green-400/30">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                  </div>
                  <span className="text-xs text-green-300 font-medium">Live</span>
                </div>

                {/* Login Button */}
                <Link
                  href="/login"
                  className="group relative bg-violet-600/90 hover:bg-violet-500 text-white font-medium rounded-lg px-4 py-2 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-violet-500/25 border border-violet-400/40 backdrop-blur-sm"
                >
                  <span className="relative z-10 flex items-center space-x-2">
                    <svg className="w-4 h-4 group-hover:-rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>Join Chat</span>
                  </span>
                  <div className="absolute inset-0 bg-violet-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="group relative p-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span className={`block h-0.5 w-6 bg-white rounded-full transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1' : ''}`}></span>
                <span className={`block h-0.5 w-6 bg-white rounded-full mt-1 transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block h-0.5 w-6 bg-white rounded-full mt-1 transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1' : ''}`}></span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden transition-all duration-300 overflow-hidden ${isMenuOpen ? 'max-h-96 pb-4' : 'max-h-0'}`}>
          <div className="px-2 pt-2 pb-3 space-y-3 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 mt-2">
            {user ? (
              <>
                <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
                  {user.photoURL && (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="w-10 h-10 rounded-full border-2 border-violet-400/60"
                    />
                  )}
                  <div>
                    <div className="text-white font-semibold">
                      {user.displayName?.split(' ')[0] || 'User'}
                    </div>
                    <div className="text-sm text-gray-400">Online</div>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-red-500/80 to-red-600/80 text-white font-semibold rounded-xl px-4 py-3 transition-all duration-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="w-full flex items-center justify-center space-x-2 bg-violet-600/90 text-white font-medium rounded-lg px-4 py-2.5 transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Join Chat</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced bottom glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent"></div>
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent blur-sm"></div>
    </nav>
  );
};

export default Navbar;