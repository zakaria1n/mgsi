import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Clock, Calendar, Bookmark } from 'lucide-react';
import { Subject, TaskType, TaskPriority } from '../types';
import { apiClient } from '../lib/api';
import { useDialog } from '../context/DialogContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  onTaskCreated: () => void;
  initialTitle?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onTaskCreated,
  initialTitle = '',
}) => {
  const { toast } = useDialog();
  const [title, setTitle] = useState(initialTitle);
  const [subjectId, setSubjectId] = useState('');
  const [isNewSubject, setIsNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');

  const [taskType, setTaskType] = useState<string>('devoir');
  const [isCustomTaskType, setIsCustomTaskType] = useState(false);
  const [customTaskType, setCustomTaskType] = useState('');

  const [deadline, setDeadline] = useState('');
  const [duration, setDuration] = useState(60);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [difficulty, setDifficulty] = useState(3);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialTitle) {
      setTitle(initialTitle);
    }
  }, [initialTitle]);

  useEffect(() => {
    if (subjects.length > 0 && !subjectId && !isNewSubject) {
      setSubjectId(subjects[0].id);
    }
    // Default deadline: in 4 days at 23:59
    const d = new Date(Date.now() + 4 * 24 * 3600 * 1000);
    d.setHours(23, 59, 0, 0);
    setDeadline(d.toISOString().slice(0, 16));
  }, [subjects]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) return;

    if (isNewSubject && !newSubjectName.trim()) {
      toast.error('Veuillez renseigner le nom de la nouvelle matière.');
      return;
    }

    if (isCustomTaskType && !customTaskType.trim()) {
      toast.error('Veuillez préciser le nom du type de travail.');
      return;
    }

    setSubmitting(true);
    try {
      const finalTaskType = isCustomTaskType ? customTaskType.trim() : taskType;

      await apiClient.createTask({
        title,
        subject_id: isNewSubject ? '__new__' : subjectId,
        new_subject_name: isNewSubject ? newSubjectName.trim() : undefined,
        new_subject_code: isNewSubject ? (newSubjectCode.trim() || undefined) : undefined,
        task_type: finalTaskType,
        deadline: new Date(deadline).toISOString(),
        estimated_duration_minutes: Number(duration),
        priority,
        difficulty: Number(difficulty),
        description,
      });

      onTaskCreated();
      toast.success(isNewSubject ? 'Nouvelle matière et tâche créées avec succès !' : 'Tâche créée avec succès !');
      onClose();
      // Reset
      setTitle('');
      setDescription('');
      setIsNewSubject(false);
      setNewSubjectName('');
      setNewSubjectCode('');
      setIsCustomTaskType(false);
      setCustomTaskType('');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création de la tâche');
    } finally {
      setSubmitting(false);
    }
  };

  // Preview how this task will be split
  const isLarge = duration > 50;
  const sessionsCount = Math.max(1, Math.ceil(duration / 45));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xl my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-black text-slate-900 flex items-center">
          <Bookmark className="h-5 w-5 mr-2 text-indigo-600" />
          Ajouter une tâche académique
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          L'IA intégrera cette charge dans votre calendrier en respectant vos cours et votre repos.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Titre du devoir ou projet *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: TP Odoo ERP, Projet Génie Logiciel..."
              className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Matière MGSI
              </label>
              <select
                value={isNewSubject ? '__new__' : subjectId}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setIsNewSubject(true);
                  } else {
                    setIsNewSubject(false);
                    setSubjectId(e.target.value);
                  }
                }}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all cursor-pointer font-medium"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
                <option value="__new__">✨ + Autre matière (créer nouvelle)...</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type de travail
              </label>
              <select
                value={isCustomTaskType ? 'other_custom' : taskType}
                onChange={(e) => {
                  if (e.target.value === 'other_custom') {
                    setIsCustomTaskType(true);
                  } else {
                    setIsCustomTaskType(false);
                    setTaskType(e.target.value);
                  }
                }}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all cursor-pointer font-medium"
              >
                <option value="devoir">Devoir / Assignment</option>
                <option value="project">Projet</option>
                <option value="exercise">Exercices</option>
                <option value="presentation">Présentation</option>
                <option value="report">Rapport</option>
                <option value="revision">Révision</option>
                <option value="exam_prep">Préparation Examen</option>
                <option value="other_custom">✨ + Autre type (personnalisé)...</option>
              </select>
            </div>
          </div>

          {/* Conditional Input for New Custom Subject */}
          {isNewSubject && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Nouvelle matière personnalisée
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsNewSubject(false);
                    if (subjects.length > 0) setSubjectId(subjects[0].id);
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Code (ex: M238)
                  </label>
                  <input
                    type="text"
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value.toUpperCase())}
                    placeholder="M238"
                    className="w-full rounded-xl bg-white border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-mono font-bold uppercase focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Nom de la matière *
                  </label>
                  <input
                    type="text"
                    required={isNewSubject}
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    placeholder="ex: Intelligence Artificielle, Cloud..."
                    className="w-full rounded-xl bg-white border border-slate-300 px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Conditional Input for Custom Task Type */}
          {isCustomTaskType && (
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-amber-900">
                  Précisez le nom du type de travail * :
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomTaskType(false);
                    setTaskType('devoir');
                  }}
                  className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
              </div>
              <input
                type="text"
                required={isCustomTaskType}
                value={customTaskType}
                onChange={(e) => setCustomTaskType(e.target.value)}
                placeholder="ex: Hackathon, TP Noté, Dossier de stage, Article de recherche..."
                className="w-full rounded-xl bg-white border border-amber-300 px-3 py-1.5 text-xs text-slate-900 font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date & Heure d'échéance *
              </label>
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Durée estimée totale (minutes)
              </label>
              <input
                type="number"
                min="15"
                step="15"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* AI Task Splitting Preview Banner */}
          {isLarge && (
            <div className="rounded-2xl bg-indigo-50/70 border border-indigo-200/80 p-3.5 text-xs text-indigo-950 space-y-1">
              <div className="flex items-center font-bold text-indigo-900">
                <Sparkles className="h-4 w-4 mr-1.5 text-indigo-600" />
                Découpage intelligent activé
              </div>
              <p className="text-[11px] text-indigo-700">
                Cette tâche de {duration} min sera automatiquement scindée en <strong>{sessionsCount} séances distinctes</strong> de ~{Math.round(duration / sessionsCount)} min réparties sur plusieurs jours pour préserver votre concentration.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priorité
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Difficulté (1 à 5)
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full mt-2 accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Facile</span>
                <span className="text-indigo-600 font-bold">{difficulty}/5</span>
                <span>Très complexe</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Consignes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Consignes données par le professeur, critères d'évaluation..."
              rows={2}
              className="w-full rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 shadow-sm hover:shadow transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? 'Création...' : 'Créer la tâche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
