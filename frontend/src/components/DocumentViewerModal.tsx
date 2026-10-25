import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Save,
  BookOpen,
  Headphones,
  FileText,
  Sparkles,
  Download,
  CheckCircle2,
  Volume2,
  FileDown,
  Layers,
  ListOrdered,
  Maximize2,
  Minimize2,
  Upload,
  RotateCcw,
  RotateCw,
} from 'lucide-react';
import { ModuleDocument, DocumentPageNote, AudioRecordingItem } from '../types';
import { apiClient } from '../lib/api';
import { triggerHaptic, getModuleTheme } from '../lib/modules';
import { extractPdfPageCount } from '../lib/pdfUtils';
import { useDialog } from '../context/DialogContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// Helper for smart pagination (avoids rendering 100+ buttons while keeping all annotated pages accessible)
const getVisiblePageNumbers = (
  current: number,
  total: number,
  annotatedPages: number[]
): (number | 'ellipsis')[] => {
  if (total <= 10) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pagesSet = new Set<number>();
  // Always include first and last page
  pagesSet.add(1);
  pagesSet.add(total);

  // Include window around current page
  for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) {
    pagesSet.add(i);
  }

  // Always include pages that contain notes
  annotatedPages.forEach((p) => {
    if (p >= 1 && p <= total) pagesSet.add(p);
  });

  const sorted = Array.from(pagesSet).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(sorted[i]);
  }

  return result;
};

interface DocumentViewerModalProps {
  isOpen: boolean;
  document: ModuleDocument | null;
  onClose: () => void;
  onDocumentUpdated?: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  document,
  onClose,
  onDocumentUpdated,
}) => {
  if (!isOpen || !document) return null;

  const modTheme = getModuleTheme(document.subject?.code || document.title);
  const { confirm: confirmDialog, alert: alertDialog, toast } = useDialog();
  const { profile } = useAuth();

  // Viewer state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(
    document.total_pages && document.total_pages > 0 ? document.total_pages : 1
  );
  const [pageInputVal, setPageInputVal] = useState<string>('1');
  const [notesByPage, setNotesByPage] = useState<Record<number, DocumentPageNote>>({});
  const [loadingNotes, setLoadingNotes] = useState(true);

  // Automatically detect and sync exact PDF page count from the file
  useEffect(() => {
    let isCancelled = false;
    const detectRealPages = async () => {
      if (!document?.file_url) return;
      try {
        const count = await extractPdfPageCount(document.file_url);
        if (!isCancelled && count && count > 0) {
          setTotalPages(count);
          setCurrentPage((prev) => Math.max(1, Math.min(prev, count)));
          setPageInputVal((prev) => String(Math.max(1, Math.min(parseInt(prev, 10) || 1, count))));
        }
      } catch (e) {
        console.warn('Failed to detect PDF page count:', e);
      }
    };
    detectRealPages();
    return () => {
      isCancelled = true;
    };
  }, [document?.id, document?.file_url]);

  // Convert Base64 data URL to Blob URL if necessary for proper #page navigation support
  const pdfBlobUrl = useMemo(() => {
    if (!document?.file_url) return '';
    if (document.file_url.startsWith('data:application/pdf;base64,')) {
      try {
        const base64 = document.file_url.split(',')[1];
        const binaryStr = atob(base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
      } catch (e) {
        console.error('Error converting base64 to blob url:', e);
        return document.file_url;
      }
    }
    return document.file_url;
  }, [document?.file_url]);

  // Detect if document is an audio document (podcast / lecture / recording)
  const isAudioDoc = useMemo(() => {
    if (!document) return false;
    return (
      document.doc_type === 'audio' ||
      /\.(mp3|wav|m4a|ogg|webm|aac|flac)($|\?)/i.test(document.file_url || '') ||
      /\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i.test(document.file_name || '') ||
      (document.file_url || '').includes('/uploads/audios/') ||
      (document.file_url || '').startsWith('data:audio/')
    );
  }, [document]);

  // Audio Document Player State
  const audioDocRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudioDoc, setIsPlayingAudioDoc] = useState(false);
  const [audioDocCurrentTime, setAudioDocCurrentTime] = useState(0);
  const [audioDocDuration, setAudioDocDuration] = useState(0);
  const [audioDocRate, setAudioDocRate] = useState(1);

  // Audio note file upload ref
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPageAudio, setUploadingPageAudio] = useState(false);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  // Helper to extract audio recordings list from note
  const getNoteAudios = (note?: DocumentPageNote | null): AudioRecordingItem[] => {
    if (!note) return [];
    if (note.audio_recordings && Array.isArray(note.audio_recordings) && note.audio_recordings.length > 0) {
      return note.audio_recordings;
    }
    if (note.audio_url) {
      return [
        {
          id: 'rec-legacy',
          url: note.audio_url,
          duration: note.audio_duration_seconds || 0,
          title: 'Note vocale 1',
          created_at: note.created_at || new Date().toISOString(),
        },
      ];
    }
    return [];
  };

  // Current page edit state
  const [pageText, setPageText] = useState<string>('');
  const [pageAudios, setPageAudios] = useState<AudioRecordingItem[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Synchronized refs to avoid stale closure issues in async callbacks (e.g. MediaRecorder onstop)
  const currentPageRef = useRef<number>(currentPage);
  const pageTextRef = useRef<string>(pageText);
  const pageAudiosRef = useRef<AudioRecordingItem[]>(pageAudios);
  currentPageRef.current = currentPage;
  pageTextRef.current = pageText;
  pageAudiosRef.current = pageAudios;

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingSecondsRef = useRef<number>(0);
  recordingSecondsRef.current = recordingSeconds;
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  // Native browser fullscreen toggle
  const toggleBrowserFullscreen = () => {
    if (!window.document.fullscreenElement) {
      window.document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullScreen(true);
    } else {
      window.document.exitFullscreen?.().catch(() => {});
      setIsFullScreen(false);
    }
  };

  const handleClose = () => {
    if (window.document.fullscreenElement) {
      window.document.exitFullscreen?.().catch(() => {});
    }
    onClose();
  };

  // View mode: 'split' (PDF + notes of current page) or 'review' (all notes compiled)
  const [viewMode, setViewMode] = useState<'split' | 'review'>('split');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Fetch all notes for this document
  const fetchNotes = async () => {
    try {
      setLoadingNotes(true);
      const res = await apiClient.getDocumentNotes(document.id);
      const map: Record<number, DocumentPageNote> = {};
      (res.notes || []).forEach((n: DocumentPageNote) => {
        map[n.page_number] = n;
      });
      setNotesByPage(map);

      // Load note for current page
      const current = map[currentPage];
      setPageText(current?.text_content || '');
      setPageAudios(getNoteAudios(current));
    } catch (err) {
      console.error('Error fetching document notes:', err);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [document.id]);

  // When changing page, synchronize the text and audio inputs and jump in PDF
  const handlePageChange = (newPage: number) => {
    // Strictly clamp between 1 and totalPages!
    const clampedPage = Math.max(1, Math.min(newPage, totalPages));
    triggerHaptic('light');

    // Auto-save previous page if text changed
    if (pageText !== (notesByPage[currentPage]?.text_content || '')) {
      handleSaveNote(currentPage, pageText, pageAudios);
    }

    setCurrentPage(clampedPage);
    setPageInputVal(String(clampedPage));
    const n = notesByPage[clampedPage];
    setPageText(n?.text_content || '');
    setPageAudios(getNoteAudios(n));
  };

  // Save note for a specific page
  const handleSaveNote = async (
    page: number = currentPageRef.current,
    text: string = pageTextRef.current,
    audios: AudioRecordingItem[] = pageAudiosRef.current
  ) => {
    try {
      setSavingNote(true);
      const primaryUrl = audios.length > 0 ? audios[0].url : null;
      const primaryDuration = audios.length > 0 ? (audios[0].duration || 0) : 0;

      const res = await apiClient.savePageNote(document.id, {
        page_number: page,
        text_content: text,
        audio_url: primaryUrl,
        audio_duration_seconds: primaryDuration,
        audio_recordings: audios,
      });

      if (res.note) {
        setNotesByPage((prev) => ({
          ...prev,
          [page]: res.note,
        }));
      }

      setSaveSuccess(true);
      triggerHaptic('medium');
      setTimeout(() => setSaveSuccess(false), 2500);
      if (onDocumentUpdated) onDocumentUpdated();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde de la note.');
    } finally {
      setSavingNote(false);
    }
  };

  // Start Audio Recording
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        await alertDialog({
          title: 'Microphone non supporté',
          message: "L'enregistrement audio n'est pas supporté par votre navigateur.",
          type: 'warning',
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const finalSeconds = recordingSecondsRef.current;
          const pageNum = currentPageRef.current;
          const currentAudios = pageAudiosRef.current;
          const currentText = pageTextRef.current;

          const isLocalMode =
            profile?.audio_storage_mode === 'local' ||
            localStorage.getItem('mgsi_audio_storage_mode') === 'local';

          let audioUrl = '';

          if (isLocalMode) {
            // 1. Stockage Local PC (Disque Dur via Backend)
            try {
              const base64Audio = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(audioBlob);
              });

              const localRes = await apiClient.uploadLocalAudio({
                audio_base64: base64Audio,
                document_id: document.id,
                page_number: pageNum,
                filename: `doc_${document.id}_page_${pageNum}_${Date.now()}.webm`,
              });

              if (localRes?.url) {
                audioUrl = localRes.url;
              }
            } catch (localErr) {
              console.warn('Local storage upload failed, attempting Supabase fallback:', localErr);
            }
          }

          // Fallback or Supabase Cloud Mode
          if (!audioUrl) {
            try {
              const fileName = `doc_${document.id}_page_${pageNum}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.webm`;
              const { data, error } = await supabase.storage
                .from('audio_notes')
                .upload(`audios/${fileName}`, audioBlob, { contentType: 'audio/webm', upsert: true });

              if (!error && data?.path) {
                const { data: publicData } = supabase.storage
                  .from('audio_notes')
                  .getPublicUrl(data.path);
                audioUrl = publicData.publicUrl;
              }
            } catch (uploadErr) {
              console.warn('Supabase storage upload failed, falling back to base64:', uploadErr);
            }
          }

          if (!audioUrl) {
            audioUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(audioBlob);
            });
          }

          const newAudio: AudioRecordingItem = {
            id: `rec-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            url: audioUrl,
            duration: finalSeconds || 0,
            title: `Note vocale ${currentAudios.length + 1}`,
            created_at: new Date().toISOString(),
          };

          const nextAudios = [...currentAudios, newAudio];
          setPageAudios(nextAudios);
          pageAudiosRef.current = nextAudios;
          await handleSaveNote(pageNum, currentText, nextAudios);
          toast.success(
            `Note vocale ${nextAudios.length} enregistrée (${isLocalMode ? 'Stockage Local PC' : 'Cloud Supabase'}) pour la page ${pageNum} !`
          );
        } catch (err: any) {
          console.error('Error in onstop recording:', err);
          toast.error("Erreur lors de l'enregistrement de la note audio.");
        } finally {
          // Stop all audio tracks
          stream.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      triggerHaptic('heavy');

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      await alertDialog({
        title: 'Accès au microphone requis',
        message: "Impossible d'accéder au microphone. Veuillez autoriser l'accès audio dans les autorisations de votre navigateur.",
        type: 'danger',
      });
    }
  };

  // Stop Audio Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      triggerHaptic('medium');
    }
  };

  // Upload an audio file for the current page
  const handleUploadPageAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPageAudio(true);
    triggerHaptic('medium');

    try {
      const pageNum = currentPageRef.current;
      const currentAudios = pageAudiosRef.current;
      const currentText = pageTextRef.current;

      const isLocalMode =
        profile?.audio_storage_mode === 'local' ||
        localStorage.getItem('mgsi_audio_storage_mode') === 'local';

      // 1. Detect audio duration
      let audioDuration = 0;
      try {
        const tempAudio = new Audio();
        const objUrl = URL.createObjectURL(file);
        tempAudio.src = objUrl;
        await new Promise((res) => {
          tempAudio.onloadedmetadata = () => {
            audioDuration = Math.round(tempAudio.duration) || 0;
            URL.revokeObjectURL(objUrl);
            res(true);
          };
          tempAudio.onerror = () => {
            URL.revokeObjectURL(objUrl);
            res(false);
          };
          setTimeout(() => res(false), 2000);
        });
      } catch {
        // ignore
      }

      let audioUrl = '';

      // 2. Upload via Local PC Backend
      if (isLocalMode) {
        try {
          const base64Audio = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const localRes = await apiClient.uploadLocalAudio({
            audio_base64: base64Audio,
            document_id: document.id,
            page_number: pageNum,
            filename: file.name,
          });

          if (localRes?.url) {
            audioUrl = localRes.url;
          }
        } catch (localErr) {
          console.warn('Local storage upload failed, attempting Supabase fallback:', localErr);
        }
      }

      // 3. Fallback or Supabase Cloud Mode
      if (!audioUrl) {
        try {
          const fileExt = file.name.split('.').pop() || 'webm';
          const fileName = `doc_${document.id}_page_${pageNum}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
          const { data, error } = await supabase.storage
            .from('audio_notes')
            .upload(`audios/${fileName}`, file, { contentType: file.type || 'audio/webm', upsert: true });

          if (!error && data?.path) {
            const { data: publicData } = supabase.storage
              .from('audio_notes')
              .getPublicUrl(data.path);
            audioUrl = publicData.publicUrl;
          }
        } catch (uploadErr) {
          console.warn('Supabase storage upload failed, falling back to base64:', uploadErr);
        }
      }

      if (!audioUrl) {
        audioUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const newAudio: AudioRecordingItem = {
        id: `rec-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        url: audioUrl,
        duration: audioDuration,
        title: file.name.replace(/\.[^/.]+$/, '') || `Note vocale ${currentAudios.length + 1}`,
        created_at: new Date().toISOString(),
      };

      const nextAudios = [...currentAudios, newAudio];
      setPageAudios(nextAudios);
      pageAudiosRef.current = nextAudios;
      await handleSaveNote(pageNum, currentText, nextAudios);
      toast.success(
        `Fichier audio "${newAudio.title}" importé pour la page ${pageNum} !`
      );
      triggerHaptic('heavy');
    } catch (err: any) {
      console.error('Error uploading page audio:', err);
      toast.error(err.message || "Erreur lors de l'enregistrement du fichier audio.");
    } finally {
      setUploadingPageAudio(false);
      if (audioFileInputRef.current) {
        audioFileInputRef.current.value = '';
      }
    }
  };

  // Rename a specific audio note
  const handleRenameAudio = (audioId: string, newTitle: string) => {
    setPageAudios((prev) => {
      const updated = prev.map((a) => (a.id === audioId ? { ...a, title: newTitle } : a));
      pageAudiosRef.current = updated;
      return updated;
    });
  };

  // Blur save after renaming
  const handleBlurRenameAudio = () => {
    handleSaveNote(currentPageRef.current, pageTextRef.current, pageAudiosRef.current);
  };

  // Delete a specific audio note
  const handleDeleteAudio = async (audioId: string, index: number) => {
    const item = pageAudiosRef.current.find((a) => a.id === audioId);
    const audioName = item?.title || `Note vocale ${index + 1}`;
    const confirmed = await confirmDialog({
      title: `Supprimer ${audioName} ?`,
      message: `Voulez-vous vraiment supprimer cet enregistrement audio de la page ${currentPageRef.current} ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Conserver',
      type: 'danger',
      icon: 'trash',
    });
    if (!confirmed) return;

    const nextAudios = pageAudiosRef.current.filter((a) => a.id !== audioId);
    setPageAudios(nextAudios);
    pageAudiosRef.current = nextAudios;
    await handleSaveNote(currentPageRef.current, pageTextRef.current, nextAudios);
    toast.success(`${audioName} supprimée avec succès !`);
    triggerHaptic('light');
  };

  // Format seconds as MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Pages with existing notes count
  const pagesWithNotes = useMemo(() => {
    return Object.keys(notesByPage)
      .map(Number)
      .filter((p) => {
        const n = notesByPage[p];
        const hasText = Boolean(n?.text_content);
        const hasAudios = (n?.audio_recordings && n.audio_recordings.length > 0) || Boolean(n?.audio_url);
        return hasText || hasAudios;
      });
  }, [notesByPage]);

  // Smart visible pages list (avoids rendering 100+ buttons while keeping annotated pages accessible)
  const visiblePages = useMemo(() => {
    return getVisiblePageNumbers(currentPage, totalPages, pagesWithNotes);
  }, [currentPage, totalPages, pagesWithNotes]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] w-screen h-screen m-0 p-0 overflow-hidden bg-white">
      <div className="w-full h-full flex flex-col m-0 p-0 rounded-none border-0 overflow-hidden bg-white">
        {/* Top Navigation Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white select-none">
          <div className="flex items-center space-x-3 overflow-hidden">
            <span
              className={`rounded-xl px-2.5 py-1 text-xs font-black uppercase tracking-wider border ${
                document.doc_type === 'cours'
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : document.doc_type === 'td'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {document.doc_type.toUpperCase()}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 truncate flex items-center gap-2">
                <span>{document.title}</span>
                <span className="text-xs font-semibold text-slate-400">
                  • {document.subject?.code || 'MGSI'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {document.subject?.name} • {document.subject?.professor || 'ENSIA-SD'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs">
              <button
                onClick={() => {
                  setViewMode('split');
                  triggerHaptic('light');
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mode Étude (PDF & Notes)</span>
                <span className="sm:hidden">Étude</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('review');
                  triggerHaptic('light');
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  viewMode === 'review'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="hidden sm:inline">Fiche de Révision Éclair</span>
                <span className="sm:hidden">Révision</span>
                {pagesWithNotes.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-full text-[10px]">
                    {pagesWithNotes.length}
                  </span>
                )}
              </button>
            </div>

            {/* Quick Save Note Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => handleSaveNote(currentPage, pageText, pageAudios)}
                disabled={savingNote}
                className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-all cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                    <span>Enregistré !</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" />
                    <span>Enregistrer</span>
                  </>
                )}
              </button>
            </div>

            {/* Browser Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleBrowserFullscreen}
              className="hidden sm:flex rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title={isFullScreen ? 'Quitter le mode plein écran natif' : 'Plein écran natif'}
            >
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title="Fermer l'espace d'étude"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {viewMode === 'split' ? (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-50/50 m-0 p-0">
            {/* LEFT PANE: Interactive PDF Viewer */}
            <div className="lg:col-span-7 flex flex-col border-r border-slate-200 bg-slate-100/70 overflow-hidden relative h-full">
              {/* PDF Toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-white/95 backdrop-blur-xs border-b border-slate-200 text-xs select-none gap-2">
                {/* Page Navigation & Direct Jump Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = parseInt(pageInputVal, 10);
                    if (!isNaN(val)) {
                      const clamped = Math.max(1, Math.min(val, totalPages));
                      handlePageChange(clamped);
                      setPageInputVal(String(clamped));
                    } else {
                      setPageInputVal(String(currentPage));
                    }
                  }}
                  className="flex items-center space-x-1.5 shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Page précédente"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center space-x-1.5 font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-xs font-sans text-slate-500 font-bold">Page</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageInputVal}
                      onChange={(e) => setPageInputVal(e.target.value)}
                      onBlur={() => {
                        const val = parseInt(pageInputVal, 10);
                        if (!isNaN(val)) {
                          const clamped = Math.max(1, Math.min(val, totalPages));
                          handlePageChange(clamped);
                          setPageInputVal(String(clamped));
                        } else {
                          setPageInputVal(String(currentPage));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = parseInt(pageInputVal, 10);
                          if (!isNaN(val)) {
                            const clamped = Math.max(1, Math.min(val, totalPages));
                            handlePageChange(clamped);
                            setPageInputVal(String(clamped));
                          } else {
                            setPageInputVal(String(currentPage));
                          }
                        }
                      }}
                      className="w-12 text-center bg-white border border-slate-300 rounded-lg px-1 py-0.5 text-indigo-700 font-black focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs shadow-xs"
                      title={`Tapez un numéro de page (1 à ${totalPages}) et appuyez sur Entrée`}
                    />
                    <span className="text-slate-500 font-bold px-1 select-none">/ {totalPages}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Page suivante"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </form>

                {/* Smart Page Indicator Pills (handles 100+ pages and keeps annotated pages accessible) */}
                <div className="flex items-center space-x-1 overflow-x-auto max-w-md lg:max-w-xl py-0.5 no-scrollbar">
                  {visiblePages.map((item, idx) => {
                    if (item === 'ellipsis') {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 text-slate-400 font-bold select-none text-xs tracking-widest"
                        >
                          •••
                        </span>
                      );
                    }

                    const p = item;
                    const hasNote = Boolean(
                      notesByPage[p]?.text_content ||
                        (notesByPage[p]?.audio_recordings && notesByPage[p].audio_recordings!.length > 0) ||
                        notesByPage[p]?.audio_url
                    );
                    const isCur = p === currentPage;

                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handlePageChange(p);
                        }}
                        className={`relative min-w-[28px] h-7 px-2 flex items-center justify-center rounded-lg text-xs font-black transition-all cursor-pointer select-none ${
                          isCur
                            ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 scale-105 z-10'
                            : hasNote
                            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 hover:text-slate-900'
                        }`}
                        title={`Aller à la page ${p}${hasNote ? ' (contient des notes)' : ''}`}
                      >
                        {p}
                        {hasNote && !isCur && (
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-indigo-600 ring-2 ring-white" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Download / Open Original PDF */}
                <a
                  href={document.file_url}
                  download={document.file_name}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1 font-bold text-[11px] shrink-0"
                  title="Télécharger le fichier original"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Ouvrir</span>
                </a>
              </div>

              {/* Media Container: Audio Player Workspace OR PDF iframe */}
              {isAudioDoc ? (
                <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 md:p-10 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 text-white relative select-none">
                  <audio
                    ref={audioDocRef}
                    src={document.file_url}
                    onTimeUpdate={() => {
                      if (audioDocRef.current) {
                        setAudioDocCurrentTime(audioDocRef.current.currentTime);
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (audioDocRef.current) {
                        setAudioDocDuration(audioDocRef.current.duration);
                      }
                    }}
                    onPlay={() => setIsPlayingAudioDoc(true)}
                    onPause={() => setIsPlayingAudioDoc(false)}
                    onEnded={() => setIsPlayingAudioDoc(false)}
                  />

                  {/* Audio Card */}
                  <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/15 p-6 rounded-3xl shadow-2xl flex flex-col items-center space-y-6">
                    {/* Animated Waveform Icon / Vinyl Cover */}
                    <div className="relative">
                      <div
                        className={`w-28 h-28 rounded-3xl flex items-center justify-center transition-all ${
                          isPlayingAudioDoc
                            ? 'bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/30 scale-105'
                            : 'bg-white/10 border border-white/20'
                        }`}
                      >
                        <Headphones className={`w-14 h-14 ${isPlayingAudioDoc ? 'text-white animate-pulse' : 'text-slate-300'}`} />
                      </div>
                      {isPlayingAudioDoc && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                        </span>
                      )}
                    </div>

                    {/* Title & Info */}
                    <div className="text-center space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                        {document.subject?.code || 'Module'} • Cours Audio
                      </span>
                      <h3 className="text-base font-black text-white line-clamp-2">
                        {document.title}
                      </h3>
                      <p className="text-xs text-slate-300 font-mono">
                        {document.file_name}
                      </p>
                    </div>

                    {/* Progress Bar & Timers */}
                    <div className="w-full space-y-2">
                      <input
                        type="range"
                        min={0}
                        max={audioDocDuration || 100}
                        value={audioDocCurrentTime}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAudioDocCurrentTime(val);
                          if (audioDocRef.current) {
                            audioDocRef.current.currentTime = val;
                          }
                        }}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                      />
                      <div className="flex justify-between text-xs font-mono text-slate-300 font-bold">
                        <span>{formatTime(Math.round(audioDocCurrentTime))}</span>
                        <span>{formatTime(Math.round(audioDocDuration))}</span>
                      </div>
                    </div>

                    {/* Controls Row */}
                    <div className="flex items-center justify-center gap-4">
                      {/* -10s */}
                      <button
                        type="button"
                        onClick={() => {
                          if (audioDocRef.current) {
                            audioDocRef.current.currentTime = Math.max(0, audioDocRef.current.currentTime - 10);
                          }
                        }}
                        className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 cursor-pointer"
                        title="Reculer de 10 secondes"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>

                      {/* Play / Pause */}
                      <button
                        type="button"
                        onClick={() => {
                          if (audioDocRef.current) {
                            if (isPlayingAudioDoc) {
                              audioDocRef.current.pause();
                            } else {
                              audioDocRef.current.play().catch(() => {});
                            }
                          }
                        }}
                        className="p-4 rounded-3xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/40 transition-all active:scale-95 cursor-pointer"
                        title={isPlayingAudioDoc ? 'Pause' : 'Lecture'}
                      >
                        {isPlayingAudioDoc ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current translate-x-0.5" />}
                      </button>

                      {/* +10s */}
                      <button
                        type="button"
                        onClick={() => {
                          if (audioDocRef.current) {
                            audioDocRef.current.currentTime = Math.min(audioDocDuration, audioDocRef.current.currentTime + 10);
                          }
                        }}
                        className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 cursor-pointer"
                        title="Avancer de 10 secondes"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Speed Rate Switcher */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Vitesse :</span>
                      {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => {
                            setAudioDocRate(rate);
                            if (audioDocRef.current) {
                              audioDocRef.current.playbackRate = rate;
                            }
                          }}
                          className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            audioDocRate === rate
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white/10 text-slate-300 hover:bg-white/20'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 w-full h-full relative bg-slate-900 overflow-hidden">
                  <iframe
                    key={`pdf-frame-${currentPage}-${document.id}`}
                    src={`${pdfBlobUrl}#page=${currentPage}&navpanes=0&scrollbar=1`}
                    className="w-full h-full border-0 block"
                    title={`Document ${document.title} - Page ${currentPage}`}
                  />
                </div>
              )}
            </div>

            {/* RIGHT PANE: Synchronized Note-Taking Workspace */}
            <div className="lg:col-span-5 flex flex-col bg-white overflow-y-auto h-full">
              {/* Page Note Header */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center space-x-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs">
                    {currentPage}
                  </span>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Notes de la Page {currentPage}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Texte et audio synchronisés avec cette page
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {saveSuccess && (
                    <span className="flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Enregistré
                    </span>
                  )}
                  <button
                    onClick={() => handleSaveNote(currentPage, pageText, pageAudios)}
                    disabled={savingNote}
                    className="flex items-center space-x-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{savingNote ? '...' : 'Sauvegarder'}</span>
                  </button>
                </div>
              </div>

              {/* Note Content Area */}
              <div className="flex-1 p-5 space-y-6 overflow-y-auto">
                {/* 1. AUDIO RECORDING & PLAYBACK SECTION (MULTIPLE AUDIOS PER PAGE) */}
                <div className="rounded-2xl border border-slate-200/90 bg-slate-50/60 p-4 space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Headphones className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Notes Vocales (Audio)
                      </span>
                    </div>
                    {pageAudios.length > 0 && (
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 flex items-center">
                        <Volume2 className="h-3 w-3 mr-1 text-emerald-600" />
                        {pageAudios.length} enregistrement{pageAudios.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* List of recorded audio notes for this page */}
                  {pageAudios.length > 0 && (
                    <div className="space-y-2.5">
                      {pageAudios.map((audio, idx) => (
                        <div
                          key={audio.id || idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-200 transition-all"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <span className="h-6 w-6 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-black text-indigo-700 shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <input
                                type="text"
                                value={audio.title || `Note vocale ${idx + 1}`}
                                onChange={(e) => handleRenameAudio(audio.id, e.target.value)}
                                onBlur={handleBlurRenameAudio}
                                className="text-xs font-bold text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border-b border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-1 focus:outline-none truncate w-36 sm:w-44"
                                title="Cliquez pour renommer cette note vocale"
                              />
                              {audio.duration ? (
                                <p className="text-[10px] text-slate-400 font-mono pl-1">
                                  Durée : {formatTime(audio.duration)}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <audio controls src={audio.url} className="w-full sm:w-44 h-8" />
                            <button
                              type="button"
                              onClick={() => handleDeleteAudio(audio.id, idx)}
                              className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                              title="Supprimer cette note audio"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recording In-Progress Banner */}
                  {isRecording ? (
                    <div className="flex items-center justify-between bg-rose-50 border border-rose-200 p-3.5 rounded-xl animate-pulse">
                      <div className="flex items-center space-x-2.5">
                        <span className="h-3 w-3 rounded-full bg-rose-600 animate-ping" />
                        <span className="font-mono text-xs font-black text-rose-800">
                          Enregistrement de la note {pageAudios.length + 1} : {formatTime(recordingSeconds)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="flex items-center space-x-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Square className="h-3.5 w-3.5 fill-current" />
                        <span>Terminer</span>
                      </button>
                    </div>
                  ) : (
                    /* Audio Actions: Record Mic or Upload Audio File */
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={startRecording}
                          className="flex items-center justify-center space-x-1.5 rounded-xl border border-slate-300/80 bg-white hover:bg-indigo-50/50 hover:border-indigo-300 text-slate-800 hover:text-indigo-700 font-bold text-xs py-2.5 transition-all shadow-2xs active:scale-[0.99] cursor-pointer"
                        >
                          <Mic className="h-4 w-4 text-indigo-600" />
                          <span>
                            {pageAudios.length === 0
                              ? 'Enregistrer au micro'
                              : `Enregistrer (${pageAudios.length + 1})`}
                          </span>
                        </button>

                        <label
                          className={`flex items-center justify-center space-x-1.5 rounded-xl border border-slate-300/80 bg-white hover:bg-violet-50/50 hover:border-violet-300 text-slate-800 hover:text-violet-700 font-bold text-xs py-2.5 transition-all shadow-2xs active:scale-[0.99] cursor-pointer ${
                            uploadingPageAudio ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <Upload className="h-4 w-4 text-violet-600" />
                          <span>{uploadingPageAudio ? 'Importation...' : 'Uploader un audio'}</span>
                          <input
                            ref={audioFileInputRef}
                            type="file"
                            accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac"
                            onChange={handleUploadPageAudio}
                            disabled={uploadingPageAudio}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 font-medium">
                    Vous pouvez enregistrer autant de notes audio que souhaité par page (remarques du professeur, explications, points clés).
                  </p>
                </div>

                {/* 2. TEXT NOTE SECTION */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <span>Note Écrite (Fiche de Synthèse)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {pageText.length} caractères
                    </span>
                  </div>

                  <textarea
                    rows={12}
                    value={pageText}
                    onChange={(e) => setPageText(e.target.value)}
                    placeholder={`Écrivez vos notes pour la page ${currentPage}...\n\n• Formules importantes\n• Questions d'examen possibles\n• Concepts clés à retenir`}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-sans leading-relaxed shadow-2xs"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* REVIEW MODE (Fiche de Révision Éclair de toutes les pages) */
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Review Mode Banner */}
              <div className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="rounded-2xl bg-indigo-600 p-2.5 text-white shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Mode Révision Éclair — {document.title}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Accédez instantanément à l'ensemble de vos notes et explications audio enregistrées sur ce document sans devoir relire l'intégralité du PDF.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="rounded-xl bg-white border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-2xs">
                    {pagesWithNotes.length} page(s) annotée(s)
                  </span>
                </div>
              </div>

              {/* List of Page Notes */}
              {pagesWithNotes.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                  <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">Aucune note enregistrée sur ce document</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Revenez en mode Étude pour parcourir le PDF et ajouter vos remarques écrites ou enregistrer des notes audio page par page.
                  </p>
                  <button
                    onClick={() => setViewMode('split')}
                    className="inline-flex items-center space-x-2 rounded-xl bg-slate-900 text-white text-xs font-bold px-4 py-2 mt-2"
                  >
                    <span>Ouvrir en Mode Étude</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pagesWithNotes.sort((a, b) => a - b).map((pageNum) => {
                    const note = notesByPage[pageNum];
                    return (
                      <div
                        key={pageNum}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center space-x-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white text-xs font-black">
                              {pageNum}
                            </span>
                            <span className="text-xs font-black text-slate-900">
                              Page {pageNum}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setCurrentPage(pageNum);
                              setViewMode('split');
                              triggerHaptic('light');
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                          >
                            <span>Voir dans le PDF</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Audio playback list if present */}
                        {(() => {
                          const list =
                            note?.audio_recordings && note.audio_recordings.length > 0
                              ? note.audio_recordings
                              : note?.audio_url
                              ? [
                                  {
                                    id: 'legacy',
                                    url: note.audio_url,
                                    title: 'Note vocale 1',
                                    duration: note.audio_duration_seconds,
                                    created_at: note.created_at,
                                  },
                                ]
                              : [];
                          if (list.length === 0) return null;
                          return (
                            <div className="space-y-2 pt-1">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Headphones className="h-3.5 w-3.5 text-indigo-600" />
                                <span>{list.length} enregistrement{list.length > 1 ? 's' : ''} audio</span>
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {list.map((rec, i) => (
                                  <div
                                    key={rec.id || i}
                                    className="flex flex-col gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200"
                                  >
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                      <span className="truncate">{rec.title || `Note vocale ${i + 1}`}</span>
                                      {rec.duration ? (
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          {formatTime(rec.duration)}
                                        </span>
                                      ) : null}
                                    </div>
                                    <audio controls src={rec.url} className="w-full h-8" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Text Content */}
                        {note?.text_content ? (
                          <div className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed font-sans pl-1">
                            {note.text_content}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Pas de note écrite pour cette page (audio uniquement).</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    window.document.body
  );
};
