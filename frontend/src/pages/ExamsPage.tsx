import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Calendar,
  Sparkles,
  MapPin,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { Exam, Subject } from '../types';
import { useDialog } from '../context/DialogContext';

export const ExamsPage: React.FC = () => {
  const { toast } = useDialog();
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // New exam form state
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examDate, setExamDate] = useState('');
  const [duration, setDuration] = useState(120);
  const [room, setRoom] = useState('Amphi 1');
  const [topics, setTopics] = useState('');
  const [difficulty, setDifficulty] = useState(4);
  const [importance, setImportance] = useState<'normal' | 'high' | 'critical'>('high');

  const loadData = async () => {
    try {
      const [examsRes, subjRes] = await Promise.all([
        apiClient.getExams(),
        apiClient.getSubjects(),
      ]);
      setExams(examsRes.exams || []);
      setSubjects(subjRes.subjects || []);
      if (subjRes.subjects?.length > 0 && !subjectId) {
        setSubjectId(subjRes.subjects[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const d = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    d.setHours(10, 0, 0, 0);
    setExamDate(d.toISOString().slice(0, 16));
  }, []);

  const handleGenerateRevisionPlan = async (examId: string) => {
    setGeneratingId(examId);
    try {
      const res = await apiClient.generateExamRevision(examId);
      toast.success(res.message || 'Plan de révision progressive généré avec succès dans vos tâches et calendrier !');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la génération du plan de révision');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !examDate || !subjectId) return;

    try {
      await apiClient.createExam({
        title,
        subject_id: subjectId,
        exam_date: new Date(examDate).toISOString(),
        duration_minutes: Number(duration),
        room,
        topics,
        difficulty: Number(difficulty),
        importance,
      });
      setIsModalOpen(false);
      await loadData();
      toast.success('Examen ajouté avec succès !');
      setTitle('');
      setTopics('');
    } catch (err: any) {
      toast.error(err.message || "Erreur de création d'examen");
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center">
            <GraduationCap className="h-6 w-6 mr-2 text-rose-600 stroke-[1.75]" />
            Examens & Stratégie de Révision
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Anticipation progressive sur 4 semaines : fiches de synthèse, exercices types, cas complexes et épreuve blanche.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Ajouter un examen</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exams.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400 text-sm bg-white">
            Aucun examen programmé. Cliquez sur "Ajouter un examen" pour démarrer.
          </div>
        ) : (
          exams.map((exam) => {
            const daysLeft = Math.ceil(
              (new Date(exam.exam_date).getTime() - Date.now()) / (24 * 3600 * 1000)
            );
            const isPrepared = exam.revision_status === 'in_progress' || exam.revision_status === 'prepared';

            return (
              <div
                key={exam.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-2">
                      {exam.subject && (
                        <span
                          className="rounded-md px-2.5 py-1 text-xs font-bold text-white shadow-xs"
                          style={{ backgroundColor: exam.subject.color || '#e11d48' }}
                        >
                          {exam.subject.code}
                        </span>
                      )}
                      <span className="rounded-md bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[10px] font-bold uppercase">
                        {exam.importance}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-1.5 text-center border border-slate-200">
                      <span className="block text-[9px] uppercase font-bold text-slate-500">Compte ? rebours</span>
                      <span className="text-sm font-black text-rose-600 font-mono">
                        J-{daysLeft}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">{exam.title}</h3>
                  {exam.subject && (
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">{exam.subject.name}</p>
                  )}

                  <div className="mt-4 space-y-2 text-xs text-slate-700 bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 font-medium">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>
                        Date :{' '}
                        <strong className="text-slate-900">
                          {new Date(exam.exam_date).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </strong>
                      </span>
                    </div>
                    {exam.room && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span>Salle : <strong className="text-slate-900">{exam.room}</strong></span>
                      </div>
                    )}
                    {exam.topics && (
                      <div className="flex items-start space-x-2 pt-1 border-t border-slate-200">
                        <BookOpen className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <span>Chapitres : {exam.topics}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center text-xs">
                    {isPrepared ? (
                      <span className="flex items-center text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        Révisions enclenchées
                      </span>
                    ) : (
                      <span className="flex items-center text-amber-800 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <AlertCircle className="h-3.5 w-3.5 mr-1 text-amber-600" />
                        Pas encore de plan
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleGenerateRevisionPlan(exam.id)}
                    disabled={generatingId === exam.id}
                    className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>
                      {generatingId === exam.id ? 'Création du plan...' : 'Générer le plan de révision'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Exam Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <GraduationCap className="h-5 w-5 mr-2 text-rose-600" />
                Nouvel examen / contrôle continu
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intitul? de l'examen *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Contrôle Final Systèmes Distribués"
                  className="w-full rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Matière
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} ? {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Importance
                  </label>
                  <select
                    value={importance}
                    onChange={(e) => setImportance(e.target.value as any)}
                    className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="normal">Normale (Quiz / TP)</option>
                    <option value="high">Haute (Contrôle Continu)</option>
                    <option value="critical">Critique (Examen Final S3)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date & Heure *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Salle / Amphi
                  </label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="Amphi 1 / Salle 10"
                    className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chapitres / Notions ? réviser
                </label>
                <textarea
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="Ex: Chapitre 1 ? 4, Algorithme de Raft, transactions distribuées 2PC..."
                  rows={2}
                  className="w-full rounded-xl bg-white border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2 shadow-sm"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
