import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Eye, Heart, Flame, Zap, Star, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const STORY_DURATION_MS = 5000;
const REACTIONS = ['❤️', '🔥', '⚡', '👏', '😮', '🎯'];

export default function StoryViewer({ entries, initialIndex = 0, onClose, onView, onReact, onDelete }) {
  const { user } = useAuth();
  const [entryIdx, setEntryIdx]   = useState(initialIndex);   // which user's stories
  const [storyIdx, setStoryIdx]   = useState(0);              // which story of that user
  const [stories, setStories]     = useState([]);
  const [progress, setProgress]   = useState(0);
  const [paused, setPaused]       = useState(false);
  const [showReact, setShowReact] = useState(false);
  const [reacted, setReacted]     = useState(null);
  const timerRef  = useRef(null);
  const startRef  = useRef(null);
  const elapsedRef = useRef(0);

  const currentEntry = entries[entryIdx];

  // Fetch stories whenever the user entry changes
  useEffect(() => {
    if (!currentEntry) return;
    currentEntry.fetchStories().then((data) => {
      setStories(data || []);
      setStoryIdx(0);
      setProgress(0);
      setReacted(null);
    });
  }, [entryIdx, currentEntry]);

  const currentStory = stories[storyIdx] ?? null;

  // Record view once per story
  useEffect(() => {
    if (!currentStory) return;
    onView?.(currentStory.id);
  }, [currentStory?.id]);

  // Progress timer
  const startTimer = useCallback(() => {
    if (paused) return;
    clearInterval(timerRef.current);
    startRef.current = Date.now() - elapsedRef.current;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min((elapsed / STORY_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timerRef.current);
        elapsedRef.current = 0;
        goNext();
      }
    }, 50);
  }, [paused]);

  useEffect(() => {
    if (!currentStory || paused) return;
    elapsedRef.current = 0;
    setProgress(0);
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [currentStory?.id, paused]);

  const goNext = useCallback(() => {
    if (storyIdx < stories.length - 1) {
      setStoryIdx((i) => i + 1);
    } else if (entryIdx < entries.length - 1) {
      setEntryIdx((i) => i + 1);
    } else {
      onClose?.();
    }
  }, [storyIdx, stories.length, entryIdx, entries.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (entryIdx > 0) {
      setEntryIdx((i) => i - 1);
    }
  }, [storyIdx, entryIdx]);

  const handleReact = useCallback(async (emoji) => {
    if (!currentStory) return;
    setReacted(emoji);
    setShowReact(false);
    await onReact?.(currentStory.id, emoji);
  }, [currentStory, onReact]);

  const handleHold = (down) => {
    setPaused(down);
    if (down) {
      clearInterval(timerRef.current);
      elapsedRef.current = Date.now() - startRef.current;
    } else {
      startTimer();
    }
  };

  if (!currentEntry || !currentStory) return null;

  const isOwn = currentEntry.user_id === user?.id;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        {/* Story card */}
        <motion.div
          key={`${entryIdx}-${storyIdx}`}
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm h-[85vh] max-h-[700px] rounded-[2.5rem] overflow-hidden select-none"
          onMouseDown={() => handleHold(true)}
          onMouseUp={() => handleHold(false)}
          onTouchStart={() => handleHold(true)}
          onTouchEnd={() => handleHold(false)}
        >
          {/* Media */}
          {currentStory.media_type === 'video' ? (
            <video
              src={currentStory.media_url}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay muted loop playsInline
            />
          ) : (
            <img
              src={currentStory.media_url}
              className="absolute inset-0 w-full h-full object-cover"
              alt="story"
            />
          )}

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

          {/* Progress bars */}
          <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
            {stories.map((_, idx) => (
              <div key={idx} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: idx < storyIdx ? '100%' : idx === storyIdx ? `${progress}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10 pt-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border-2 border-mint overflow-hidden shadow-neon-mint">
                {currentEntry.avatar_url
                  ? <img src={currentEntry.avatar_url} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full bg-mint flex items-center justify-center text-obsidian font-black text-xs">{currentEntry.username?.[0]?.toUpperCase()}</div>
                }
              </div>
              <div>
                <p className="text-white text-xs font-black uppercase tracking-widest leading-none">{currentEntry.username}</p>
                <p className="text-white/50 text-[9px] font-bold mt-0.5">
                  {currentStory.created_at
                    ? new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOwn && currentStory && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete?.(currentStory.id); }}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              )}
              {isOwn && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur">
                  <Eye size={11} className="text-white/60" />
                  <span className="text-[9px] font-black text-white/60">{currentStory.view_count ?? 0}</span>
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onClose?.(); }}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Caption */}
          {currentStory.caption && (
            <div className="absolute bottom-20 left-4 right-4 z-10">
              <p className="text-white text-sm font-medium leading-snug text-center drop-shadow-lg">
                {currentStory.caption}
              </p>
            </div>
          )}

          {/* Reactions bar */}
          <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center gap-2">
            {!isOwn && (
              <>
                <div className="relative flex-1">
                  {showReact && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      className="absolute bottom-12 left-0 flex gap-2 px-3 py-2.5 rounded-2xl bg-obsidian-light/90 backdrop-blur border border-white/10"
                    >
                      {REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={(e) => { e.stopPropagation(); handleReact(emoji); }}
                          className="text-xl hover:scale-125 transition-transform"
                        >
                          {emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowReact((v) => !v); }}
                    className={`w-full py-2.5 rounded-2xl border font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                      reacted
                        ? 'bg-mint/20 border-mint/40 text-mint'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    {reacted ? (
                      <><span className="text-base">{reacted}</span> Reacted</>
                    ) : (
                      <><Heart size={13} /> React</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Tap zones for prev/next */}
          <button
            className="absolute left-0 top-0 w-1/3 h-full z-10 opacity-0"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
          />
          <button
            className="absolute right-0 top-0 w-1/3 h-full z-10 opacity-0"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
          />
        </motion.div>

        {/* Prev/Next user arrows */}
        {entryIdx > 0 && (
          <button
            onClick={() => setEntryIdx((i) => i - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/5 border border-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/10 transition-all z-20"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {entryIdx < entries.length - 1 && (
          <button
            onClick={() => setEntryIdx((i) => i + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/5 border border-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/10 transition-all z-20"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
