import { NextResponse } from 'next/server';
import cloudinary from '../../../utils/cloudinary';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

export async function POST(request: Request) {
  try {
    const { image, publicId, uid } = await request.json();
    
    if (!image || !publicId || !uid) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Update user document in Firestore
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      photoURL: image,
      photoPublicId: publicId,
    }, { merge: true });

    return NextResponse.json({ 
      message: 'Profile picture updated successfully',
      photoURL: image 
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update profile picture' 
    }, { status: 500 });
  }
} 