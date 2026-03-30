import { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreateCommunityModal = ({ isOpen, onClose, user }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'communities'), {
        name, description, 
        createdBy: user.uid,
        memberIds: [user.uid],
        createdAt: serverTimestamp()
      });
      onClose();
      setName(''); setDescription('');
    } catch (err) { alert(err.message); } 
    finally { setLoading(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center p-4 z-50">
      <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
        <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">Create Community</h3><button onClick={onClose}><X size={20}/></button></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm mb-1 font-medium">Name</label><input required value={name} onChange={e=>setName(e.target.value)} className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
          <div><label className="block text-sm mb-1 font-medium">Description</label><textarea required rows="3" value={description} onChange={e=>setDescription(e.target.value)} className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-brand-500" /></div>
          <button disabled={loading} type="submit" className="w-full bg-brand-500 text-white rounded-lg py-2.5 font-medium">{loading ? 'Creating...' : 'Create'}</button>
        </form>
      </div>
    </div>
  );
};

export default function Communities({ user }) {
  const [communities, setCommunities] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'communities'));
    return onSnapshot(q, (snap) => setCommunities(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  }, []);

  const toggleJoin = async (community, isJoined) => {
    const ref = doc(db, 'communities', community.id);
    if (isJoined) await updateDoc(ref, { memberIds: arrayRemove(user.uid) });
    else await updateDoc(ref, { memberIds: arrayUnion(user.uid) });
  };

  return (
    <div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-100 flex justify-between items-center mb-6">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Communities</h2>
           <p className="text-gray-500">Find environmental groups to join.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center bg-brand-500 text-white px-5 py-2.5 rounded-lg font-medium"><Plus size={20} className="mr-2"/> Create</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {communities.map(c => {
          const isJoined = c.memberIds?.includes(user.uid);
          return (
            <div key={c.id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col hover:border-brand-300">
               <div className="flex-1 mb-4">
                 <h3 className="text-lg font-bold text-gray-800 mb-1">{c.name}</h3>
                 <p className="text-sm text-gray-600 line-clamp-2">{c.description}</p>
                 <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded inline-flex items-center mt-3"><Users size={12} className="mr-1"/> {c.memberIds?.length || 0} members</span>
               </div>
               <div className="flex space-x-2 pt-4 border-t border-gray-100">
                 {isJoined ? (
                    <button onClick={() => toggleJoin(c, true)} className="flex-1 bg-red-50 text-red-600 border border-red-100 py-2 rounded-lg text-sm font-medium">Leave</button>
                 ) : (
                    <button onClick={() => toggleJoin(c, false)} className="flex-1 bg-brand-50 text-brand-700 border border-brand-200 py-2 rounded-lg text-sm font-medium">Join</button>
                 )}
                 <Link to={`/community/${c.id}`} className="flex-1 bg-gray-50 text-gray-700 border border-gray-200 py-2 rounded-lg text-sm font-medium text-center hover:bg-gray-100 transition-colors">View</Link>
               </div>
            </div>
          );
        })}
      </div>

      <CreateCommunityModal user={user} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}