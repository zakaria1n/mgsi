import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  FileText,
  Upload,
  Search,
  Plus,
  BookOpen,
  Headphones,
  Trash2,
  Download,
  Filter,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  FileUp,
  Layers,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Volume2,
  FileAudio,
} from 'lucide-react';
import { MODULE_THEMES, getModuleTheme, triggerHaptic } from '../lib/modules';
import { apiClient } from '../lib/api';
import { supabase } from '../lib/supabase';
import { ModuleDocument, DocumentType, Subject } from '../types';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { useAuth } from '../context/AuthContext';
import { extractPdfPageCount } from '../lib/pdfUtils';
import { useDialog } from '../context/DialogContext';

export const ModulesPage: React.FC = () => {
  const { user } = useAuth();
  const { confirm: confirmDialog, toast } = useDialog();

  // State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [documents, setDocuments] = useState<ModuleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | 'ALL'>('ALL');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'pdf' | 'audio'>('pdf');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubjectId, setUploadSubjectId] = useState('');
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('cours');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Helper to detect audio file
  const isAudioItem = (fileOrUrl?: File | string | null) => {
    if (!fileOrUrl) return false;
    if (typeof fileOrUrl === 'string') {
      return (
        fileOrUrl.includes('/uploads/audios/') ||
        /\.(mp3|wav|m4a|ogg|webm|aac|flac)($|\?)/i.test(fileOrUrl) ||
        fileOrUrl.startsWith('data:audio/')
      );
    }
    return (
      fileOrUrl.type.startsWith('audio/') ||
      /\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i.test(fileOrUrl.name)
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 Ko';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  // Active study viewer modal
  const [activeDocForViewer, setActiveDocForViewer] = useState<ModuleDocument | null>(null);

  // Load subjects and documents
  const loadData = async () => {
    try {
      setLoading(true);
      const [subjRes, docsRes] = await Promise.all([
        apiClient.getSubjects(),
        apiClient.getDocuments(),
      ]);
      setSubjects(subjRes.subjects || []);
      setDocuments(docsRes.documents || []);
    } catch (err) {
      console.error('Error loading modules & documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Subject filter
      if (selectedSubjectId && doc.subject_id !== selectedSubjectId) return false;
      // Doc type filter
      if (selectedDocType !== 'ALL') {
        if (selectedDocType === 'audio') {
          if (doc.doc_type !== 'audio' && !isAudioItem(doc.file_name) && !isAudioItem(doc.file_url)) {
            return false;
          }
        } else if (doc.doc_type !== selectedDocType) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchSubject = doc.subject?.name?.toLowerCase().includes(q) || doc.subject?.code?.toLowerCase().includes(q);
        if (!matchTitle && !matchSubject) return false;
      }
      return true;
    });
  }, [documents, selectedSubjectId, selectedDocType, searchQuery]);

  // Handle file upload (PDF or Audio)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle || !uploadSubjectId) {
      toast.warning('Veuillez renseigner le titre, le module et sélectionner un fichier (PDF ou Audio).');
      return;
    }

    setUploading(true);
    triggerHaptic('medium');

    try {
      const isAudio = isAudioItem(uploadFile) || uploadDocType === 'audio';
      let fileUrl = '';
      let detectedPages = 1;

      const isLocalMode =
        user?.audio_storage_mode === 'local' ||
        localStorage.getItem('mgsi_audio_storage_mode') === 'local';

      // 1. If audio and local PC storage preferred
      if (isAudio && isLocalMode) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(uploadFile);
          });

          const localRes = await apiClient.uploadLocalAudio({
            audio_base64: base64,
            document_id: uploadSubjectId,
            filename: uploadFile.name,
          });

          if (localRes?.url) {
            fileUrl = localRes.url;
          }
        } catch (localErr) {
          console.warn('Local storage upload failed, attempting Supabase fallback:', localErr);
        }
      }

      // 2. Try uploading to Supabase Storage bucket 'module_files' or 'audio_notes'
      if (!fileUrl) {
        const fileExt = uploadFile.name.split('.').pop();
        const filePath = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const bucket = isAudio ? 'audio_notes' : 'module_files';

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, uploadFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: uploadFile.type || (isAudio ? 'audio/mpeg' : 'application/pdf'),
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);
          fileUrl = publicUrlData.publicUrl;
        } else {
          // Fallback: convert file to Base64 Data URL for zero-friction storage
          fileUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(uploadFile);
          });
        }
      }

      // 3. Detect real page count from PDF if applicable
      if (!isAudio && uploadFile.type === 'application/pdf') {
        detectedPages = (await extractPdfPageCount(uploadFile)) || 1;
      }

      // 4. Create document record via API
      const finalDocType: DocumentType = isAudio && uploadDocType === 'cours' ? 'audio' : uploadDocType;
      await apiClient.createDocument({
        subject_id: uploadSubjectId,
        title: uploadTitle,
        doc_type: finalDocType,
        file_url: fileUrl,
        file_name: uploadFile.name,
        file_size: uploadFile.size,
        total_pages: detectedPages,
      });

      // Reset form & reload
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadFile(null);
      await loadData();
      toast.success(isAudio ? 'Enregistrement audio ajouté au module avec succès !' : 'Document PDF ajouté avec succès !');
      triggerHaptic('heavy');
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi du document");
    } finally {
      setUploading(false);
    }
  };

  // Delete document
  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirmDialog({
      title: 'Supprimer ce document ?',
      message: 'Voulez-vous vraiment supprimer définitivement ce document et toutes ses notes associées (écrites et audio) ?',
      confirmText: 'Supprimer',
      cancelText: 'Conserver',
      type: 'danger',
      icon: 'trash',
    });
    if (!confirmed) return;

    try {
      await apiClient.deleteDocument(id);
      await loadData();
      toast.success('Document supprimé avec succès.');
      triggerHaptic('medium');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression');
    }
  };

  // Quick Seed: Add official S3 timetable as a course document if empty
  const handleQuickSeedOfficial = async () => {
    try {
      setUploading(true);
      const m232 = subjects.find((s) => s.code === 'M232') || subjects[0];
      if (!m232) return;

      await apiClient.createDocument({
        subject_id: m232.id,
        title: 'Emploi du Temps Officiel MGSI S3 (PDF)',
        doc_type: 'cours',
        file_url: '/MGSI S3.pdf',
        file_name: 'MGSI S3.pdf',
        file_size: 270238,
        total_pages: 1,
      });

      await loadData();
      toast.success('Emploi S3 chargé avec succès !');
      triggerHaptic('heavy');
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setUploading(false);
    }
  };

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200/60">
              Semestre 3 • Cycle Ingénieur
            </span>
            <span className="text-xs text-slate-500 font-medium">ENSIA-SD Taroudant</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center">
            <Folder className="h-6 w-6 mr-2 text-indigo-600 stroke-[1.75]" />
            Modules & Espaces d'Étude Synchronisés
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Accédez à vos cours, TD et TP. Lisez vos PDF avec prise de notes écrites et audio synchronisées page par page.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {documents.length === 0 && (
            <button
              onClick={handleQuickSeedOfficial}
              disabled={uploading}
              className="flex items-center space-x-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-xs font-bold px-3 py-2 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Charger l'Emploi S3 (Démo)</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selectedSubjectId) setUploadSubjectId(selectedSubjectId);
                else if (subjects.length > 0) setUploadSubjectId(subjects[0].id);
                setUploadMode('audio');
                setUploadDocType('audio');
                setIsUploadOpen(true);
                triggerHaptic('light');
              }}
              className="flex items-center space-x-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200/80 text-xs font-bold px-3 py-2 shadow-xs transition-all active:scale-[0.98]"
              title="Ajouter un enregistrement audio ou un podcast de cours pour ce module"
            >
              <Headphones className="h-3.5 w-3.5 text-violet-600" />
              <span>Upload Audio</span>
            </button>

            <button
              onClick={() => {
                if (selectedSubjectId) setUploadSubjectId(selectedSubjectId);
                else if (subjects.length > 0) setUploadSubjectId(subjects[0].id);
                setUploadMode('pdf');
                setUploadDocType('cours');
                setIsUploadOpen(true);
                triggerHaptic('light');
              }}
              className="flex items-center space-x-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 shadow-xs transition-all active:scale-[0.98]"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Ajouter un Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODULES LIST / CARDS */}
      {!selectedSubjectId ? (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un module, un enseignant ou un document..."
              className="w-full rounded-2xl border border-slate-200/90 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-2xs"
            />
          </div>

          {/* Grid of Modules */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjects.map((subj) => {
              const theme = getModuleTheme(subj.code);
              const subjDocs = documents.filter((d) => d.subject_id === subj.id);
              const coursCount = subjDocs.filter((d) => d.doc_type === 'cours').length;
              const tdCount = subjDocs.filter((d) => d.doc_type === 'td').length;
              const tpCount = subjDocs.filter((d) => d.doc_type === 'tp').length;
              const audioCount = subjDocs.filter((d) => d.doc_type === 'audio' || isAudioItem(d.file_name) || isAudioItem(d.file_url)).length;

              return (
                <div
                  key={subj.id}
                  onClick={() => {
                    setSelectedSubjectId(subj.id);
                    triggerHaptic('light');
                  }}
                  className="group rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-xl px-2.5 py-1 text-xs font-black border ${theme.badgeBg} ${theme.badgeText} ${theme.border}`}
                      >
                        {subj.code}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {subj.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        {subj.professor || 'Enseignant non spécifié'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {subj.room || 'ENSIA-SD'}
                      </p>
                    </div>
                  </div>

                  {/* Documents count pill */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                    <div className="flex items-center space-x-1.5">
                      <FileText className="h-3.5 w-3.5 text-indigo-500" />
                      <span>{subjDocs.length} doc{subjDocs.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
                      <span>{coursCount}C</span>
                      <span>•</span>
                      <span>{tdCount}TD</span>
                      <span>•</span>
                      <span>{tpCount}TP</span>
                      {audioCount > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-violet-600 font-bold">{audioCount}Audio</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* SINGLE MODULE VIEW (Breadcrumb + Category tabs + Documents list) */
        <div className="space-y-6">
          {/* Breadcrumb & Module Header */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <button
                onClick={() => {
                  setSelectedSubjectId(null);
                  triggerHaptic('light');
                }}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
                title="Retour à la liste des modules"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div>
                <div className="flex items-center space-x-2">
                  <span className="rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 text-xs font-black">
                    {selectedSubject?.code}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedSubject?.professor} • {selectedSubject?.room}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {selectedSubject?.name}
                </h3>
              </div>
            </div>

            {/* Type selector tabs */}
            <div className="flex items-center rounded-xl bg-slate-100 border border-slate-200/80 p-1 text-xs overflow-x-auto no-scrollbar">
              {(['ALL', 'cours', 'td', 'tp', 'audio'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setSelectedDocType(t);
                    triggerHaptic('light');
                  }}
                  className={`rounded-lg px-3 py-1 font-bold whitespace-nowrap transition-all ${
                    selectedDocType === t
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t === 'ALL' ? 'Tous' : t === 'audio' ? 'Audio / Vocaux' : t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Document list */}
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
              <FileUp className="h-10 w-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Aucun document pour ce module</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Téléversez vos diapositives de cours, fiches de TD, TP ou vos enregistrements audio / podcasts pour étudier.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => {
                    setUploadSubjectId(selectedSubjectId);
                    setUploadMode('pdf');
                    setUploadDocType('cours');
                    setIsUploadOpen(true);
                    triggerHaptic('light');
                  }}
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold px-3.5 py-2"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Ajouter un PDF</span>
                </button>
                <button
                  onClick={() => {
                    setUploadSubjectId(selectedSubjectId);
                    setUploadMode('audio');
                    setUploadDocType('audio');
                    setIsUploadOpen(true);
                    triggerHaptic('light');
                  }}
                  className="inline-flex items-center space-x-1.5 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 text-xs font-bold px-3.5 py-2 hover:bg-violet-100"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  <span>Uploader un Audio</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => {
                const isAudio = doc.doc_type === 'audio' || isAudioItem(doc.file_url) || isAudioItem(doc.file_name);
                const theme = getModuleTheme(doc.subject?.code);
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setActiveDocForViewer(doc);
                      triggerHaptic('medium');
                    }}
                    className="group rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded-xl px-2.5 py-1 text-xs font-black uppercase tracking-wider border flex items-center space-x-1.5 ${
                            doc.doc_type === 'cours'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : doc.doc_type === 'td'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : doc.doc_type === 'tp'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-violet-50 text-violet-700 border-violet-200'
                          }`}
                        >
                          {isAudio ? <Headphones className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                          <span>{doc.doc_type.toUpperCase()}</span>
                        </span>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => handleDeleteDoc(doc.id, e)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Supprimer le document"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                          {doc.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-1">
                          {doc.file_name} • {formatFileSize(doc.file_size)}
                        </p>
                      </div>

                      {/* Inline audio mini-player if audio file */}
                      {isAudio && (
                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                          <audio controls src={doc.file_url} className="w-full h-8 rounded-lg" />
                        </div>
                      )}
                    </div>

                    {/* Footer CTA */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-[11px] font-bold text-indigo-600">
                        {isAudio ? (
                          <>
                            <Headphones className="h-3.5 w-3.5 text-violet-600" />
                            <span className="text-violet-700">Écouter & Annoter</span>
                          </>
                        ) : (
                          <>
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>Ouvrir l'Espace d'Étude</span>
                          </>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* UPLOAD MODAL (PDF & AUDIO) */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                {uploadMode === 'audio' ? (
                  <Headphones className="h-5 w-5 text-violet-600" />
                ) : (
                  <Upload className="h-5 w-5 text-indigo-600" />
                )}
                <h3 className="text-base font-black text-slate-900">
                  {uploadMode === 'audio' ? 'Ajouter un Enregistrement Audio' : 'Ajouter un Document PDF'}
                </h3>
              </div>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setUploadMode('pdf');
                  if (uploadDocType === 'audio') setUploadDocType('cours');
                }}
                className={`flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  uploadMode === 'pdf'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Document PDF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadMode('audio');
                  setUploadDocType('audio');
                }}
                className={`flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  uploadMode === 'audio'
                    ? 'bg-white text-violet-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Headphones className="h-4 w-4" />
                <span>Fichier Audio (MP3, WAV...)</span>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* Module selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Module / Matière</label>
                <select
                  value={uploadSubjectId}
                  onChange={(e) => setUploadSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                  required
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Document Type */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Type / Catégorie</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['cours', 'td', 'tp', 'audio'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setUploadDocType(t);
                        if (t === 'audio') setUploadMode('audio');
                      }}
                      className={`rounded-xl py-2 font-bold uppercase transition-all border ${
                        uploadDocType === t
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {uploadMode === 'audio' ? 'Titre de la piste audio' : 'Titre du document'}
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder={
                    uploadMode === 'audio'
                      ? 'ex: Enregistrement Amphi 1 - Intro ou Podcast Révision'
                      : 'ex: Chapitre 1 - Architecture des ERP ou TD 2 SQL Avancé'
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* File selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {uploadMode === 'audio' ? 'Fichier Audio (MP3, WAV, M4A, OGG, WebM)' : 'Fichier PDF'}
                </label>
                <input
                  type="file"
                  accept={
                    uploadMode === 'audio'
                      ? 'audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac'
                      : 'application/pdf,audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac'
                  }
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadFile(f);
                      if (isAudioItem(f)) {
                        setUploadMode('audio');
                        if (uploadDocType !== 'audio' && uploadDocType !== 'cours') {
                          setUploadDocType('audio');
                        }
                      }
                      if (!uploadTitle) {
                        setUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
                      }
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  required
                />
              </div>

              {/* Submit button */}
              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="rounded-xl px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className={`flex items-center space-x-1.5 rounded-xl font-bold px-4 py-2 shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 text-white ${
                    uploadMode === 'audio' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {uploadMode === 'audio' ? <Headphones className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                  <span>{uploading ? 'Téléversement...' : 'Enregistrer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVE PDF STUDY VIEWER MODAL */}
      {activeDocForViewer && (
        <DocumentViewerModal
          isOpen={Boolean(activeDocForViewer)}
          document={activeDocForViewer}
          onClose={() => setActiveDocForViewer(null)}
          onDocumentUpdated={loadData}
        />
      )}
    </div>
  );
};
