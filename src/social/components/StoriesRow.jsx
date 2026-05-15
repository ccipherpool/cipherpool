import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { useStories } from '../hooks/useStories';
import StoryViewer from './StoryViewer';
import StoryCreator from './StoryCreator';

// Neon ring colors cycling per entry
const RING_COLORS = [
  'shadow-[0_0_0_2px_#10B981,0_0_12px_#10B981]',   // mint
  'shadow-[0_0_0_2px_#8B5CF6,0_0_12px_#8B5CF6]',   // purple
  'shadow-[0_0_0_2px_#F5C518,0_0_12px_#F5C518]',   // gold
  'shadow-[0_0_0_2px_#3B82F6,0_0_12px_#3B82F6]',   // blue
];

function StoryBubble({ entry, index, isOwn, onClick }) {
  const unseen = entry.has_unseen;
  const ringIdx = index % RING_COLORS.length;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 flex-shrink-0 w-16"
    >
      {/* Avatar ring */}
      <div className="relative">
        {/* Glow ring */}
        <div
          className={`w-[58px] h-[58px] rounded-full flex items-center justify-center transition-all duration-300 ${
            unseen
              ? `${RING_COLORS[ringIdx]} bg-transparent animate-pulse`
              : 'shadow-[0_0_0_2px_#334155] bg-transparent'
          }`}
        >
          <div className="w-[50px] h-[50px] rounded-full overflow-hidden border-2 border-obsidian-deep bg-obsidian-deep">
            {isOwn && !entry.story_count ? (
              // "Your Story" — no story yet, show plus
              <div className="w-full h-full bg-gradient-to-br from-mint/30 to-electric-purple/20 flex items-center justify-center">
                {entry.avatar_url
                  ? <img src={entry.avatar_url} className="w-full h-full object-cover opacity-60" alt="" />
                  : <span className="text-obsidian font-black text-lg">{entry.username?.[0]?.toUpperCase() || '?'}</span>
                }
              </div>
            ) : entry.avatar_url ? (
              <img src={entry.avatar_url} className="w-full h-full object-cover" alt={entry.username} />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-mint to-mint-dark flex items-center justify-center">
                <span className="text-obsidian font-black text-base">{entry.username?.[0]?.toUpperCase() || '?'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Plus badge for "Your Story" with no existing stories */}
        {isOwn && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-mint border-2 border-obsidian-deep flex items-center justify-center shadow-neon-mint">
            <Plus size={10} className="text-obsidian" strokeWidth={3} />
          </div>
        )}

        {/* Unseen dot for others */}
        {!isOwn && unseen && (
          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-mint border-2 border-obsidian-deep animate-pulse" />
        )}
      </div>

      {/* Username */}
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none truncate w-full text-center">
        {isOwn ? 'Your Story' : entry.username}
      </span>
    </motion.button>
  );
}

export default function StoriesRow({ profile }) {
  const {
    feed, loading, currentUserEntry,
    fetchUserStories, createStory, recordView, reactToStory, deleteStory,
  } = useStories();

  const [viewerOpen, setViewerOpen]   = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);

  // Build entries list for the viewer (each entry needs a fetchStories fn)
  const viewerEntries = feed.map((entry) => ({
    ...entry,
    fetchStories: () => fetchUserStories(entry.user_id),
  }));

  const openViewer = useCallback((index) => {
    setViewerIndex(index);
    setViewerOpen(true);
  }, []);

  const handleBubbleClick = useCallback((entry, index) => {
    const isOwn = entry.user_id === profile?.id;
    if (isOwn) {
      // Always open creator to add new story; if they have stories, open viewer first
      if (entry.story_count > 0) openViewer(index);
      else setCreatorOpen(true);
    } else {
      openViewer(index);
    }
  }, [profile?.id, openViewer]);

  const handlePublish = useCallback(async (opts) => {
    await createStory(opts);
  }, [createStory]);

  if (loading && feed.length === 0) {
    return (
      <div className="flex items-center gap-3 py-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0 w-16">
            <div className="w-[58px] h-[58px] rounded-full bg-white/5 animate-pulse" />
            <div className="w-10 h-2 rounded bg-white/5 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // "My Story" bubble — always show even if no stories yet
  const myStoryEntry = currentUserEntry ?? {
    user_id: profile?.id,
    username: profile?.username,
    avatar_url: profile?.avatar_url,
    has_unseen: false,
    story_count: 0,
    latest_story_id: null,
    latest_media_url: null,
    latest_created_at: null,
  };

  // Feed without own entry (we render it separately first)
  const othersFeed = feed.filter((e) => e.user_id !== profile?.id);

  // Full ordered list for viewer: own first
  const orderedFeed = currentUserEntry
    ? [currentUserEntry, ...othersFeed]
    : othersFeed;

  return (
    <>
      {/* Row container */}
      <div className="relative z-10 -mx-4 md:-mx-0 mb-4">
        <div className="flex items-end gap-3 overflow-x-auto pb-4 px-4 scroll-smooth scrollbar-hide">
          {/* "My Story" bubble */}
          <StoryBubble
            entry={myStoryEntry}
            index={0}
            isOwn={true}
            onClick={() => handleBubbleClick(myStoryEntry, 0)}
          />

          {/* Divider line */}
          {othersFeed.length > 0 && (
            <div className="h-10 w-px bg-white/5 flex-shrink-0 self-center mx-1" />
          )}

          {/* Friends / others */}
          {othersFeed.map((entry, idx) => {
            // Index in the full viewer list (0 is own, so +1 if own exists)
            const viewerIdx = currentUserEntry ? idx + 1 : idx;
            return (
              <StoryBubble
                key={entry.user_id}
                entry={entry}
                index={idx + 1}
                isOwn={false}
                onClick={() => handleBubbleClick(entry, viewerIdx)}
              />
            );
          })}

          {/* Empty state */}
          {othersFeed.length === 0 && !loading && (
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.02] border border-white/5 flex-shrink-0">
               <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <Plus size={14} className="text-slate-500" />
               </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Invite friends to see stories
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer */}
      {viewerOpen && viewerEntries.length > 0 && (
        <StoryViewer
          entries={viewerEntries}
          initialIndex={Math.min(viewerIndex, viewerEntries.length - 1)}
          onClose={() => setViewerOpen(false)}
          onView={recordView}
          onReact={reactToStory}
          onDelete={async (id) => { await deleteStory(id); setViewerOpen(false); }}
        />
      )}

      {/* Story Creator */}
      {creatorOpen && (
        <StoryCreator
          onClose={() => setCreatorOpen(false)}
          onPublish={handlePublish}
        />
      )}
    </>
  );
}
