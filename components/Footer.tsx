const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-900 shadow m-4">
      <div className="w-full max-w-screen-xl mx-auto p-4 md:py-8">
        <span className="block text-sm text-gray-500 sm:text-center dark:text-gray-400">
          © 2025{' '}
          <a href="/" className="hover:underline">
            Chat App
          </a>
          . All Rights Reserved.
        </span>
      </div>
    </footer>
  );
};

export default Footer;