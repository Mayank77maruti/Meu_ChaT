"use client";
import { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { UserProfile, updateUserProfile, cleanupPresence } from '../utils/userUtils';
import { useAuthState } from 'react-firebase-hooks/auth';
import { CldUploadWidget } from 'next-cloudinary';

export default function Settings({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      
      // Start the cleanup process but don't wait for it
      cleanupPresence().catch(console.error);
      
      // Force sign out and redirect after a short delay
      setTimeout(async () => {
        try {
          await signOut(auth);
          router.push('/');
        } catch (error) {
          console.error('Error during forced sign out:', error);
          router.push('/');
        }
      }, 1000); // 1 second delay
      
    } catch (error) {
      console.error('Error during logout:', error);
      // Force sign out and redirect on error
      signOut(auth).finally(() => router.push('/'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateUserProfile({ displayName: displayName.trim() });
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDisplayName(user?.displayName || '');
    setError('');
  };

  const handleUploadSuccess = async (result: any) => {
    try {
      setIsUploading(true);
      setError('');
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image: result.info.secure_url,
          publicId: result.info.public_id,
          uid: user.uid
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile picture');
      }

      const data = await response.json();
      
      // Update Firebase Auth profile
      await updateProfile(user, {
        photoURL: result.info.secure_url
      });

      setSuccess('Profile picture updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to update profile picture');
      console.error('Error updating profile picture:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Profile Section */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-gray-500 dark:text-gray-400">
                    {user?.displayName?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              <CldUploadWidget
                uploadPreset="profile_pictures"
                onSuccess={handleUploadSuccess}
              >
                {({ open }) => (
                  <button
                    onClick={() => open()}
                    disabled={isUploading}
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <span className="text-white text-sm">
                      {isUploading ? 'Uploading...' : 'Change Photo'}
                    </span>
                  </button>
                )}
              </CldUploadWidget>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {user?.displayName || 'User'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            </div>
          </div>

          {/* Edit Profile Form */}
          <form onSubmit={handleUpdateProfile}>
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Display Name
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isEditing || isLoading}
                  className="flex-1 p-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                  className="ml-2 px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>
            </div>

            {isEditing && (
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            )}

            {error && (
              <p className="mt-2 text-sm text-red-500 dark:text-red-400">{error}</p>
            )}

            {success && (
              <p className="mt-2 text-sm text-green-500 dark:text-green-400">{success}</p>
            )}
          </form>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full mt-6 px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
} 