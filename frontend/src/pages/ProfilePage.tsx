import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Moon,
  Utensils,
  Clock,
  Award,
  Save,
  Check,
  TableProperties,
  CheckCircle2,
  User,
  GraduationCap,
  Sparkles,
  HardDrive,
  Cloud,
  DownloadCloud,
  Folder,
  RefreshCw,
  FileAudio,
  AlertTriangle,
  Music,
  Plus,
  Trash2,
  ExternalLink,
  Upload,
  Play,
  Pause,
  Radio,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TPGroup, FocusCustomSound } from '../types';
import { useDialog } from '../context/DialogContext';
import { apiClient } from '../lib/api';

interface ProfilePageProps {
  initialSection?: 'lifestyle' | 'timetable' | 'audio';
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ initialSection = 'lifestyle' }) => {
  const { profile, user, updateProfile } = useAuth();
  const { confirm: confirmDialog, toast } = useDialog();

  const [activeSection, setActiveSection] = useState<'lifestyle' | 'timetable' | 'audio'>(initialSection);
  const [tpGroup, setTpGroup] = useState<TPGroup>('G1');
  const [sleepStart, setSleepStart] = useState('23:30');
  const [sleepEnd, setSleepEnd] = useState('07:00');
  const [lunchStart, setLunchStart] = useState('12:15');
  const [lunchEnd, setLunchEnd] = useState('14:30');
  const [dinnerStart, setDinnerStart] = useState('19:30');
  const [dinnerEnd, setDinnerEnd] = useState('20:30');
  const [preferredSession, setPreferredSession] = useState(45);
  const [maxDailyHours, setMaxDailyHours] = useState(4);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Audio Storage Settings State
  const [audioStorageMode, setAudioStorageMode] = useState<'supabase' | 'local'>('supabase');
  const [localAudioFolder, setLocalAudioFolder] = useState<string>('uploads/audios');
  const [audioStats, setAudioStats] = useState<{
    local: { count: number; bytes: number; folder: string };
    supabase: { count: number; bytes: number };
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [migrating, setMigrating] = useState(false);

  // Focus Sounds State (YouTube & Custom Audio Files)
  const [newSoundTitle, setNewSoundTitle] = useState('');
  const [newSoundType, setNewSoundType] = useState<'youtube' | 'file'>('youtube');
  const [newSoundYoutubeUrl, setNewSoundYoutubeUrl] = useState('');
  const [uploadingFocusAudio, setUploadingFocusAudio] = useState(false);
  const focusFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const customSounds: FocusCustomSound[] = profile?.focus_custom_sounds || [];

  const handleAddFocusSound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSoundTitle.trim()) {
      toast.error('Veuillez saisir un titre pour le son.');
      return;
    }

    if (newSoundType === 'youtube') {
      const match = newSoundYoutubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
      if (!match) {
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
      setNewSoundTitle('');
      setNewSoundYoutubeUrl('');
      toast.success(`Son YouTube « ${newSound.title} » ajouté à vos sons de concentration !`);
    }
  };

  const handleFocusFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingFocusAudio(true);
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

          setNewSoundTitle('');
          setUploadingFocusAudio(false);
          toast.success(`Fichier audio « ${newSound.title} » uploadé avec succès !`);
        } catch (err: any) {
          setUploadingFocusAudio(false);
          toast.error(err.message || "Erreur lors de l'upload du fichier audio.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadingFocusAudio(false);
      toast.error(err.message || 'Erreur lors de la lecture du fichier.');
    }
  };

  const handleDeleteFocusSound = async (id: string) => {
    const nextSounds = customSounds.filter((s) => s.id !== id);
    await updateProfile({
      focus_custom_sounds: nextSounds,
    });
    toast.info('Son supprimé.');
  };

  const handleSetDefaultFocusSound = async (sound: FocusCustomSound) => {
    await updateProfile({
      focus_sound_type: sound.type === 'youtube' ? 'youtube' : 'custom_file',
      focus_sound_url: sound.url,
      focus_sound_title: sound.title,
    });
    toast.success(`« ${sound.title} » défini comme musique par défaut du Chrono !`);
  };

  // Timetable view state
  const [timetableGroup, setTimetableGroup] = useState<TPGroup | 'ALL'>('ALL');

  useEffect(() => {
    if (profile) {
      setTpGroup(profile.tp_group || 'G1');
      if (profile.sleep_start) setSleepStart(profile.sleep_start.slice(0, 5));
      if (profile.sleep_end) setSleepEnd(profile.sleep_end.slice(0, 5));
      if (profile.lunch_start) setLunchStart(profile.lunch_start.slice(0, 5));
      if (profile.lunch_end) setLunchEnd(profile.lunch_end.slice(0, 5));
      if (profile.dinner_start) setDinnerStart(profile.dinner_start.slice(0, 5));
      if (profile.dinner_end) setDinnerEnd(profile.dinner_end.slice(0, 5));
      if (profile.preferred_session_minutes) setPreferredSession(profile.preferred_session_minutes);
      if (profile.max_daily_study_hours) setMaxDailyHours(profile.max_daily_study_hours);

      const savedMode =
        (profile.audio_storage_mode as 'supabase' | 'local') ||
        (localStorage.getItem('mgsi_audio_storage_mode') as any) ||
        'supabase';
      setAudioStorageMode(savedMode);
      if (profile.local_audio_folder) setLocalAudioFolder(profile.local_audio_folder);
    }
  }, [profile]);

  // Fetch audio statistics
  const fetchAudioStats = async () => {
    try {
      setLoadingStats(true);
      const res = await apiClient.getAudioStorageStats();
      setAudioStats(res);
    } catch (err) {
      console.error('Error fetching audio stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'audio') {
      fetchAudioStats();
    }
  }, [activeSection]);

  // Save Audio Storage Settings
  const handleSaveAudioSettings = async (newMode: 'supabase' | 'local', folder: string = localAudioFolder) => {
    setSaving(true);
    try {
      localStorage.setItem('mgsi_audio_storage_mode', newMode);
      setAudioStorageMode(newMode);
      await updateProfile({
        audio_storage_mode: newMode,
        local_audio_folder: folder,
      });
      toast.success(
        newMode === 'local'
          ? 'Mode Stockage Local activé ! Vos prochains audios seront stockés directement sur votre PC.'
          : 'Mode Cloud Supabase activé ! Vos prochains audios seront stockés sur le cloud Supabase.',
        'Paramètres Audio Mis à Jour'
      );
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde des paramètres audio');
    } finally {
      setSaving(false);
    }
  };

  // Migrate Audios from Supabase to Local PC
  const handleMigrateToLocal = async () => {
    const confirmed = await confirmDialog({
      title: 'Transférer et Vider Supabase ?',
      message:
        'Voulez-vous télécharger tous les fichiers audio actuellement stockés sur Supabase vers votre dossier local sur votre ordinateur et libérer tout le stockage Supabase ? Les liaisons avec chaque cours et chaque page resteront parfaitement synchronisées et fonctionnelles.',
      confirmText: 'Démarrer le transfert',
      cancelText: 'Annuler',
      type: 'warning',
      icon: 'info',
    });

    if (!confirmed) return;

    try {
      setMigrating(true);
      const res = await apiClient.migrateAudiosToLocal();
      toast.success(res.message || 'Migration terminée avec succès !', 'Stockage PC mis à jour');
      // Automatically switch storage mode to local
      await handleSaveAudioSettings('local');
      // Refresh stats
      await fetchAudioStats();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la migration des audios.');
    } finally {
      setMigrating(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Mo';
    const k = 1024;
    const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        tp_group: tpGroup,
        sleep_start: `${sleepStart}:00`,
        sleep_end: `${sleepEnd}:00`,
        lunch_start: `${lunchStart}:00`,
        lunch_end: `${lunchEnd}:00`,
        dinner_start: `${dinnerStart}:00`,
        dinner_end: `${dinnerEnd}:00`,
        preferred_session_minutes: Number(preferredSession),
        max_daily_study_hours: Number(maxDailyHours),
      });
      setSavedSuccess(true);
      toast.success('Vos préférences et votre groupe ont été enregistrés !', 'Profil mis à jour');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const officialRules = [
    { label: 'Début des Cours (CM)', date: '07/09/2026', desc: 'Deuxième et Troisième Années du cycle ingénieur' },
    { label: 'Début des Travaux Dirigés (TD)', date: '14/09/2026', desc: 'Pour les semestres S3 et S5' },
    { label: 'Début des Travaux Pratiques (TP)', date: '21/09/2026', desc: 'En salles informatiques spécialisées' },
    { label: 'Horaires Spéciaux Vendredi', date: '15h00 - 16h45 & 17h00 - 18h45', desc: 'Séance 1 : 15h00 — Séance 2 : 17h00' },
  ];

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Student Identity Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xl font-black shadow-xs">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'E'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-slate-900">
                {profile?.full_name || 'Étudiant Ingénieur'}
              </h2>
              <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold">
                Groupe TP {profile?.tp_group || tpGroup}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {user?.email} • Filière MGSI (Semestre 3) — ENSIA-SD Taroudant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 text-xs font-bold flex items-center">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
            Emploi actif jusqu'au 20 Juin 2027
          </span>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex rounded-2xl bg-slate-100 p-1.5 border border-slate-200/80">
        <button
          onClick={() => setActiveSection('lifestyle')}
          className={`flex-1 flex items-center justify-center space-x-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeSection === 'lifestyle'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="h-4 w-4 stroke-[1.75]" />
          <span>Rythme de Vie & Contraintes Cognitives</span>
        </button>
        <button
          onClick={() => setActiveSection('timetable')}
          className={`flex-1 flex items-center justify-center space-x-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeSection === 'timetable'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TableProperties className="h-4 w-4 stroke-[1.75]" />
          <span>Emploi du Temps Officiel ENSIA-SD (S3)</span>
        </button>
        <button
          onClick={() => setActiveSection('audio')}
          className={`flex-1 flex items-center justify-center space-x-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
            activeSection === 'audio'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <HardDrive className="h-4 w-4 stroke-[1.75]" />
          <span>Stockage Audio (Local / Supabase)</span>
        </button>
      </div>

      {/* SECTION 1: LIFESTYLE & COGNITIVE CONSTRAINTS */}
      {activeSection === 'lifestyle' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Pedagogical Group */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-900">
              <Award className="h-4 w-4 text-indigo-600" />
              <span>Filière & Affectation Pédagogique</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Filière</label>
                <input
                  type="text"
                  disabled
                  value="MGSI — Semestre 3 (Session d'Automne 2026-2027)"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Groupe de TP</label>
                <select
                  value={tpGroup}
                  onChange={(e) => setTpGroup(e.target.value as TPGroup)}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="G1">Groupe 1 (G1)</option>
                  <option value="G2">Groupe 2 (G2)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sleep Hours */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-900">
              <Moon className="h-4 w-4 text-indigo-600" />
              <span>Horaires de Sommeil (Créneaux Sanctuarisés)</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              L'algorithme ne placera jamais de séances d'études pendant votre sommeil.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Coucher habituel</label>
                <input
                  type="time"
                  value={sleepStart || '23:30'}
                  onChange={(e) => setSleepStart(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Réveil habituel</label>
                <input
                  type="time"
                  value={sleepEnd || '07:00'}
                  onChange={(e) => setSleepEnd(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Meal Times */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-900">
              <Utensils className="h-4 w-4 text-amber-600" />
              <span>Pauses Repas & Récupération</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Déjeuner (Début)</label>
                <input
                  type="time"
                  value={lunchStart || '12:15'}
                  onChange={(e) => setLunchStart(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Déjeuner (Fin)</label>
                <input
                  type="time"
                  value={lunchEnd || '14:30'}
                  onChange={(e) => setLunchEnd(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dîner (Début)</label>
                <input
                  type="time"
                  value={dinnerStart || '19:30'}
                  onChange={(e) => setDinnerStart(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dîner (Fin)</label>
                <input
                  type="time"
                  value={dinnerEnd || '20:30'}
                  onChange={(e) => setDinnerEnd(e.target.value)}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Cognitive & Study Preferences */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-slate-900">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span>Endurance Cognitive & Préférences d'étude</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Durée idéale d'une séance (minutes)
                </label>
                <select
                  value={preferredSession}
                  onChange={(e) => setPreferredSession(Number(e.target.value))}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value={25}>25 min (Pomodoro intense)</option>
                  <option value={30}>30 min (Court & dynamique)</option>
                  <option value={45}>45 min (Équilibré recommandé)</option>
                  <option value={60}>60 min (Grand bloc approfondi)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Limite quotidienne de travail personnel (heures)
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={maxDailyHours}
                  onChange={(e) => setMaxDailyHours(Number(e.target.value))}
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                  L'IA n'imposera jamais plus de {maxDailyHours}h d'étude personnelle par jour.
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedSuccess && (
              <span className="flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <Check className="h-4 w-4 mr-1 text-emerald-600" />
                Paramètres enregistrés et pris en compte par le planificateur !
              </span>
            )}
            <button
              type="submit"
              disabled={saving}
              className="ml-auto flex items-center space-x-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-3 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Enregistrement...' : 'Sauvegarder mes préférences'}</span>
            </button>
          </div>
        </form>
      )}

      {/* SECTION 2: OFFICIAL ENSIA-SD TIMETABLE (S3) */}
      {activeSection === 'timetable' && (
        <div className="space-y-6">
          {/* Header Controls for Timetable */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Grille Officielle Hebdomadaire — ENSIA-SD Taroudant
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Cours Magistraux (CM), Travaux Dirigés (TD) et Travaux Pratiques (TP)
              </p>
            </div>

            <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200/80 p-1 text-xs">
              {(['ALL', 'G1', 'G2'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setTimetableGroup(g)}
                  className={`rounded-lg px-3 py-1 font-bold transition-all ${
                    timetableGroup === g
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {g === 'ALL' ? 'Vue Globale' : `Groupe TP ${g}`}
                </button>
              ))}
            </div>
          </div>

          {/* Official Directives Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {officialRules.map((rule, idx) => (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1 shadow-xs">
                <div className="flex items-center text-xs font-bold text-slate-800">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-600 stroke-[2]" />
                  {rule.label}
                </div>
                <div className="font-mono text-xs font-bold text-indigo-700">{rule.date}</div>
                <p className="text-[11px] text-slate-500 font-medium">{rule.desc}</p>
              </div>
            ))}
          </div>

          {/* Full Weekly Grid */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-xs min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold">
                  <th className="p-4 w-28">Jour</th>
                  <th className="p-4 border-l border-slate-200">08:30 - 10:15</th>
                  <th className="p-4 border-l border-slate-200">10:30 - 12:15</th>
                  <th className="p-4 border-l border-slate-200">14:30 - 16:15</th>
                  <th className="p-4 border-l border-slate-200">16:30 - 18:15</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {/* Lundi */}
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">Lundi</td>
                  <td className="p-3 border-l border-slate-200 bg-sky-50/40">
                    <div className="font-bold text-slate-900">M234 - Progiciels ERP</div>
                    <div className="text-[10px] text-sky-700 font-bold uppercase mt-0.5">CM • Salle 12</div>
                    <div className="text-[10px] text-slate-500">Pr. SAAD BASMA</div>
                  </td>
                  <td className="p-3 border-l border-slate-200 bg-amber-50/40">
                    <div className="font-bold text-slate-900">M234 - Progiciels ERP</div>
                    <div className="text-[10px] text-amber-700 font-bold uppercase mt-0.5">TD • Salle 12</div>
                    <div className="text-[10px] text-slate-500">Pr. SAAD BASMA</div>
                  </td>
                  <td className="p-3 border-l border-slate-200 bg-sky-50/40">
                    <div className="font-bold text-slate-900">M232 - Gestion de projet</div>
                    <div className="text-[10px] text-sky-700 font-bold uppercase mt-0.5">CM • Amphi 1</div>
                    <div className="text-[10px] text-slate-500">Pr. RASSAM LATIFA</div>
                  </td>
                  <td className="p-3 border-l border-slate-200 text-slate-400 italic">Libre</td>
                </tr>

                {/* Mardi */}
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">Mardi</td>
                  <td className="p-3 border-l border-slate-200 bg-sky-50/40">
                    <div className="font-bold text-slate-900">M231_1 - Langue française</div>
                    <div className="text-[10px] text-sky-700 font-bold uppercase mt-0.5">CM • Amphi 3</div>
                    <div className="text-[10px] text-slate-500">Pr. Mohamed EL OUARDI</div>
                  </td>
                  <td className="p-3 border-l border-slate-200 bg-sky-50/40">
                    <div className="font-bold text-slate-900">M237_1 - Transf. Digitale</div>
                    <div className="text-[10px] text-sky-700 font-bold uppercase mt-0.5">CM • Amphi 1</div>
                    <div className="text-[10px] text-slate-500">Pr. EL BICHRI Fadila</div>
                  </td>
                  <td className="p-3 border-l border-slate-200 bg-sky-50/40">
                    <div className="font-bold text-slate-900">M231_2 - Langue Anglaise</div>
                    <div className="text-[10px] text-sky-700 font-bold uppercase mt-0.5">CM • Amphi 3</div>
                    <div className="text-[10px] text-slate-500">Pr. Mohamed HIKAL</div>
                  </td>
                  <td className="p-3 border-l border-slate-200 text-slate-400 italic">Libre</td>
                </tr>

                {/* Mercredi */}
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">Mercredi</td>
                  <td className="p-3 border-l border-slate-200 text-slate-400 italic">Libre</td>
                  <td className="p-3 border-l border-slate-200 bg-amber-50/40">
                    <div className="font-bold text-slate-900">M232 - Gestion de projet</div>
                    <div className="text-[10px] text-amber-700 font-bold uppercase mt-0.5">TD • Salle 10</div>
                    <div className="text-[10px] text-slate-500">Pr. RASSAM LATIFA</div>
                  </td>
                  <td className="p-3 border-l border-slate-200 space-y-2">
                    <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-200/80">
                      <div className="font-bold text-slate-900">M235 - Audit des SI (CM)</div>
                      <div className="text-[10px] text-sky-700 font-bold uppercase">Salle 10 • Pr. EL-ATEIF</div>
                    </div>
                    {(timetableGroup === 'ALL' || timetableGroup === 'G2') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M235 - Audit SI (TP G2)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 2 INFO • Pr. EL-ATEIF</div>
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-l border-slate-200 space-y-2">
                    <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-200/80">
                      <div className="font-bold text-slate-900">M235 - Audit des SI (CM)</div>
                      <div className="text-[10px] text-sky-700 font-bold uppercase">Salle 10 • Pr. EL-ATEIF</div>
                    </div>
                    {(timetableGroup === 'ALL' || timetableGroup === 'G1') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M235 - Audit SI (TP G1)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 2 INFO • Pr. EL-ATEIF</div>
                      </div>
                    )}
                  </td>
                </tr>

                {/* Jeudi */}
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">Jeudi</td>
                  <td className="p-3 border-l border-slate-200 space-y-2">
                    <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-200/80">
                      <div className="font-bold text-slate-900">M233 - Admin BD Avancées (CM)</div>
                      <div className="text-[10px] text-sky-700 font-bold uppercase">Salle 10 • Pr. LAASSAM</div>
                    </div>
                    {(timetableGroup === 'ALL' || timetableGroup === 'G1') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M233 - Admin BD (TP G1)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 2 INFO • Pr. LAASSAM</div>
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-l border-slate-200 space-y-2">
                    <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/80">
                      <div className="font-bold text-slate-900">M233 - Admin BD (TD)</div>
                      <div className="text-[10px] text-amber-700 font-bold uppercase">Salle 10 • Pr. LAASSAM</div>
                    </div>
                    {(timetableGroup === 'ALL' || timetableGroup === 'G2') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M233 - Admin BD (TP G2)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 2 INFO • Pr. LAASSAM</div>
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-l border-slate-200 space-y-2">
                    {(timetableGroup === 'ALL' || timetableGroup === 'G1') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M232 - Génie Logiciel (TP G1)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 4 INFO • Pr. RASSAM</div>
                      </div>
                    )}
                    {(timetableGroup === 'ALL' || timetableGroup === 'G2') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M236 - Syst. Distribués (TP G2)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 3 INFO • Pr. BOUJERFAOUI</div>
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-l border-slate-200 space-y-2">
                    {(timetableGroup === 'ALL' || timetableGroup === 'G2') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M232 - Génie Logiciel (TP G2)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 4 INFO • Pr. RASSAM</div>
                      </div>
                    )}
                    {(timetableGroup === 'ALL' || timetableGroup === 'G1') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M236 - Syst. Distribués (TP G1)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 3 INFO • Pr. BOUJERFAOUI</div>
                      </div>
                    )}
                  </td>
                </tr>

                {/* Vendredi */}
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">
                    Vendredi
                    <span className="block text-[10px] text-slate-500 font-medium mt-0.5">Horaires spéciaux après-midi</span>
                  </td>
                  <td className="p-3 border-l border-slate-200">
                    {(timetableGroup === 'ALL' || timetableGroup === 'G2') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M234 - ERP (TP G2)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 3 INFO • Pr. SAAD</div>
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-l border-slate-200">
                    {(timetableGroup === 'ALL' || timetableGroup === 'G1') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M234 - ERP (TP G1)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 3 INFO • Pr. SAAD</div>
                      </div>
                    )}
                  </td>
                  {/* Vendredi après-midi : 15h00 - 16h45 */}
                  <td className="p-3 border-l border-slate-200 bg-sky-50/40">
                    <div className="font-mono text-[10px] text-sky-800 font-bold mb-1">15:00 - 16:45</div>
                    <div className="font-bold text-slate-900">M236 - Systèmes Distribués</div>
                    <div className="text-[10px] text-sky-700 font-bold uppercase mt-0.5">CM • Salle 6</div>
                    <div className="text-[10px] text-slate-500">Pr. BOUJERFAOUI SAID</div>
                  </td>
                  {/* Vendredi après-midi : 17h00 - 18h45 */}
                  <td className="p-3 border-l border-slate-200 bg-amber-50/40">
                    <div className="font-mono text-[10px] text-amber-800 font-bold mb-1">17:00 - 18:45</div>
                    <div className="font-bold text-slate-900">M236 - Systèmes Distribués</div>
                    <div className="text-[10px] text-amber-700 font-bold uppercase mt-0.5">TD • Salle 6</div>
                    <div className="text-[10px] text-slate-500">Pr. BOUJERFAOUI SAID</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: AUDIO STORAGE (LOCAL PC vs SUPABASE CLOUD) */}
      {activeSection === 'audio' && (
        <div className="space-y-6">
          {/* Main Storage Mode Selection */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-indigo-600" />
                  Mode de Stockage des Notes Vocales
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Choisissez l'emplacement où sont enregistrées vos notes audio. Le mode local utilise le disque de votre PC sans aucune limite de taille ni de quota.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchAudioStats}
                disabled={loadingStats}
                className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
                title="Actualiser les statistiques"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? 'animate-spin text-indigo-600' : ''}`} />
                <span>Actualiser</span>
              </button>
            </div>

            {/* Mode Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Local Storage PC */}
              <div
                onClick={() => handleSaveAudioSettings('local')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  audioStorageMode === 'local'
                    ? 'border-indigo-600 bg-indigo-50/30 shadow-xs ring-4 ring-indigo-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2.5 rounded-xl ${audioStorageMode === 'local' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        <HardDrive className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-sm">Stockage Local (sur PC)</div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          Recommandé • Illimité
                        </span>
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      audioStorageMode === 'local' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                    }`}>
                      {audioStorageMode === 'local' && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Les enregistrements sont stockés directement sur votre disque dur dans le dossier du serveur local. 
                    <strong> Aucun quota Supabase consommé</strong>, stockage illimité et synchronisation permanente avec vos cours et pages.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Dossier : uploads/audios</span>
                  <span className="font-bold text-indigo-700">Zero Limite</span>
                </div>
              </div>

              {/* Card 2: Supabase Cloud */}
              <div
                onClick={() => handleSaveAudioSettings('supabase')}
                className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  audioStorageMode === 'supabase'
                    ? 'border-indigo-600 bg-indigo-50/30 shadow-xs ring-4 ring-indigo-50'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2.5 rounded-xl ${audioStorageMode === 'supabase' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        <Cloud className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-black text-slate-900 text-sm">Cloud Supabase Storage</div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                          Quota Gratuit : 1 Go Max
                        </span>
                      </div>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      audioStorageMode === 'supabase' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
                    }`}>
                      {audioStorageMode === 'supabase' && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Les fichiers audio sont hébergés dans le bucket cloud <code>audio_notes</code> de votre projet Supabase.
                    Accessible partout sur le web mais limité au quota de 1 Go du plan gratuit.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Bucket : audio_notes</span>
                  <span className="font-bold text-amber-700">1 Go Max</span>
                </div>
              </div>
            </div>

            {/* Custom Folder Configuration if in Local Mode */}
            {audioStorageMode === 'local' && (
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-2">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Folder className="h-4 w-4 text-indigo-600" />
                  Dossier local de destination sur votre machine :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localAudioFolder || ''}
                    onChange={(e) => setLocalAudioFolder(e.target.value)}
                    placeholder="uploads/audios"
                    className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono font-bold text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveAudioSettings('local', localAudioFolder)}
                    disabled={saving}
                    className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? '...' : 'Enregistrer'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Par défaut : <code>uploads/audios</code> dans le dossier du backend MGSI. Les fichiers audio sont servis via <code>/uploads/audios/...</code>.
                </p>
              </div>
            )}
          </div>

          {/* Real-time Storage Usage Statistics */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileAudio className="h-4 w-4 text-indigo-600" />
              État Actuel du Stockage
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Local PC Stats */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <HardDrive className="h-4 w-4 text-slate-700" />
                    Stockage Local (PC)
                  </span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5">
                    Actif
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {formatBytes(audioStats?.local.bytes || 0)}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {audioStats?.local.count || 0} enregistrement{(audioStats?.local.count || 0) > 1 ? 's' : ''} sur disque
                </div>
              </div>

              {/* Supabase Cloud Stats */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Cloud className="h-4 w-4 text-indigo-600" />
                    Stockage Supabase (Cloud)
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    Limite : 1 Go
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {formatBytes(audioStats?.supabase.bytes || 0)}
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  {audioStats?.supabase.count || 0} fichier{(audioStats?.supabase.count || 0) > 1 ? 's' : ''} dans le bucket <code>audio_notes</code>
                </div>
              </div>
            </div>
          </div>

          {/* Migration & Supabase Space Cleanup Card */}
          <div className="rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/50 p-6 shadow-xs space-y-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-xs shrink-0">
                <DownloadCloud className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-900">
                  Transférer les Audios vers le PC & Libérer l'Espace Supabase
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cette action télécharge tous les enregistrements audio actuellement hébergés sur Supabase vers votre dossier local sur votre ordinateur, met à jour automatiquement les liens avec chaque document et chaque page (aucune perte de données !), puis vide le stockage Supabase pour restaurer 100% de votre quota gratuit.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center text-[11px] text-slate-500 font-medium">
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-amber-500 shrink-0" />
                <span>Les notes de texte et les liens de pages restent inchangés et fonctionnels.</span>
              </div>

              <button
                type="button"
                onClick={handleMigrateToLocal}
                disabled={migrating}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-5 py-3 shadow-md hover:shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shrink-0"
              >
                {migrating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Téléchargement & Nettoyage en cours...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="h-4 w-4" />
                    <span>Migrer vers le PC & Vider Supabase</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SECTION: CUSTOM FOCUS SOUNDS (YOUTUBE & LOCAL FILES) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Music className="h-5 w-5 text-indigo-600" />
                  Musiques & Sons de Concentration (Chrono Focus)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Personnalisez librement les sons de vos sessions de révision : ajoutez des streams YouTube (Lofi, Coran, Bruit Blanc) ou importez vos propres fichiers audio depuis votre PC.
                </p>
              </div>
            </div>

            {/* Existing Custom Sounds List */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Vos Pistes Audio Enregistrées ({customSounds.length + 1})
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Default Rain Card */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className="text-xl">🌧️</span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">Pluie Zen (Synthétiseur)</div>
                      <span className="text-[10px] text-slate-500 font-medium">Son d'ambiance intégré</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                    Par défaut
                  </span>
                </div>

                {/* Custom Sounds Cards */}
                {customSounds.map((sound) => {
                  const isDefault = profile?.focus_sound_url === sound.url;
                  return (
                    <div
                      key={sound.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                        isDefault ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="text-xl">{sound.type === 'youtube' ? '▶️' : '🎵'}</span>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">{sound.title}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1.5 truncate">
                            <span>{sound.type === 'youtube' ? 'YouTube Stream' : 'Fichier Audio PC'}</span>
                            {sound.type === 'youtube' && (
                              <a
                                href={sound.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline flex items-center gap-0.5"
                                title="Ouvrir sur YouTube"
                              >
                                <span>Ouvrir</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {!isDefault ? (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultFocusSound(sound)}
                            className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Définir comme musique active par défaut"
                          >
                            Activer
                          </button>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            Actif
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteFocusSound(sound.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer ce son"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add New Sound Form Card */}
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-4 sm:p-5 space-y-4">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-indigo-600" />
                Ajouter une Nouvelle Piste Audio
              </h4>

              {/* Toggle: YouTube vs Fichier */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 max-w-sm">
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

              <form onSubmit={handleAddFocusSound} className="space-y-3 max-w-xl">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Titre ou Nom du son :
                  </label>
                  <input
                    type="text"
                    value={newSoundTitle || ''}
                    onChange={(e) => setNewSoundTitle(e.target.value)}
                    placeholder="ex: Lofi Girl Study, Coran Sourate Al-Kahf, Deep Focus..."
                    required
                    className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {newSoundType === 'youtube' ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      URL de la vidéo YouTube :
                    </label>
                    <input
                      type="url"
                      value={newSoundYoutubeUrl || ''}
                      onChange={(e) => setNewSoundYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                      className="w-full text-xs rounded-xl border border-slate-300 bg-white p-2.5 focus:border-indigo-500 focus:outline-none font-mono text-[11px]"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Le son de la vidéo sera diffusé en arrière-plan pendant vos sessions de révision dans le Chrono.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Fichier Audio (MP3, WAV, WebM) :
                    </label>
                    <input
                      type="file"
                      ref={focusFileInputRef}
                      accept="audio/*"
                      onChange={handleFocusFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => focusFileInputRef.current?.click()}
                      disabled={uploadingFocusAudio}
                      className="w-full flex items-center justify-center space-x-2 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white hover:bg-indigo-50/30 p-4 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      <Upload className="h-4 w-4 text-indigo-600" />
                      <span>{uploadingFocusAudio ? 'Upload en cours...' : 'Sélectionner un fichier audio sur votre ordinateur'}</span>
                    </button>
                  </div>
                )}

                {newSoundType === 'youtube' && (
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 shadow-xs transition-all cursor-pointer"
                  >
                    Ajouter le son YouTube
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
