import Link from 'next/link';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface NavbarProps {
  onGoogleSignIn: () => Promise<void>;
}

const Navbar = ({ onGoogleSignIn }: NavbarProps) => {
  const [user, loading, error] = useAuthState(auth);

  const handleSignOut = async () => {
    await auth.signOut();
  };

  return (
    <nav className="bg-white dark:bg-gray-900 fixed w-full z-20 top-0 left-0 border-b border-gray-200 dark:border-gray-600">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <Link href="/" className="flex items-center">
          <span className="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">Chat App</span>
        </Link>
        <div className="flex md:order-2">
          {user ? (
            <button
              onClick={handleSignOut}
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mr-2"
            >
              Logout
            </button>
          ) : (
            // <button
            //   onClick={onGoogleSignIn}
            //   className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mr-2"
            // >
            //   Login
            // </button>
            <Link
              href="/login"
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mr-2"
            >
              Login/Signup
            </Link>
          )}
          {/* {!user && (
            <Link
              href="/login"
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 mr-2"
            >
              Login/Signup
            </Link>
          )} */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;