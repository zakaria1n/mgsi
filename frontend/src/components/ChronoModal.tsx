import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  CheckCircle2,
  Star,
  X,
  Sparkles,
  Flame,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Music,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  Upload,
  Radio,
  RadioTower,
  ArrowLeft,
} from 'lucide-react';
import { Task, FocusCustomSound } from '../types';
import { apiClient } from '../lib/api';
import { triggerHaptic } from '../lib/modules';
import { triggerConfetti } from '../lib/confetti';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';

interface ChronoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTask?: Task | null;
  onSessionLogged?: () => void;
}

// Helper to extract YouTube Video ID
const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
};

export const ChronoModal: React.FC<ChronoModalProps> = ({ isOpen, onClose, initialTask, onSessionLogged }) => {
  const { profile, updateProfile } = useAuth();
  const { toast } = useDialog();

  const [selectedMinutes, setSelectedMinutes] = useState(initialTask?.estimated_duration_minutes || 30);
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [rating, setRating] = useState(4);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Audio / Music State
  const [activeSoundId, setActiveSoundId] = useState<string>('default_rain');
  const [isSoundPlaying, setIsSoundPlaying] = useState<boolean>(true);
  const [showSoundMenu, setShowSoundMenu] = useState<boolean>(false);
  const [chronoView, setChronoView] = useState<'timer' | 'add_sound'>('timer');

  // Add new sound form state
  const [newSoundTitle, setNewSoundTitle] = useState('');
  const [newSoundType, setNewSoundType] = useState<'youtube' | 'file'>('youtube');
  const [newSoundYoutubeUrl, setNewSoundYoutubeUrl] = useState('');
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio Context Ref for Synthesized Rain Ambient Sound
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load custom sounds from profile
  const customSounds: FocusCustomSound[] = profile?.focus_custom_sounds || [];
  const allSounds = [
    { id: 'default_rain', title: 'Pluie Zen 🌧️', type: 'synthesizer' as const, url: '' },
    ...customSounds,
  ];

  const activeSound = allSounds.find((s) => s.id === activeSoundId) || allSounds[0];

  // Set default sound from profile if available
  useEffect(() => {
    if (profile?.focus_sound_url) {
      const match = (profile.focus_custom_sounds || []).find((s) => s.url === profile.focus_sound_url);
      if (match) {
        setActiveSoundId(match.id);
      }
    }
  }, [profile?.focus_sound_url]);

  // Rain noise synthesizer functions
  const startRainSynthesizer = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      if (noiseNodeRef.current) return;

      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 1.5;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 850;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noiseNodeRef.current = noise;
      gainNodeRef.current = gain;
    } catch (e) {
      console.warn('Ambient audio not supported', e);
    }
  };

  const stopRainSynthesizer = () => {
    try {
      noiseNodeRef.current?.disconnect();
      gainNodeRef.current?.disconnect();
      noiseNodeRef.current = null;
      gainNodeRef.current = null;
    } catch {}
  };

  // Sync sound playing state with timer running & user toggle
  useEffect(() => {
    if (isRunning && isSoundPlaying && activeSoundId !== 'none') {
      if (activeSound?.type === 'synthesizer') {
        startRainSynthesizer();
        customAudioRef.current?.pause();
      } else if (activeSound?.type === 'file' && activeSound.url) {
        stopRainSynthesizer();
        if (customAudioRef.current) {
          customAudioRef.current.src = activeSound.url;
          customAudioRef.current.play().catch(() => {});
        }
      } else {
        // YouTube stream handled via iframe
        stopRainSynthesizer();
        customAudioRef.current?.pause();
      }
    } else {
      stopRainSynthesizer();
      customAudioRef.current?.pause();
    }
  }, [isRunning, isSoundPlaying, activeSoundId]);

  // Clean up sounds on unmount
  useEffect(() => {
    return () => {
      stopRainSynthesizer();
      customAudioRef.current?.pause();
    };
  }, []);

  // Add new sound (YouTube or uploaded file)
  const handleAddNewSound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSoundTitle.trim()) {
      toast.error('Veuillez saisir un titre pour votre musique/son.');
      return;
    }

    if (newSoundType === 'youtube') {
      const ytId = getYouTubeVideoId(newSoundYoutubeUrl);
      if (!ytId) {
        toast.error('URL YouTube invalide. Veuillez coller un lien valide (ex: https://www.youtube.com/watch?v=...).');
        return;
      }
      const newSound: FocusCustomSound = {
        id: `sound-yt-${Date.now()}`,
        title: newSoundTitle.trim(),
        type: 'youtube',
        url: newSoundYoutubeUrl.trim(),
        created_at: new Date().toISOString(),
      };
      const nextSounds = [...customSounds, newSound];
      await updateProfile({
        focus_custom_sounds: nextSounds,
        focus_sound_type: 'youtube',
        focus_sound_url: newSound.url,
        focus_sound_title: newSound.title,
      });
      setActiveSoundId(newSound.id);
      setIsSoundPlaying(true);
      setChronoView('timer');
      setNewSoundTitle('');
      setNewSoundYoutubeUrl('');
      toast.success(`Son YouTube "${newSound.title}" sélectionné !`);
    }
  };

  // Upload local audio file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAudio(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const uploadRes = await apiClient.uploadLocalAudio({
            audio_base64: base64,
            filename: `focus_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`,
          });

          const newSound: FocusCustomSound = {
            id: `sound-file-${Date.now()}`,
            title: newSoundTitle.trim() || file.name.replace(/\.[^/.]+$/, ''),
            type: 'file',
            url: uploadRes.url,
            created_at: new Date().toISOString(),
          };

          const nextSounds = [...customSounds, newSound];
          await updateProfile({
            focus_custom_sounds: nextSounds,
            focus_sound_type: 'custom_file',
            focus_sound_url: newSound.url,
            focus_sound_title: newSound.title,
          });

          setActiveSoundId(newSound.id);
          setIsSoundPlaying(true);
          setChronoView('timer');
          setNewSoundTitle('');
          setUploadingAudio(false);
          toast.success(`Fichier audio "${newSound.title}" uploadé et sélectionné !`);
        } catch (uploadErr: any) {
          setUploadingAudio(false);
          toast.error(uploadErr.message || "Erreur lors de l'enregistrement du fichier audio.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadingAudio(false);
      toast.error(err.message || "Erreur lors de la lecture du fichier.");
    }
  };

  // Delete custom sound
  const handleDeleteCustomSound = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSounds = customSounds.filter((s) => s.id !== id);
    if (activeSoundId === id) {
      setActiveSoundId('default_rain');
    }
    await updateProfile({
      focus_custom_sounds: nextSounds,
    });
    toast.info('Son supprimé de votre liste.');
  };

  // Play a gentle alert sound using Web Audio API when timer reaches 0
  const playAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch {}
  };

  useEffect(() => {
    if (initialTask?.estimated_duration_minutes) {
      const mins = Math.min(60, initialTask.estimated_duration_minutes);
      setSelectedMinutes(mins);
      setSecondsLeft(mins * 60);
    }
  }, [initialTask]);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && secondsLeft === 0) {
      setIsRunning(false);
      playAlertSound();
      triggerConfetti();
      setShowCompletionForm(true);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  if (!isOpen) return null;

  const handleSelectMinutes = (mins: number) => {
    if (isRunning) return;
    triggerHaptic('light');
    setSelectedMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const startTimer = () => {
    triggerHaptic('medium');
    if (!startTime) setStartTime(new Date());
    setIsRunning(true);
  };

  const pauseTimer = () => {
    triggerHaptic('light');
    setIsRunning(false);
  };

  const finishSessionEarly = () => {
    triggerHaptic('medium');
    setIsRunning(false);
    setShowCompletionForm(true);
  };

  const handleSaveSession = async () => {
    setSubmitting(true);
    triggerHaptic('heavy');
    const endTime = new Date();
    const elapsedMinutes = startTime
      ? Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / (60 * 1000)))
      : selectedMinutes;

    try {
      await apiClient.completeFocusSession({
        taskId: initialTask?.id || null,
        startTime: startTime?.toISOString() || new Date().toISOString(),
        endTime: endTime.toISOString(),
        plannedMinutes: selectedMinutes,
        actualMinutes: elapsedMinutes,
        taskCompleted,
        productivityRating: rating,
        notes,
      });

      if (taskCompleted) {
        triggerConfetti();
      }

      if (onSessionLogged) onSessionLogged();
      toast.success('Session Focus enregistrée avec succès !');
      handleClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur d'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    stopRainSynthesizer();
    if (customAudioRef.current) {
      customAudioRef.current.pause();
    }
    setIsSoundPlaying(false);
    setIsRunning(false);
    setIsZenMode(false);
    setShowCompletionForm(false);
    setStartTime(null);
    setShowSoundMenu(false);
    setChronoView('timer');
    onClose();
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, Math.max(0, Math.round(((selectedMinutes * 60 - secondsLeft) / (selectedMinutes * 60)) * 100)));

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all ${
        isZenMode
          ? 'bg-white text-slate-900 p-6'
          : 'bg-slate-900/40 backdrop-blur-sm p-4'
      }`}
    >
      {/* Hidden Audio Elements */}
      <audio ref={customAudioRef} loop />
      {activeSound?.type === 'youtube' && isRunning && isSoundPlaying && (
        <div className="hidden">
          <iframe
            key={`yt-${activeSound.id}-${isRunning}`}
            width="200"
            height="200"
            src={`https://www.youtube-nocookie.com/embed/${getYouTubeVideoId(activeSound.url)}?autoplay=1&loop=1&playlist=${getYouTubeVideoId(activeSound.url)}&controls=0`}
            allow="autoplay"
            title="Focus Sound"
          />
        </div>
      )}

      <div
        className={`relative transition-all flex flex-col ${
          isZenMode
            ? 'w-full h-full max-w-4xl p-6 sm:p-8'
            : 'w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xl'
        }`}
      >
        {/* Modal Header Bar (Left badge, Right audio & window controls) */}
        <div className="flex items-center justify-between w-full pb-3 border-b border-slate-100 mb-2 z-20 shrink-0">
          {/* Left: Badge / Status */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200/80 shrink-0">
            <Flame className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-[170px]">
              {isZenMode ? 'Mode Zen' : initialTask?.subject?.code ? `Focus • ${initialTask.subject.code}` : 'Session Focus'}
            </span>
          </div>

          {/* Right: Sound Selector + Zen Mode + Close */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Sound Selector Dropdown & Toggle Button */}
            {chronoView === 'timer' && !showCompletionForm && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSoundMenu((prev) => !prev)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSoundPlaying && activeSoundId !== 'none'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200/80 bg-slate-50/60'
                  }`}
                  title="Choisir la musique ou le son de concentration"
                >
                  {isSoundPlaying && activeSoundId !== 'none' ? (
                    <Volume2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span className="max-w-[85px] sm:max-w-[120px] truncate">
                    {activeSoundId === 'none' ? 'Silence' : activeSound.title}
                  </span>
                  <ChevronDown className="h-3 w-3 opacity-60 shrink-0" />
                </button>

              {/* Sound Menu Popover */}
              {showSoundMenu && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-2xl p-3 z-50 space-y-2 text-left animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Music className="h-3.5 w-3.5 text-indigo-600" />
                      Ambiance Sonore
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSoundPlaying((prev) => !prev)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      {isSoundPlaying ? 'Mettre en pause' : 'Activer le son'}
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {/* Built-in Rain */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSoundId('default_rain');
                        setIsSoundPlaying(true);
                        setShowSoundMenu(false);
                        triggerHaptic('light');
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        activeSoundId === 'default_rain' && isSoundPlaying
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>🌧️</span>
                        <span>Pluie Zen (Synthétiseur)</span>
                      </span>
                      {activeSoundId === 'default_rain' && isSoundPlaying && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                      )}
                    </button>

                    {/* Custom Sounds List */}
                    {customSounds.map((sound) => (
                      <div
                        key={sound.id}
                        onClick={() => {
                          setActiveSoundId(sound.id);
                          setIsSoundPlaying(true);
                          setShowSoundMenu(false);
                          triggerHaptic('light');
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer group ${
                          activeSoundId === sound.id && isSoundPlaying
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span>{sound.type === 'youtube' ? '▶️' : '🎵'}</span>
                          <span className="truncate max-w-[140px]">{sound.title}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {activeSoundId === sound.id && isSoundPlaying && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 mr-1" />
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomSound(sound.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                            title="Supprimer ce son"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Mute Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSoundId('none');
                        setIsSoundPlaying(false);
                        setShowSoundMenu(false);
                        triggerHaptic('light');
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        activeSoundId === 'none' || !isSoundPlaying
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                        <span>Silence complet (Désactivé)</span>
                      </span>
                      {(activeSoundId === 'none' || !isSoundPlaying) && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-slate-600" />
                      )}
                    </button>
                  </div>

                  {/* Add new sound trigger */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSoundMenu(false);
                        setChronoView('add_sound');
                      }}
                      className="w-full flex items-center justify-center space-x-1.5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 p-2 text-xs font-bold text-indigo-700 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Ajouter un son (Fichier ou YouTube)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Zen Mode Toggle */}
          {chronoView === 'timer' && !showCompletionForm && (
            <button
              onClick={() => {
                triggerHaptic('medium');
                setIsZenMode((prev) => !prev);
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title={isZenMode ? 'Quitter le mode Zen' : 'Plein écran Mode Zen sans distraction'}
            >
              {isZenMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}

            {/* Close button */}
            <button
              onClick={handleClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showCompletionForm ? (
          /* Completion Form */
          <div className="flex-1 flex flex-col justify-center space-y-5 w-full max-w-md mx-auto my-auto py-4">
            <div className="text-center space-y-1">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mb-2">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Session accomplie !</h3>
              <p className="text-xs text-slate-500 font-medium">
                Bravo ! Enregistrez votre ressenti pour enrichir votre modèle prédictif MGSI.
              </p>
            </div>

            {initialTask && (
              <label className="flex items-center space-x-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taskCompleted}
                  onChange={(e) => setTaskCompleted(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-800">
                  Marquer « {initialTask.title} » comme entièrement terminée
                </span>
              </label>
            )}

            {/* Productivity Star Rating */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Niveau de concentration ressenti :
              </label>
              <div className="flex items-center justify-center space-x-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating ? 'fill-current text-amber-400' : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Notes d'assimilation (optionnel) :
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Concepts clés retenus, blocages éventuels..."
                rows={2}
                className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <button
              onClick={handleSaveSession}
              disabled={submitting}
              className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3.5 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'Enregistrement...' : 'Valider la session'}
            </button>
          </div>
        ) : chronoView === 'add_sound' ? (
          /* Add Sound View directly in the card */
          <div className="flex-1 flex flex-col justify-center space-y-4 text-left w-full max-w-md mx-auto my-auto py-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <button
                  type="button"
                  onClick={() => setChronoView('timer')}
                  className="p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Retour au chronomètre"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Music className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Ajouter un son de concentration
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Personnalisez votre ambiance sonore
                  </p>
                </div>
              </div>
            </div>

            {/* Type selector: YouTube vs Fichier */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setNewSoundType('youtube')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  newSoundType === 'youtube'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ▶️ Lien YouTube
              </button>
              <button
                type="button"
                onClick={() => setNewSoundType('file')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  newSoundType === 'file'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📁 Fichier Audio Local (PC)
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddNewSound} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Titre de la piste / musique :
                </label>
                <input
                  type="text"
                  value={newSoundTitle}
                  onChange={(e) => setNewSoundTitle(e.target.value)}
                  placeholder="ex: Lofi Girl, Coran apaisant, Bruit blanc..."
                  required
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {newSoundType === 'youtube' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    URL de la vidéo YouTube :
                  </label>
                  <input
                    type="url"
                    value={newSoundYoutubeUrl}
                    onChange={(e) => setNewSoundYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-indigo-500 focus:outline-none font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Le flux YouTube sera joué en arrière-plan pendant toute la durée du chrono.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Fichier Audio (MP3, WAV, WebM) :
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAudio}
                    className="w-full flex items-center justify-center space-x-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/40 p-4 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    <Upload className="h-4 w-4 text-indigo-600" />
                    <span>{uploadingAudio ? 'Téléchargement...' : 'Choisir un fichier audio sur votre PC'}</span>
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Le fichier sera enregistré sur votre stockage local et disponible à tout moment.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setChronoView('timer')}
                  className="flex items-center space-x-1 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Retour</span>
                </button>
                {newSoundType === 'youtube' && (
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    Ajouter le son
                  </button>
                )}
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 w-full my-auto py-4">
            <div>
              <h2 className={`font-black text-slate-900 truncate tracking-tight ${isZenMode ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-2xl'}`}>
                {initialTask ? initialTask.title : 'Session Focus Libre'}
              </h2>
              {initialTask?.subject ? (
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {initialTask.subject.code} — {initialTask.subject.name}
                </p>
              ) : (
                <p className="text-xs text-slate-400 font-medium mt-1">
                  Concentration & productivité sans distraction
                </p>
              )}
            </div>

            {/* Circular Timer Display (SVG Progress - Clean & Smooth) */}
            <div className="relative flex items-center justify-center my-6">
              <div
                className={`relative flex items-center justify-center transition-all ${
                  isZenMode ? 'h-72 w-72 sm:h-84 sm:w-84' : 'h-56 w-56'
                }`}
              >
                {/* Background & Progress SVG Circle */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  {/* Background Track Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    stroke="#f1f5f9"
                    strokeWidth="5"
                    fill="transparent"
                  />
                  {/* Dynamic Progress Circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    stroke="#0f172a"
                    strokeWidth="5"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (1 - progressPercent / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>

                {/* Inner Content */}
                <div className="flex flex-col items-center justify-center relative z-10 select-none">
                  <span className={`font-mono font-black text-slate-900 tracking-tight ${isZenMode ? 'text-6xl sm:text-7xl' : 'text-5xl'}`}>
                    {formatTime(secondsLeft)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 mt-2 uppercase tracking-wider">
                    {isRunning ? 'Concentration en cours...' : 'En pause'}
                  </span>
                </div>
              </div>
            </div>

            {/* Duration Selector (Only if not yet started) */}
            {!isRunning && (
              <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto">
                {[25, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleSelectMinutes(mins)}
                    className={`rounded-xl py-2 text-xs font-bold border transition-all cursor-pointer ${
                      selectedMinutes === mins
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center space-x-3 pt-2">
              {!isRunning ? (
                <button
                  onClick={startTimer}
                  className="flex items-center space-x-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-7 py-3.5 shadow-sm hover:shadow transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Démarrer le bloc</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={pauseTimer}
                    className="flex items-center space-x-2 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 py-3.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Pause</span>
                  </button>
                  <button
                    onClick={finishSessionEarly}
                    className="flex items-center space-x-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-3.5 border border-slate-200 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    <span>Terminer</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
