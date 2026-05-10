import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageSquare, 
  Ticket, 
  HelpCircle, 
  Search, 
  Plus, 
  Send,
  User,
  ShieldCheck,
  ChevronLeft,
  X,
  AlertCircle,
  Clock,
  ExternalLink,
  MessageCircle,
  FileText,
  LifeBuoy
} from "lucide-react";
import Button from "../components/ui/Button";
import { format } from "date-fns";

const CATEGORIES = [
  { id: "General", label: "General Protocol", icon: HelpCircle, color: "text-blue-400" },
  { id: "Tournaments", label: "Tournament Ops", icon: Trophy, color: "text-amber-400" },
  { id: "Billing", label: "Economy & CP", icon: Wallet, color: "text-emerald-400" },
  { id: "Account", label: "Account Security", icon: ShieldCheck, color: "text-purple-400" },
  { id: "Bug", label: "Technical Anomaly", icon: AlertCircle, color: "text-rose-400" },
];

const FAQS = [
  { q: "How to withdraw CP?", a: "Go to Wallet > Withdraw. Minimum 500 CP required for tactical transfer." },
  { q: "Tournament didn't start?", a: "Verify check-in status. If 10min pass, contact duty admin immediately." },
  { q: "Clan points not updated?", a: "System syncs every 60 minutes. Check your clan dashboard then." },
  { q: "Reported a cheater?", a: "Our AI audits all reports within 24h. You'll receive a system ping once resolved." },
];

import { Trophy, Wallet } from "lucide-react";

const StatusBadge = ({ status }) => {
  const styles = {
    open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    closed: "bg-white/5 text-slate-500 border-white/10"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${styles[status]}`}>
      {status}
    </span>
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
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileView, setMobileView] = useState("list"); // 'list' or 'detail'

  const [formData, setFormData] = useState({ subject: "", category: "General", body: "" });
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTickets();
  }, [profile?.id]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
      if (window.innerWidth < 768) setMobileView("detail");
    } else {
      setMobileView("list");
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
      .select(`*, sender:profiles(id, username, role, avatar_url)`)
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

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return null;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col overflow-hidden">
      
      {/* FAQ Quick Cards (Desktop Only) */}
      {!selectedTicket && (
        <div className="hidden lg:grid grid-cols-4 gap-6 mb-10">
          {FAQS.map((faq, i) => (
            <div key={i} className="ultra-glass p-6 group hover:border-mint/30 transition-all">
               <HelpCircle size={20} className="text-mint mb-4" />
               <h4 className="font-bold text-white text-xs uppercase tracking-tight mb-2">{faq.q}</h4>
               <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 flex gap-6 overflow-hidden relative">
        
        {/* Sidebar - Tickets List */}
        <div className={`w-full md:w-80 flex flex-col space-y-4 ${mobileView === 'detail' ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex items-center justify-between">
             <h2 className="text-xl font-heading font-black text-white uppercase tracking-tighter">PROTOCOLS</h2>
             <button 
              onClick={() => setShowForm(true)}
              className="w-8 h-8 rounded-lg bg-mint text-obsidian flex items-center justify-center hover:scale-110 transition-transform shadow-neon-mint"
             >
                <Plus size={18} />
             </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-mint" size={14} />
            <input 
              type="text" 
              placeholder="Search protocol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:border-mint/30"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {filteredTickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedTicket?.id === ticket.id 
                    ? 'bg-mint/5 border-mint/30 shadow-neon-mint' 
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                   <StatusBadge status={ticket.status} />
                   <span className="text-[9px] font-black text-slate-600 uppercase">
                     {format(new Date(ticket.created_at), "dd MMM")}
                   </span>
                </div>
                <h4 className="font-bold text-white text-xs uppercase truncate mb-1">{ticket.subject}</h4>
                <div className="flex items-center gap-2">
                   <div className="w-1 h-1 rounded-full bg-slate-700" />
                   <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{ticket.category}</p>
                </div>
              </button>
            ))}
            {filteredTickets.length === 0 && (
              <div className="text-center py-20 opacity-20">
                <LifeBuoy size={48} className="mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">No protocols found</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 glass-card flex flex-col overflow-hidden !p-0 ${mobileView === 'list' && 'hidden md:flex'}`}>
          {selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="p-4 md:p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedTicket(null)}
                    className="md:hidden p-2 text-slate-500 hover:text-white"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h3 className="font-heading font-black text-white uppercase tracking-tight text-sm md:text-base">{selectedTicket.subject}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
                        <span className="text-[9px] font-black text-mint uppercase tracking-widest">Active session</span>
                      </div>
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest hidden md:inline">ID: #{selectedTicket.id.slice(0,8)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="sm" className="hidden lg:flex text-slate-500 hover:text-white uppercase font-black tracking-widest text-[9px]">
                      Mark as Resolved
                   </Button>
                </div>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scrollbar-hide">
                {messages.map((msg, i) => {
                  const isMe = msg.sender_id === profile?.id;
                  const isStaff = msg.sender?.role === 'admin' || msg.sender?.role === 'super_admin';
                  
                  return (
                    <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`p-4 rounded-2xl text-sm font-medium ${
                          isMe 
                            ? 'bg-mint text-obsidian rounded-br-none shadow-neon-mint' 
                            : isStaff
                              ? 'bg-purple-600/10 border border-purple-500/20 text-white rounded-bl-none shadow-[0_0_20px_rgba(139,92,246,0.1)]'
                              : 'bg-white/5 border border-white/5 text-white rounded-bl-none'
                        }`}>
                          {msg.message}
                        </div>
                        <div className="flex items-center gap-3 mt-2 px-1">
                           {isStaff && (
                             <div className="flex items-center gap-1">
                               <ShieldCheck size={10} className="text-purple-400" />
                               <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">CIPHERPOOL STAFF</span>
                             </div>
                           )}
                           {!isMe && !isStaff && (
                             <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">OPERATOR</span>
                           )}
                           <span className="text-[9px] font-medium text-slate-700 uppercase">
                             {format(new Date(msg.created_at), "HH:mm")}
                           </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 md:p-6 border-t border-white/5 bg-white/5">
                <div className="relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Input tactical report..."
                    className="w-full bg-obsidian-light border border-white/5 rounded-2xl py-4 pl-4 pr-16 text-sm text-white focus:outline-none focus:border-mint/30 resize-none min-h-[56px] max-h-32"
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
               <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center mb-8 relative">
                  <div className="absolute inset-0 bg-mint/5 blur-2xl animate-pulse rounded-full" />
                  < LifeBuoy size={48} className="text-slate-700 relative z-10" />
               </div>
               <h3 className="text-2xl font-heading font-black text-white uppercase tracking-tight mb-2">No Active Session</h3>
               <p className="text-slate-500 max-w-sm font-medium text-sm">
                  Select a protocol from the left wing or initialize a new ticket to establish secure uplink with CipherPool operators.
               </p>
               <Button onClick={() => setShowForm(true)} className="mt-8 gap-2">
                 <Plus size={18} /> Initialize New Ticket
               </Button>
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
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-obsidian/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-xl ultra-glass p-10 relative border-white/10"
            >
              <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
              
              <div className="mb-10">
                <h2 className="text-3xl font-heading font-black text-white uppercase tracking-tighter mb-2">NEW PROTOCOL</h2>
                <p className="text-slate-500 text-xs font-black uppercase tracking-widest px-1">Tactical Support Initialization</p>
              </div>
              
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                    <FileText size={12} /> Subject Line
                  </label>
                  <input 
                    type="text" 
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    placeholder="e.g. TRANSACTION_AUTH_FAILURE"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-mint/50 transition-all font-mono uppercase"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                      <ShieldCheck size={12} /> Category
                    </label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest text-white focus:outline-none focus:border-mint/50 transition-all appearance-none"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                      <Clock size={12} /> Priority
                    </label>
                    <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-widest text-mint">
                      High Priority
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
                    <MessageCircle size={12} /> Intel Brief
                  </label>
                  <textarea 
                    value={formData.body}
                    onChange={(e) => setFormData({...formData, body: e.target.value})}
                    placeholder="Provide full technical context..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-mint/50 transition-all resize-none"
                    rows={4}
                  />
                </div>

                <button 
                  onClick={createTicket} 
                  className="w-full py-5 rounded-2xl bg-mint text-obsidian font-heading font-black text-xs uppercase tracking-[0.3em] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-neon-mint disabled:opacity-50 disabled:grayscale" 
                  disabled={!formData.subject.trim()}
                >
                  ESTABLISH PROTOCOL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
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
