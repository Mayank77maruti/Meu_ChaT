'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ZEGO_CONFIG } from '../config/zego';

interface CallInterfaceProps {
  chatId: string;
  currentUser: any;
  otherUser: any;
  onEndCall: () => void;
  callType: 'audio' | 'video';
  isIncoming?: boolean;
}

interface MediaError extends Error {
  name: string;
}

const CallInterface: React.FC<CallInterfaceProps> = ({
  chatId,
  currentUser,
  otherUser,
  onEndCall,
  callType,
  isIncoming = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(isIncoming);
  const zegoInstanceRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isJoiningRef = useRef(false);

  // Generate a random ID for the room
  const generateRoomID = (length: number = 5) => {
    const chars = '12345qwertyuiopasdfgh67890jklmnbvcxzMNBVCZXASDQWERTYHGFUIOLKJP';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Get token from your server
  const generateToken = async (appID: number, userID: string) => {
    try {
      const response = await fetch(ZEGO_CONFIG.tokenServerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: appID,
          user_id: userID,
        }),
      });
      return await response.text();
    } catch (error) {
      console.error('Error generating token:', error);
      throw error;
    }
  };

  const cleanupZego = () => {
    try {
      // Stop all tracks in the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Clean up ZegoCloud instance
      if (zegoInstanceRef.current) {
        zegoInstanceRef.current = null;
      }
    } catch (error) {
      console.error('Error cleaning up ZegoCloud:', error);
    }
    setIsInitialized(false);
    isJoiningRef.current = false;
  };

  useEffect(() => {
    let mounted = true;

    const initializeCall = async () => {
      if (!containerRef.current || isJoiningRef.current || !mounted || zegoInstanceRef.current) return;

      try {
        isJoiningRef.current = true;

        // Dynamically import ZegoUIKitPrebuilt
        const { ZegoUIKitPrebuilt } = await import('@zegocloud/zego-uikit-prebuilt');

        // Request permissions first
        const constraints = callType === 'video'
          ? { video: true, audio: true }
          : { audio: true };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        const appID = ZEGO_CONFIG.appID;
        const userID = currentUser.uid;
        const userName = currentUser.displayName || 'User';
        const roomID = chatId || generateRoomID();

        // Generate token
        const token = await generateToken(appID, userID);

        // Generate kit token
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
          appID,
          token,
          roomID,
          userID,
          userName
        );

        // Create ZegoCloud instance
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zegoInstanceRef.current = zp;

        // Join room
        await zp.joinRoom({
          container: containerRef.current,
          sharedLinks: [
            {
              name: 'Personal link',
              url: window.location.origin + window.location.pathname + '?roomID=' + roomID,
            },
          ],
          scenario: {
            mode: ZegoUIKitPrebuilt.GroupCall
              // : ZegoUIKitPrebuilt.OneONoneCall,
          },
          turnOnCameraWhenJoining: callType === 'video',
          turnOnMicrophoneWhenJoining: true,
          // useCamera: callType === 'video',
          // useMicrophone: true,
          showPreJoinView: false,
          showLeavingView: false,
          onLeaveRoom: () => {
            cleanupZego();
            onEndCall();
          },
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing call:', error);
        const mediaError = error as MediaError;
        if (mediaError.name === 'NotAllowedError') {
          alert('Please allow camera/microphone access to use the call feature.');
        }
        cleanupZego();
        onEndCall();
      } finally {
        isJoiningRef.current = false;
      }
    };

    if (!isIncomingCall) {
      initializeCall();
    }

    return () => {
      mounted = false;
      cleanupZego();
    };
  }, [chatId, currentUser, callType, onEndCall, isIncomingCall]);

  if (isIncomingCall) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Incoming {callType} Call</h2>
            <p className="mb-6">From: {otherUser?.displayName || 'Unknown'}</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setIsIncomingCall(false);
                  setIsInitialized(false);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Accept
              </button>
              <button
                onClick={() => {
                  cleanupZego();
                  onEndCall();
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-4xl h-[80vh]">
        <div
          ref={containerRef}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default CallInterface; 