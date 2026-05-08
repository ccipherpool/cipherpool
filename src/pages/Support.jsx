import { useState, useEffect, useRef } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Ticket, 
  HelpCircle, 
  ShieldQuestion, 
  ChevronRight, 
  Search, 
  Plus, 
  Clock, 
  Send,
  User,
  ShieldCheck,
  AlertCircle,
  X
} from "lucide-react";
import Button from "../components/ui/Button";

const TicketCard = ({ ticket, active, onClick }) => {
  const statusStyles = {
    open: "bg-mint/10 text-mint border-mint/20",
    pending: "bg-cyber-gold/10 text-cyber-gold border-cyber-gold/20",
    closed: "bg-white/5 text-slate-500 border-white/10"
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border transition-all ${
        active 
          ? 'bg-mint/5 border-mint/30 shadow-neon-mint' 
          : 'bg-obsidian-light border-white/5 hover:border-white/10'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${statusStyles[ticket.status]}`}>
          {ticket.status}
        </span>
        <span className="text-[10px] font-black text-slate-600 uppercase">
          {new Date(ticket.created_at).toLocaleDateString()}
        </span>
      </div>
      <h4 className="font-bold text-white text-sm uppercase truncate mb-1">{ticket.subject}</h4>
      <p className="text-[10px] text-slate-500 font-medium truncate">Category: {ticket.category}</p>
    </button>
  );
};

export default function Support() {
  const { profile } = useOutletContext() || {};
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ subject: "", category: "General", body: "" });

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTickets();
  }, [profile?.id]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", profile?.id)
      .order("created_at", { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  const fetchMessages = async (ticketId) => {
    const { data } = await supabase
      .from("support_messages")
      .select(`*, sender:profiles!support_messages_sender_id_fkey(id, username, role, avatar_url)`)
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const createTicket = async () => {
    if (!formData.subject.trim()) return;
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert([{
        user_id: profile?.id,
        subject: formData.subject,
        category: formData.category,
        status: "open"
      }])
      .select()
      .single();

    if (!error && ticket) {
      await supabase.from("support_messages").insert([{
        ticket_id: ticket.id,
        sender_id: profile?.id,
        message: formData.body || formData.subject
      }]);
      setShowForm(false);
      fetchTickets();
      setSelectedTicket(ticket);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    const { error } = await supabase.from("support_messages").insert([{
      ticket_id: selectedTicket.id,
      sender_id: profile?.id,
      message: newMessage.trim()
    }]);
    if (!error) {
      setNewMessage("");
      fetchMessages(selectedTicket.id);
    }
  };

  if (loading) return null;

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-black tracking-tighter uppercase">
            COMMAND <span className="text-mint">SUPPORT</span>
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            System assistance and tactical resolution center.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus size={18} /> New Ticket
        </Button>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar - Tickets List */}
        <div className="w-80 flex flex-col space-y-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-mint" size={16} />
            <input 
              type="text" 
              placeholder="Filter tickets..."
              className="w-full bg-obsidian-light border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-mint/30"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {tickets.map(ticket => (
              <TicketCard 
                key={ticket.id} 
                ticket={ticket} 
                active={selectedTicket?.id === ticket.id}
                onClick={() => setSelectedTicket(ticket)}
              />
            ))}
            {tickets.length === 0 && (
              <div className="text-center py-10 opacity-20 italic text-sm">
                No active tickets
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 glass-card flex flex-col overflow-hidden !p-0">
          {selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-black text-white uppercase tracking-tight">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
                    <span className="text-[10px] font-black text-mint uppercase tracking-widest">Active Session</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white uppercase font-black tracking-widest text-[10px]">
                      Close Ticket
                   </Button>
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide">
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === profile?.id;
                  return (
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`p-4 rounded-2xl text-sm font-medium ${
                          isMe 
                            ? 'bg-mint text-obsidian rounded-br-none' 
                            : 'bg-white/5 border border-white/5 text-white rounded-bl-none'
                        }`}>
                          {msg.message}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                           {!isMe && (
                             <span className="text-[10px] font-black text-mint uppercase tracking-widest">
                               {msg.sender?.role === 'admin' ? 'SYSTEM ADMIN' : 'PLAYER'}
                             </span>
                           )}
                           <span className="text-[10px] font-medium text-slate-600 uppercase">
                             {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-6 border-t border-white/5 bg-white/5">
                <div className="relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Input tactical message..."
                    className="w-full bg-obsidian-light border border-white/5 rounded-2xl py-4 pl-4 pr-16 text-sm text-white focus:outline-none focus:border-mint/30 resize-none"
                    rows={1}
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-mint text-obsidian flex items-center justify-center disabled:opacity-50 disabled:grayscale transition-all hover:scale-105 active:scale-95"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
               <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center mb-8">
                  <ShieldQuestion size={48} className="text-slate-700" />
               </div>
               <h3 className="text-2xl font-heading font-black text-white uppercase tracking-tight mb-2">No Session Selected</h3>
               <p className="text-slate-500 max-w-sm font-medium">
                  Select a ticket from the sidebar or create a new one to start a secure communication session with our protocols.
               </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal - New Ticket Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-obsidian/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg glass-card p-8 relative"
            >
              <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
              <h2 className="text-2xl font-heading font-black text-white uppercase tracking-tighter mb-2">Initialize Support Ticket</h2>
              <p className="text-slate-500 text-sm font-medium mb-8">Briefly explain your situation for technical audit.</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Subject Protocol</label>
                  <input 
                    type="text" 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="e.g. Account Verification Issue"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-mint/50 transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Tactical Category</label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-mint/50 transition-all appearance-none"
                  >
                    <option value="General">General Inquiries</option>
                    <option value="Billing">Economy & CP</option>
                    <option value="Tournament">Tournament Operations</option>
                    <option value="Account">Account Security</option>
                    <option value="Bug">Technical Anomaly</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Detailed Intel</label>
                  <textarea 
                    value={formData.body}
                    onChange={(e) => setFormData({...formData, body: e.target.value})}
                    placeholder="Provide all necessary details..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-mint/50 transition-all resize-none"
                    rows={4}
                  />
                </div>

                <Button onClick={createTicket} className="w-full py-4 text-sm tracking-[0.2em]" disabled={!formData.subject.trim()}>
                  INITIALIZE TICKET
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
