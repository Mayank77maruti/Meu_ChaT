"use client";
import { useEffect } from 'react';
import { initializePresence } from '../utils/userUtils';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initializePresence();
  }, []);

  return <>{children}</>;
} 