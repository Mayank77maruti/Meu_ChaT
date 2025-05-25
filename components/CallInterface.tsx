import React, { useEffect, useRef, useState } from 'react';
import { getDatabase, ref, onValue, set, remove } from 'firebase/database';
import { UserProfile } from '../utils/userUtils';
import IncomingCallNotification from './IncomingCallNotification';

interface CallInterfaceProps {
  chatId: string;
  currentUser: any;
  otherUser: UserProfile | null;
  onEndCall: () => void;
  callType: 'audio' | 'video';
  isIncoming?: boolean;
}

const CallInterface: React.FC<CallInterfaceProps> = ({
  chatId,
  currentUser,
  otherUser,
  onEndCall,
  callType,
  isIncoming = false,
}) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCallAccepted, setIsCallAccepted] = useState(false);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [isInitiator, setIsInitiator] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState<any>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const rtdb = getDatabase();

  const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  useEffect(() => {
    let isInitialized = false;
    let unsubscribe: (() => void) | null = null;
    let isCleaningUp = false;
    let initialCallData: any = null;

    // Check if we're in a secure context
    const isSecureContext = window.isSecureContext;
    if (!isSecureContext) {
      console.error('Media devices require a secure context (HTTPS or localhost)');
      alert('Video/audio calls require a secure connection. Please use HTTPS or localhost.');
      onEndCall();
      return;
    }

    // Initialize media stream
    const initializeMedia = async () => {
      if (isInitialized || isCleaningUp) {
        console.log('Media already initialized or cleaning up, skipping...');
        return;
      }

      try {
        console.log('Starting media initialization...');
        const constraints = {
          audio: true,
          video: callType === 'video' ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } : false
        };

        console.log('Requesting media with constraints:', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Media stream obtained successfully');
        
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          console.log('Local video stream set');
        }

        // Initialize peer connection
        console.log('Initializing peer connection...');
        const pc = new RTCPeerConnection(servers);
        peerConnectionRef.current = pc;

        // Add local tracks to peer connection
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
        console.log('Local tracks added to peer connection');

        // Handle incoming tracks
        pc.ontrack = (event) => {
          console.log('Received remote track');
          const [remoteStream] = event.streams;
          setRemoteStream(remoteStream);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            console.log('Remote video stream set');
          }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('New ICE candidate');
            set(ref(rtdb, `calls/${chatId}/candidates/${currentUser.uid}`), {
              type: 'ice-candidate',
              candidate: event.candidate.toJSON(),
              from: currentUser.uid,
              to: otherUser?.uid,
            });
          }
        };

        // If we're the initiator, create and send offer
        if (isInitiator) {
          console.log('Creating offer as initiator');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          // Create call notification data
          const callData = {
            type: 'offer',
            offer,
            from: currentUser.uid,
            to: otherUser?.uid,
            callType: callType,
            timestamp: Date.now(),
            status: 'ringing'
          };

          // Set call data in Firebase
          set(ref(rtdb, `calls/${chatId}`), callData);
          console.log('Call notification sent');
        }

        // Listen for call signals
        console.log('Setting up call signal listener');
        const callRef = ref(rtdb, `calls/${chatId}`);
        unsubscribe = onValue(callRef, async (snapshot) => {
          if (isCleaningUp) return;

          const data = snapshot.val();
          if (!data) return;

          console.log('Received call signal:', data.type);
          
          // Store initial call data
          if (!initialCallData) {
            initialCallData = data;
            console.log('Stored initial call data:', initialCallData);
          }
          
          if (data.type === 'offer' && !isInitiator) {
            console.log('Received incoming call offer');
            setIncomingCallData(data);
            setShowIncomingCall(true);
            return;
          }

          // Only process end-call if it's different from initial data
          if (data.type === 'end-call' && data !== initialCallData) {
            console.log('Received end-call signal, cleaning up...');
            isCleaningUp = true;
            handleEndCall();
            return;
          }

          if (isCallEnded) return;

          if (data.type === 'answer' && isInitiator) {
            await handleCallAnswer(data);
          } else if (data.type === 'ice-candidate') {
            await handleIceCandidate(data);
          }
        });

        // Set call as active after successful initialization
        console.log('Setting call as active');
        setIsCallActive(true);
        isInitialized = true;
      } catch (error) {
        console.error('Error initializing media:', error);
        handleMediaError(error);
      }
    };

    if (!isIncoming) {
      initializeMedia();
    }

    return () => {
      if (!isCleaningUp) {
        console.log('Component unmounting, cleaning up...');
        isCleaningUp = true;
        if (unsubscribe) {
          unsubscribe();
        }
        cleanup();
      }
    };
  }, [chatId, isInitiator, callType, isIncoming]);

  // Add a debug effect to monitor state changes
  useEffect(() => {
    console.log('Call state:', {
      isCallActive,
      hasLocalStream: !!localStream,
      hasRemoteStream: !!remoteStream,
      isInitiator,
      isCallEnded
    });
  }, [isCallActive, localStream, remoteStream, isInitiator, isCallEnded]);

  const handleMediaError = (error: any) => {
    if (error.name === 'NotAllowedError') {
      alert('Camera/microphone access was denied. Please allow access to use video/audio calls.');
    } else if (error.name === 'NotFoundError') {
      alert('No camera/microphone found on your device.');
    } else if (error.name === 'NotReadableError') {
      alert('Your camera/microphone is already in use by another application.');
    } else {
      alert('Error accessing camera/microphone. Please check your device settings.');
    }
    onEndCall();
  };

  const handleCallAnswer = async (data: any) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      setIsCallAccepted(true);
    } catch (error) {
      console.error('Error handling call answer:', error);
      handleEndCall();
    }
  };

  const handleIceCandidate = async (data: any) => {
    if (!peerConnectionRef.current) return;

    try {
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const cleanup = () => {
    if (isCallEnded) return;
    
    console.log('Cleaning up media and connections...');
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      console.log('Closed peer connection');
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsCallActive(false);
  };

  const handleEndCall = () => {
    if (isCallEnded) return;
    
    console.log('Handling end call...');
    cleanup();
    setIsCallEnded(true);
    
    // Update call status to ended before removing
    set(ref(rtdb, `calls/${chatId}`), {
      type: 'end-call',
      from: currentUser.uid,
      to: otherUser?.uid,
      status: 'ended',
      timestamp: Date.now()
    }).then(() => {
      // Remove the call data after a short delay to ensure the end-call signal is received
      setTimeout(() => {
        remove(ref(rtdb, `calls/${chatId}`)).then(() => {
          console.log('Call data removed from Firebase');
          onEndCall();
        }).catch(error => {
          console.error('Error removing call data:', error);
          onEndCall();
        });
      }, 1000);
    });
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Add mobile device detection
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Add a function to start the call
  const startCall = async () => {
    if (!peerConnectionRef.current) return;
    
    try {
      setIsInitiator(true);
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      set(ref(rtdb, `calls/${chatId}`), {
        type: 'offer',
        offer,
        from: currentUser.uid,
        to: otherUser?.uid,
      });
      
      setIsCallActive(true);
    } catch (error) {
      console.error('Error starting call:', error);
      handleEndCall();
    }
  };

  // Add this new function to handle incoming call acceptance
  const handleAcceptCall = async () => {
    if (!incomingCallData) return;
    
    try {
      console.log('Accepting incoming call...');
      setShowIncomingCall(false);
      setIsInitiator(false);
      
      // Initialize media and handle the call
      const initializeMediaForIncomingCall = async () => {
        try {
          console.log('Starting media initialization for incoming call...');
          const constraints = {
            audio: true,
            video: incomingCallData.callType === 'video' ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user'
            } : false
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          const pc = new RTCPeerConnection(servers);
          peerConnectionRef.current = pc;

          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });

          pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            setRemoteStream(remoteStream);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription(incomingCallData.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          set(ref(rtdb, `calls/${chatId}`), {
            ...incomingCallData,
            type: 'answer',
            answer,
            status: 'accepted',
            timestamp: Date.now()
          });

          setIsCallAccepted(true);
          setIsCallActive(true);
        } catch (error) {
          console.error('Error initializing media for incoming call:', error);
          handleEndCall();
        }
      };

      await initializeMediaForIncomingCall();
    } catch (error) {
      console.error('Error accepting call:', error);
      handleEndCall();
    }
  };

  // Add this new function to handle incoming call rejection
  const handleRejectCall = () => {
    console.log('Rejecting incoming call...');
    setShowIncomingCall(false);
    handleEndCall();
  };

  // Render the incoming call notification if needed
  if (showIncomingCall && incomingCallData) {
    return (
      <IncomingCallNotification
        caller={otherUser!}
        callType={incomingCallData.callType}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 w-full max-w-4xl">
        {!isCallActive ? (
          <div className="flex flex-col items-center justify-center p-8">
            <h2 className="text-xl font-semibold mb-4">Initializing Call...</h2>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-sm text-gray-500">Please allow camera/microphone access if prompted</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className={`grid ${isMobileDevice() ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              {/* Remote Video */}
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                {remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    {otherUser?.displayName || 'Remote User'}
                  </div>
                )}
              </div>

              {/* Local Video - Only show in non-mobile or if explicitly requested */}
              {(!isMobileDevice() || callType === 'video') && (
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  {localStream ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      You
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Call Controls */}
            <div className="flex justify-center space-x-4 mt-4">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full ${
                  isMuted
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {isMuted ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  )}
                </svg>
              </button>

              {callType === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full ${
                    isVideoOff
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-gray-600 hover:bg-gray-700'
                  }`}
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {isVideoOff ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    )}
                  </svg>
                </button>
              )}

              <button
                onClick={handleEndCall}
                className="p-3 rounded-full bg-red-500 hover:bg-red-600"
              >
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallInterface; 