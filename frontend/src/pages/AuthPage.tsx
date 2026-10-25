import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TPGroup } from '../types';
import { useDialog } from '../context/DialogContext';

export const AuthPage: React.FC = () => {
  const { alert: alertDialog } = useDialog();
  const { login, signup, loginAsDemo } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [tpGroup, setTpGroup] = useState<TPGroup>('G1');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, fullName, tpGroup);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur d\'authentification');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      await loginAsDemo();
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de se connecter au compte démo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-white font-sans selection:bg-indigo-600 selection:text-white px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-md space-y-4">
        {/* Top Brand Header */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5 mb-3">
            <img
              src="/logo.png"
              alt="MGSI Logo"
              className="h-10 w-10 rounded-xl object-contain shadow-xs border border-slate-200 bg-white p-0.5"
            />
            <div>
              <span className="text-sm font-black text-slate-900 tracking-tight block">
                MGSI Planner
              </span>
              <span className="text-[11px] font-bold text-indigo-600 block">
                ENSIA-SD Taroudant
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isLogin ? 'Hello !' : 'Bienvenue !'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {isLogin
              ? 'Connectez-vous à votre espace étudiant'
              : 'Créez votre profil ingénieur Semestre 3'}
          </p>
        </div>

        {/* Quick 1-Click Demo Button */}
        <button
          type="button"
          onClick={handleDemoClick}
          disabled={loading}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-indigo-200/70 hover:border-indigo-300 text-indigo-900 text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-2xs group"
        >
          <div className="flex items-center space-x-2.5">
            <div className="h-6 w-6 rounded-lg bg-white border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Sparkles className="h-3 w-3 animate-pulse" />
            </div>
            <div className="text-left">
              <span className="block text-xs font-black text-indigo-950">Accès Démo 1-Clic</span>
              <span className="block text-[10px] text-indigo-600/80 font-medium">Prêt avec les cours et devoirs S3</span>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-indigo-600 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center py-0.5">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-2.5 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
            ou vos identifiants
          </span>
          <div className="border-t border-slate-200 w-full" />
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
            {errorMsg}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && (
            <>
              {/* Full Name */}
              <div className="relative flex items-center">
                <div className="absolute left-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-xs flex-shrink-0 z-10">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nom complet (ex: Youssef El Amrani)"
                  className="w-full rounded-full bg-slate-50/90 border border-slate-200/90 pl-14 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100/60 focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                />
              </div>

              {/* TP Group */}
              <div className="relative flex items-center">
                <div className="absolute left-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-xs flex-shrink-0 z-10">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <select
                  value={tpGroup}
                  onChange={(e) => setTpGroup(e.target.value as TPGroup)}
                  className="w-full rounded-full bg-slate-50/90 border border-slate-200/90 pl-14 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100/60 focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                >
                  <option value="G1">Groupe 1 de TP (G1)</option>
                  <option value="G2">Groupe 2 de TP (G2)</option>
                </select>
              </div>
            </>
          )}

          {/* Email */}
          <div className="relative flex items-center">
            <div className="absolute left-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-xs flex-shrink-0 z-10">
              <Mail className="h-4 w-4" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              className="w-full rounded-full bg-slate-50/90 border border-slate-200/90 pl-14 pr-4 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100/60 focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
            />
          </div>

          {/* Password */}
          <div className="relative flex items-center">
            <div className="absolute left-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-xs flex-shrink-0 z-10">
              <Lock className="h-4 w-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-full bg-slate-50/90 border border-slate-200/90 pl-14 pr-11 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100/60 focus:outline-none transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 p-1 text-slate-400 hover:text-indigo-600 transition-colors"
              title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-indigo-600" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-xs px-2 pt-0.5">
            <label className="flex items-center space-x-2 text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 border-slate-300"
              />
              <span className="font-medium text-[11px] sm:text-xs">Se souvenir de moi</span>
            </label>

            <button
              type="button"
              onClick={() => alertDialog({
                title: 'Réinitialisation des accès',
                message: "Veuillez contacter l'administration de l'ENSIA-SD Taroudant ou le service scolarité pour réinitialiser votre mot de passe institutionnel.",
                type: 'info',
                buttonText: 'Compris',
              })}
              className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] sm:text-xs cursor-pointer"
            >
              Mot de passe oublié ?
            </button>
          </div>

          {/* Gradient Submit Button */}
          <div className="pt-1.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-extrabold py-3 px-6 shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/35 active:scale-[0.98] disabled:opacity-50 text-xs tracking-wider uppercase flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Chargement...</span>
              ) : (
                <>
                  <span>{isLogin ? 'SE CONNECTER' : 'CRÉER MON COMPTE'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Toggle between login and register */}
        <div className="text-center pt-1">
          <p className="text-xs text-slate-500 font-medium">
            {isLogin ? "Vous n'avez pas de compte ?" : 'Vous avez déjà un compte ?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
              }}
              className="font-extrabold text-indigo-600 hover:text-indigo-800 underline underline-offset-4 ml-1"
            >
              {isLogin ? 'Créer un compte' : 'Se connecter'}
            </button>
          </p>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center space-x-1 text-[10px] text-slate-400 pt-0.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Sécurisé par authentification chiffrée Supabase</span>
        </div>
      </div>
    </div>
  );
};

