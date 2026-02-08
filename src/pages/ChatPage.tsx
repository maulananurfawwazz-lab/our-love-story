import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Send } from 'lucide-react';
import { format } from 'date-fns';

interface ChatMsg {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

const ChatPage = () => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const processedIds = useRef(new Set<string>());

  useEffect(() => {
    if (!profile?.couple_id) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('couple_id', profile.couple_id)
        .order('created_at', { ascending: true })
        .limit(200);
      if (data) {
        setMessages(data);
        data.forEach(m => processedIds.current.add(m.id));
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `couple_id=eq.${profile.couple_id}`,
      }, (payload) => {
        const newMsg = payload.new as ChatMsg;
        if (!processedIds.current.has(newMsg.id)) {
          processedIds.current.add(newMsg.id);
          setMessages(prev => [...prev, newMsg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.couple_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !profile?.couple_id || !user) return;
    setSending(true);
    const msg = text.trim();
    setText('');
    
    await supabase.from('chat_messages').insert({
      couple_id: profile.couple_id,
      sender_id: user.id,
      message: msg,
    });
    setSending(false);
  };

  const isMe = (senderId: string) => senderId === user?.id;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-lg mx-auto">
      {/* Header */}
      <div className="glass-card mx-4 mt-4 mb-2 p-4 text-center">
        <h2 className="font-script text-xl text-gradient-love">Chat Kita 💬</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 no-scrollbar">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${isMe(msg.sender_id) ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                isMe(msg.sender_id)
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'glass-card rounded-bl-md'
              }`}
            >
              <p className="text-sm">{msg.message}</p>
              <p className={`text-[10px] mt-1 ${
                isMe(msg.sender_id) ? 'text-primary-foreground/60' : 'text-muted-foreground'
              }`}>
                {format(new Date(msg.created_at), 'HH:mm')}
              </p>
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3">
        <div className="glass-card flex items-center gap-2 p-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Tulis pesan..."
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={sendMessage}
            disabled={sending || !text.trim()}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send size={16} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
