import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, query, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, MapPin, Calendar, Users, X, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CreateProjectModal = ({ isOpen, onClose, user, communityId = null }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'projects'), {
        title, description, location, date,
        organizerId: user.uid,
        organizerEmail: user.email,
        communityId,
        participants: [],
        participantIds: [],
        createdAt: serverTimestamp()
      });
      onClose();
      setTitle(''); setDescription(''); setLocation(''); setDate('');
    } catch (error) {
      alert("Error creating: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Create New Initiative</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Title</label><input required value={title} onChange={e=>setTitle(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" /></div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea required value={description} onChange={e=>setDescription(e.target.value)} rows="3" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Location</label><input required value={location} onChange={e=>setLocation(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" /></div>
            <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" required value={date} onChange={e=>setDate(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" /></div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-brand-500 hover:bg-brand-600 text-white py-2.5 rounded-lg font-medium mt-6">{loading ? 'Creating...' : 'Create Project'}</button>
        </form>
      </div>
    </div>
  );
};

export default function Dashboard({ user }) {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      // For Dashboard, primarily show global projects (communityId is null) or just show all. We'll show all global ones here.
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProjects(fetched.filter(p => !p.communityId)); 
    });
  }, []);

  const handleJoin = async (projectId) => {
    try {
      const pRef = doc(db, 'projects', projectId);
      const userProfileSnap = await getDoc(doc(db, 'users', user.uid));
      const username = userProfileSnap.exists() ? userProfileSnap.data().username : 'Eco Warrior';
      
      await updateDoc(pRef, {
        participants: arrayUnion({ uid: user.uid, email: user.email, username }),
        participantIds: arrayUnion(user.uid)
      });
    } catch (error) { console.error("Error joining:", error); }
  };

  const handleLeave = async (projectId) => {
    try {
      const pRef = doc(db, 'projects', projectId);
      const project = projects.find(p => p.id === projectId);
      const pToRemove = project.participants.find(p => p.uid === user.uid);
      if (pToRemove) {
        await updateDoc(pRef, {
          participants: arrayRemove(pToRemove),
          participantIds: arrayRemove(user.uid)
        });
      }
    } catch (error) { console.error("Error leaving:", error); }
  };

  const viewUserProfile = async (uid) => {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      setSelectedUser({ uid, ...snap.data() });
    } else {
      setSelectedUser({ uid, username: 'Unregistered user', bio: 'This user has not completed their profile yet.' });
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-brand-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Discover Initiatives</h2>
          <p className="text-gray-500">Find and join local sustainability projects.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-lg flex items-center shadow-md font-medium">
          <Plus size={20} className="mr-2" /> Start Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 && <p className="text-gray-500 col-span-full">No open initiatives right now.</p>}
        {projects.map(project => {
          const isOrg = project.organizerId === user.uid;
          const isJoined = project.participantIds?.includes(user.uid) || project.participants?.some(p => p.uid === user.uid);

          return (
            <div key={project.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-300 transition-colors flex flex-col shadow-sm">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">{project.title}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">{project.description}</p>
                <div className="space-y-2 mb-4 text-sm text-gray-500">
                  <div className="flex items-center"><MapPin size={16} className="mr-2 text-brand-500" />{project.location}</div>
                  <div className="flex items-center"><Calendar size={16} className="mr-2 text-brand-500" />{project.date}</div>
                  <div className="flex items-center"><Users size={16} className="mr-2 text-brand-500" />{project.participants?.length || 0} participants</div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 mt-auto">
                {isOrg ? (
                   <div className="space-y-3">
                     <div className="text-sm font-medium text-brand-600 bg-brand-50 py-2 px-3 rounded-lg text-center">Organized by you</div>
                     {project.participants?.length > 0 && (
                       <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                         <p className="font-semibold mb-2">Participant List:</p>
                         {project.participants.map(p => (
                           <div key={p.uid} className="flex justify-between items-center bg-white p-2 mb-1 rounded border border-gray-200">
                             <span className="truncate mr-2 font-medium">{p.username || p.email}</span>
                             <button onClick={() => viewUserProfile(p.uid)} className="text-brand-500 hover:text-brand-700 bg-brand-50 p-1 rounded" title="View Details">
                               <Info size={14} />
                             </button>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                ) : isJoined ? (
                  <button onClick={() => handleLeave(project.id)} className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2 rounded-lg font-medium transition-colors">Leave Project</button>
                ) : (
                  <button onClick={() => handleJoin(project.id)} className="w-full bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 py-2 rounded-lg font-medium transition-colors">Join Project</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <CreateProjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={user} />
      
      {/* User Info Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-lg text-gray-800">Participant Details</h3>
               <button onClick={()=>setSelectedUser(null)} className="text-gray-400"><X size={20}/></button>
             </div>
             <div className="space-y-3 text-sm text-gray-700">
               <p><span className="font-semibold text-gray-900">User:</span> {selectedUser.username}</p>
               <p><span className="font-semibold text-gray-900">Age:</span> {selectedUser.age || 'N/A'}</p>
               <p><span className="font-semibold text-gray-900">Occupation:</span> {selectedUser.occupation || 'N/A'}</p>
               <div className="bg-gray-50 p-3 rounded-lg"><span className="font-semibold text-gray-900 block mb-1">Bio:</span> {selectedUser.bio || 'N/A'}</div>
             </div>
             {selectedUser.uid !== user.uid && (
               <button onClick={() => navigate('/messages', { state: { otherUser: selectedUser } })} className="w-full mt-4 bg-brand-500 hover:bg-brand-600 text-white py-2 rounded-lg font-medium transition-colors">
                 Send Message
               </button>
             )}
             <button onClick={()=>setSelectedUser(null)} className="w-full mt-3 bg-gray-100 hover:bg-gray-200 py-2 rounded-lg font-medium">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}