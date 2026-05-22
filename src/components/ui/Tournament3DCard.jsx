import { use3DTilt } from '../../hooks/use3DTilt';
import { NeonBadge } from './NeonBadge';
import { Users, Trophy, Clock, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

const STATUS_CONFIG = {
  registration_open: { label: 'Open',      variant: 'green',  pill: 'status-open' },
  open:              { label: 'Open',      variant: 'green',  pill: 'status-open' },
  full:              { label: 'Full',      variant: 'gold',   pill: 'status-full' },
  ready:             { label: 'Ready',     variant: 'cyan',   pill: 'status-upcoming' },
  live:              { label: 'Live',      variant: 'red',    pill: 'status-live' },
  completed:         { label: 'Ended',     variant: 'cyber',  pill: 'status-completed' },
  cancelled:         { label: 'Cancelled', variant: 'red',    pill: 'status-cancelled' },
};

export function Tournament3DCard({ tournament, onClick, className = '' }) {
  const { ref, onMouseMove, onMouseLeave } = use3DTilt({ max: 10, scale: 1.02 });

  const {
    name,
    game,
    status = 'open',
    entry_fee = 0,
    prize_pool = 0,
    max_players = 0,
    current_players = 0,
    start_date,
    banner_url,
    mode,
  } = tournament ?? {};

  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.open;
  const fillPct = max_players > 0 ? Math.round((current_players / max_players) * 100) : 0;

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      className={cn('tournament-card cursor-pointer', className)}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Banner */}
      {banner_url && (
        <div className="relative h-36 overflow-hidden rounded-t-[19px]">
          <img src={banner_url} alt={name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07091a] via-[#07091a]/40 to-transparent" />
          <div className="absolute top-3 left-3">
            <span className={cn('status-pill', cfg.pill)}>{cfg.label}</span>
          </div>
          {status === 'live' && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-black tracking-widest uppercase text-red-400">Live</span>
            </div>
          )}
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-widest uppercase text-white/35 mb-0.5">{game}{mode ? ` · ${mode}` : ''}</p>
            <h3 className="font-heading text-sm font-black tracking-tight text-white leading-tight line-clamp-2">{name}</h3>
          </div>
          {!banner_url && <NeonBadge variant={cfg.variant}>{cfg.label}</NeonBadge>}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <Trophy size={12} className="text-yellow-400/60" />
            <span className="text-[11px] font-black text-white">{prize_pool.toLocaleString()}</span>
            <span className="text-[8px] uppercase tracking-widest text-white/30">Prize</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <Zap size={12} className="text-purple-400/60" />
            <span className="text-[11px] font-black text-white">{entry_fee === 0 ? 'Free' : entry_fee.toLocaleString()}</span>
            <span className="text-[8px] uppercase tracking-widest text-white/30">Entry</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05]">
            <Users size={12} className="text-cyan-400/60" />
            <span className="text-[11px] font-black text-white">{current_players}/{max_players}</span>
            <span className="text-[8px] uppercase tracking-widest text-white/30">Players</span>
          </div>
        </div>

        {/* Fill bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[9px] text-white/30 uppercase tracking-widest">Slots filled</span>
            <span className="text-[10px] font-bold text-white/50">{fillPct}%</span>
          </div>
          <div className="health-bar-track">
            <div
              className={cn('health-bar-fill', fillPct >= 90 ? 'health-critical' : fillPct >= 60 ? 'health-warning' : 'health-excellent')}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        {/* Date */}
        {start_date && (
          <div className="flex items-center gap-1.5 text-white/30">
            <Clock size={11} />
            <span className="text-[10px]">{new Date(start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
