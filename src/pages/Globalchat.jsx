import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Smile, Paperclip, MoreVertical, Users, Clock } from "lucide-react";

export default function GlobalChat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchUserAndMessages();
    subscribeToMessages();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchUserAndMessages = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      if (authUser) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        setProfile(profileData);
      }

      const { data } = await supabase
        .from("chat_messages")
        .select("*, sender:profiles(full_name, avatar_url, id)")
        .order("created_at", { ascending: true })
        .limit(100);

      setMessages(data || []);
      setOnlineCount(Math.floor(Math.random() * 150) + 50);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel("chat_messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      await supabase.from("chat_messages").insert({
        sender_id: user.id,
        channel: "global",
        content: newMessage,
      });

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const getAvatarColor = (userId) => {
    const colors = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
    const index = userId?.charCodeAt(0) % colors.length;
    return colors[index] || "#8b5cf6";
  };

  const getInitials = (name) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase() || "?";
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap');
        
        .chat-container {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(75, 0, 130, 0.1));
          backdrop-filter: blur(10px);
        }
        
        .message-bubble {
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .message-own {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        
        .message-other {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .message-bubble:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(139, 92, 246, 0.4);
        }
        
        .avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 12px;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .online-indicator {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Header */}
      <div className="chat-container border-b border-purple-500/20 p-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Chat Global
            </h1>
            <p className="text-sm text-gray-400 mt-1">Discutez avec la communauté</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="online-indicator"></div>
            <span className="text-sm text-gray-300">{onlineCount} en ligne</span>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full"
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Users size={48} className="mb-4 opacity-50" />
            <p>Aucun message pour le moment. Soyez le premier à parler!</p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg, idx) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <motion.div
                  key={msg.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  {!isOwn && (
                    <div
                      className="avatar flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(msg.sender_id) }}
                    >
                      {getInitials(msg.sender?.full_name)}
                    </div>
                  )}
                  
                  <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-xs`}>
                    {!isOwn && (
                      <span className="text-xs text-gray-400 mb-1 px-2">
                        {msg.sender?.full_name || "Utilisateur"}
                      </span>
                    )}
                    <div className={`message-bubble ${isOwn ? "message-own" : "message-other"} px-4 py-2 rounded-lg backdrop-blur-sm transition-all duration-200`}>
                      <p className="text-sm text-gray-100 break-words">{msg.content}</p>
                    </div>
                    <span className="text-xs text-gray-500 mt-1 px-2 flex items-center gap-1">
                      <Clock size={10} />
                      {formatTime(msg.created_at)}
                    </span>
                  </div>

                  {isOwn && (
                    <div
                      className="avatar flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(msg.sender_id) }}
                    >
                      {getInitials(profile?.full_name)}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="chat-container border-t border-purple-500/20 p-4 backdrop-blur-md">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all duration-200 text-gray-400 hover:text-purple-400"
            >
              <Smile size={18} />
            </button>
            <button
              type="button"
              className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-all duration-200 text-gray-400 hover:text-purple-400"
            >
              <Paperclip size={18} />
            </button>
          </div>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 px-4 py-2 bg-purple-500/5 border border-purple-500/20 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/10 transition-all duration-200"
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-all duration-200 flex items-center gap-2"
          >
            <Send size={16} />
            Envoyer
          </motion.button>
        </form>
      </div>
    </div>
  );
}
