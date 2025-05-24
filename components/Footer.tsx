"use client"
import { useState, useEffect } from 'react';

const Footer = () => {
  const [systemStatus, setSystemStatus] = useState<'operational' | 'degraded' | 'maintenance'>('operational');
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    setLastUpdated(new Date().toLocaleTimeString());
    const interval = setInterval(() => {
      setLastUpdated(new Date().toLocaleTimeString());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="relative w-full mt-auto">
      {/* Gradient border at top */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
      
      {/* Main footer content */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/10">
        <div className="w-full max-w-screen-xl mx-auto px-6 py-8">
          {/* Status bar row */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  systemStatus === 'operational' ? 'bg-green-400' :
                  systemStatus === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                } opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  systemStatus === 'operational' ? 'bg-green-400' :
                  systemStatus === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                }`}></span>
              </span>
              <span className="text-sm font-medium bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">
                {systemStatus === 'operational' ? 'Meu_chat is online and ready' :
                 systemStatus === 'degraded' ? 'System performance degraded' :
                 'System under maintenance'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-400 font-mono">
                Last updated: {lastUpdated}
              </span>
            </div>
          </div>

          {/* Main footer content */}
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0">
            {/* Left side - Brand */}
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                  Meu_chat
                </h3>
                <p className="text-xs text-gray-400">Your personal chat universe</p>
              </div>
            </div>

            {/* Center - Links */}
            <div className="flex flex-wrap items-center justify-center gap-6">
              <a href="#" className="group flex items-center space-x-2 text-sm text-gray-400 hover:text-violet-300 transition-all duration-300">
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Privacy Policy</span>
              </a>
              <a href="#" className="group flex items-center space-x-2 text-sm text-gray-400 hover:text-violet-300 transition-all duration-300">
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Terms of Service</span>
              </a>
              <a href="#" className="group flex items-center space-x-2 text-sm text-gray-400 hover:text-violet-300 transition-all duration-300">
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Contact</span>
              </a>
              <a href="#" className="group flex items-center space-x-2 text-sm text-gray-400 hover:text-violet-300 transition-all duration-300">
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Help Center</span>
              </a>
            </div>

            {/* Right side - Social */}
            <div className="flex items-center space-x-4">
              <span className="text-xs text-gray-500 font-mono">Follow us:</span>
              <div className="flex space-x-3">
                <a href="#" className="w-8 h-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/30 transition-all duration-300 group">
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/30 transition-all duration-300 group">
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </a>
                <a href="#" className="w-8 h-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg flex items-center justify-center text-gray-400 hover:text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/30 transition-all duration-300 group">
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Bottom border with copyright */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
              <span className="text-sm text-gray-400">
                © 2025{' '}
                <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent font-semibold">
                  Meu_chat
                </span>
                . All Rights Reserved.
              </span>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>Made with</span>
                <svg className="w-3 h-3 text-red-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>for seamless connections</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom glow effect */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent"></div>
    </footer>
  );
};

export default Footer;