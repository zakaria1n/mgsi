import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Wrench,
  ChevronDown,
  ChevronUp,
  Plus,
  Pin,
  PinOff,
  Edit2,
  Trash2,
  Copy,
  Check,
  Search,
  MessageSquare,
  X,
  Undo2,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { apiClient } from '../lib/api';
import { AIMessage } from '../types';
import { useDialog } from '../context/DialogContext';

export interface ChatConversation {
  id: string;
  title: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  messages: AIMessage[];
}

const STORAGE_KEY = 'mgsi_ai_conversations_v2';
const ACTIVE_CHAT_KEY = 'mgsi_ai_active_chat_id';

export const AIAssistantPage: React.FC = () => {
  const { confirm: confirmDialog, toast } = useDialog();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Active chat state
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Edit message in-place state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMsgContent, setEditMsgContent] = useState('');

  // Edit conversation title state
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renamedTitle, setRenamedTitle] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Load conversations from localStorage or initialize
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ChatConversation[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          const savedActiveId = localStorage.getItem(ACTIVE_CHAT_KEY);
          if (savedActiveId && parsed.some((c) => c.id === savedActiveId)) {
            setActiveChatId(savedActiveId);
          } else {
            setActiveChatId(parsed[0].id);
          }
          return;
        }
      }
    } catch (e) {
      console.error('Error reading conversations:', e);
    }

    // Default conversation if none exists
    const defaultChat: ChatConversation = {
      id: `chat-${Date.now()}`,
      title: 'Organisation & Copilote',
      isPinned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setConversations([defaultChat]);
    setActiveChatId(defaultChat.id);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    if (activeChatId) {
      localStorage.setItem(ACTIVE_CHAT_KEY, activeChatId);
    }
  }, [activeChatId]);

  // Current active conversation
  const activeConversation = conversations.find((c) => c.id === activeChatId) || conversations[0];
  const activeMessages = activeConversation ? activeConversation.messages : [];

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, loading]);

  // Focus rename input
  useEffect(() => {
    if (renamingChatId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingChatId]);

  // Create new conversation
  const handleCreateNewChat = () => {
    const newChat: ChatConversation = {
      id: `chat-${Date.now()}`,
      title: 'Nouvelle discussion',
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    setConversations((prev) => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setInputMessage('');
    setIsDrawerOpen(false);
  };

  // Pin / Unpin conversation
  const handleTogglePin = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, isPinned: !c.isPinned } : c))
    );
  };

  // Start renaming conversation
  const handleStartRename = (chat: ChatConversation, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRenamingChatId(chat.id);
    setRenamedTitle(chat.title);
  };

  // Save renamed conversation
  const handleSaveRename = (chatId: string) => {
    if (!renamedTitle.trim()) {
      setRenamingChatId(null);
      return;
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, title: renamedTitle.trim(), updatedAt: new Date().toISOString() }
          : c
      )
    );
    setRenamingChatId(null);
  };

  // Delete conversation
  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversations.length <= 1) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, messages: [], title: 'Nouvelle discussion', updatedAt: new Date().toISOString() }
            : c
        )
      );
      return;
    }

    const filtered = conversations.filter((c) => c.id !== chatId);
    setConversations(filtered);
    if (activeChatId === chatId) {
      setActiveChatId(filtered[0].id);
    }
  };

  // Clear current chat
  const handleClearCurrentChat = async () => {
    if (!activeChatId) return;
    const confirmed = await confirmDialog({
      title: 'Effacer cette discussion ?',
      message: 'Voulez-vous vraiment effacer tous les messages échangés dans cette conversation ?',
      confirmText: 'Effacer',
      cancelText: 'Annuler',
      type: 'danger',
      icon: 'trash',
    });
    if (!confirmed) return;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, messages: [], updatedAt: new Date().toISOString() }
          : c
      )
    );
    try {
      await apiClient.clearAIHistory();
      toast.success('Discussion effacée.');
    } catch (e) {
      // local clear
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading || !activeChatId) return;

    const userMsg: AIMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString(),
    };

    const isFirstMessage = activeConversation && activeConversation.messages.length === 0;
    const derivedTitle = isFirstMessage
      ? text.length > 30
        ? text.slice(0, 30) + '...'
        : text
      : activeConversation.title;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              title: c.title === 'Nouvelle discussion' ? derivedTitle : c.title,
              messages: [...c.messages, userMsg],
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );

    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      const res = await apiClient.sendAIMessage(text);
      const aiMsg: AIMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        tool_calls: res.toolExecutions,
        created_at: new Date().toISOString(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? {
                ...c,
                messages: [...c.messages, aiMsg],
                updatedAt: new Date().toISOString(),
              }
            : c
        )
      );
    } catch (err: any) {
      const errorMsg: AIMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Désolé, une anomalie est survenue : ${err.message}`,
        created_at: new Date().toISOString(),
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChatId
            ? { ...c, messages: [...c.messages, errorMsg] }
            : c
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // UNDO: Revert last exchange
  const handleUndoLastExchange = () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const msgs = [...activeConversation.messages];

    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }

    if (lastUserIdx !== -1) {
      const lastUserContent = msgs[lastUserIdx].content;
      const truncated = msgs.slice(0, lastUserIdx);
      setConversations((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, messages: truncated } : c))
      );
      setInputMessage(lastUserContent);
    }
  };

  // EDIT MESSAGE: in place
  const handleStartEditMessage = (msg: AIMessage) => {
    setEditingMsgId(msg.id);
    setEditMsgContent(msg.content);
  };

  const handleSaveEditAndResend = async (msgId: string) => {
    if (!editMsgContent.trim() || !activeConversation) return;

    const msgs = activeConversation.messages;
    const targetIdx = msgs.findIndex((m) => m.id === msgId);
    if (targetIdx === -1) return;

    const truncated = msgs.slice(0, targetIdx);
    const newText = editMsgContent.trim();
    setEditingMsgId(null);
    setEditMsgContent('');

    setConversations((prev) =>
      prev.map((c) => (c.id === activeChatId ? { ...c, messages: truncated } : c))
    );

    handleSendMessage(newText);
  };

  // REGENERATE last AI response
  const handleRegenerateLastResponse = () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const msgs = activeConversation.messages;
    const lastMsg = msgs[msgs.length - 1];

    if (lastMsg.role === 'assistant') {
      const prevUserMsg = msgs[msgs.length - 2];
      if (prevUserMsg && prevUserMsg.role === 'user') {
        const truncated = msgs.slice(0, msgs.length - 1);
        setConversations((prev) =>
          prev.map((c) => (c.id === activeChatId ? { ...c, messages: truncated } : c))
        );
        handleSendMessage(prevUserMsg.content);
      }
    }
  };

  // COPY MESSAGE
  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const toggleToolExpand = (msgId: string, idx: number) => {
    const key = `${msgId}-${idx}`;
    setExpandedTools((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filtered discussions
  const filteredConversations = conversations
    .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const pinnedList = filteredConversations.filter((c) => c.isPinned);
  const recentList = filteredConversations.filter((c) => !c.isPinned);

  const suggestions = [
    'Organise ma semaine de travail selon mon rythme',
    'Ajoute un devoir ERP pour vendredi 18h',
    'Reprogramme ma session inachevée sans conflit',
    'Que dois-je faire aujourd\'hui en priorité ?',
  ];

  return (
    <div className="relative flex flex-col h-full w-full bg-white overflow-hidden pb-16 lg:pb-0">
      {/* TOP UNIFIED HEADER */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200/80 bg-white/95 backdrop-blur-md z-20">
        <div className="flex items-center space-x-3 min-w-0">
          {/* Button to open sliding conversations drawer */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all active:scale-95 shadow-xs"
            title="Ouvrir la liste des discussions"
          >
            <MessageSquare className="h-4 w-4 text-indigo-600" />
            <span className="hidden sm:inline">Discussions</span>
            <span className="rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.2 text-[10px] font-extrabold">
              {conversations.length}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {/* New Chat quick button */}
          <button
            onClick={handleCreateNewChat}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all active:scale-95 shadow-xs"
            title="Créer une nouvelle discussion"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Nouveau chat</span>
          </button>

          {/* Current Chat Title & Inline Rename */}
          <div className="flex items-center space-x-2 min-w-0 pl-1">
            {renamingChatId === activeConversation?.id ? (
              <div className="flex items-center space-x-1">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renamedTitle}
                  onChange={(e) => setRenamedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(activeConversation.id);
                    if (e.key === 'Escape') setRenamingChatId(null);
                  }}
                  className="bg-white border border-indigo-500 rounded-lg px-2 py-0.5 text-xs text-slate-900 font-bold focus:outline-none"
                />
                <button
                  onClick={() => handleSaveRename(activeConversation.id)}
                  className="p-1 text-emerald-600 hover:text-emerald-700"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setRenamingChatId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 min-w-0">
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                  {activeConversation?.title || 'Nouvelle discussion'}
                </h2>
                <button
                  onClick={() => handleStartRename(activeConversation)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Renommer ce chat"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                {activeConversation?.isPinned && (
                  <span className="hidden sm:inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                    <Pin className="h-2.5 w-2.5 mr-1 fill-indigo-600" />
                    Épinglé
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons on the right */}
        <div className="flex items-center space-x-1.5">
          {activeMessages.length > 0 && (
            <>
              <button
                onClick={handleUndoLastExchange}
                title="Annuler le dernier échange et réinsérer la saisie"
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
              >
                <Undo2 className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Annuler</span>
              </button>

              <button
                onClick={handleRegenerateLastResponse}
                title="Régénérer la dernière réponse"
                disabled={loading}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Régénérer</span>
              </button>
            </>
          )}

          <button
            onClick={handleClearCurrentChat}
            title="Vider les messages de cette discussion"
            className="p-1.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* SLIDING CONVERSATIONS DRAWER (OVERLAY) */}
      {isDrawerOpen && (
        <div className="absolute inset-0 z-30 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-slate-900/15 backdrop-blur-[2px] transition-opacity"
          />

          {/* Drawer Panel */}
          <aside className="relative w-80 max-w-[85vw] h-full bg-white border-r border-slate-200/90 shadow-2xl flex flex-col z-40 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-200/80 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm">
                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                  <span>Mes Discussions ({conversations.length})</span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  title="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={handleCreateNewChat}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 text-xs shadow-xs transition-all active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                <span>+ Nouvelle discussion</span>
              </button>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une discussion..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
              {pinnedList.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider flex items-center space-x-1.5">
                    <Pin className="h-3 w-3 fill-indigo-500" />
                    <span>Épinglées ({pinnedList.length})</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {pinnedList.map((chat) => renderDrawerChatRow(chat))}
                  </div>
                </div>
              )}

              <div>
                {pinnedList.length > 0 && recentList.length > 0 && (
                  <div className="px-2 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Récentes
                  </div>
                )}
                <div className="space-y-1 mt-1">
                  {recentList.map((chat) => renderDrawerChatRow(chat))}
                </div>
              </div>

              {filteredConversations.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  Aucune discussion trouvée.
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* MAIN MESSAGES VIEWPORT */}
      <div className="flex-1 overflow-y-auto w-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-4 min-h-full flex flex-col justify-between">
          {activeMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 max-w-lg mx-auto space-y-6 my-auto">
            <div className="relative">
              <img
                src="/logo.png"
                alt="MGSI Logo"
                className="h-16 w-16 rounded-2xl object-contain shadow-sm border border-slate-200 bg-white p-1"
              />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                <Sparkles className="h-3 w-3 text-white" />
              </span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Copilote Académique MGSI
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                Contrôlez votre emploi du temps et devoirs sans manipulation manuelle. Vos conversations sont mémorisées, épinglables et modifiables.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(s)}
                  className="rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 p-3.5 text-xs font-semibold text-slate-700 transition-all hover:scale-[1.01] shadow-2xs flex items-center space-x-2.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                  <span>{s}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          activeMessages.map((msg) => {
            const isUser = msg.role === 'user';
            const isEditing = editingMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`group flex items-start space-x-3 ${
                  isUser ? 'justify-end' : 'justify-start'
                }`}
              >
                {!isUser && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex-shrink-0 mt-1 shadow-2xs">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm transition-all ${
                    isUser
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  {/* Tool Executions */}
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="mb-3 space-y-2 border-b border-slate-100 pb-3">
                      {msg.tool_calls.map((t, idx) => {
                        const key = `${msg.id}-${idx}`;
                        const isExpanded = Boolean(expandedTools[key]);
                        return (
                          <div
                            key={idx}
                            className="rounded-xl bg-indigo-50/70 border border-indigo-100 p-2.5 text-xs"
                          >
                            <div
                              onClick={() => toggleToolExpand(msg.id, idx)}
                              className="flex items-center justify-between cursor-pointer text-indigo-900 font-bold"
                            >
                              <div className="flex items-center space-x-2">
                                <Wrench className="h-3.5 w-3.5 text-indigo-600" />
                                <span>
                                  Action : <strong>{t.tool}</strong>
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </div>
                            {isExpanded && (
                              <pre className="mt-2 p-2 rounded-lg bg-white border border-indigo-100 text-[10px] font-mono text-slate-700 overflow-x-auto">
                                {JSON.stringify(t.result, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Message content or Edit box */}
                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={editMsgContent}
                        onChange={(e) => setEditMsgContent(e.target.value)}
                        className="w-full rounded-xl bg-slate-800 text-white border border-slate-700 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setEditingMsgId(null)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => handleSaveEditAndResend(msg.id)}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs flex items-center space-x-1"
                        >
                          <span>Modifier et relancer</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                      <div className="mt-2 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>

                        <div className="flex items-center space-x-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className={`p-1 rounded-md transition-colors ${
                              isUser
                                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                            }`}
                            title="Copier le texte"
                          >
                            {copiedMsgId === msg.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>

                          {isUser && (
                            <button
                              onClick={() => handleStartEditMessage(msg)}
                              className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                              title="Modifier ce message"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 border border-slate-300 text-slate-700 flex-shrink-0 mt-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4 text-xs text-slate-600 flex items-center space-x-2 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce" />
              <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
              <div className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
              <span className="ml-2 font-semibold">Le copilote analyse vos données et exécute les requêtes...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* BOTTOM INPUT AREA */}
      <div className="border-t border-slate-200/80 p-3 sm:p-4 bg-white/95 backdrop-blur-md w-full">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Écrivez un message (ex: Organise ma semaine, Ajoute un TP, Que dois-je faire ?)..."
              className="flex-1 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none shadow-2xs transition-all"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="rounded-2xl bg-slate-900 hover:bg-slate-800 text-white p-3 shadow-xs transition-all active:scale-95 disabled:opacity-35"
              title="Envoyer le message"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  // Render individual row inside the sliding drawer
  function renderDrawerChatRow(chat: ChatConversation) {
    const isActive = activeChatId === chat.id;

    return (
      <div
        key={chat.id}
        onClick={() => {
          setActiveChatId(chat.id);
          setIsDrawerOpen(false);
        }}
        className={`group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-semibold cursor-pointer transition-all ${
          isActive
            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs'
            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'
        }`}
      >
        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
          <MessageSquare
            className={`h-3.5 w-3.5 flex-shrink-0 ${
              isActive ? 'text-indigo-600' : 'text-slate-400'
            }`}
          />
          <span className="truncate flex-1">{chat.title}</span>
        </div>

        {/* Hover / Actions */}
        <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5">
          <button
            onClick={(e) => handleTogglePin(chat.id, e)}
            className={`p-1 rounded hover:bg-slate-200/60 ${
              chat.isPinned ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
            }`}
            title={chat.isPinned ? 'Désépingler' : 'Épingler en tête'}
          >
            {chat.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStartRename(chat);
              setIsDrawerOpen(false);
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
            title="Renommer la discussion"
          >
            <Edit2 className="h-3 w-3" />
          </button>

          <button
            onClick={(e) => handleDeleteChat(chat.id, e)}
            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            title="Supprimer la discussion"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }
};
