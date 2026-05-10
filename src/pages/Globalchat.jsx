import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Smile, 
  MoreVertical, 
  Check, 
  CheckCheck, 
  Reply, 
  X, 
  Hash,
  Info
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";

const EMOJIS = ["👍","🔥","💪","🏆","😂","❤️","👏","🎮","⚡","💀","🎯","💎","👑","🤝","💣","👀"];

const ROLE_BADGES = {
  super_admin: { label: "SUPER", color: "bg-red-500", text: "text-white" },
  founder: { label: "FOUNDER", color: "bg-purple-600", text: "text-white" },
  fondateur: { label: "FOUNDER", color: "bg-purple-600", text: "text-white" },
  admin: { label: "ADMIN", color: "bg-orange-500", text: "text-white" },
  designer: { label: "DESIGN", color: "bg-emerald-500", text: "text-white" },
};

function DateSeparator({ date }) {
  let label = format(new Date(date), "dd MMMM yyyy");
  if (isToday(new Date(date))) label = "Aujourd'hui";
  else if (isYesterday(new Date(date))) label = "Hier";

  return (
    <div className="flex justify-center my-6">
      <span className="bg-white/5 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest border border-white/5">
        {label}
      </span>
    </div>
  );
}

export default function GlobalChat() {
  const { profile } = useOutletContext() || {};
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel("global_arena_v4")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (payload) => {
        const { data } = await supabase
          .from("chat_messages")
          .select("*, sender:profiles(id, username, full_name, avatar_url, role)")
          .eq("id", payload.new.id)
          .single();
        if (data) setMessages(prev => [...prev, data]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, sender:profiles(id, username, full_name, avatar_url, role)")
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages(data || []);
    setLoading(false);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMsg.trim() || !profile?.id || sending) return;

    setSending(true);
    const content = newMsg.trim();
    const reply_data = replyTo ? { id: replyTo.id, content: replyTo.content, sender: replyTo.sender?.username || replyTo.sender?.full_name } : null;
    
    setNewMsg("");
    setReplyTo(null);
    setShowEmoji(false);

    const { error } = await supabase.from("chat_messages").insert([{
      sender_id: profile.id,
      content,
      reply_to: reply_data,
      channel: "global"
    }]);

    if (error) console.error(error);
    setSending(false);
    inputRef.current?.focus();
  };

  if (loading) return (
    <div className="h-[calc(100vh-120px)] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-mint/20 border-t-mint rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-[calc(100vh-112px)] flex flex-col bg-obsidian-deep/40 backdrop-blur-3xl relative overflow-hidden">
      {/* WhatsApp Style Header */}
      <header className="sticky top-0 z-50 bg-obsidian-light/60 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-mint/10 border border-mint/20 flex items-center justify-center text-mint shadow-neon-mint">
              <Hash size={20} />
           </div>
           <div>
              <h2 className="font-heading font-black text-white uppercase tracking-tight">Global Arena</h2>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
                 <span className="text-[10px] font-black text-mint uppercase tracking-widest">Active Combatants: {messages.length > 0 ? messages.length : 0}</span>
              </div>
           </div>
        </div>
        <button className="p-2 text-slate-500 hover:text-white transition-colors">
          <Info size={20} />
        </button>
      </header>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-1 scrollbar-hide"
      >
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === profile?.id;
          const prevMsg = messages[i - 1];
          const nextMsg = messages[i + 1];
          
          const isFirstInBurst = !prevMsg || prevMsg.sender_id !== msg.sender_id || (new Date(msg.created_at) - new Date(prevMsg.created_at) > 180000);
          const isLastInBurst = !nextMsg || nextMsg.sender_id !== msg.sender_id || (new Date(nextMsg.created_at) - new Date(msg.created_at) > 180000);
          
          const showDate = !prevMsg || format(new Date(msg.created_at), "yyyy-MM-dd") !== format(new Date(prevMsg.created_at), "yyyy-MM-dd");

          return (
            <div key={msg.id}>
              {showDate && <DateSeparator date={msg.created_at} />}
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-0.5`}
                onDoubleClick={() => setReplyTo(msg)}
              >
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                  
                  {isFirstInBurst && !isMe && (
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-3 mb-1 mt-3 flex items-center gap-2">
                      {msg.sender?.username || msg.sender?.full_name || "Unknown"}
                      {ROLE_BADGES[msg.sender?.role] && (
                        <span className={`${ROLE_BADGES[msg.sender?.role].color} ${ROLE_BADGES[msg.sender?.role].text} px-1.5 py-0.5 rounded text-[8px] font-black`}>
                          {ROLE_BADGES[msg.sender?.role].label}
                        </span>
                      )}
                    </span>
                  )}

                  <div className={`relative p-3 rounded-2xl group transition-all ${
                    isMe 
                      ? `bg-mint text-obsidian ${isFirstInBurst ? 'rounded-tr-none' : ''} ${isLastInBurst ? 'rounded-br-3xl' : ''}` 
                      : `bg-white/5 border border-white/5 text-white ${isFirstInBurst ? 'rounded-tl-none' : ''} ${isLastInBurst ? 'rounded-bl-3xl' : ''}`
                  }`}>
                    
                    {/* Reply Quote */}
                    {msg.reply_to && (
                      <div className={`mb-2 p-2 rounded-lg border-l-4 text-[11px] overflow-hidden ${
                        isMe ? 'bg-black/10 border-obsidian/40' : 'bg-white/5 border-mint/40'
                      }`}>
                        <p className="font-black uppercase opacity-60 truncate">{msg.reply_to.sender}</p>
                        <p className="truncate opacity-80">{msg.reply_to.content}</p>
                      </div>
                    )}

                    <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                    
                    <div className="flex items-center justify-end gap-1.5 mt-1 opacity-40">
                      <span className="text-[9px] font-black tracking-tighter">
                        {format(new Date(msg.created_at), "HH:mm")}
                      </span>
                      {isMe && <CheckCheck size={12} />}
                    </div>

                    {/* Quick Reply Button on Hover */}
                    <button 
                      onClick={() => setReplyTo(msg)}
                      className={`absolute top-0 ${isMe ? '-left-10' : '-right-10'} p-2 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity`}
                    >
                      <Reply size={14} className="text-slate-500" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>

      {/* Composer Area */}
      <footer className="bg-obsidian-light/80 backdrop-blur-2xl border-t border-white/5 p-4 md:p-6 pb-safe">
        
        {/* Reply Preview */}
        <AnimatePresence>
          {replyTo && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-white/5 border-l-4 border-mint p-3 mb-4 rounded-r-xl flex items-center justify-between"
            >
              <div className="overflow-hidden">
                 <p className="text-[10px] font-black text-mint uppercase tracking-widest">Replying to {replyTo.sender?.username}</p>
                 <p className="text-xs text-slate-400 truncate mt-1">{replyTo.content}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X size={16} className="text-slate-500" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-4 max-w-7xl mx-auto">
          <div className="relative flex-1">
             <div className="absolute left-4 bottom-4">
                <button 
                  onClick={() => setShowEmoji(!showEmoji)}
                  className={`p-1 transition-colors ${showEmoji ? 'text-mint' : 'text-slate-500 hover:text-white'}`}
                >
                  <Smile size={22} />
                </button>
             </div>

             <textarea
                ref={inputRef}
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Synchronize tactical intel..."
                className="w-full bg-white/[0.03] border border-white/10 rounded-[1.5rem] py-4 pl-14 pr-14 text-sm text-white focus:outline-none focus:border-mint/30 focus:bg-white/[0.05] transition-all resize-none min-h-[56px] max-h-32 scrollbar-hide"
                rows={1}
             />

             <div className="absolute right-4 bottom-4 flex items-center gap-2">
                <button 
                  onClick={handleSendMessage}
                  disabled={!newMsg.trim() || sending}
                  className="w-10 h-10 rounded-xl bg-mint text-obsidian flex items-center justify-center shadow-neon-mint disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95"
                >
                  <Send size={18} />
                </button>
             </div>
          </div>
        </div>

        {/* Emoji Grid */}
        <AnimatePresence>
          {showEmoji && (
            <motion.div 
              initial={{ height: 0, opacity: 0, y: 20 }}
              animate={{ height: 'auto', opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: 20 }}
              className="mt-4 grid grid-cols-8 gap-2 bg-white/5 p-4 rounded-[1.5rem] border border-white/5"
            >
              {EMOJIS.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => { setNewMsg(prev => prev + emoji); setShowEmoji(false); }}
                  className="text-2xl hover:scale-125 transition-transform p-2"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[9px] font-black text-slate-600 text-center mt-4 uppercase tracking-[0.3em]">
          End-to-End Encryption Protocol // Secure Channel v4.2
        </p>
      </footer>

      <style jsx>{`
        .pb-safe {
          padding-bottom: max(1.5rem, env(safe-area-inset-bottom));
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
