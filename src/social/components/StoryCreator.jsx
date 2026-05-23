import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image, Globe, Users, Users2, Shield, Loader2, Plus } from 'lucide-react';

const PRIVACY_OPTIONS = [
  { value: 'public',  label: 'Public',       icon: Globe,  desc: 'Everyone can see' },
  { value: 'friends', label: 'Friends',      icon: Users,  desc: 'Only your friends' },
  { value: 'clan',    label: 'Clan',         icon: Shield, desc: 'Clan members only' },
  { value: 'team',    label: 'Team',         icon: Users2, desc: 'Team members only' },
];

const MAX_CAPTION = 200;

export default function StoryCreator({ onClose, onPublish }) {
  const [file, setFile]         = useState(null);
  const [preview, setPreview]   = useState(null);
  const [caption, setCaption]   = useState('');
  const [privacy, setPrivacy]   = useState('friends');
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f) return;
    const maxMb = f.type.startsWith('video/') ? 50 : 10;
    if (f.size > maxMb * 1024 * 1024) {
      setError(`File too large (max ${maxMb} MB)`);
      return;
    }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const handlePublish = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      await onPublish({ file, caption: caption.trim(), privacy });
      onClose?.();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Bucket not found') || msg.includes('bucket') || msg.includes('storage')) {
        setError('Media upload unavailable right now. Please try again later.');
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setError('Connection error. Check your internet and try again.');
      } else {
        setError(msg || 'Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };

  const isVideo = file?.type?.startsWith('video/');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="w-full max-w-md bg-obsidian-deep border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
            <div>
              <h2 className="font-heading font-black text-white uppercase tracking-tight text-xl">Add Story</h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">Share your moment</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/20 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Drop zone / preview */}
            {preview ? (
              <div className="relative rounded-2xl overflow-hidden aspect-[9/16] max-h-64 bg-black">
                {isVideo
                  ? <video src={preview} className="w-full h-full object-contain" controls muted />
                  : <img src={preview} className="w-full h-full object-contain" alt="preview" />
                }
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-red-500/80 transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-mint/40 hover:bg-mint/[0.03] transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-mint/10 border border-mint/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus size={24} className="text-mint" />
                </div>
                <div className="text-center">
                  <p className="text-white text-sm font-black uppercase tracking-widest">Choose Media</p>
                  <p className="text-slate-500 text-[10px] font-bold mt-1">Photo or Video • Max 50MB</p>
                </div>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/mp4,video/webm"
              className="hidden"
              onChange={(e) => handleFile(e.target.files[0])}
            />

            {/* Caption */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Caption</label>
              <div className="relative">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
                  placeholder="Add a caption..."
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-mint/40 resize-none transition-colors"
                />
                <span className="absolute bottom-2.5 right-3 text-[9px] text-slate-600 font-bold">
                  {caption.length}/{MAX_CAPTION}
                </span>
              </div>
            </div>

            {/* Privacy */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Audience</label>
              <div className="grid grid-cols-2 gap-2">
                {PRIVACY_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    onClick={() => setPrivacy(value)}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                      privacy === value
                        ? 'border-mint/50 bg-mint/10 text-mint'
                        : 'border-white/5 bg-white/[0.02] text-slate-400 hover:border-white/10'
                    }`}
                  >
                    <Icon size={14} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</p>
                      <p className="text-[8px] font-bold text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest text-center">{error}</p>
            )}

            {/* Publish button */}
            <button
              onClick={handlePublish}
              disabled={!file || uploading}
              className="w-full py-4 rounded-2xl bg-mint text-obsidian font-heading font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-neon-mint transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <><Loader2 size={16} className="animate-spin" /> Publishing...</>
              ) : (
                <><Upload size={16} /> Publish Story</>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
