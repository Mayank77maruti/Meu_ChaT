"use client";
import { useRouter, usePathname } from 'next/navigation';
import { ChatBubbleLeftRightIcon, UserGroupIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import Settings from './Settings';

export default function Sidebar() {
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
    <div className="w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
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
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
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
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 rounded-lg w-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
          title="Settings"
        >
          <Cog6ToothIcon className="h-6 w-6 mx-auto" />
        </button>
      </div>

      {/* Settings Modal */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
} 