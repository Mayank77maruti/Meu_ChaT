import { NextResponse } from 'next/server';;
import { getFirestore, doc, setDoc } from 'firebase/firestore';;
import { app } from '../../../firebase';;
 
 const db = getFirestore(app);
 
 export async function POST(request: Request) {
  try {
    const { uid, publicKey } = await request.json();
     await setDoc(doc(db, 'users', uid), {
       publicKey: publicKey,
    }, { merge: true });
    return NextResponse.json({ message: 'Public key updated successfully' }, { status: 200 });
  } catch (error) {
     console.error("Error updating public key:", error);
    return NextResponse.json({ message: 'Error updating public key' }, { status: 500 });
  }
}