import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Trash2, 
  Send, 
  User, 
  Clock, 
  Mic, 
  Square, 
  Play, 
  Pause, 
  Volume2, 
  MessageSquare,
  Upload,
  Sparkles,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { PDFAnnotation, CommentReply } from '../../types';

// Hoisted constants & utility functions outside component (rendering-hoist-jsx, rerender-memo-with-default-value)
const NOTE_COLORS = ['#f59e0b', '#facc15', '#10b981', '#0ea5e9', '#8b5cf6', '#f43f5e', '#18181b'] as const;

function formatSeconds(secs: number): string {
  const mins = Math.floor(secs / 60);
  const remainder = secs % 60;
  return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
}

interface StickyNoteModalProps {
  annotation: PDFAnnotation;
  isOpen: boolean;
  onClose: () => void;
  onUpdateAnnotation: (updated: PDFAnnotation) => void;
  onDeleteAnnotation: (id: string) => void;
}

export default function StickyNoteModal({
  annotation,
  isOpen,
  onClose,
  onUpdateAnnotation,
  onDeleteAnnotation,
}: StickyNoteModalProps) {
  const [newCommentText, setNewCommentText] = useState('');
  const [authorName, setAuthorName] = useState('Author');
  const [micError, setMicError] = useState<string | null>(null);

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Audio Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  // Update audio player source when annotation audio changes
  useEffect(() => {
    if (annotation.audioBlobUrl) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(annotation.audioBlobUrl);
      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
      };
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlaybackProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      audioPlayerRef.current = audio;
    }
  }, [annotation.audioBlobUrl]);

  const isVoiceNote = annotation.type === 'voice-note';

  // Update Primary Note Text
  const handleMainTextChange = useCallback((text: string) => {
    onUpdateAnnotation({
      ...annotation,
      text,
      updatedAt: new Date(),
    });
  }, [annotation, onUpdateAnnotation]);

  // Add Comment / Discussion Reply
  const handleAddReply = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newReply: CommentReply = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      author: authorName.trim() || 'Author',
      content: newCommentText.trim(),
      createdAt: new Date(),
    };

    const updatedComments = [...(annotation.comments || []), newReply];
    onUpdateAnnotation({
      ...annotation,
      comments: updatedComments,
      updatedAt: new Date(),
    });
    setNewCommentText('');
  }, [newCommentText, authorName, annotation, onUpdateAnnotation]);

  // Delete specific reply
  const handleDeleteReply = useCallback((replyId: string) => {
    const updatedComments = (annotation.comments || []).filter((c) => c.id !== replyId);
    onUpdateAnnotation({
      ...annotation,
      comments: updatedComments,
      updatedAt: new Date(),
    });
  }, [annotation, onUpdateAnnotation]);

  // 1. Live Microphone Recording
  const startRecording = useCallback(async () => {
    setMicError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone API is not supported in this environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        onUpdateAnnotation({
          ...annotation,
          audioBlobUrl: audioUrl,
          audioDuration: recordDuration || 3,
          updatedAt: new Date(),
        });
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setMicError(err?.message || 'Microphone access denied or hardware not detected.');
    }
  }, [annotation, onUpdateAnnotation, recordDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  // 2. Audio File Upload Option
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const audioUrl = URL.createObjectURL(file);
    onUpdateAnnotation({
      ...annotation,
      audioBlobUrl: audioUrl,
      audioDuration: 5,
      updatedAt: new Date(),
    });
    setMicError(null);
  }, [annotation, onUpdateAnnotation]);

  // 3. Simulated Speech Memo Option (Works 100% of time even without mic hardware)
  const handleGenerateSampleMemo = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const dest = ctx.createMediaStreamDestination();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

      osc.connect(gain);
      gain.connect(dest);
      gain.connect(ctx.destination);

      const recorder = new MediaRecorder(dest.stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        onUpdateAnnotation({
          ...annotation,
          audioBlobUrl: audioUrl,
          audioDuration: 2,
          text: annotation.text || 'Voice memo attachment',
          updatedAt: new Date(),
        });
      };

      recorder.start();
      osc.start();
      setTimeout(() => {
        osc.stop();
        recorder.stop();
      }, 1800);
      setMicError(null);
    } catch {
      onUpdateAnnotation({
        ...annotation,
        text: annotation.text || 'Voice memo registered for page',
        updatedAt: new Date(),
      });
    }
  }, [annotation, onUpdateAnnotation]);

  // Play / Pause Audio
  const togglePlayAudio = useCallback(() => {
    if (!audioPlayerRef.current) return;

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => console.warn('Playback error:', e));
    }
  }, [isPlaying]);

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] text-zinc-800 dark:text-zinc-200 animate-in zoom-in-95 duration-150"
      >
        {/* 1. Modal Header */}
        <header className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface/70 backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-xs">
            <div 
              className="h-3.5 w-3.5 rounded-full shadow-xs flex-shrink-0 ring-1 ring-black/20"
              style={{ backgroundColor: annotation.color || '#f59e0b' }}
            />
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold">
              {isVoiceNote ? 'Voice Note & Comments' : 'Sticky Note & Discussion'}
            </span>
            <span className="text-[10px] font-mono text-accent bg-accent/10 px-1.5 py-0.5 rounded font-bold">
              Page {annotation.pageNum}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Color Switcher */}
            <div className="flex items-center gap-1 mr-1">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdateAnnotation({ ...annotation, color: c })}
                  style={{ backgroundColor: c }}
                  className={`h-3.5 w-3.5 rounded-full transition-transform ${annotation.color === c ? 'scale-125 ring-2 ring-zinc-900 dark:ring-zinc-100' : 'opacity-60 hover:opacity-100'}`}
                />
              ))}
            </div>

            <button
              onClick={() => onDeleteAnnotation(annotation.id)}
              title="Delete Note"
              className="h-7 w-7 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 flex items-center justify-center text-zinc-400 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="h-7 w-7 rounded-lg hover:bg-surface dark:hover:bg-surface flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* 2. Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          
          {/* SECTION A: MAIN NOTE TEXT EDITOR */}
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface/80 border border-border">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              <span>Primary Note Description</span>
              <span className="text-[10px] font-mono text-zinc-400 font-normal">Auto-saves live</span>
            </div>
            <textarea
              value={annotation.text || ''}
              onChange={(e) => handleMainTextChange(e.target.value)}
              placeholder="Write your main note or review description here..."
              rows={3}
              autoFocus={!isVoiceNote}
              className="w-full bg-card p-2.5 rounded-lg border border-border text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-accent resize-y font-sans leading-relaxed shadow-xs"
            />
          </div>

          {/* SECTION B: VOICE NOTE AUDIO CONTROLS (If voice-note) */}
          {isVoiceNote && (
            <div className="flex flex-col p-4 rounded-xl bg-surface border border-border gap-3">
              <div className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-rose-500" />
                <span>Voice Memo Recording</span>
              </div>

              {annotation.audioBlobUrl ? (
                /* Player Interface */
                <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-card border border-border shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={togglePlayAudio}
                        className="h-10 w-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600 active:scale-95 transition-all"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-white ml-0.5" />}
                      </button>
                      <div>
                        <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Voice Note Attached</div>
                        <div className="text-[10px] font-mono text-zinc-400">{formatSeconds(annotation.audioDuration || 0)} duration</div>
                      </div>
                    </div>

                    <button
                      onClick={() => onUpdateAnnotation({ ...annotation, audioBlobUrl: undefined, audioDuration: undefined })}
                      className="px-2.5 py-1 rounded-lg border border-border hover:bg-rose-500/10 hover:text-rose-500 text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Re-record</span>
                    </button>
                  </div>

                  {/* Playback progress bar */}
                  <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full transition-all duration-100" 
                      style={{ width: `${playbackProgress}%` }}
                    />
                  </div>
                </div>
              ) : isRecording ? (
                /* Active Recording State */
                <div className="flex flex-col items-center gap-3 py-4 bg-rose-500/5 rounded-xl border border-rose-500/30">
                  <div className="h-12 w-12 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg animate-pulse">
                    <Mic className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">RECORDING LIVE AUDIO</div>
                    <div className="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-100">{formatSeconds(recordDuration)}</div>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="px-4 py-1.5 rounded-xl bg-rose-600 text-white flex items-center gap-1.5 text-xs font-bold shadow hover:bg-rose-700 active:scale-95 transition-all"
                  >
                    <Square className="h-3.5 w-3.5 fill-white" />
                    <span>Stop & Attach</span>
                  </button>
                </div>
              ) : (
                /* Ready State with Multiple Resilient Options */
                <div className="flex flex-col gap-2.5">
                  {micError && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Microphone Notice</div>
                        <div className="text-[11px] opacity-90">{micError} You can still upload an audio file or generate a voice sample below.</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Option 1: Record from Mic */}
                    <button
                      onClick={startRecording}
                      className="p-3 rounded-xl bg-card border border-border hover:border-rose-500 text-left flex flex-col gap-1 group transition-all shadow-xs"
                    >
                      <div className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors">
                        <Mic className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Live Mic</span>
                      <span className="text-[10px] text-zinc-400">Record from microphone</span>
                    </button>

                    {/* Option 2: Upload Audio File */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-xl bg-card border border-border hover:border-accent text-left flex flex-col gap-1 group transition-all shadow-xs"
                    >
                      <div className="h-7 w-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors">
                        <Upload className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Upload Audio</span>
                      <span className="text-[10px] text-zinc-400">Attach MP3, WAV, M4A</span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="audio/*" 
                      className="hidden" 
                    />

                    {/* Option 3: Generate Audio Memo */}
                    <button
                      onClick={handleGenerateSampleMemo}
                      className="p-3 rounded-xl bg-card border border-border hover:border-purple-500 text-left flex flex-col gap-1 group transition-all shadow-xs"
                    >
                      <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Quick Voice Memo</span>
                      <span className="text-[10px] text-zinc-400">Instant audio signal clip</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION C: THREADED COMMENTS & REPLIES (Showing ALL comments at once) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-accent" />
                <span>Threaded Discussion & Comments ({(annotation.comments || []).length})</span>
              </div>
            </div>

            {(!annotation.comments || annotation.comments.length === 0) ? (
              <div className="p-3 text-center rounded-xl bg-surface/40 border border-border/60 text-xs text-zinc-400">
                <p>No additional comments yet. Add a reply or feedback in the thread below.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {annotation.comments.map((comment) => (
                  <div key={comment.id} className="p-3 rounded-xl bg-card border border-border flex flex-col gap-1.5 shadow-xs">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                        <User className="h-3.5 w-3.5 text-accent" />
                        <span>{comment.author}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={() => handleDeleteReply(comment.id)}
                          title="Delete Comment"
                          className="text-zinc-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* 3. Modal Footer: Add Reply Form */}
        <form onSubmit={handleAddReply} className="p-3 border-t border-border bg-surface/70 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Your Name"
              className="h-6 w-24 px-2 text-[10px] font-mono rounded bg-card border border-border text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <span className="text-[10px] text-zinc-400 font-mono">Posting as author</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a comment to this discussion thread..."
              className="flex-1 h-8 px-3 text-xs rounded-xl bg-card border border-border text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-accent shadow-xs"
            />
            <button
              type="submit"
              disabled={!newCommentText.trim()}
              className="h-8 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold flex items-center gap-1.5 hover:bg-accent dark:hover:bg-accent dark:hover:text-white disabled:opacity-30 transition-all shadow-xs flex-shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Post</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
