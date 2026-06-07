import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { Trophy, Crosshair, CheckCircle, Clock, Loader, Star } from "lucide-react";

const RANK_COLORS = ["#f59e0b","#94a3b8","#cd7f32"];
const RANK_EMOJI  = ["🥇","🥈","🥉"];

function Avatar({ url, name, size = 30 }) {
  const [err, setErr] = useState(false);
  if (url && !err) return (
    <img src={url} alt={name} onError={() => setErr(true)}
      style={{ width:size,height:size,borderRadius:7,objectFit:"cover",flexShrink:0 }}/>
  );
  return (
    <div style={{ width:size,height:size,borderRadius:7,flexShrink:0,
      background:"linear-gradient(135deg,#4f46e5,#7c3aed)",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:Math.round(size*.38),fontWeight:800,color:"#fff" }}>
      {(name||"?")[0].toUpperCase()}
    </div>
  );
}

export default function MatchLeaderboard({ tournamentId, currentUserId }) {
  const [rows, setRows]       = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchLeaderboard = async () => {
    const { data } = await supabase.rpc("get_tournament_leaderboard", { p_tournament_id: tournamentId });
    if (data) { setRows(data); setLastUpdate(new Date()); }
    setLoading(false);
  };

  const fetchMatches = async () => {
    const { data } = await supabase.rpc("get_match_list", { p_tournament_id: tournamentId });
    if (data) setMatches(data);
  };

  useEffect(() => {
    if (!tournamentId) return;
    fetchLeaderboard();
    fetchMatches();

    const ch = supabase.channel("lb_" + tournamentId)
      .on("postgres_changes", { event:"*", schema:"public", table:"match_results",
        filter:`tournament_id=eq.${tournamentId}` }, () => {
          fetchLeaderboard();
        })
      .on("postgres_changes", { event:"*", schema:"public", table:"tournament_matches",
        filter:`tournament_id=eq.${tournamentId}` }, () => {
          fetchMatches();
          fetchLeaderboard();
        })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [tournamentId]);

  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === "completed").length;

  return (
    <div style={{
      background:"#0a0e1a",border:"1px solid rgba(255,255,255,0.07)",
      borderRadius:14,overflow:"hidden",
    }}>
      {/* Header */}
      <div style={{ padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)",
        display:"flex",alignItems:"center",gap:10 }}>
        <Trophy size={13} color="#f59e0b"/>
        <span style={{ fontSize:11,fontWeight:800,color:"rgba(255,255,255,0.5)",letterSpacing:1,textTransform:"uppercase" }}>
          Live Leaderboard
        </span>
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:8 }}>
          {totalMatches > 0 && (
            <span style={{ fontSize:9,padding:"2px 7px",borderRadius:6,
              background:"rgba(99,102,241,0.12)",color:"#818cf8",fontWeight:700 }}>
              {completedMatches}/{totalMatches} matches
            </span>
          )}
          <div style={{ width:6,height:6,borderRadius:"50%",background:"#10b981",
            boxShadow:"0 0 6px #10b981",animation:"lb-pulse 2s infinite" }}/>
        </div>
      </div>

      {/* Match history pills */}
      {matches.length > 0 && (
        <div style={{ padding:"8px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)",
          display:"flex",gap:6,overflowX:"auto",scrollbarWidth:"none" }}>
          {matches.map(m => (
            <div key={m.match_id} style={{
              flexShrink:0,padding:"4px 10px",borderRadius:20,fontSize:10,fontWeight:700,
              background: m.status==="completed"?"rgba(16,185,129,0.1)":m.status==="processing"?"rgba(245,158,11,0.1)":"rgba(255,255,255,0.04)",
              border:`1px solid ${m.status==="completed"?"rgba(16,185,129,0.25)":m.status==="processing"?"rgba(245,158,11,0.25)":"rgba(255,255,255,0.08)"}`,
              color: m.status==="completed"?"#34d399":m.status==="processing"?"#f59e0b":"rgba(255,255,255,0.3)",
              display:"flex",alignItems:"center",gap:5,
            }}>
              {m.status==="completed"?"✅":m.status==="processing"?<Loader size={8}/>:"🔒"}
              Match {m.match_number}
              {m.submissions > 0 && <span style={{ opacity:.6 }}>({m.submissions})</span>}
            </div>
          ))}
        </div>
      )}

      {/* Rows */}
      <div style={{ padding:"8px 0" }}>
        {loading ? (
          <div style={{ padding:"24px",textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:12 }}>
            <Loader size={18} style={{ margin:"0 auto 8px",display:"block",opacity:.4 }}/>
            Loading rankings…
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding:"24px",textAlign:"center" }}>
            <Trophy size={28} style={{ margin:"0 auto 8px",display:"block",opacity:.15,color:"#f59e0b" }}/>
            <div style={{ color:"rgba(255,255,255,0.2)",fontSize:12 }}>Results will appear here after verification</div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {rows.map((row, i) => {
              const isMe  = row.player_id === currentUserId;
              const rank  = Number(row.rank_position);
              const color = rank <= 3 ? RANK_COLORS[rank-1] : "rgba(255,255,255,0.3)";
              return (
                <motion.div key={row.player_id}
                  layout
                  initial={{ opacity:0,x:-10 }}
                  animate={{ opacity:1,x:0 }}
                  transition={{ duration:.25, delay:i*0.03 }}
                  style={{
                    display:"flex",alignItems:"center",gap:10,
                    padding:"8px 16px",
                    background: isMe ? "rgba(99,102,241,0.08)" : rank<=3?"rgba(245,158,11,0.03)":"transparent",
                    borderLeft:`2px solid ${isMe?"#6366f1":rank<=3?color:"transparent"}`,
                    transition:"background .2s",
                  }}>

                  {/* Rank */}
                  <div style={{ width:28,flexShrink:0,textAlign:"center" }}>
                    {rank<=3
                      ? <span style={{ fontSize:16 }}>{RANK_EMOJI[rank-1]}</span>
                      : <span style={{ fontSize:12,fontWeight:800,color:"rgba(255,255,255,0.2)" }}>#{rank}</span>
                    }
                  </div>

                  {/* Avatar */}
                  <Avatar url={row.avatar_url} name={row.username} size={30}/>

                  {/* Name + FF name */}
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:700,color:isMe?"#818cf8":"#f1f5f9",
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:"15px" }}>
                      {row.username || "Player"}
                      {isMe && <span style={{ fontSize:8,color:"#6366f1",fontWeight:800,marginLeft:5 }}>YOU</span>}
                    </div>
                    {row.free_fire_name && (
                      <div style={{ fontSize:10,color:"#f59e0b",fontWeight:600,lineHeight:"13px" }}>
                        {row.free_fire_name}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div style={{ display:"flex",gap:12,flexShrink:0,alignItems:"center" }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:14,fontWeight:900,color:color,lineHeight:"17px" }}>
                        {row.total_points}
                        <span style={{ fontSize:8,color:"rgba(255,255,255,0.2)",fontWeight:400,marginLeft:2 }}>pts</span>
                      </div>
                      <div style={{ fontSize:9,color:"rgba(255,255,255,0.2)",lineHeight:"12px" }}>
                        {row.total_kills} kills
                      </div>
                    </div>
                    {row.matches_played > 0 && (
                      <div style={{ fontSize:9,padding:"2px 6px",borderRadius:6,
                        background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.25)",fontWeight:700 }}>
                        {row.matches_played}M
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {lastUpdate && (
        <div style={{ padding:"6px 16px",borderTop:"1px solid rgba(255,255,255,0.04)",
          fontSize:9,color:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",gap:4 }}>
          <CheckCircle size={8}/> Updated {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      <style>{`@keyframes lb-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}
