import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, query, collection, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Briefcase, Calendar as CalendarIcon, Settings } from 'lucide-react';

export default function Profile({ user }) {
  const [profile, setProfile] = useState({ username: '', age: '', occupation: '', bio: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [organizedProjects, setOrganizedProjects] = useState([]);
  const [joinedProjects, setJoinedProjects] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
         setIsEditing(true);
      }
      setLoading(false);
    };
    fetchProfile();

    // Fetch Organized Projects
    const qOrg = query(collection(db, 'projects'), where('organizerId', '==', user.uid));
    const unsubOrg = onSnapshot(qOrg, (snap) => setOrganizedProjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    // Fetch Joined Projects
    const qJoined = query(collection(db, 'projects'), where('participantIds', 'array-contains', user.uid));
    const unsubJoined = onSnapshot(qJoined, (snap) => setJoinedProjects(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    return () => { unsubOrg(); unsubJoined(); };
  }, [user.uid]);

  const handleSave = async (e) => {
    e.preventDefault();
    await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
    setIsEditing(false);
  };

  if (loading) return <div className="text-center py-10">Loading profile...</div>;

  const now = new Date().toISOString().split('T')[0];
  const activeJoined = joinedProjects.filter(p => !p.date || p.date >= now);
  const historyJoined = joinedProjects.filter(p => p.date && p.date < now);

  return (
     <div className="space-y-6">
       <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-brand-100">
         <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Your Profile</h1>
              <p className="text-gray-500">Manage your personal information</p>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)} 
                className="flex items-center text-sm font-medium text-brand-600 bg-brand-50 px-4 py-2 rounded-lg hover:bg-brand-100 transition-colors"
               >
                <Settings size={16} className="mr-2"/> Edit
              </button>
            )}
         </div>

         {isEditing ? (
           <form onSubmit={handleSave} className="space-y-4 max-w-xl">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
               <input required type="text" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="eco_warrior" />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                 <input type="number" required value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                 <input type="text" required value={profile.occupation} onChange={e => setProfile({...profile, occupation: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Student, Engineer..." />
               </div>
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Bio / Interests</label>
               <textarea rows="3" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="What sustainability causes do you care about?"></textarea>
             </div>
             <div className="flex space-x-3 pt-2">
               <button type="submit" className="bg-brand-500 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-600 transition-colors">Save Changes</button>
               <button type="button" onClick={() => {if(profile.username) setIsEditing(false)}} className="text-gray-600 bg-gray-100 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors">Cancel</button>
             </div>
           </form>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center text-gray-700">
                  <User className="mr-3 text-brand-500" /> 
                  <span className="font-medium mr-2">Username:</span> {profile.username || 'Not set'}
                </div>
                <div className="flex items-center text-gray-700">
                  <CalendarIcon className="mr-3 text-brand-500" /> 
                  <span className="font-medium mr-2">Age:</span> {profile.age || 'Not set'}
                </div>
                <div className="flex items-center text-gray-700">
                  <Briefcase className="mr-3 text-brand-500" /> 
                  <span className="font-medium mr-2">Occupation:</span> {profile.occupation || 'Not set'}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-2">About me</h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{profile.bio || 'No bio added yet.'}</p>
              </div>
            </div>
         )}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Joined */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Active Projects Joined</h2>
            {activeJoined.length === 0 ? <p className="text-gray-500 text-sm">No active projects joined.</p> : (
              <ul className="space-y-3">
                {activeJoined.map(p => (
                  <li key={p.id} className="p-3 bg-brand-50 rounded-lg flex flex-col">
                    <p className="font-semibold text-gray-800">{p.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{p.date} • {p.location}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Organized */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-brand-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Projects Organized</h2>
            {organizedProjects.length === 0 ? <p className="text-gray-500 text-sm">You haven't organized any projects.</p> : (
              <ul className="space-y-3">
                {organizedProjects.map(p => (
                  <li key={p.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                     <p className="font-semibold text-gray-800">{p.title}</p>
                     <p className="text-xs text-gray-500 mt-1">{p.date} • {p.participants?.length || 0} participants</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* History */}
          <div className="md:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-brand-100">
            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Project History (Completed)</h2>
            {historyJoined.length === 0 ? <p className="text-gray-500 text-sm">No past projects.</p> : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {historyJoined.map(p => (
                  <li key={p.id} className="p-3 bg-gray-50 border border-gray-100 rounded-lg opacity-75">
                     <p className="font-semibold text-gray-600">{p.title}</p>
                     <p className="text-xs text-gray-500 mt-1">Completed on: {p.date}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
       </div>
     </div>
  );
}