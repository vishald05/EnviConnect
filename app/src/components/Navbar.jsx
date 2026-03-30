import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Leaf, User, Users, Home, LogOut, MessageSquare, Moon, Sun } from 'lucide-react';

export default function Navbar({ user }) {
  const location = useLocation();
  const [hasUnread, setHasUnread] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const anyUnread = snap.docs.some(d => d.data().hasUnread?.[user.uid]);
      setHasUnread(anyUnread);
    });
    return unsubscribe;
  }, [user]);

  const toggleTheme = () => {
    if (!document.startViewTransition) {
      setIsDark(!isDark);
      return;
    }
    document.startViewTransition(() => {
      setIsDark(!isDark);
    });
  };

  const isActive = (path) => location.pathname === path ? 'text-brand-600 bg-brand-100' : 'text-gray-600 hover:bg-brand-50 hover:text-brand-600';

  return (
    <header className="bg-white px-4 md:px-6 py-4 shadow-sm border-b border-brand-100 flex justify-between items-center sticky top-0 z-40">
      <div className="flex items-center space-x-2">
        <Leaf className="text-brand-600 w-6 h-6" />
        <span className="text-xl font-bold text-gray-800 hidden md:block">EnviConnect</span>
      </div>
      <nav className="flex items-center space-x-1 sm:space-x-2">
        <button onClick={toggleTheme} className="p-2 sm:px-3 sm:py-2 text-gray-600 hover:bg-brand-50 hover:text-brand-600 rounded-lg flex items-center transition-colors" title="Toggle Theme">
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <Link to="/dashboard" className={`p-2 sm:px-4 sm:py-2 rounded-lg flex items-center transition-colors ${isActive('/dashboard')}`}>
          <Home size={20} className="sm:mr-2" /> <span className="hidden sm:block font-medium">Home</span>
        </Link>
        <Link to="/communities" className={`p-2 sm:px-4 sm:py-2 rounded-lg flex items-center transition-colors ${isActive('/communities') || location.pathname.startsWith('/community/') ? 'text-brand-600 bg-brand-100' : 'text-gray-600 hover:bg-brand-50 hover:text-brand-600'}`}>
          <Users size={20} className="sm:mr-2" /> <span className="hidden sm:block font-medium">Community</span>
        </Link>
        <Link to="/messages" className={`relative p-2 sm:px-4 sm:py-2 rounded-lg flex items-center transition-colors ${isActive('/messages')}`}>
          <MessageSquare size={20} className="sm:mr-2" /> 
          <span className="hidden sm:block font-medium">Messages</span>
          {hasUnread && <span className="absolute top-1 right-1 sm:top-2 sm:right-2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>}
        </Link>
        <Link to="/profile" className={`p-2 sm:px-4 sm:py-2 rounded-lg flex items-center transition-colors ${isActive('/profile')}`}>
          <User size={20} className="sm:mr-2" /> <span className="hidden sm:block font-medium">Profile</span>
        </Link>
        <div className="w-px h-6 bg-gray-200 mx-1 sm:mx-2"></div>
        <button onClick={() => signOut(auth)} className="p-2 sm:px-2 md:px-4 sm:py-2 text-red-500 hover:bg-red-50 rounded-lg flex items-center font-medium transition-colors" title="Logout">
          <LogOut size={20} className="md:mr-2" /> <span className="hidden md:block">Logout</span>
        </button>
      </nav>
    </header>
  );
}