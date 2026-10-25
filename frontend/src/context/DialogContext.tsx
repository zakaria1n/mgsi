import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  X,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { triggerHaptic } from '../lib/modules';

export type DialogType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: DialogType;
  icon?: 'trash' | 'alert' | 'info' | 'check';
}

export interface AlertOptions {
  title?: string;
  message: string;
  buttonText?: string;
  type?: DialogType;
}

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: DialogType;
}

interface DialogContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
  };
}

const DialogContext = createContext<DialogContextValue | null>(null);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  // Alert Modal State
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    options: AlertOptions;
    resolve: () => void;
  } | null>(null);

  // Toast State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 1. Confirm Dialog Promise Implementation
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    triggerHaptic('medium');
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        options: {
          confirmText: options.confirmText || 'Confirmer',
          cancelText: options.cancelText || 'Annuler',
          type: options.type || 'danger',
          ...options,
        },
        resolve: (val: boolean) => {
          setConfirmState(null);
          resolve(val);
        },
      });
    });
  }, []);

  // 2. Alert Dialog Promise Implementation
  const alert = useCallback((options: AlertOptions | string): Promise<void> => {
    triggerHaptic('light');
    const resolvedOptions: AlertOptions =
      typeof options === 'string'
        ? { message: options, title: 'Information', type: 'info', buttonText: 'Compris' }
        : {
            title: options.title || 'Information',
            buttonText: options.buttonText || 'Compris',
            type: options.type || 'info',
            message: options.message,
          };

    return new Promise<void>((resolve) => {
      setAlertState({
        isOpen: true,
        options: resolvedOptions,
        resolve: () => {
          setAlertState(null);
          resolve();
        },
      });
    });
  }, []);

  // 3. Toast Implementation
  const addToast = useCallback((message: string, type: DialogType, title?: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, title, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const toast = {
    success: (msg: string, title?: string) => addToast(msg, 'success', title),
    error: (msg: string, title?: string) => addToast(msg, 'danger', title),
    info: (msg: string, title?: string) => addToast(msg, 'info', title),
    warning: (msg: string, title?: string) => addToast(msg, 'warning', title),
  };

  return (
    <DialogContext.Provider value={{ confirm, alert, toast }}>
      {children}

      {/* CONFIRMATION MODAL PRO (z-[100000] to sit above DocumentViewerModal) */}
      {confirmState?.isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden scale-100 transition-all p-6 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-4">
              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  confirmState.options.type === 'danger'
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : confirmState.options.type === 'warning'
                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                }`}
              >
                {confirmState.options.icon === 'trash' || confirmState.options.type === 'danger' ? (
                  <Trash2 className="h-6 w-6 stroke-[2]" />
                ) : confirmState.options.type === 'warning' ? (
                  <AlertTriangle className="h-6 w-6 stroke-[2]" />
                ) : (
                  <HelpCircle className="h-6 w-6 stroke-[2]" />
                )}
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {confirmState.options.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  confirmState.resolve(false);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {confirmState.options.cancelText || 'Annuler'}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  confirmState.resolve(true);
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-xs transition-all cursor-pointer active:scale-98 ${
                  confirmState.options.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 focus:ring-4 focus:ring-rose-200'
                    : confirmState.options.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 focus:ring-4 focus:ring-amber-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200'
                }`}
              >
                {confirmState.options.confirmText || 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL PRO */}
      {alertState?.isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 select-none">
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden scale-100 transition-all p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3.5">
              <div
                className={`p-2.5 rounded-2xl shrink-0 ${
                  alertState.options.type === 'danger'
                    ? 'bg-rose-50 text-rose-600 border border-rose-100'
                    : alertState.options.type === 'success'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    : alertState.options.type === 'warning'
                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                }`}
              >
                {alertState.options.type === 'danger' ? (
                  <XCircle className="h-5 w-5 stroke-[2]" />
                ) : alertState.options.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 stroke-[2]" />
                ) : alertState.options.type === 'warning' ? (
                  <AlertTriangle className="h-5 w-5 stroke-[2]" />
                ) : (
                  <Info className="h-5 w-5 stroke-[2]" />
                )}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <h3 className="text-sm font-black text-slate-900">
                  {alertState.options.title || 'Information'}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {alertState.options.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  alertState.resolve();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {alertState.options.buttonText || 'Compris'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING TOASTS NOTIFICATIONS */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[100001] flex flex-col space-y-2 pointer-events-none max-w-sm w-full select-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl shadow-xl border bg-white text-slate-900 transition-all animate-in slide-in-from-bottom-3 duration-200 ${
                t.type === 'danger'
                  ? 'border-rose-200'
                  : t.type === 'success'
                  ? 'border-emerald-200'
                  : t.type === 'warning'
                  ? 'border-amber-200'
                  : 'border-indigo-200'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <span
                  className={`p-1.5 rounded-xl ${
                    t.type === 'danger'
                      ? 'bg-rose-100 text-rose-600'
                      : t.type === 'success'
                      ? 'bg-emerald-100 text-emerald-600'
                      : t.type === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-indigo-100 text-indigo-600'
                  }`}
                >
                  {t.type === 'danger' ? (
                    <XCircle className="h-4 w-4" />
                  ) : t.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : t.type === 'warning' ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  {t.title && <h4 className="text-xs font-bold text-slate-900">{t.title}</h4>}
                  <p className="text-xs text-slate-700 font-medium truncate">{t.message}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </DialogContext.Provider>
  );
};

export const useDialog = (): DialogContextValue => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};
