import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  ArrowRight,
  CheckCircle2,
  X,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { triggerHaptic } from '../lib/modules';

interface NoteItem {
  id: string;
  text: string;
  createdAt: string;
}

interface QuickNotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConvertToTask: (title: string) => void;
}

export const QuickNotesDrawer: React.FC<QuickNotesDrawerProps> = ({
  isOpen,
  onClose,
  onConvertToTask,
}) => {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [newText, setNewText] = useState('');

  // Load notes from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mgsi_scratchpad_notes');
      if (saved) {
        setNotes(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Save notes to localStorage
  const saveNotes = (updated: NoteItem[]) => {
    setNotes(updated);
    try {
      localStorage.setItem('mgsi_scratchpad_notes', JSON.stringify(updated));
    } catch {}
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    triggerHaptic('light');

    const newNote: NoteItem = {
      id: Date.now().toString(),
      text: newText.trim(),
      createdAt: new Date().toISOString(),
    };

    saveNotes([newNote, ...notes]);
    setNewText('');
  };

  const handleDeleteNote = (id: string) => {
    triggerHaptic('light');
    saveNotes(notes.filter((n) => n.id !== id));
  };

  const handleConvert = (note: NoteItem) => {
    triggerHaptic('medium');
    onConvertToTask(note.text);
    handleDeleteNote(note.id);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col p-6 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 border border-amber-200/70 text-amber-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Scratchpad Amphi & Cours
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Notes rapides convertibles en devoirs en 1 clic
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAddNote} className="pt-4 pb-3 space-y-2">
          <div className="relative">
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Note orale, consigne prof, rappel rapide..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white transition-all pr-10"
            />
            <button
              type="submit"
              disabled={!newText.trim()}
              className="absolute right-2 top-2 p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all disabled:opacity-30"
              title="Ajouter la note"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {notes.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-400 text-xs">
              <FileText className="h-8 w-8 text-slate-200 mb-2" />
              <p className="font-semibold text-slate-600">Aucune note pour le moment</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                Notez une consigne donnée en amphi et transformez-la en tâche dès que vous êtes prêt.
              </p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-amber-200 hover:shadow-xs transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900 leading-relaxed break-words">
                    {note.text}
                  </p>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="opacity-40 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 transition-all rounded-lg"
                    title="Supprimer la note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px]">
                  <span className="text-slate-400 font-medium">
                    {new Date(note.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <button
                    onClick={() => handleConvert(note)}
                    className="flex items-center space-x-1 font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200/60 transition-colors"
                    title="Ouvrir le formulaire de création de devoir avec ce titre"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Créer Devoir</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-medium">
          <span>Raccourci : <kbd className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">Ctrl + J</kbd></span>
          <span>{notes.length} note(s) sauvegardée(s)</span>
        </div>
      </div>
    </div>
  );
};
