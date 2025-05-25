"use client";
import { useRouter, usePathname } from 'next/navigation';
import { ChatBubbleLeftRightIcon, UserGroupIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import Settings from './Settings';

export default function Sidebar({ hideMobileNav }: { hideMobileNav?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const navItems = [
    {
      name: 'Chats',
      icon: ChatBubbleLeftRightIcon,
      path: '/chat',
    },
    {
      name: 'Create Group',
      icon: UserGroupIcon,
      path: '/create-group',
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col h-full">
        {/* Top Navigation Items */}
        <div className="flex-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            
            return (
              <button
                key={item.name}
                onClick={() => router.push(item.path)}
                className={`p-3 rounded-lg mb-2 w-full transition-colors duration-200 ${
                  isActive
                    ? 'bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={item.name}
              >
                <Icon className="h-6 w-6 mx-auto" />
              </button>
            );
          })}
        </div>

        {/* Settings Button at Bottom */}
        <div className="p-4">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 rounded-lg w-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title="Settings"
          >
            <Cog6ToothIcon className="h-6 w-6 mx-auto" />
          </button>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {!hideMobileNav && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              
              return (
                <button
                  key={item.name}
                  onClick={() => router.push(item.path)}
                  className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 ${
                    isActive
                      ? 'text-violet-600 dark:text-violet-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs mt-1">{item.name}</span>
                </button>
              );
            })}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200 text-gray-600 dark:text-gray-400`}
            >
              <Cog6ToothIcon className="h-6 w-6" />
              <span className="text-xs mt-1">Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
} 