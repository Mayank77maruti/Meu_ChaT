"use client";
import { useState, useRef, useEffect } from 'react';
import { FaceSmileIcon } from '@heroicons/react/24/outline';
import EmojiPickerReact, { EmojiClickData, Theme } from 'emoji-picker-react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
  theme?: Theme;
}

export default function EmojiPicker({ onSelect, position = 'bottom', theme = Theme.LIGHT }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect(emojiData.emoji);
    setIsOpen(false);
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2 left-0';
      case 'bottom':
        return 'top-full mt-2 left-0';
      case 'left':
        return 'right-full mr-2 top-0';
      case 'right':
        return 'left-full ml-2 top-0';
      default:
        return 'top-full mt-2 left-0';
    }
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
        title="Add reaction"
      >
        <FaceSmileIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div className={`absolute ${getPositionClasses()} z-50`}>
          <div className="shadow-lg rounded-lg overflow-hidden">
            <EmojiPickerReact
              onEmojiClick={handleEmojiClick}
              width={300}
              height={400}
              theme={theme}
              searchDisabled
              skinTonesDisabled
              previewConfig={{
                showPreview: false
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
} 