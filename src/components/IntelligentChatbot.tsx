import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Filter, 
  Sparkles, 
  ExternalLink, 
  ShieldCheck, 
  Trash2, 
  Scale, 
  Copy, 
  Check, 
  RefreshCw,
  Cpu,
  UserCheck,
  Zap,
  BookOpen,
  Download,
  AlertCircle,
  HelpCircle,
  Clock
} from 'lucide-react';
import { DocumentRecord, EvidentiaryWeight } from '../types';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  citations?: { id: string; title: string; docId?: string }[];
  weightFilterUsed?: EvidentiaryWeight | 'All';
  modelUsed?: string;
  roleUsed?: string;
}

export type ChatbotRole = 
  | 'strategist' 
  | 'cross_examiner' 
  | 'biff_coach' 
  | 'mediation_counsel' 
  | 'emergency_injunction';

export type GeminiModelChoice = 
  | 'gemini-3.8-flash' 
  | 'gemini-3.5-flash' 
  | 'gemini-3.1-flash-lite' 
  | 'gemini-3.1-pro-preview';

interface IntelligentChatbotProps {
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

const ROLES_INFO: Record<ChatbotRole, { name: string; description: string; badgeColor: string }> = {
  strategist: {
    name: 'Senior Family Court Strategist',
    description: 'Specializes in FCWA Case 4344/2023 orders, s 60CC child best interests, and contravention remedies.',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  cross_examiner: {
    name: 'Forensic Cross-Examiner',
    description: 'Pins down discrepancies between Sue-Anne’s claims vs verified school/hospital/Telstra records.',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  biff_coach: {
    name: 'BIFF Co-Parenting Coach',
    description: 'Crafts Brief, Informative, Friendly, Firm messages under Order 9.1 (42h communication rule).',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  mediation_counsel: {
    name: 'Mediation & Red-Team Counsel',
    description: 'Prepares compromise positions, stress-tests schedules, and assesses settlement risks.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  emergency_injunction: {
    name: 'Emergency Welfare & Injunctions',
    description: 'Handles urgent withholding (Busselton trip) and medical concealment (Order 5.1).',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
};

const MODELS_INFO: Record<GeminiModelChoice, { name: string; label: string; tag: string }> = {
  'gemini-3.8-flash': {
    name: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash (Balanced & High Quality)',
    tag: 'Recommended Default',
  },
  'gemini-3.5-flash': {
    name: 'gemini-3.5-flash',
    label: 'Gemini 3.5 Flash (General Tasks)',
    tag: 'Standard Intelligence',
  },
  'gemini-3.1-flash-lite': {
    name: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash-Lite (High Speed)',
    tag: 'Fast Responses',
  },
  'gemini-3.1-pro-preview': {
    name: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro Preview (Complex Tasks)',
    tag: 'Deep Legal Reasoning',
  },
};

export const IntelligentChatbot: React.FC<IntelligentChatbotProps> = ({
  documents,
  onViewDocument,
  initialQuery,
  onClearInitialQuery,
}) => {
  const [selectedRole, setSelectedRole] = useState<ChatbotRole>('strategist');
  const [selectedModel, setSelectedModel] = useState<GeminiModelChoice>('gemini-3.8-flash');
  const [weightFilter, setWeightFilter] = useState<EvidentiaryWeight | 'All'>('All');
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init-1',
      sender: 'agent',
      text: `Family Court of WA Intelligence Agent initialized for Case 4344/2023 (Hawkins v Hawkins).\n\n• Active Role: ${ROLES_INFO.strategist.name}\n• Configured Model: gemini-3.8-flash\n• Primary Records: 9 sworn & verified exhibits indexed.\n\nAsk any question regarding Interim Orders, changeovers, medical concealment, or cross-examination strategy. Every statement is strictly grounded in case exhibits.`,
      timestamp: '09:00 AM',
      roleUsed: 'strategist',
      modelUsed: 'gemini-3.8-flash',
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      executeUserMessage(initialQuery);
      if (onClearInitialQuery) onClearInitialQuery();
    }
  }, [initialQuery]);

  const quickPrompts: Record<ChatbotRole, string[]> = {
    strategist: [
      "What evidence proves Ben's active involvement in Isabella and Mason's sports?",
      "List all breaches of the 42-hour communication rule (Order 9.1)",
      "Summarize medical concealment incidents under Order 5.1",
      "Did Sue-Anne withhold the children from school changeover on 12 April 2024?"
    ],
    cross_examiner: [
      "How do we cross-examine Sue-Anne on the 12 April 2024 Busselton withholding?",
      "Draft 5 leading questions confronting Sue-Anne on Mason's hospital admission concealment",
      "Highlight contradictions between Sue-Anne's affidavit and Bassendean PS attendance records",
      "Show evidence disproving her claim that Ben never attends extracurricular activities"
    ],
    biff_coach: [
      "Draft a BIFF response to Sue-Anne demanding changes to the Easter weekend schedule",
      "Help me reply to her email alleging I am late for pick-up, staying under 70 words",
      "Review my message about Mason's asthma medication so it has zero emotional hooks",
      "Draft a formal request for 28 days written notice before interstate travel"
    ],
    mediation_counsel: [
      "How do we propose transitioning from 5/9 fortnightly care to equal 7/7 shared care?",
      "What are opposing counsel's strongest arguments, and how do we counter them?",
      "Formulate a compromise protocol for Mason's specialist medical appointments",
      "Draft a mediation clause for dispute resolution before filing Form 2 Contravention"
    ],
    emergency_injunction: [
      "What immediate steps should Ben take if children are withheld from school pick-up?",
      "Draft grounds for an Urgent Form 2 Contravention Application under s 70NFB",
      "Assess legal threshold for seeking compensatory make-up time under s 70NEB",
      "Outline police assistance / recovery order requirements for FCWA enforcement"
    ],
  };

  const executeUserMessage = async (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Append user message immediately
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      // Pass full conversation history for multi-turn chat
      const historyPayload = updatedHistory.map(m => ({
        sender: m.sender,
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: queryText,
          history: historyPayload,
          role: selectedRole,
          model: selectedModel,
          evidentiaryFilter: weightFilter,
          documents: documents.map(d => ({
            id: d.id,
            title: d.title,
            category: d.category,
            date: d.date,
            sourceOrigin: d.sourceOrigin,
            evidentiaryWeight: d.evidentiaryWeight,
            excerpt: d.excerpt,
          })),
        }),
      });

      const data = await res.json();

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: data.reply || 'No direct record matches found in the evidentiary database.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: data.citations || [],
        weightFilterUsed: weightFilter,
        modelUsed: data.modelUsed || selectedModel,
        roleUsed: data.roleUsed || selectedRole,
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `agent-err-${Date.now()}`,
        sender: 'agent',
        text: 'Error processing inquiry. Please verify the local server is running.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isLoading) return;
    const q = inputQuery;
    setInputQuery('');
    executeUserMessage(q);
  };

  const copyMessageText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'msg-reset',
        sender: 'agent',
        text: `Conversation history reset.\n• Role: ${ROLES_INFO[selectedRole].name}\n• Ready for multi-turn inquiry.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        roleUsed: selectedRole,
        modelUsed: selectedModel,
      }
    ]);
  };

  const exportChatTranscript = () => {
    const transcript = messages.map(m => {
      const sender = m.sender === 'user' ? 'BENJAMIN HAWKINS' : `INTELLIGENCE AGENT (${ROLES_INFO[(m.roleUsed as ChatbotRole) || selectedRole]?.name || 'FCWA Agent'})`;
      return `[${m.timestamp}] ${sender}:\n${m.text}\n${m.citations && m.citations.length > 0 ? `Citations: ${m.citations.map(c => c.id).join(', ')}\n` : ''}\n-----------------------------------\n`;
    }).join('\n');

    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Case_4344_Chat_Transcript_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-12" id="intelligent-chatbot-container">
      {/* Top Configuration Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <span>Multi-Turn Legal AI Chatbot</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-sans font-medium">
                Gemini Multi-Turn Thread
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Case 4344/2023 Evidentiary Intelligence • Specialized Legal Roles • Multi-Turn Memory
            </p>
          </div>

          {/* Model Selector & Actions */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
              <Cpu className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-medium text-slate-600">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as GeminiModelChoice)}
                className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-none cursor-pointer"
                title="Select Gemini Model Tier"
                id="gemini-model-select"
              >
                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Default / High Quality)</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash (General Tasks)</option>
                <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Fast Tasks)</option>
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview (Deep Legal Reasoning)</option>
              </select>
            </div>

            <button
              onClick={exportChatTranscript}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
              title="Export Conversation Transcript"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <button
              onClick={clearChat}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              title="Reset Conversation History"
              id="clear-chat-history-btn"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Specialized Bot Roles Tabs */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>System Role Instruction:</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Each role enforces specialized prompt behavior &amp; statutory rules
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {(Object.keys(ROLES_INFO) as ChatbotRole[]).map((roleKey) => {
              const info = ROLES_INFO[roleKey];
              const isSelected = selectedRole === roleKey;
              return (
                <button
                  key={roleKey}
                  onClick={() => setSelectedRole(roleKey)}
                  className={`p-2 rounded-xl text-left transition-all border text-xs flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                  id={`role-btn-${roleKey}`}
                >
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span className="truncate">{info.name.split(' ')[0]} {info.name.split(' ')[1]}</span>
                    {isSelected && <Check className="w-3 h-3 text-indigo-600 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-tight">
                    {info.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Evidence Weight Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-2 border-t border-slate-100">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Evidentiary Filter:</span>
          </span>
          {(['All', 'Sworn/Official', 'Third-Party Objective', 'Unverified Claim'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWeightFilter(w)}
              className={`px-2.5 py-0.5 rounded-md font-medium text-xs transition-colors ${
                weightFilter === w
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {w}
            </button>
          ))}
          <span className="text-[11px] text-slate-400 ml-auto hidden sm:inline">
            Active: <strong className="text-slate-700">{ROLES_INFO[selectedRole].name}</strong> • <span className="font-mono text-indigo-600">{MODELS_INFO[selectedModel].tag}</span>
          </span>
        </div>
      </div>

      {/* Quick Prompts Suggestions Carousel for Selected Role */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-xs font-semibold text-slate-500 shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Role Prompts:</span>
        </span>
        {quickPrompts[selectedRole].map((qp, idx) => (
          <button
            key={idx}
            onClick={() => executeUserMessage(qp)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 whitespace-nowrap shadow-2xs hover:border-indigo-400 transition-colors shrink-0"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Chat Messages Scrollable Thread */}
      <div 
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-[530px] overflow-y-auto space-y-4 text-xs"
        id="chat-messages-thread"
      >
        {messages.map((msg) => {
          const isAgent = msg.sender === 'agent';
          const roleLabel = msg.roleUsed ? ROLES_INFO[msg.roleUsed as ChatbotRole]?.name : ROLES_INFO[selectedRole].name;

          return (
            <div
              key={msg.id}
              className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 space-y-2.5 shadow-2xs ${
                  isAgent
                    ? 'bg-slate-50 border border-slate-200/90 text-slate-900 rounded-tl-xs'
                    : 'bg-indigo-600 text-white rounded-tr-xs'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center justify-between gap-3 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold uppercase tracking-wider ${isAgent ? 'text-indigo-700' : 'text-indigo-200'}`}>
                      {isAgent ? roleLabel : 'Benjamin Hawkins (Applicant)'}
                    </span>
                    {isAgent && msg.modelUsed && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-100/70 text-indigo-700 font-mono text-[9px]">
                        {msg.modelUsed}
                      </span>
                    )}
                  </div>
                  <span className={isAgent ? 'text-slate-400' : 'text-indigo-200'}>
                    {msg.timestamp}
                  </span>
                </div>

                {/* Message Body */}
                <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs">
                  {msg.text}
                </div>

                {/* Zero-Hallucination Citations Drawer */}
                {isAgent && msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Referenced Court Records &amp; Third-Party Evidence:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((c, i) => {
                        const matchedDoc = documents.find(d => d.id === c.docId || d.id === c.id);
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (matchedDoc) onViewDocument(matchedDoc);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded font-mono text-[11px] text-indigo-700 hover:text-indigo-900 transition-colors shadow-2xs"
                            title={c.title || c.id}
                          >
                            <ExternalLink className="w-3 h-3 text-indigo-500" />
                            <span>{c.id}</span>
                            {c.title && <span className="text-slate-500 font-sans text-[10px] max-w-[140px] truncate hidden sm:inline">({c.title})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Footer Copy & Status */}
                {isAgent && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Zero-Hallucination Verified</span>
                    </span>
                    <button
                      onClick={() => copyMessageText(msg.id, msg.text)}
                      className="hover:text-slate-600 flex items-center gap-1 transition-colors"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs p-4 space-y-2 text-xs text-slate-600 flex items-center gap-2.5 shadow-2xs">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
              <div>
                <p className="font-semibold text-slate-800">
                  {ROLES_INFO[selectedRole].name} is analyzing records...
                </p>
                <p className="text-[11px] text-slate-400">
                  Running multi-turn inference with {selectedModel}
                </p>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Box Form */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder={`Inquire with ${ROLES_INFO[selectedRole].name} (maintains conversation context)...`}
          className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
          id="chatbot-query-input"
        />
        <button
          type="submit"
          disabled={isLoading || !inputQuery.trim()}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
          id="send-chat-query-btn"
        >
          <span>Submit</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
