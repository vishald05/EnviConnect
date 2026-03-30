import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, query, collection, where, arrayUnion, arrayRemove, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CreateProjectModal } from './Dashboard';
import { ArrowLeft, Users, Plus, MapPin, Calendar, Info, X } from 'lucide-react';

export default function CommunityDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const unsubComm = onSnapshot(doc(db, 'communities', id), doc => setCommunity({id: doc.id, ...doc.data()}));
    const qProjects = query(collection(db, 'projects'), where('communityId', '==', id));
    const unsubProj = onSnapshot(qProjects, snap => setProjects(snap.docs.map(d=>({id: d.id, ...d.data()}))));
    return () => { unsubComm(); unsubProj(); };
  }, [id]);

  if (!community) return <div className="text-center py-10">Loading...</div>;

  const isJoined = community.memberIds?.includes(user.uid);

  const handleProjectJoin = async (projectId) => {
    try {
      const pRef = doc(db, 'projects', projectId);
      const userProfileSnap = await getDoc(doc(db, 'users', user.uid));
      const username = userProfileSnap.exists() ? userProfileSnap.data().username : 'Eco Warrior';
      await updateDoc(pRef, {
        participants: arrayUnion({ uid: user.uid, email: user.email, username }),
        participantIds: arrayUnion(user.uid)
      });
    } catch (e) { console.error(e); }
  };

  const handleProjectLeave = async (projectId) => {
    try {
      const pRef = doc(db, 'projects', projectId);
      const project = projects.find(p => p.id === projectId);
      const pToRemove = project.participants.find(p => p.uid === user.uid);
      if (pToRemove) await updateDoc(pRef, { participants: arrayRemove(pToRemove), participantIds: arrayRemove(user.uid) });
    } catch (e) { console.error(e); }
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
    <div className="space-y-6">
      <Link to="/communities" className="inline-flex items-center text-brand-600 font-medium hover:underline"><ArrowLeft size={16} className="mr-2"/> Back to Communities</Link>
      
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-brand-100">
        <div className="flex justify-between items-start">
           <div>
             <h1 className="text-3xl font-bold text-gray-800 mb-2">{community.name}</h1>
             <p className="text-gray-600 max-w-2xl">{community.description}</p>
             <div className="mt-4 flex items-center text-gray-500 font-medium bg-gray-50 inline-flex px-3 py-1.5 rounded-lg">
               <Users size={18} className="mr-2 text-brand-500"/> {community.memberIds?.length || 0} Members
             </div>
           </div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-brand-100">
        <h2 className="text-xl font-bold text-gray-800">Community Projects</h2>
        {isJoined && (
           <button onClick={() => setIsModalOpen(true)} className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center font-medium">
             <Plus size={18} className="mr-2"/> New Project
           </button>
        )}
      </div>

      {!isJoined && (
         <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-xl text-center">
           Join the community to participate in or create projects here!
         </div>
      )}

      {isJoined && projects.length === 0 && <p className="text-center text-gray-500 mt-6">No projects yet. Start one!</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map(project => {
          const isOrg = project.organizerId === user.uid;
          const isProjJoined = project.participantIds?.includes(user.uid) || project.participants?.some(p => p.uid === user.uid);

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
                ) : isProjJoined ? (
                  <button onClick={() => handleProjectLeave(project.id)} disabled={!isJoined} className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2 rounded-lg font-medium transition-colors">Leave Project</button>
                ) : (
                  <button onClick={() => handleProjectJoin(project.id)} disabled={!isJoined} className="w-full bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 py-2 rounded-lg font-medium transition-colors disabled:opacity-50">Join Project</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CreateProjectModal communityId={id} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} user={user} />
      
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