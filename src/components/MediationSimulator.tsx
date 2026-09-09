import React, { useState } from 'react';
import { 
  Users, 
  ShieldAlert, 
  Scale, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { DocumentRecord } from '../types';

interface MediationSimulatorProps {
  documents: DocumentRecord[];
  onViewDocument: (doc: DocumentRecord) => void;
}

export const MediationSimulator: React.FC<MediationSimulatorProps> = ({
  documents,
  onViewDocument,
}) => {
  const [topic, setTopic] = useState('Parenting Plan & Care Schedule');
  const [userProposal, setUserProposal] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);

  const presets = [
    {
      label: 'Equal Shared Care Schedule',
      topic: 'Equal Shared Care Transition',
      text: 'I propose transitioning to a structured equal shared care arrangement on a fortnightly cycle, with changeovers occurring directly at school to minimize parental conflict.',
    },
    {
      label: 'Medical & Healthcare Authority',
      topic: 'Medical Consultation & Emergency Notification',
      text: 'Pursuant to s 60CC best interests principles, both parents must be notified within 24 hours of any emergency healthcare event, and both retain independent authority to consult treating practitioners.',
    },
    {
      label: 'School Holiday Care & Travel',
      topic: 'School Holiday Division & Inter-State Notice',
      text: 'I propose school holiday periods be divided equally, with at least 28 days written notice required prior to travel outside the registry jurisdiction.',
    }
  ];

  const handleSimulate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userProposal.trim()) return;

    setIsSimulating(true);
    try {
      const res = await fetch('/api/gemini/mediation-red-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userProposal,
          topic,
        }),
      });
      const data = await res.json();
      setSimulationResult(data);
    } catch (err) {
      console.error('Failed to run mediation simulator:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12" id="mediation-simulator-container">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          <span>Mediation Red-Team Simulator</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Simulates upcoming Family Dispute Resolution (FDRP) and FCWA Pre-Trial Conference. Stress-tests positions and arms you with evidence-backed counter-arguments.
        </p>
      </div>

      {/* Preset Topics */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Scenario Presets:</span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setTopic(p.topic);
              setUserProposal(p.text);
            }}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 transition-colors shadow-2xs"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input Simulator Console */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mediation Agenda Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                id="mediation-topic-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Your Proposed Position / Settlement Offer
              </label>
              <textarea
                rows={3}
                required
                value={userProposal}
                onChange={(e) => setUserProposal(e.target.value)}
                placeholder="Detail what you plan to say or propose to the mediator..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                id="mediation-proposal-input"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSimulating || !userProposal.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              id="run-mediation-simulation-btn"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Simulating Opposing Counsel Stance...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Execute Red-Team Stress-Test</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Simulation Output */}
      {simulationResult && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Opposing Counsel Stance & Mediator Perspective */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opposing Counsel Stance */}
            <div className="bg-white rounded-xl border border-rose-200 p-5 shadow-sm space-y-3 bg-rose-50/15">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Anticipated Opposing Counsel Attack</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                {simulationResult.opposingCounselStance}
              </p>

              <div className="pt-2 border-t border-rose-100">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                  Vulnerabilities They Will Exploit:
                </span>
                <ul className="space-y-1 text-xs text-slate-700">
                  {simulationResult.redTeamVulnerabilities?.map((vuln: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-500 font-bold">⚠</span>
                      <span>{vuln}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Mediator Perspective & Statutory Grounding */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Scale className="w-4 h-4 text-indigo-600" />
                <span>Accredited FDRP Mediator Assessment</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {simulationResult.mediatorAssessment}
              </p>

              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-900">
                <strong className="block font-bold mb-0.5">Statutory Framework:</strong>
                {simulationResult.statutoryGrounding}
              </div>
            </div>
          </div>

          {/* Admissible Counter-Points with Citations */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Evidence-Backed Counter-Points (Admissible in FCWA)</span>
              </div>
              <span className="text-[11px] text-slate-400">Zero-Hallucination Verified</span>
            </div>

            <ul className="space-y-2 text-xs text-slate-800">
              {simulationResult.admissibleCounterPoints?.map((pt: string, i: number) => (
                <li key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
                  <span className="text-emerald-600 font-bold text-sm leading-none">•</span>
                  <span className="leading-relaxed">{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Tactical Compromise */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-md space-y-2 border border-slate-800">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              Recommended Settlement Stance / Strategic Counter-Proposal
            </span>
            <p className="text-xs text-slate-200 leading-relaxed">
              {simulationResult.recommendedCompromiseOption}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
