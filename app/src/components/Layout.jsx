import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout({ user }) {
  return (
    <div className="min-h-screen bg-brand-50 text-gray-900">
      <Navbar user={user} />
      <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        <Outlet />
      </div>
    </div>
  );
}