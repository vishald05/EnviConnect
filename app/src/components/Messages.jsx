import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, setDoc, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Send, User, MessageCircle } from 'lucide-react';

export default function Messages({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom when messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle arriving from clicking "Message" on someone's profile
  useEffect(() => {
    if (location.state?.otherUser) {
      const other = location.state.otherUser;
      const chatId = [user.uid, other.uid].sort().join('_');
      setActiveChat({ id: chatId, otherUser: other });
      // Clear location state so refresh doesn't reset it
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate, user.uid]);

  // Fetch all user's chats
  useEffect(() => {
    // Note: We fetch without orderBy first to avoid requiring a composite index, then sort locally
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
      setChats(items);
    });
    return unsubscribe;
  }, [user.uid]);

  // Fetch messages for the currently active chat
  useEffect(() => {
    if (!activeChat) return;
    const q = query(collection(db, `chats/${activeChat.id}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsubscribe;
  }, [activeChat]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeChat) return;
    
    const msgText = text.trim();
    setText(''); // clear input early

    const chatRef = doc(db, 'chats', activeChat.id);
    const myName = user.displayName || user.email.split('@')[0];
    const otherName = activeChat.otherUser.username || activeChat.otherUser.email?.split('@')[0] || 'User';

    // Update or create chat document
    await setDoc(chatRef, {
      participants: [user.uid, activeChat.otherUser.uid],
      participantDetails: {
        [user.uid]: { email: user.email, username: myName },
        [activeChat.otherUser.uid]: { email: activeChat.otherUser.email || '', username: otherName },
      },
      lastMessage: msgText,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Add actual message
    await addDoc(collection(db, `chats/${activeChat.id}/messages`), {
      text: msgText,
      senderId: user.uid,
      createdAt: serverTimestamp()
    });
  };

  // Extract other user from chat doc for left sidebar rendering
  const getOtherUser = (chatDoc) => {
    const otherUid = chatDoc.participants.find(id => id !== user.uid);
    return { uid: otherUid, ...chatDoc.participantDetails?.[otherUid] };
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-brand-100 flex overflow-hidden min-h-[70vh] max-h-[85vh]">
      
      {/* Left Sidebar - Chat List */}
      <div className={`w-full md:w-1/3 border-r border-brand-100 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-brand-100 bg-brand-50/50">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <MessageCircle className="mr-2 text-brand-500" /> Messages
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <p className="p-6 text-center text-gray-500 text-sm">No recent conversations. Start one from a profile.</p>
          ) : (
            chats.map(chat => {
              const otherUser = getOtherUser(chat);
              const isActive = activeChat?.id === chat.id;
              return (
                <button 
                  key={chat.id} 
                  onClick={() => setActiveChat({ id: chat.id, otherUser })}
                  className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center space-x-3 ${isActive ? 'bg-brand-50 border-l-4 border-l-brand-500' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="bg-gray-200 p-2 rounded-full hidden sm:block"><User size={20} className="text-gray-500" /></div>
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-semibold text-gray-800 truncate">{otherUser.username}</h3>
                    <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right Panel - Active Chat Screen */}
      <div className={`w-full md:w-2/3 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center z-10 shadow-sm">
              <div className="flex items-center">
                <button onClick={() => setActiveChat(null)} className="mr-3 md:hidden text-gray-500 hover:text-gray-700">← Back</button>
                <div className="bg-brand-100 p-2 rounded-full mr-3"><User size={20} className="text-brand-600" /></div>
                <h3 className="font-bold text-gray-800 text-lg">{activeChat.otherUser.username}</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col space-y-3">
              {messages.length === 0 && <p className="text-center text-gray-400 mt-4 text-sm">No messages yet. Say hello!</p>}
              
              {messages.map(m => {
                const isMe = m.senderId === user.uid;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'items-end justify-end' : 'items-start justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${isMe ? 'bg-brand-500 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-gray-200">
              <form onSubmit={handleSend} className="flex items-center space-x-2">
                <input 
                  type="text" 
                  value={text} 
                  onChange={e => setText(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
                <button 
                  type="submit" 
                  disabled={!text.trim()} 
                  className="bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-full transition-colors flex items-center justify-center shadow-sm font-medium"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-gray-50/50">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4">
              <MessageCircle size={48} className="text-brand-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-700">Your Messages</h3>
            <p className="text-gray-500 mt-2 max-w-sm">Select a conversation from the sidebar or click "Message" on someone's profile to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}