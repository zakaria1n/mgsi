import React, { useState, useEffect } from 'react';
import {
  TableProperties,
  CheckCircle2,
  Sparkles,
  ArrowRightLeft,
  Clock,
  Layers,
  MapPin,
  GraduationCap,
  Calendar,
  Info,
} from 'lucide-react';
import { TPGroup } from '../types';
import { useAuth } from '../context/AuthContext';
import { triggerHaptic } from '../lib/modules';

export const TimetablePage: React.FC = () => {
  const { profile } = useAuth();
  const userGroup = (profile?.tp_group as TPGroup) || 'G1';

  // Tabs: 'MY_GROUP' (default personal schedule), 'COMPARE' (G1 vs G2 diff), 'ALL' (global school view)
  const [activeTab, setActiveTab] = useState<'MY_GROUP' | 'COMPARE' | 'ALL'>('MY_GROUP');
  const [selectedGroup, setSelectedGroup] = useState<TPGroup | 'ALL'>(userGroup);

  useEffect(() => {
    if (profile?.tp_group) {
      setSelectedGroup(profile.tp_group as TPGroup);
    }
  }, [profile?.tp_group]);

  const officialRules = [
    { label: 'Début des Cours (CM)', date: '07/09/2026', desc: 'Deuxième et Troisième Années du cycle ingénieur' },
    { label: 'Début des Travaux Dirigés (TD)', date: '14/09/2026', desc: 'Pour les semestres S3 et S5' },
    { label: 'Début des Travaux Pratiques (TP)', date: '21/09/2026', desc: 'En salles informatiques spécialisées' },
    { label: 'Horaires Spéciaux Vendredi Après-Midi', date: '15h00 - 16h45 & 17h00 - 18h45', desc: 'Séance 1 : 15h00 • Séance 2 : 17h00' },
  ];

  // Key differences between G1 and G2 derived from MGSI S3.pdf
  const groupDifferences = [
    {
      day: 'Mercredi Après-Midi',
      timeSlot: '14:30 - 16:15 & 16:30 - 18:15',
      subject: 'M235 - Audit des Systèmes d’Information',
      teacher: 'Pr. EL-ATEIF SARA',
      g1Slot: '14:30 CM (Salle 10) ➔ 16:30 TP G1 (Salle 2 INFO)',
      g2Slot: '14:30 TP G2 (Salle 2 INFO) ➔ 16:30 CM (Salle 10)',
      explanation: 'Inversion de la séance de TP et du Cours Magistral : G2 commence en salle informatique à 14h30, puis rejoint le CM à 16h30.',
    },
    {
      day: 'Jeudi Matin',
      timeSlot: '08:30 - 10:15 & 10:30 - 12:15',
      subject: 'M233 - Administration BD Avancées',
      teacher: 'Pr. LAASSAM BRAHIM',
      g1Slot: '08:30 TP G1 (Salle 2 INFO) ➔ 10:30 TD (Salle 10)',
      g2Slot: '08:30 CM (Salle 10) ➔ 10:30 TP G2 (Salle 2 INFO)',
      explanation: 'G1 débute sa matinée par le TP en salle 2 INFO à 08h30, tandis que G2 a son TP en 2ème séance à 10h30.',
    },
    {
      day: 'Jeudi Après-Midi',
      timeSlot: '14:30 - 16:15 & 16:30 - 18:15',
      subject: 'M232 (Génie Logiciel) & M236 (Systèmes Distribués)',
      teacher: 'Pr. RASSAM & Pr. BOUJERFAOUI',
      g1Slot: '14:30 TP M232 (Salle 4 INFO) ➔ 16:30 TP M236 (Salle 3 INFO)',
      g2Slot: '14:30 TP M236 (Salle 3 INFO) ➔ 16:30 TP M232 (Salle 4 INFO)',
      explanation: 'Croisement direct des matières et des salles informatiques : G1 fait Génie Logiciel puis Systèmes Distribués, et inversement pour G2.',
    },
    {
      day: 'Vendredi Matin (Différence Majeure)',
      timeSlot: '08:30 - 10:15 & 10:30 - 12:15',
      subject: 'M234 - Progiciels de Gestion Intégrée (ERP)',
      teacher: 'Pr. SAAD BASMA',
      g1Slot: '08:30 LIBRE (Pause/Étude) ➔ 10:30 TP G1 (Salle 3 INFO)',
      g2Slot: '08:30 TP G2 (Salle 3 INFO) ➔ 10:30 LIBRE (Pause/Étude)',
      explanation: 'Décalage horaire d’une matinée entière : G1 commence les cours à 10h30 (matinée plus tardive), tandis que G2 a TP à 08h30 puis est libre à 10h30.',
    },
  ];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200/60">
              ENSIA-SD Taroudant
            </span>
            <span className="text-xs text-slate-500 font-medium">Université Ibn Zohr</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              Votre Groupe : <span className="text-indigo-600 font-black">{userGroup}</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center">
            <TableProperties className="h-6 w-6 mr-2 text-indigo-600 stroke-[1.75]" />
            Emploi du Temps Officiel — Filière MGSI S3
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Management et Gouvernance des Systèmes d'information — Semestre 3 (Automne 2026-2027)
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center rounded-2xl bg-slate-100 border border-slate-200/80 p-1 text-xs">
          <button
            onClick={() => {
              setActiveTab('MY_GROUP');
              setSelectedGroup(userGroup);
              triggerHaptic('light');
            }}
            className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 font-bold transition-all ${
              activeTab === 'MY_GROUP'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="h-4 w-4 text-indigo-600" />
            <span>Mon Emploi ({userGroup})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('COMPARE');
              triggerHaptic('light');
            }}
            className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 font-bold transition-all ${
              activeTab === 'COMPARE'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4 text-amber-500" />
            <span>Comparateur G1 vs G2</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('ALL');
              setSelectedGroup('ALL' as any);
              triggerHaptic('light');
            }}
            className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 font-bold transition-all ${
              activeTab === 'ALL'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-4 w-4 text-slate-500" />
            <span>Vue Globale</span>
          </button>
        </div>
      </div>

      {/* COMPARISON VIEW (Différences G1 vs G2) */}
      {activeTab === 'COMPARE' ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Comparison Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-1">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Volume Hebdomadaire</span>
              <div className="text-xl font-black text-indigo-950">26h 15min</div>
              <p className="text-[11px] text-indigo-700 font-medium">Exactement le même volume de cours pour G1 et G2</p>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4 space-y-1">
              <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Heures en Commun (CM & TD)</span>
              <div className="text-xl font-black text-sky-950">14h 00min (53%)</div>
              <p className="text-[11px] text-sky-700 font-medium">Lundi, Mardi, Mercredi matin et Vendredi après-midi</p>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 space-y-1">
              <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Créneaux Différenciés (TP)</span>
              <div className="text-xl font-black text-amber-950">12h 15min (47%)</div>
              <p className="text-[11px] text-amber-700 font-medium">Inversions de créneaux et rotations de salles informatiques</p>
            </div>
          </div>

          {/* Detailed Differences Breakdown Cards */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Analyse Détaillée des 4 Différences d'Horaires (G1 vs G2)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupDifferences.map((diff, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-indigo-600" />
                      {diff.day}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                      {diff.timeSlot}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{diff.subject}</h4>
                    <p className="text-[11px] text-slate-500">{diff.teacher}</p>
                  </div>

                  {/* Visual G1 vs G2 Comparison */}
                  <div className="space-y-2 pt-1">
                    <div className="rounded-xl bg-indigo-50/70 border border-indigo-200/80 p-2.5 text-xs">
                      <span className="inline-block rounded-md bg-indigo-600 text-white font-black text-[10px] px-1.5 py-0.2 mr-2">
                        GROUPE 1 (G1)
                      </span>
                      <span className="font-semibold text-indigo-950">{diff.g1Slot}</span>
                    </div>

                    <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-2.5 text-xs">
                      <span className="inline-block rounded-md bg-emerald-600 text-white font-black text-[10px] px-1.5 py-0.2 mr-2">
                        GROUPE 2 (G2)
                      </span>
                      <span className="font-semibold text-emerald-950">{diff.g2Slot}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                    💡 <span className="font-bold">Impact :</span> {diff.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Side-by-Side Comparison Matrix */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <TableProperties className="h-4 w-4 text-indigo-600" />
              <span>Matrice Comparative Séance par Séance</span>
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                    <th className="p-3.5 w-32">Jour & Créneau</th>
                    <th className="p-3.5 border-l border-slate-200 bg-indigo-50/40 text-indigo-900">Groupe 1 (G1)</th>
                    <th className="p-3.5 border-l border-slate-200 bg-emerald-50/40 text-emerald-900">Groupe 2 (G2)</th>
                    <th className="p-3.5 border-l border-slate-200 w-36">Nature du Créneau</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {/* Lundi */}
                  <tr>
                    <td className="p-3 font-bold">Lundi (Toute la journée)</td>
                    <td className="p-3 border-l border-slate-200">ERP (CM + TD) + Gestion projet (CM)</td>
                    <td className="p-3 border-l border-slate-200">ERP (CM + TD) + Gestion projet (CM)</td>
                    <td className="p-3 border-l border-slate-200 text-slate-500 font-semibold bg-slate-50/50">100% Identique</td>
                  </tr>

                  {/* Mardi */}
                  <tr>
                    <td className="p-3 font-bold">Mardi (Toute la journée)</td>
                    <td className="p-3 border-l border-slate-200">Français (CM) + Transf. Digitale (CM) + Anglais (CM)</td>
                    <td className="p-3 border-l border-slate-200">Français (CM) + Transf. Digitale (CM) + Anglais (CM)</td>
                    <td className="p-3 border-l border-slate-200 text-slate-500 font-semibold bg-slate-50/50">100% Identique</td>
                  </tr>

                  {/* Mercredi Matin */}
                  <tr>
                    <td className="p-3 font-bold">Mercredi 10:30 - 12:15</td>
                    <td className="p-3 border-l border-slate-200">Gestion de projet (TD • Salle 10)</td>
                    <td className="p-3 border-l border-slate-200">Gestion de projet (TD • Salle 10)</td>
                    <td className="p-3 border-l border-slate-200 text-slate-500 font-semibold bg-slate-50/50">100% Identique</td>
                  </tr>

                  {/* Mercredi 14:30 */}
                  <tr className="bg-amber-50/20">
                    <td className="p-3 font-bold">Mercredi 14:30 - 16:15</td>
                    <td className="p-3 border-l border-slate-200 text-indigo-900 font-semibold">Audit SI (CM • Salle 10)</td>
                    <td className="p-3 border-l border-slate-200 text-emerald-900 font-black">Audit SI (TP G2 • Salle 2 INFO)</td>
                    <td className="p-3 border-l border-slate-200 text-amber-800 font-bold bg-amber-50/60">Inversion CM / TP</td>
                  </tr>

                  {/* Mercredi 16:30 */}
                  <tr className="bg-amber-50/20">
                    <td className="p-3 font-bold">Mercredi 16:30 - 18:15</td>
                    <td className="p-3 border-l border-slate-200 text-indigo-900 font-black">Audit SI (TP G1 • Salle 2 INFO)</td>
                    <td className="p-3 border-l border-slate-200 text-emerald-900 font-semibold">Audit SI (CM • Salle 10)</td>
                    <td className="p-3 border-l border-slate-200 text-amber-800 font-bold bg-amber-50/60">Inversion CM / TP</td>
                  </tr>

                  {/* Jeudi 08:30 */}
                  <tr className="bg-amber-50/20">
                    <td className="p-3 font-bold">Jeudi 08:30 - 10:15</td>
                    <td className="p-3 border-l border-slate-200 text-indigo-900 font-black">Admin BD (TP G1 • Salle 2 INFO)</td>
                    <td className="p-3 border-l border-slate-200 text-emerald-900 font-semibold">Admin BD (CM • Salle 10)</td>
                    <td className="p-3 border-l border-slate-200 text-amber-800 font-bold bg-amber-50/60">Inversion TP / CM</td>
                  </tr>

                  {/* Jeudi 10:30 */}
                  <tr className="bg-amber-50/20">
                    <td className="p-3 font-bold">Jeudi 10:30 - 12:15</td>
                    <td className="p-3 border-l border-slate-200 text-indigo-900 font-semibold">Admin BD (TD • Salle 10)</td>
                    <td className="p-3 border-l border-slate-200 text-emerald-900 font-black">Admin BD (TP G2 • Salle 2 INFO)</td>
                    <td className="p-3 border-l border-slate-200 text-amber-800 font-bold bg-amber-50/60">Inversion TD / TP</td>
                  </tr>

                  {/* Jeudi 14:30 */}
                  <tr className="bg-purple-50/20">
                    <td className="p-3 font-bold">Jeudi 14:30 - 16:15</td>
                    <td className="p-3 border-l border-slate-200 text-indigo-900 font-black">Génie Logiciel (TP G1 • Salle 4 INFO)</td>
                    <td className="p-3 border-l border-slate-200 text-emerald-900 font-black">Syst. Distribués (TP G2 • Salle 3 INFO)</td>
                    <td className="p-3 border-l border-slate-200 text-purple-800 font-bold bg-purple-50/60">Rotation Matières & Salles</td>
                  </tr>

                  {/* Jeudi 16:30 */}
                  <tr className="bg-purple-50/20">
                    <td className="p-3 font-bold">Jeudi 16:30 - 18:15</td>
                    <td className="p-3 border-l border-slate-200 text-indigo-900 font-black">Syst. Distribués (TP G1 • Salle 3 INFO)</td>
                    <td className="p-3 border-l border-slate-200 text-emerald-900 font-black">Génie Logiciel (TP G2 • Salle 4 INFO)</td>
                    <td className="p-3 border-l border-slate-200 text-purple-800 font-bold bg-purple-50/60">Rotation Matières & Salles</td>
                  </tr>

                  {/* Vendredi 08:30 */}
                  <tr className="bg-rose-50/20">
                    <td className="p-3 font-bold">Vendredi 08:30 - 10:15</td>
                    <td className="p-3 border-l border-slate-200 text-slate-400 italic">Libre (Matinée libre)</td>
                    <td className="p-3 border-l border-slate-200 text-emerald-900 font-black">ERP (TP G2 • Salle 3 INFO)</td>
                    <td className="p-3 border-l border-slate-200 text-rose-800 font-bold bg-rose-50/60">Décalage Libre vs TP</td>
                  </tr>

                  {/* Vendredi 10:30 */}
                  <tr className="bg-rose-50/20">
                    <td className="p-3 font-bold">Vendredi 10:30 - 12:15</td>
                    <td className="p-3 border-l border-slate-200 text-indigo-900 font-black">ERP (TP G1 • Salle 3 INFO)</td>
                    <td className="p-3 border-l border-slate-200 text-slate-400 italic">Libre (Pause midi avancée)</td>
                    <td className="p-3 border-l border-slate-200 text-rose-800 font-bold bg-rose-50/60">Décalage TP vs Libre</td>
                  </tr>

                  {/* Vendredi Après-Midi */}
                  <tr>
                    <td className="p-3 font-bold">Vendredi 15:00 - 18:45</td>
                    <td className="p-3 border-l border-slate-200">Systèmes Distribués (CM 15h + TD 17h • Salle 6)</td>
                    <td className="p-3 border-l border-slate-200">Systèmes Distribués (CM 15h + TD 17h • Salle 6)</td>
                    <td className="p-3 border-l border-slate-200 text-slate-500 font-semibold bg-slate-50/50">100% Identique</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD TIMETABLE GRID (MY GROUP OR ALL) */
        <div className="space-y-6">
          {/* Subheader Filter Bar for My Group */}
          {activeTab === 'MY_GROUP' && (
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">
                Affichage personnalisé pour <span className="font-black text-indigo-700">Groupe TP {selectedGroup}</span> (vos CM, TD et TP spécifiques).
              </span>
              <div className="flex items-center space-x-1">
                {(['G1', 'G2'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => {
                      setSelectedGroup(g);
                      triggerHaptic('light');
                    }}
                    className={`rounded-lg px-2.5 py-1 font-bold transition-all ${
                      selectedGroup === g
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Groupe {g} {g === userGroup && '(Vous)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Official Directives Banner */}
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
                    {(selectedGroup === 'ALL' || selectedGroup === 'G2') && (
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
                    {(selectedGroup === 'ALL' || selectedGroup === 'G1') && (
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
                    {(selectedGroup === 'ALL' || selectedGroup === 'G1') && (
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
                    {(selectedGroup === 'ALL' || selectedGroup === 'G2') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M233 - Admin BD (TP G2)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 2 INFO • Pr. LAASSAM</div>
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-l border-slate-200 space-y-2">
                    {(selectedGroup === 'ALL' || selectedGroup === 'G1') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M232 - Génie Logiciel (TP G1)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 4 INFO • Pr. RASSAM</div>
                      </div>
                    )}
                    {(selectedGroup === 'ALL' || selectedGroup === 'G2') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M236 - Syst. Distribués (TP G2)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 3 INFO • Pr. BOUJERFAOUI</div>
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-l border-slate-200 space-y-2">
                    {(selectedGroup === 'ALL' || selectedGroup === 'G2') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M232 - Génie Logiciel (TP G2)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 4 INFO • Pr. RASSAM</div>
                      </div>
                    )}
                    {(selectedGroup === 'ALL' || selectedGroup === 'G1') && (
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
                    {(selectedGroup === 'ALL' || selectedGroup === 'G2') && (
                      <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/80">
                        <div className="font-bold text-emerald-800">M234 - ERP (TP G2)</div>
                        <div className="text-[10px] text-emerald-700 font-bold uppercase">Salle 3 INFO • Pr. SAAD</div>
                      </div>
                    )}
                  </td>
                  <td className="p-3 border-l border-slate-200">
                    {(selectedGroup === 'ALL' || selectedGroup === 'G1') && (
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
    </div>
  );
};
