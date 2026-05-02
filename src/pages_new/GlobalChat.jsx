import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Button, Input, Card } from "../components/ui";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Smile, Paperclip, MoreVertical } from "lucide-react";

export default function GlobalChat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
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
        .select("*, sender:profiles(full_name, avatar_url)")
        .order("created_at", { ascending: true })
        .limit(50);

      setMessages(data || []);
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

  return (
    <div className="flex flex-col h-full bg-bg-base">
      {/* Header */}
      <div className="border-b border-primary-900/30 p-4 bg-bg-surface">
        <h1 className="text-2xl font-bold text-text-primary">Chat Global</h1>
        <p className="text-sm text-text-secondary">Discutez avec la communauté</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-text-secondary">Chargement des messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <Smile className="w-16 h-16 mx-auto text-text-muted mb-4 opacity-50" />
              <p className="text-text-secondary">Aucun message pour le moment</p>
              <p className="text-text-muted text-sm">Soyez le premier à envoyer un message!</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg, index) => {
              const isOwnMessage = msg.sender_id === user?.id;
              const showAvatar =
                index === 0 || messages[index - 1]?.sender_id !== msg.sender_id;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  {showAvatar && (
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                        isOwnMessage ? "order-2" : ""
                      }`}
                    >
                      {msg.sender?.full_name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}

                  {/* Message */}
                  <div
                    className={`flex flex-col ${
                      isOwnMessage ? "items-end" : "items-start"
                    }`}
                  >
                    {showAvatar && (
                      <p className="text-xs text-text-muted mb-1">
                        {msg.sender?.full_name || "Utilisateur"}
                      </p>
                    )}
                    <div
                      className={`px-4 py-2 rounded-lg max-w-xs ${
                        isOwnMessage
                          ? "bg-primary-600/30 border border-primary-500/50 text-text-primary"
                          : "bg-bg-card border border-primary-900/30 text-text-primary"
                      }`}
                    >
                      <p className="text-sm break-words">{msg.content}</p>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-primary-900/30 p-4 bg-bg-surface">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <Input
            placeholder="Écrivez un message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
          />

          <button
            type="button"
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
          >
            <Smile className="w-5 h-5" />
          </button>

          <Button
            variant="primary"
            type="submit"
            disabled={!newMessage.trim()}
            className="gap-2"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Envoyer</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
