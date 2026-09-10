import React, { useState } from 'react';
import { upsertProfiles } from '../utils/reconcile';
import { 
  User, 
  Users, 
  ShieldAlert, 
  HeartHandshake, 
  MessageSquare, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ExternalLink,
  RefreshCw,
  Quote,
  Brain,
  ChevronRight,
  Activity,
  AlertCircle,
  Lock,
  Unlock
} from 'lucide-react';
import {
  PartyProfile,
  DocumentRecord,
  TimelineEvent,
  CommunicationMessage,
  ChildName,
  CHILD_TIMELINE_CATEGORIES,
} from '../types';
import {
  getChildTimeline,
  getChildCategoryCounts,
  getEmptyChildCategories,
  CHILD_CATEGORY_STYLES,
} from '../utils/childTimelineService';
import { summariseProductivityForParty } from '../utils/communicationProductivity';

/**
 * Renders one themed block of a child's welfare record. Empty lists are shown
 * as an explicit gap rather than hidden, because a silent field and a field
 * with no evidence look identical to a reader otherwise — and only one of
 * those is something to act on.
 */
const ChildSection: React.FC<{
  title: string;
  summary: string;
  lists?: { label: string; items: string[] }[];
  note?: string;
}> = ({ title, summary, lists = [], note }) => (
  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
      {title}
    </span>

    {summary && <p className="text-xs text-slate-600 leading-relaxed mb-2">{summary}</p>}

    <div className="space-y-2">
      {lists.map((list, idx) => (
        <div key={idx}>
          <span className="text-[10px] font-semibold text-slate-500 block mb-1">{list.label}</span>
          {(list.items?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-1">
              {(list.items || []).map((item, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] text-slate-700"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              None recorded — evidentiary gap
            </span>
          )}
        </div>
      ))}
    </div>

    {note && (
      <p className="text-[11px] text-slate-600 mt-2 pt-2 border-t border-slate-200 leading-relaxed">
        {note}
      </p>
    )}
  </div>
);

interface PartyProfilesProps {
  profiles: PartyProfile[];
  documents: DocumentRecord[];
  timeline: TimelineEvent[];
  communicationMessages: CommunicationMessage[];
  onUpdateProfiles: (updated: PartyProfile[]) => void;
  onViewDocument: (doc: DocumentRecord) => void;
  onNavigateToAffidavit: () => void;
  onNavigateToBreaches: () => void;
}

export const PartyProfiles: React.FC<PartyProfilesProps> = ({
  profiles,
  documents,
  timeline,
  communicationMessages,
  onUpdateProfiles,
  onViewDocument,
  onNavigateToAffidavit,
  onNavigateToBreaches,
}) => {
  const [selectedPartyId, setSelectedPartyId] = useState<string>(profiles[0]?.id || 'PROF-001');
  const [isAiReviewing, setIsAiReviewing] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  const activeProfile = profiles.find(p => p.id === selectedPartyId) || profiles[0];

  // Child profiles carry a different shape entirely — parent-oriented blocks
  // (parenting capacity, order compliance) do not apply to a subject child.
  const childDetail = activeProfile?.childDetail;
  const activeChildName = childDetail?.childName as ChildName | undefined;

  const childTimeline = activeChildName ? getChildTimeline(timeline, activeChildName) : [];
  const childCategoryCounts = activeChildName
    ? getChildCategoryCounts(timeline, activeChildName)
    : {};
  const childEmptyCategories = activeChildName
    ? getEmptyChildCategories(timeline, activeChildName)
    : [];

  // Live productivity metrics, used when the profile has no stored pattern yet.
  const liveProductivity =
    activeProfile && !childDetail
      ? summariseProductivityForParty(communicationMessages, activeProfile.partyName)
      : null;
  const productivityPattern = activeProfile?.communicationProductivityPattern || liveProductivity;

  const handleRunAiReview = async () => {
    setIsAiReviewing(true);
    setReviewSuccessMsg(null);

    try {
      const res = await fetch('/api/gemini/review-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentProfiles: profiles,
          documents: documents.slice(0, 15).map(d => ({
            id: d.id,
            title: d.title,
            category: d.category,
            date: d.date,
            weight: d.evidentiaryWeight,
            excerpt: d.excerpt
          })),
          // Communications drive both tone AND productivity findings.
          communications: communicationMessages.slice(0, 30).map(m => ({
            id: m.id,
            timestamp: m.timestamp,
            sender: m.sender,
            channel: m.channel,
            tone: m.tone,
            lagHours: m.lagHours,
            breach42h: m.breachOf42HourMandate,
            isReply: Boolean(m.responseToId),
            content: (m.content || '').slice(0, 400),
          })),
          // Timeline drives per-child attribution.
          timeline: timeline.slice(0, 30).map(e => ({
            id: e.id,
            date: e.date,
            title: e.title,
            category: e.category,
            children: e.childrenMentioned,
            childImpacts: e.childImpacts,
            breach: e.orderBreachFlag,
          })),
          // Empty categories tell the model where a child's record is silent.
          childCategoryCounts: {
            Isabella: getChildCategoryCounts(timeline, 'Isabella'),
            Mason: getChildCategoryCounts(timeline, 'Mason'),
          },
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.profiles && Array.isArray(data.profiles)) {
          onUpdateProfiles(data.profiles);
          setReviewSuccessMsg(data.summary || 'AI successfully analyzed knowledge base documents and refreshed behavioral, communication, and risk profiles.');
        } else {
          simulateLocalUpdate();
        }
      } else {
        simulateLocalUpdate();
      }
    } catch (e) {
      console.warn('AI profiles endpoint error, applying local evaluation:', e);
      simulateLocalUpdate();
    } finally {
      setIsAiReviewing(false);
      setTimeout(() => setReviewSuccessMsg(null), 7000);
    }
  };

  /**
   * Local review pass used when the AI endpoint is unavailable. It still does
   * real work: productivity metrics and per-child timeline counts are computed
   * deterministically from the store rather than merely bumping a timestamp.
   */
  const simulateLocalUpdate = () => {
    const nowStamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const updated = profiles.map(p => {
      if (p.childDetail) {
        const name = p.childDetail.childName;
        return {
          ...p,
          childDetail: {
            ...p.childDetail,
            timelineCategoryCounts: getChildCategoryCounts(timeline, name),
          },
          lastAiReviewTimestamp: nowStamp,
        };
      }

      return {
        ...p,
        communicationProductivityPattern: summariseProductivityForParty(
          communicationMessages,
          p.partyName
        ),
        lastAiReviewTimestamp: nowStamp,
      };
    });

    onUpdateProfiles(updated);
    setReviewSuccessMsg(
      `Local review complete across ${documents.length} documents, ${communicationMessages.length} communications and ${timeline.length} timeline events. Communication productivity metrics and per-child timeline categories recomputed for all ${profiles.length} profiles.`
    );
  };

  const getRoleBadge = (role: PartyProfile['role']) => {
    switch (role) {
      case 'Applicant (Father)':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Respondent (Mother)':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  const getToneBadge = (tone: PartyProfile['communicationTonePattern']['primaryTone']) => {
    switch (tone) {
      case 'BIFF / Professional':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Hostile / Combative':
        return 'bg-rose-100 text-rose-800 border-rose-200 font-bold';
      case 'Avoidant / High Latency':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Party Intelligence &amp; Behavioral Profiles</h1>
                <p className="text-xs text-slate-500">
                  AI-synthesized behavioral records, observed conduct, communication tone patterns, and risks across applicant, respondent, and children.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAiReview}
              disabled={isAiReviewing}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition-all ${
                isAiReviewing
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
              id="run-ai-profiles-review-btn"
            >
              {isAiReviewing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>AI Reviewing Knowledge Base...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Review &amp; Refresh Profiles</span>
                </>
              )}
            </button>
          </div>
        </div>

        {reviewSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{reviewSuccessMsg}</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-mono">Synced</span>
          </div>
        )}

        {/* Party Selector Tabs */}
        <div className="flex flex-wrap gap-2 mt-5 border-t border-slate-100 pt-4">
          {profiles.map(profile => {
            const isSelected = profile.id === selectedPartyId;
            const isChild = Boolean(profile.childDetail);
            const childEventCount = isChild
              ? getChildTimeline(timeline, profile.childDetail!.childName).length
              : 0;

            return (
              <div key={profile.id} className="relative">
              <button
                onClick={() => setSelectedPartyId(profile.id)}
                id={`profile-tab-${profile.id}`}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : isChild
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isChild ? <HeartHandshake className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                <span className="font-semibold">{profile.partyName}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-sm border ${
                  isSelected ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'
                }`}>
                  {isChild ? 'Child' : profile.role.split(' ')[0]}
                </span>
                {isChild && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      childEventCount === 0
                        ? 'bg-rose-500 text-white'
                        : isSelected
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                    title={
                      childEventCount === 0
                        ? 'No timeline events attributed to this child'
                        : `${childEventCount} timeline entries on this child's own timeline`
                    }
                  >
                    {childEventCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => onUpdateProfiles(upsertProfiles(profiles, [{ ...profile, immutableLock: !profile.immutableLock }]))}
                className={`absolute -top-1.5 -right-1.5 p-0.5 rounded-full border transition-colors ${
                  profile.immutableLock
                    ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100'
                    : 'text-slate-400 bg-white border-slate-200 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title={
                  profile.immutableLock
                    ? 'Locked -- AI review refreshes will never overwrite this profile. Click to unlock.'
                    : 'Lock this profile so AI review refreshes can never overwrite or drop it'
                }
              >
                {profile.immutableLock ? (
                  <Lock className="w-2.5 h-2.5" />
                ) : (
                  <Unlock className="w-2.5 h-2.5" />
                )}
              </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Profile Details */}
      {activeProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Summary & Behaviour */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Card */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{activeProfile.partyName}</h2>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getRoleBadge(activeProfile.role)}`}>
                      {activeProfile.role}
                    </span>
                    {activeProfile.age && (
                      <span className="text-xs text-slate-500 font-medium">
                        Age {activeProfile.age} {activeProfile.dob ? `(DOB: ${activeProfile.dob})` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {activeProfile.summary}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block font-mono">Last AI Review</span>
                  <span className="text-xs font-semibold text-slate-700 font-mono">
                    {activeProfile.lastAiReviewTimestamp || 'Current'}
                  </span>
                </div>
              </div>

              {/* Quick Metrics Bar — child variant */}
              {childDetail && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 mt-4 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">School</span>
                    <span className="font-bold text-slate-900">{childDetail.school || 'Not recorded'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Own Timeline Entries</span>
                    <span className="font-bold text-slate-900">{childTimeline.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Categories Covered</span>
                    <span className={`font-bold ${childEmptyCategories.length > 4 ? 'text-rose-700' : 'text-slate-900'}`}>
                      {CHILD_TIMELINE_CATEGORIES.length - childEmptyCategories.length} / {CHILD_TIMELINE_CATEGORIES.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Views Recorded (s 60CC(2)(b))</span>
                    <span className={`font-bold ${childDetail.viewsExpressed.recordedViews.length === 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {childDetail.viewsExpressed.recordedViews.length || 'None'}
                    </span>
                  </div>
                </div>
              )}

              {/* Quick Metrics Bar — parent variant */}
              {!childDetail && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 mt-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Compliance Status</span>
                  <span className={`font-bold ${
                    activeProfile.behaviour.orderComplianceRating === 'Consistently Compliant'
                      ? 'text-emerald-700'
                      : activeProfile.behaviour.orderComplianceRating === 'N/A'
                      ? 'text-slate-600'
                      : 'text-rose-700'
                  }`}>
                    {activeProfile.behaviour.orderComplianceRating}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Observed Breaches</span>
                  <span className="font-bold text-slate-900">
                    {activeProfile.behaviour.observedIncidentsCount} incidents
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Primary Tone</span>
                  <span className={`font-bold inline-block px-1.5 py-0.5 rounded text-[10px] border mt-0.5 ${getToneBadge(activeProfile.communicationTonePattern.primaryTone)}`}>
                    {activeProfile.communicationTonePattern.primaryTone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Avg Response Latency</span>
                  <span className={`font-bold font-mono ${activeProfile.communicationTonePattern.avgResponseLatencyHours > 42 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {activeProfile.communicationTonePattern.avgResponseLatencyHours > 0 
                      ? `${activeProfile.communicationTonePattern.avgResponseLatencyHours} hrs`
                      : 'N/A'}
                  </span>
                </div>
              </div>
              )}
            </div>

            {/* Behaviour & Conduct Section — parents only */}
            {!childDetail && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Observed Behaviour &amp; Court Conduct</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {activeProfile.behaviour.summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Behavioral Traits */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Key Character &amp; Conduct Traits
                  </span>
                  <ul className="space-y-1.5">
                    {(activeProfile.behaviour?.traits || []).map((trait, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{trait}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risk Factors */}
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    Observed Risk Factors
                  </span>
                  <ul className="space-y-1.5">
                    {(activeProfile.behaviour?.riskFactors || []).map((risk, idx) => (
                      <li key={idx} className="text-xs text-amber-900 flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            )}

            {/* Communication Tone Pattern & Verbatim Evidence — parents only */}
            {!childDetail && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-sm text-slate-900">Communication Tone Pattern &amp; 42-Hour Audit</h3>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  Order 9.1 Breach Rate: <strong className="text-slate-900">{activeProfile.communicationTonePattern.order9BreachRate}</strong>
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {(activeProfile.communicationTonePattern?.toneCharacteristics || []).map((tc, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-medium">
                    {tc}
                  </span>
                ))}
              </div>

              {/* Verbatim Examples */}
              {(activeProfile.communicationTonePattern?.verbatimExamples?.length ?? 0) > 0 && (
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Corroborated Verbatim Quotes from Knowledge Base
                  </span>
                  {(activeProfile.communicationTonePattern?.verbatimExamples || []).map((ex, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-indigo-700">{ex.context}</span>
                        <span className="font-mono">{ex.date}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Quote className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <p className="italic text-slate-800 text-xs">
                          "{ex.excerpt}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Communication Productivity — parents only. Separate axis from
                tone: substance, not manner, and not the 42-hour clock. */}
            {!childDetail && productivityPattern && (
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-rose-600" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Communication Productivity (Substance)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Non-Productive:{' '}
                    <strong className="text-rose-700">{productivityPattern.nonProductiveRate}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 block">Productive</span>
                    <span className="text-lg font-bold text-emerald-800">{productivityPattern.productiveCount}</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block">Partial</span>
                    <span className="text-lg font-bold text-amber-800">{productivityPattern.partiallyProductiveCount}</span>
                  </div>
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-rose-700 block">Non-Productive</span>
                    <span className="text-lg font-bold text-rose-800">{productivityPattern.nonProductiveCount}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-slate-600 block">Substantive Replies</span>
                    <span className="text-lg font-bold text-slate-900">{productivityPattern.substantiveResponseRate}</span>
                  </div>
                </div>

                {(productivityPattern.dominantNonProductiveMarkers?.length ?? 0) > 0 && (
                  <div className="mb-3">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Dominant Non-Productive Markers
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(productivityPattern.dominantNonProductiveMarkers || []).map((mk, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-800 font-medium"
                        >
                          {mk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-600 leading-relaxed p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  {productivityPattern.assessmentNote}
                </p>

                {(productivityPattern.nonProductiveExamples?.length ?? 0) > 0 && (
                  <div className="space-y-2 mt-3">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Non-Productive Verbatim Examples
                    </span>
                    {(productivityPattern.nonProductiveExamples || []).map((ex, idx) => (
                      <div key={idx} className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-rose-800">{ex.context}</span>
                          <span className="font-mono text-rose-600">{ex.date}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Quote className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <p className="italic text-slate-800 text-xs">"{ex.excerpt}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════ CHILD PANELS ══════════ */}
            {childDetail && (
              <>
                {/* Health, education, emotional, development */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-sm text-slate-900">
                      {childDetail.childName}'s Developmental &amp; Welfare Record
                    </h3>
                  </div>

                  <ChildSection
                    title="Health & Medical"
                    summary={childDetail.healthAndMedical.summary}
                    lists={[
                      { label: 'Conditions', items: childDetail.healthAndMedical.conditions },
                      { label: 'Treating Providers', items: childDetail.healthAndMedical.treatingProviders },
                    ]}
                    note={childDetail.healthAndMedical.complianceNotes}
                  />

                  <ChildSection
                    title="Education & Schooling"
                    summary={childDetail.educationAndSchooling.summary}
                    lists={[{ label: 'Support Needs', items: childDetail.educationAndSchooling.supportNeeds }]}
                    note={childDetail.educationAndSchooling.attendanceNotes}
                  />

                  <ChildSection
                    title="Emotional & Psychological"
                    summary={childDetail.emotionalAndPsychological.summary}
                    lists={[
                      { label: 'Observed Indicators', items: childDetail.emotionalAndPsychological.observedIndicators },
                    ]}
                    note={childDetail.emotionalAndPsychological.exposureToConflictNotes}
                  />

                  <ChildSection
                    title="Extracurricular & Social"
                    summary={childDetail.extracurricularAndSocial.summary}
                    lists={[{ label: 'Activities', items: childDetail.extracurricularAndSocial.activities }]}
                  />

                  {childDetail.developmentalNeeds.length > 0 && (
                    <ChildSection
                      title="Developmental Needs"
                      summary=""
                      lists={[{ label: 'Identified Needs', items: childDetail.developmentalNeeds }]}
                    />
                  )}
                </div>

                {/* Views expressed — s 60CC(2)(b) */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <h3 className="font-bold text-sm text-slate-900">
                        Views Expressed by {childDetail.childName}
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">s 60CC(2)(b)</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {childDetail.viewsExpressed?.summary}
                  </p>

                  {(childDetail.viewsExpressed?.recordedViews?.length ?? 0) > 0 ? (
                    <div className="space-y-2">
                      {(childDetail.viewsExpressed?.recordedViews || []).map((v, idx) => (
                        <div key={idx} className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-indigo-800">{v.context}</span>
                            <span className="font-mono text-indigo-600">{v.date}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Quote className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                            <p className="italic text-slate-800">"{v.excerpt}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        No views on file. The Court must consider any views expressed by{' '}
                        {childDetail.childName}. Views are typically captured through a family
                        report, an ICL interview, or a school counsellor note — none of which are
                        currently in the vault.
                      </span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100">
                    {childDetail.viewsExpressed?.weightConsiderations}
                  </p>
                </div>

                {/* This child's own timeline, by their own categories */}
                <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <h3 className="font-bold text-sm text-slate-900">
                        {childDetail.childName}'s Timeline by Category
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {childTimeline.length} entr{childTimeline.length === 1 ? 'y' : 'ies'}
                    </span>
                  </div>

                  {/* Category coverage grid */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {CHILD_TIMELINE_CATEGORIES.map(cat => {
                      const count = childCategoryCounts[cat] || 0;
                      return (
                        <span
                          key={cat}
                          className={`text-[11px] px-2 py-0.5 rounded border font-medium ${
                            count
                              ? CHILD_CATEGORY_STYLES[cat]
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}
                          title={count ? `${count} entries` : 'No entries recorded — evidentiary gap'}
                        >
                          {cat} {count ? `· ${count}` : '· 0'}
                        </span>
                      );
                    })}
                  </div>

                  {childEmptyCategories.length > 0 && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 mb-3 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>{childEmptyCategories.length}</strong> of{' '}
                        {CHILD_TIMELINE_CATEGORIES.length} categories hold no entries for{' '}
                        {childDetail.childName}: {childEmptyCategories.join(', ')}. Any submission
                        specific to these areas is presently unsupported.
                      </span>
                    </div>
                  )}

                  {/* Entries */}
                  {childTimeline.length > 0 ? (
                    <div className="space-y-2">
                      {childTimeline.slice(0, 20).map(({ event, impact }, idx) => {
                        const sourceDoc = documents.find(
                          d => d.id.trim().toLowerCase() === (event.primaryDocId || '').trim().toLowerCase()
                        );
                        return (
                          <div
                            key={`${event.id}-${idx}`}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  {event.date}
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                                    CHILD_CATEGORY_STYLES[impact.childCategory]
                                  }`}
                                >
                                  {impact.childCategory}
                                </span>
                                {!impact.directlyEvidenced && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 border border-slate-300"
                                    title={`${childDetail.childName} was not named directly in the source — attribution inferred from a general reference to the children.`}
                                  >
                                    Inferred attribution
                                  </span>
                                )}
                              </div>
                              {sourceDoc ? (
                                <button
                                  onClick={() => onViewDocument(sourceDoc)}
                                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                                  title="Open this document in the Vault viewer"
                                >
                                  <span>{sourceDoc.annexureNumber || sourceDoc.id}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              ) : event.primaryDocId ? (
                                <span
                                  className="text-[11px] text-slate-400 font-medium flex items-center gap-1"
                                  title={`Cited document ${event.primaryDocId} is not in the current vault -- it may have been removed or re-ingested under a different ID.`}
                                >
                                  <span>{event.primaryDocId}</span>
                                  <AlertCircle className="w-3 h-3" />
                                </span>
                              ) : null}
                            </div>
                            <div className="font-semibold text-slate-900">{event.title}</div>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                              {impact.impactSummary}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                      No timeline entries are attributed to {childDetail.childName}. Events reach a
                      child's timeline only when the source document names that child, so a document
                      referring generally to "the children" may not have been attributed here.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Column: Concerns, Parenting Capacity, & Evidentiary Citations */}
          <div className="space-y-6">
            {/* Concerns Raised / Substantiated */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-sm text-slate-900">Key Concerns &amp; Safety Factors</h3>
              </div>

              {(activeProfile.concerns?.substantiatedConcernsAgainstParty?.length ?? 0) > 0 && (
                <div className="mb-4">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block mb-2">
                    Substantiated Concerns Against Party
                  </span>
                  <div className="space-y-2">
                    {(activeProfile.concerns?.substantiatedConcernsAgainstParty || []).map((c, idx) => (
                      <div key={idx} className="p-2.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-lg text-xs flex items-start gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(activeProfile.concerns?.raisedByParty?.length ?? 0) > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Concerns Expressed / Raised
                  </span>
                  <ul className="space-y-1.5">
                    {(activeProfile.concerns?.raisedByParty || []).map((c, idx) => (
                      <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Safety &amp; Wellbeing Notes
                </span>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeProfile.concerns?.safetyAndWellbeingNotes}
                </p>
              </div>
            </div>

            {/* Child safety & risk — child profiles only */}
            {childDetail && (
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <h3 className="font-bold text-sm text-slate-900">
                    Safety &amp; Risk — {childDetail.childName}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {childDetail.safetyAndRiskNotes || 'No safety or risk findings recorded from the vault.'}
                </p>

                {(childDetail.s60CCFactorLinks?.length ?? 0) > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Linked Statutory Factors
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(childDetail.s60CCFactorLinks || []).map((f, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-700 font-mono"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Parenting Capacity Assessment — parents only */}
            {!childDetail && (
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <HeartHandshake className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Parenting Capacity Indicators</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-bold text-slate-900 block mb-0.5">School &amp; Educational Engagement</span>
                  <span className="text-slate-600">{activeProfile.parentingCapacity.schoolEngagement}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-bold text-slate-900 block mb-0.5">Medical &amp; Therapy Management</span>
                  <span className="text-slate-600">{activeProfile.parentingCapacity.medicalManagement}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-bold text-slate-900 block mb-0.5">Routine Consistency</span>
                  <span className="text-slate-600">{activeProfile.parentingCapacity.routineConsistency}</span>
                </div>
              </div>
            </div>
            )}

            {/* Evidentiary References in Vault */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <h3 className="font-bold text-sm text-slate-900">Corroborating Evidence</h3>
                </div>
                <span className="text-[11px] text-slate-400">Knowledge Base</span>
              </div>

              <div className="space-y-2">
                {(activeProfile.evidentiaryReferences || []).map((ref, idx) => {
                  const docObj = documents.find(
                    d => d.id.trim().toLowerCase() === (ref.docId || '').trim().toLowerCase()
                  );
                  return (
                    <div 
                      key={idx}
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                          <span>{ref.title}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-mono">
                            {ref.citation}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{ref.note}</p>
                      </div>

                      {docObj ? (
                        <button
                          onClick={() => onViewDocument(docObj)}
                          className="px-2 py-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 shrink-0"
                          title="View source document in Vault"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <span
                          className="px-2 py-1 text-[11px] text-slate-400 font-medium flex items-center gap-1 shrink-0"
                          title={`Cited document ${ref.docId || 'unknown'} is not in the current vault -- it may have been removed or re-ingested under a different ID.`}
                        >
                          <span>Not in Vault</span>
                          <AlertCircle className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
