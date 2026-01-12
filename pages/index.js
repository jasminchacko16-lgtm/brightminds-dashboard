import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, X, Check, Lock, Eye, AlertCircle, RefreshCw, User, Calendar, FileText, Heart, Users, Clock, MapPin, UserCheck, Shield, ClipboardList, School, BarChart3, Building2 } from 'lucide-react';

const SUPABASE_URL = 'https://igkwugfefllkutthnjwi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlna3d1Z2ZlZmxsa3V0dGhuandpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNTUxMTIsImV4cCI6MjA4MzczMTExMn0.w9vE39YSYiwGRl9saT9pUpde57XMTTyUjDw-v2sc12o';

const supabase = {
  from: (t) => ({
    select: async () => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*&order=id.desc`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }); const d = await r.json(); return { data: d, error: r.ok ? null : d }; },
    insert: async (rows) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}`, { method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(rows) }); const d = await r.json(); return { data: d, error: r.ok ? null : d }; },
    update: (row) => ({ eq: async (c, v) => { await fetch(`${SUPABASE_URL}/rest/v1/${t}?${c}=eq.${v}`, { method: 'PATCH', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(row) }); } }),
    delete: () => ({ eq: async (c, v) => { await fetch(`${SUPABASE_URL}/rest/v1/${t}?${c}=eq.${v}`, { method: 'DELETE', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }); } })
  })
};

const diagAssess = { ABA: ['FBA', 'ADOS-2', 'VB-MAPP', 'ABLLS-R', 'AFLS', 'Paired Choice', 'Vineland-3'], Psychiatry: ['DSM-5 Criteria', 'ADOS-2', 'Medical Review', 'Mental Status Exam'], Psychology: ['ADOS-2', 'ADI-R', 'WISC-V/WPPSI-IV', 'CBCL', 'ABAS-3'], SLP: ['CELF-5', 'PLS-5', 'PPVT-4', 'EVT-3', 'GFTA-3'], OT: ['Sensory Profile', 'PM-2', 'BOT-2', 'PDMS-2', 'GAS Baseline'] };
const swAssess = ['SES Assessment', 'Eco-Map', 'Genogram', 'Family Needs', 'CANS'];
const itpDisc = ['Psychiatry', 'Psychology', 'ABA', 'SLP', 'OT', 'Social Work'];
const meetingTypes = ['Team Huddle', 'Case Review', 'Program Review', 'Training Updates', 'Family Advisory Council'];
const frequencies = ['Weekly', 'Bi-Weekly', 'Monthly (PR)', 'Monthly (TU)', 'Quarterly'];
const disciplines = ['Care Coordination', 'Psychiatry', 'Psychology', 'ABA', 'SLP', 'OT'];
const kpiList = [{ name: 'Referral-to-Service Timeline', target: '7 days' }, { name: 'Caregiver Engagement', target: '> 85%' }, { name: 'No-Show Rate', target: '< 20%' }, { name: 'Functional Progress (GAP)', target: '70%' }, { name: 'QoL Improvement', target: 'Baseline' }];
const quarterlyAreas = ['System-Level Issues', 'Workforce & Capacity', 'Family Advisory Feedback', 'Multi-Agency Collaboration', 'Resource Allocation'];

const emptyITP = () => ({ goals: [], signoffs: { parent: { signed: false, date: '' }, socialWorker: { signed: false, date: '' }, psychiatry: { signed: false, date: '' }, psychology: { signed: false, date: '' }, aba: { signed: false, date: '' }, slp: { signed: false, date: '' }, ot: { signed: false, date: '' } }, finalized: false, finalizedDate: '', editRequests: [] });
const emptyMeeting = () => ({ patientId: '', patientName: '', date: '', time: '', type: '', frequency: '', location: '', facilitator: '', nextDate: '', nextType: '', status: 'Scheduled', attendees: '', absenceNotes: '', safeguardingConcerns: '', previousActionReview: '', caseReview: disciplines.reduce((a, d) => ({ ...a, [d]: { updates: '', risks: '', actions: '' } }), {}), decisions: '', schoolCollab: disciplines.slice(1).reduce((a, d) => ({ ...a, [d]: { itpAlignment: '', teacherFeedback: '', classroomNeeds: '' } }), {}), actionItems: [], kpis: kpiList.map(k => ({ ...k, current: '', notes: '' })), quarterlyReview: quarterlyAreas.map(a => ({ area: a, summary: '', recommendations: '' })) });

const toDb = (p) => ({ case_id: p.caseId, first_name: p.firstName, last_name: p.lastName, dob: p.dob || null, parent_name: p.parentName, insurance: p.insurance, primary_dx: p.primaryDx, parent_intake_complete: p.parentIntakeComplete, diagnostic_assessments: p.diagnosticAssessments, social_work_assessments: p.socialWorkAssessments, itp: p.itp, treatment_start_date: p.treatmentStartDate || null });
const fromDb = (r) => ({ id: r.id, caseId: r.case_id, firstName: r.first_name || '', lastName: r.last_name || '', dob: r.dob || '', parentName: r.parent_name || '', insurance: r.insurance || '', primaryDx: r.primary_dx || '', parentIntakeComplete: r.parent_intake_complete || false, diagnosticAssessments: r.diagnostic_assessments || { ABA: [], Psychiatry: [], Psychology: [], SLP: [], OT: [] }, socialWorkAssessments: r.social_work_assessments || [], itp: r.itp || emptyITP(), treatmentStartDate: r.treatment_start_date || null });

const mtToDb = (m) => ({ patient_id: m.patientId, patient_name: m.patientName, date: m.date, time: m.time, type: m.type, frequency: m.frequency, location: m.location, facilitator: m.facilitator, next_date: m.nextDate, next_type: m.nextType, status: m.status, attendees: m.attendees, absence_notes: m.absenceNotes, safeguarding_concerns: m.safeguardingConcerns, previous_action_review: m.previousActionReview, case_review: m.caseReview, decisions: m.decisions, school_collab: m.schoolCollab, action_items: m.actionItems, kpis: m.kpis, quarterly_review: m.quarterlyReview });
const mtFromDb = (r) => ({ id: r.id, patientId: r.patient_id, patientName: r.patient_name || '', date: r.date || '', time: r.time || '', type: r.type || '', frequency: r.frequency || '', location: r.location || '', facilitator: r.facilitator || '', nextDate: r.next_date || '', nextType: r.next_type || '', status: r.status || 'Scheduled', attendees: r.attendees || '', absenceNotes: r.absence_notes || '', safeguardingConcerns: r.safeguarding_concerns || '', previousActionReview: r.previous_action_review || '', caseReview: r.case_review || disciplines.reduce((a, d) => ({ ...a, [d]: { updates: '', risks: '', actions: '' } }), {}), decisions: r.decisions || '', schoolCollab: r.school_collab || disciplines.slice(1).reduce((a, d) => ({ ...a, [d]: { itpAlignment: '', teacherFeedback: '', classroomNeeds: '' } }), {}), actionItems: r.action_items || [], kpis: r.kpis || kpiList.map(k => ({ ...k, current: '', notes: '' })), quarterlyReview: r.quarterly_review || quarterlyAreas.map(a => ({ area: a, summary: '', recommendations: '' })) });

export default function App() {
  const [patients, setPatients] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('patients');
  const [selPt, setSelPt] = useState(null);
  const [selMt, setSelMt] = useState(null);
  const [section, setSection] = useState('info');
  const [mtSection, setMtSection] = useState('header');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddMt, setShowAddMt] = useState(false);
  const [newPt, setNewPt] = useState({ caseId: '', firstName: '', lastName: '', dob: '', primaryDx: '' });
  const [newMt, setNewMt] = useState({ patientId: '', date: '', time: '', type: '', frequency: '' });

  const load = async () => { 
    setLoading(true); 
    try { 
      const { data: pData } = await supabase.from('patients').select(); 
      if (pData && Array.isArray(pData)) setPatients(pData.map(fromDb)); 
      const { data: mData } = await supabase.from('meetings').select(); 
      if (mData && Array.isArray(mData)) setMeetings(mData.map(mtFromDb)); 
    } catch (e) { console.error(e); } 
    setLoading(false); 
  };
  useEffect(() => { load(); }, []);

  const save = async (pt) => { setSaving(true); await supabase.from('patients').update(toDb(pt)).eq('id', pt.id); setSaving(false); };

  const getPhase = (p) => { if (p.treatmentStartDate) return { label: "Treatment", color: "emerald" }; const diagDone = p.parentIntakeComplete && Object.values(p.diagnosticAssessments).flat().length === Object.values(diagAssess).flat().length; if (!diagDone) return { label: "Diagnostic", color: "amber" }; if (p.socialWorkAssessments.length < swAssess.length) return { label: "Assessment", color: "blue" }; return Object.values(p.itp.signoffs).every(s => s.signed) ? { label: "Ready", color: "indigo" } : { label: "ITP", color: "violet" }; };
  const getProgress = (p) => { const ph = getPhase(p).label; if (ph === "Diagnostic") return Math.round(((Object.values(p.diagnosticAssessments).flat().length + (p.parentIntakeComplete ? 1 : 0)) / (Object.values(diagAssess).flat().length + 1)) * 100); if (ph === "Assessment") return Math.round((p.socialWorkAssessments.length / swAssess.length) * 100); if (ph === "ITP") return Math.round((Object.values(p.itp.signoffs).filter(s => s.signed).length / 7) * 100); return 100; };
  const phaseColor = (c) => c === 'amber' ? 'bg-amber-400' : c === 'blue' ? 'bg-blue-400' : c === 'violet' ? 'bg-violet-400' : c === 'emerald' ? 'bg-emerald-400' : 'bg-slate-400';
  const phaseBadge = (c) => c === 'amber' ? 'bg-amber-50 text-amber-600' : c === 'blue' ? 'bg-blue-50 text-blue-600' : c === 'violet' ? 'bg-violet-50 text-violet-600' : c === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600';

  const updatePt = async (id, u) => { const upd = patients.map(p => p.id === id ? { ...p, ...u } : p); setPatients(upd); const pt = upd.find(p => p.id === id); if (selPt?.id === id) setSelPt(pt); await save(pt); };
  const toggleDiag = async (id, disc, a) => { const upd = patients.map(p => p.id === id ? { ...p, diagnosticAssessments: { ...p.diagnosticAssessments, [disc]: p.diagnosticAssessments[disc].includes(a) ? p.diagnosticAssessments[disc].filter(x => x !== a) : [...p.diagnosticAssessments[disc], a] } } : p); setPatients(upd); const pt = upd.find(p => p.id === id); if (selPt?.id === id) setSelPt(pt); await save(pt); };
  const toggleSW = async (id, a) => { const upd = patients.map(p => p.id === id ? { ...p, socialWorkAssessments: p.socialWorkAssessments.includes(a) ? p.socialWorkAssessments.filter(x => x !== a) : [...p.socialWorkAssessments, a] } : p); setPatients(upd); const pt = upd.find(p => p.id === id); if (selPt?.id === id) setSelPt(pt); await save(pt); };
  const toggleSign = async (id, role) => { const pt = patients.find(p => p.id === id); if (pt.itp.finalized) return; const upd = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, signoffs: { ...p.itp.signoffs, [role]: { signed: !p.itp.signoffs[role].signed, date: !p.itp.signoffs[role].signed ? new Date().toISOString().split('T')[0] : '' } } } } : p); setPatients(upd); const upt = upd.find(p => p.id === id); if (selPt?.id === id) setSelPt(upt); await save(upt); };
  const finalize = async (id) => { const upd = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, finalized: true, finalizedDate: new Date().toISOString().split('T')[0] } } : p); setPatients(upd); const pt = upd.find(p => p.id === id); if (selPt?.id === id) setSelPt(pt); await save(pt); };
  const unlock = async (id) => { const upd = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, finalized: false, finalizedDate: '', editRequests: [...p.itp.editRequests, { date: new Date().toISOString().split('T')[0], reason: 'Unlocked' }] } } : p); setPatients(upd); const pt = upd.find(p => p.id === id); if (selPt?.id === id) setSelPt(pt); await save(pt); };
  const addGoal = async (id) => { const pt = patients.find(p => p.id === id); if (pt.itp.finalized) return; const upd = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, goals: [...p.itp.goals, { id: Date.now(), discipline: '', domain: '', longTermGoal: '', shortTermGoals: [{ goal: '', measure: '', criteria: '' }] }] } } : p); setPatients(upd); const upt = upd.find(p => p.id === id); if (selPt?.id === id) setSelPt(upt); await save(upt); };
  const updateGoal = async (pId, gId, f, v) => { const pt = patients.find(p => p.id === pId); if (pt.itp.finalized) return; const upd = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.map(g => g.id === gId ? { ...g, [f]: v } : g) } } : p); setPatients(upd); const upt = upd.find(p => p.id === pId); if (selPt?.id === pId) setSelPt(upt); await save(upt); };
  const removeGoal = async (pId, gId) => { const pt = patients.find(p => p.id === pId); if (pt.itp.finalized) return; const upd = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.filter(g => g.id !== gId) } } : p); setPatients(upd); const upt = upd.find(p => p.id === pId); if (selPt?.id === pId) setSelPt(upt); await save(upt); };
  const addSTG = async (pId, gId) => { const pt = patients.find(p => p.id === pId); if (pt.itp.finalized) return; const upd = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.map(g => g.id === gId ? { ...g, shortTermGoals: [...g.shortTermGoals, { goal: '', measure: '', criteria: '' }] } : g) } } : p); setPatients(upd); const upt = upd.find(p => p.id === pId); if (selPt?.id === pId) setSelPt(upt); await save(upt); };
  const updateSTG = async (pId, gId, idx, f, v) => { const pt = patients.find(p => p.id === pId); if (pt.itp.finalized) return; const upd = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.map(g => g.id === gId ? { ...g, shortTermGoals: g.shortTermGoals.map((s, i) => i === idx ? { ...s, [f]: v } : s) } : g) } } : p); setPatients(upd); const upt = upd.find(p => p.id === pId); if (selPt?.id === pId) setSelPt(upt); await save(upt); };
  const deletePt = async (id) => { if (confirm('Delete?')) { await supabase.from('patients').delete().eq('id', id); setPatients(patients.filter(p => p.id !== id)); if (selPt?.id === id) setSelPt(null); } };
  const addPatient = async () => { if (!newPt.caseId) return; const pt = { ...newPt, parentIntakeComplete: false, diagnosticAssessments: { ABA: [], Psychiatry: [], Psychology: [], SLP: [], OT: [] }, socialWorkAssessments: [], itp: emptyITP(), treatmentStartDate: null }; const { data } = await supabase.from('patients').insert([toDb(pt)]); if (data) setPatients([fromDb(data[0]), ...patients]); setNewPt({ caseId: '', firstName: '', lastName: '', dob: '', primaryDx: '' }); setShowAdd(false); };
  const allSigned = (p) => Object.values(p.itp.signoffs).every(s => s.signed);

  const addMeeting = async () => { 
    if (!newMt.patientId || !newMt.date) return; 
    const pt = patients.find(p => p.id === parseInt(newMt.patientId)); 
    const mt = { ...emptyMeeting(), ...newMt, patientId: parseInt(newMt.patientId), patientName: pt ? `${pt.caseId} - ${pt.firstName} ${pt.lastName}` : '' }; 
    const { data } = await supabase.from('meetings').insert([mtToDb(mt)]); 
    if (data && data[0]) setMeetings([mtFromDb(data[0]), ...meetings]); 
    setNewMt({ patientId: '', date: '', time: '', type: '', frequency: '' }); 
    setShowAddMt(false); 
  };
  const saveMt = async (mt) => { setSaving(true); await supabase.from('meetings').update(mtToDb(mt)).eq('id', mt.id); setSaving(false); };
  const updateMt = async (id, u) => { const upd = meetings.map(m => m.id === id ? { ...m, ...u } : m); setMeetings(upd); const mt = upd.find(m => m.id === id); if (selMt?.id === id) setSelMt(mt); await saveMt(mt); };
  const deleteMt = async (id) => { if (confirm('Delete?')) { await supabase.from('meetings').delete().eq('id', id); setMeetings(meetings.filter(m => m.id !== id)); if (selMt?.id === id) setSelMt(null); } };
  const addAction = (mid) => { const m = meetings.find(x => x.id === mid); updateMt(mid, { actionItems: [...(m.actionItems || []), { id: Date.now(), action: '', owner: '', deadline: '', status: 'Pending' }] }); };
  const updateAction = (mid, aid, f, v) => { const m = meetings.find(x => x.id === mid); updateMt(mid, { actionItems: m.actionItems.map(a => a.id === aid ? { ...a, [f]: v } : a) }); };
  const updateCaseReview = (mid, disc, f, v) => { const m = meetings.find(x => x.id === mid); updateMt(mid, { caseReview: { ...m.caseReview, [disc]: { ...m.caseReview[disc], [f]: v } } }); };
  const updateSchoolCollab = (mid, disc, f, v) => { const m = meetings.find(x => x.id === mid); updateMt(mid, { schoolCollab: { ...m.schoolCollab, [disc]: { ...m.schoolCollab[disc], [f]: v } } }); };
  const updateKpi = (mid, idx, f, v) => { const m = meetings.find(x => x.id === mid); const kpis = [...m.kpis]; kpis[idx] = { ...kpis[idx], [f]: v }; updateMt(mid, { kpis }); };
  const updateQuarterly = (mid, idx, f, v) => { const m = meetings.find(x => x.id === mid); const qr = [...m.quarterlyReview]; qr[idx] = { ...qr[idx], [f]: v }; updateMt(mid, { quarterlyReview: qr }); };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div></div>;

  const Input = ({ label, value, onChange, type = 'text', placeholder = '', className = '' }) => (
    <div className={className}><label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label><input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full mt-1 p-2.5 bg-slate-50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-slate-200" /></div>
  );
  const TextArea = ({ label, value, onChange, placeholder = '', rows = 3 }) => (
    <div><label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label><textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full mt-1 p-2.5 bg-slate-50 border-0 rounded-lg text-sm resize-none focus:ring-2 focus:ring-slate-200" /></div>
  );
  const Select = ({ label, value, onChange, options, className = '' }) => (
    <div className={className}><label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label><select value={value || ''} onChange={e => onChange(e.target.value)} className="w-full mt-1 p-2.5 bg-slate-50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-slate-200"><option value="">Select...</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
  );
  const Section = ({ title, icon: Icon, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (<div className="border border-slate-200 rounded-xl overflow-hidden mb-4"><button onClick={() => setOpen(!open)} className="w-full p-4 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"><div className="flex items-center gap-3"><Icon className="w-5 h-5 text-slate-500" /><span className="font-medium text-slate-700">{title}</span></div>{open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}</button>{open && <div className="p-4 border-t border-slate-200">{children}</div>}</div>);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20"><Heart className="w-5 h-5 text-white" strokeWidth={2.5} /></div>
              <h1 className="text-lg font-semibold text-slate-800">Bright Minds</h1>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full">
              <button onClick={() => { setView('patients'); setSelMt(null); }} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'patients' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><User className="w-4 h-4 inline mr-1.5" />Patients</button>
              <button onClick={() => { setView('meetings'); setSelPt(null); }} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${view === 'meetings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Users className="w-4 h-4 inline mr-1.5" />MDT Meetings</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-slate-400">Saving...</span>}
            <button onClick={load} className="p-2 rounded-full hover:bg-slate-100"><RefreshCw className="w-4 h-4 text-slate-400" /></button>
            <button onClick={() => view === 'patients' ? setShowAdd(true) : setShowAddMt(true)} className="h-9 px-4 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 flex items-center gap-2"><Plus className="w-4 h-4" />New {view === 'patients' ? 'Patient' : 'Meeting'}</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100"><h2 className="font-semibold text-slate-700">{view === 'patients' ? 'Patients' : 'Meetings'}</h2></div>
              <div className="divide-y divide-slate-50 max-h-[calc(100vh-200px)] overflow-auto">
                {view === 'patients' ? (patients.length === 0 ? <div className="p-8 text-center"><User className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">No patients</p></div> : patients.map(pt => { const ph = getPhase(pt); return (<div key={pt.id} onClick={() => { setSelPt(pt); setSection('info'); }} className={`p-4 cursor-pointer ${selPt?.id === pt.id ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}><div className="flex justify-between mb-1"><span className="font-medium text-slate-700 text-sm">{pt.caseId}</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${phaseBadge(ph.color)}`}>{ph.label}</span></div><p className="text-xs text-slate-400">{pt.firstName} {pt.lastName}</p></div>); })) : (meetings.length === 0 ? <div className="p-8 text-center"><Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-400">No meetings</p></div> : meetings.map(m => (<div key={m.id} onClick={() => { setSelMt(m); setMtSection('header'); }} className={`p-4 cursor-pointer ${selMt?.id === m.id ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}><div className="flex justify-between mb-1"><span className="font-medium text-slate-700 text-sm">{m.type || 'Meeting'}</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{m.status}</span></div><p className="text-xs text-slate-400">{m.patientName}</p><p className="text-xs text-slate-300 mt-1">{m.date}</p></div>)))}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {view === 'patients' && !selPt && <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center"><FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-400">Select a patient</p></div>}
            {view === 'meetings' && !selMt && <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center"><Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-400">Select a meeting</p></div>}

            {view === 'patients' && selPt && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                  <div><h2 className="text-xl font-semibold text-slate-800">{selPt.caseId}</h2><p className="text-slate-400 text-sm">{selPt.firstName} {selPt.lastName}</p></div>
                  <div className="flex gap-2">{selPt.itp.finalized && <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-medium"><Lock className="w-3 h-3" />Finalized</span>}<button onClick={() => deletePt(selPt.id)} className="p-1.5 rounded-full hover:bg-red-50"><X className="w-4 h-4 text-slate-400 hover:text-red-500" /></button></div>
                </div>
                <div className="flex border-b border-slate-100 overflow-x-auto">{['info', 'diagnostic', 'assessment', 'itp', 'treatment'].map(t => <button key={t} onClick={() => setSection(t)} className={`px-4 py-3 text-sm font-medium whitespace-nowrap capitalize relative ${section === t ? 'text-slate-800' : 'text-slate-400'}`}>{t === 'itp' ? 'ITP' : t}{section === t && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-slate-800 rounded-full" />}</button>)}</div>
                <div className="p-5 max-h-[calc(100vh-280px)] overflow-auto">
                  {section === 'info' && <div className="grid grid-cols-2 gap-4"><Input label="Case ID" value={selPt.caseId} onChange={v => updatePt(selPt.id, { caseId: v })} /><Input label="First Name" value={selPt.firstName} onChange={v => updatePt(selPt.id, { firstName: v })} /><Input label="Last Name" value={selPt.lastName} onChange={v => updatePt(selPt.id, { lastName: v })} /><Input label="DOB" type="date" value={selPt.dob} onChange={v => updatePt(selPt.id, { dob: v })} /><Input label="Diagnosis" value={selPt.primaryDx} onChange={v => updatePt(selPt.id, { primaryDx: v })} className="col-span-2" /></div>}
                  {section === 'diagnostic' && <div className="space-y-4"><div onClick={() => updatePt(selPt.id, { parentIntakeComplete: !selPt.parentIntakeComplete })} className={`p-3 rounded-xl cursor-pointer ${selPt.parentIntakeComplete ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-transparent'}`}><div className="flex items-center gap-3"><div className={`w-5 h-5 rounded-full flex items-center justify-center ${selPt.parentIntakeComplete ? 'bg-emerald-500' : 'bg-slate-200'}`}>{selPt.parentIntakeComplete && <Check className="w-3 h-3 text-white" strokeWidth={3} />}</div><span className={`text-sm ${selPt.parentIntakeComplete ? 'text-emerald-700 font-medium' : 'text-slate-600'}`}>Parent Intake</span></div></div>{Object.entries(diagAssess).map(([d, items]) => <div key={d}><h4 className="text-sm font-medium text-slate-700 mb-2">{d}</h4><div className="flex flex-wrap gap-1.5">{items.map(a => { const done = selPt.diagnosticAssessments[d]?.includes(a); return <button key={a} onClick={() => toggleDiag(selPt.id, d, a)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${done ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-transparent hover:border-slate-200'}`}>{done && <Check className="w-3 h-3 inline mr-1" strokeWidth={3} />}{a}</button>; })}</div></div>)}</div>}
                  {section === 'assessment' && <div><h4 className="text-sm font-medium text-slate-700 mb-2">Social Work Assessments</h4><div className="flex flex-wrap gap-1.5">{swAssess.map(a => { const done = selPt.socialWorkAssessments.includes(a); return <button key={a} onClick={() => toggleSW(selPt.id, a)} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${done ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-500 border border-transparent hover:border-slate-200'}`}>{done && <Check className="w-3 h-3 inline mr-1" strokeWidth={3} />}{a}</button>; })}</div></div>}
                  {section === 'itp' && <div className="space-y-4"><div className="flex justify-between items-center"><h4 className="text-sm font-medium text-slate-700">Goals</h4>{!selPt.itp.finalized && <button onClick={() => addGoal(selPt.id)} className="text-xs text-slate-500 flex items-center gap-1"><Plus className="w-3 h-3" />Add</button>}</div>{selPt.itp.goals.length === 0 ? <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-400 text-sm">No goals</div> : selPt.itp.goals.map(g => <div key={g.id} className="p-3 bg-slate-50 rounded-xl space-y-2"><div className="flex gap-2"><select value={g.discipline} onChange={e => updateGoal(selPt.id, g.id, 'discipline', e.target.value)} disabled={selPt.itp.finalized} className="px-2 py-1.5 bg-white rounded-lg text-xs"><option value="">Discipline</option>{itpDisc.map(d => <option key={d}>{d}</option>)}</select><input value={g.domain} onChange={e => updateGoal(selPt.id, g.id, 'domain', e.target.value)} disabled={selPt.itp.finalized} placeholder="Domain" className="flex-1 px-2 py-1.5 bg-white rounded-lg text-xs" />{!selPt.itp.finalized && <button onClick={() => removeGoal(selPt.id, g.id)} className="p-1 text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>}</div><textarea value={g.longTermGoal} onChange={e => updateGoal(selPt.id, g.id, 'longTermGoal', e.target.value)} disabled={selPt.itp.finalized} placeholder="Long Term Goal" className="w-full px-2 py-1.5 bg-white rounded-lg text-xs resize-none h-16" /><p className="text-xs text-slate-400">Short Term Goals</p>{g.shortTermGoals.map((s, i) => <div key={i} className="flex gap-1.5"><input value={s.goal} onChange={e => updateSTG(selPt.id, g.id, i, 'goal', e.target.value)} disabled={selPt.itp.finalized} placeholder="Goal" className="flex-1 px-2 py-1 bg-white rounded text-xs" /><input value={s.measure} onChange={e => updateSTG(selPt.id, g.id, i, 'measure', e.target.value)} disabled={selPt.itp.finalized} placeholder="Measure" className="w-20 px-2 py-1 bg-white rounded text-xs" /><input value={s.criteria} onChange={e => updateSTG(selPt.id, g.id, i, 'criteria', e.target.value)} disabled={selPt.itp.finalized} placeholder="Criteria" className="w-20 px-2 py-1 bg-white rounded text-xs" /></div>)}{!selPt.itp.finalized && <button onClick={() => addSTG(selPt.id, g.id)} className="text-xs text-slate-400">+ STG</button>}</div>)}<h4 className="text-sm font-medium text-slate-700 mt-4">Sign-offs</h4><div className="grid grid-cols-4 gap-2">{[{ k: 'parent', l: 'Parent' }, { k: 'socialWorker', l: 'SW' }, { k: 'psychiatry', l: 'Psych' }, { k: 'psychology', l: 'Psychol' }, { k: 'aba', l: 'ABA' }, { k: 'slp', l: 'SLP' }, { k: 'ot', l: 'OT' }].map(r => { const s = selPt.itp.signoffs[r.k].signed; return <button key={r.k} onClick={() => toggleSign(selPt.id, r.k)} disabled={selPt.itp.finalized} className={`p-2 rounded-lg text-left ${s ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'} ${selPt.itp.finalized ? 'opacity-60' : ''}`}><div className="flex items-center gap-1.5"><div className={`w-4 h-4 rounded-full flex items-center justify-center ${s ? 'bg-emerald-500' : 'bg-slate-200'}`}>{s && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}</div><span className={`text-xs ${s ? 'text-emerald-700' : 'text-slate-500'}`}>{r.l}</span></div></button>; })}</div>{!selPt.itp.finalized && allSigned(selPt) && <button onClick={() => finalize(selPt.id)} className="w-full py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl mt-4"><Lock className="w-4 h-4 inline mr-1" />Finalize</button>}{selPt.itp.finalized && <button onClick={() => unlock(selPt.id)} className="w-full py-2.5 bg-slate-100 text-slate-600 text-sm font-medium rounded-xl mt-4"><AlertCircle className="w-4 h-4 inline mr-1" />Unlock</button>}</div>}
                  {section === 'treatment' && <div>{selPt.treatmentStartDate ? <div className="p-6 bg-emerald-50 rounded-xl text-center"><Heart className="w-8 h-8 text-emerald-500 mx-auto mb-2" /><p className="text-emerald-700 font-medium">Started {selPt.treatmentStartDate}</p></div> : getPhase(selPt).label === "Ready" ? <button onClick={() => updatePt(selPt.id, { treatmentStartDate: new Date().toISOString().split('T')[0] })} className="w-full py-3 bg-emerald-500 text-white font-medium rounded-xl">Start Treatment</button> : <div className="p-6 bg-slate-50 rounded-xl text-center text-slate-400 text-sm">Complete ITP first</div>}</div>}
                </div>
              </div>
            )}

            {view === 'meetings' && selMt && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                  <div><h2 className="text-xl font-semibold text-slate-800">{selMt.type || 'MDT Meeting'}</h2><p className="text-slate-400 text-sm">{selMt.patientName}</p></div>
                  <div className="flex items-center gap-2">
                    <select value={selMt.status} onChange={e => updateMt(selMt.id, { status: e.target.value })} className={`px-3 py-1.5 rounded-full text-xs font-medium border-0 ${selMt.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}><option>Scheduled</option><option>Completed</option><option>Cancelled</option></select>
                    <button onClick={() => deleteMt(selMt.id)} className="p-1.5 rounded-full hover:bg-red-50"><X className="w-4 h-4 text-slate-400 hover:text-red-500" /></button>
                  </div>
                </div>
                <div className="p-5 max-h-[calc(100vh-220px)] overflow-auto">
                  <Section title="Meeting Details" icon={Calendar}>
                    <div className="grid grid-cols-3 gap-3">
                      <Input label="Date" type="date" value={selMt.date} onChange={v => updateMt(selMt.id, { date: v })} />
                      <Input label="Time" type="time" value={selMt.time} onChange={v => updateMt(selMt.id, { time: v })} />
                      <Select label="Type" value={selMt.type} onChange={v => updateMt(selMt.id, { type: v })} options={meetingTypes} />
                      <Select label="Frequency" value={selMt.frequency} onChange={v => updateMt(selMt.id, { frequency: v })} options={frequencies} />
                      <Input label="Location" value={selMt.location} onChange={v => updateMt(selMt.id, { location: v })} />
                      <Input label="Facilitator" value={selMt.facilitator} onChange={v => updateMt(selMt.id, { facilitator: v })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                      <Input label="Next Meeting Date" type="date" value={selMt.nextDate} onChange={v => updateMt(selMt.id, { nextDate: v })} />
                      <Select label="Next Meeting Type" value={selMt.nextType} onChange={v => updateMt(selMt.id, { nextType: v })} options={frequencies} />
                    </div>
                  </Section>

                  <Section title="Administrative Review" icon={UserCheck}>
                    <div className="grid grid-cols-2 gap-3">
                      <TextArea label="Attendees" value={selMt.attendees} onChange={v => updateMt(selMt.id, { attendees: v })} placeholder="List attendees..." />
                      <TextArea label="Notes on Absences" value={selMt.absenceNotes} onChange={v => updateMt(selMt.id, { absenceNotes: v })} placeholder="Note any absences..." />
                      <TextArea label="Safeguarding Concerns" value={selMt.safeguardingConcerns} onChange={v => updateMt(selMt.id, { safeguardingConcerns: v })} placeholder="Any safeguarding concerns..." />
                      <TextArea label="Review of Previous Action Items" value={selMt.previousActionReview} onChange={v => updateMt(selMt.id, { previousActionReview: v })} placeholder="Status of previous actions..." />
                    </div>
                  </Section>

                  <Section title="Case-by-Case Review" icon={ClipboardList}>
                    <div className="space-y-3">
                      {disciplines.map(d => (
                        <div key={d} className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm font-medium text-slate-700 mb-2">{d}</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div><label className="text-xs text-slate-400">Key Updates</label><textarea value={selMt.caseReview?.[d]?.updates || ''} onChange={e => updateCaseReview(selMt.id, d, 'updates', e.target.value)} className="w-full mt-1 p-2 bg-white rounded text-xs resize-none h-16" /></div>
                            <div><label className="text-xs text-slate-400">Risks/Barriers</label><textarea value={selMt.caseReview?.[d]?.risks || ''} onChange={e => updateCaseReview(selMt.id, d, 'risks', e.target.value)} className="w-full mt-1 p-2 bg-white rounded text-xs resize-none h-16" /></div>
                            <div><label className="text-xs text-slate-400">Required Actions</label><textarea value={selMt.caseReview?.[d]?.actions || ''} onChange={e => updateCaseReview(selMt.id, d, 'actions', e.target.value)} className="w-full mt-1 p-2 bg-white rounded text-xs resize-none h-16" /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <TextArea label="Decisions Made" value={selMt.decisions} onChange={v => updateMt(selMt.id, { decisions: v })} placeholder="Document key decisions..." />
                  </Section>

                  <Section title="School Collaboration" icon={School} defaultOpen={false}>
                    <div className="space-y-3">
                      {disciplines.slice(1).map(d => (
                        <div key={d} className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm font-medium text-slate-700 mb-2">{d}</p>
                          <div className="grid grid-cols-3 gap-2">
                            <div><label className="text-xs text-slate-400">ITP/IEP Alignment</label><textarea value={selMt.schoolCollab?.[d]?.itpAlignment || ''} onChange={e => updateSchoolCollab(selMt.id, d, 'itpAlignment', e.target.value)} className="w-full mt-1 p-2 bg-white rounded text-xs resize-none h-12" /></div>
                            <div><label className="text-xs text-slate-400">Teacher Feedback</label><textarea value={selMt.schoolCollab?.[d]?.teacherFeedback || ''} onChange={e => updateSchoolCollab(selMt.id, d, 'teacherFeedback', e.target.value)} className="w-full mt-1 p-2 bg-white rounded text-xs resize-none h-12" /></div>
                            <div><label className="text-xs text-slate-400">Classroom Support</label><textarea value={selMt.schoolCollab?.[d]?.classroomNeeds || ''} onChange={e => updateSchoolCollab(selMt.id, d, 'classroomNeeds', e.target.value)} className="w-full mt-1 p-2 bg-white rounded text-xs resize-none h-12" /></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section title="Action Items" icon={CheckCircle2}>
                    <div className="flex justify-end mb-3"><button onClick={() => addAction(selMt.id)} className="text-xs text-slate-500 flex items-center gap-1"><Plus className="w-3 h-3" />Add Action</button></div>
                    {(!selMt.actionItems || selMt.actionItems.length === 0) ? <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-400 text-sm">No action items</div> : (
                      <div className="space-y-2">{selMt.actionItems.map(a => (
                        <div key={a.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="flex gap-2">
                            <input value={a.action} onChange={e => updateAction(selMt.id, a.id, 'action', e.target.value)} placeholder="Action..." className="flex-1 px-2 py-1.5 bg-white rounded text-xs" />
                            <input value={a.owner} onChange={e => updateAction(selMt.id, a.id, 'owner', e.target.value)} placeholder="Owner" className="w-24 px-2 py-1.5 bg-white rounded text-xs" />
                            <input type="date" value={a.deadline} onChange={e => updateAction(selMt.id, a.id, 'deadline', e.target.value)} className="px-2 py-1.5 bg-white rounded text-xs" />
                            <select value={a.status} onChange={e => updateAction(selMt.id, a.id, 'status', e.target.value)} className={`px-2 py-1.5 rounded text-xs ${a.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-white'}`}><option>Pending</option><option>Completed</option></select>
                          </div>
                        </div>
                      ))}</div>
                    )}
                  </Section>

                  {(selMt.type === 'Program Review' || selMt.frequency?.includes('Monthly')) && (
                    <Section title="Monthly KPIs" icon={BarChart3} defaultOpen={false}>
                      <div className="space-y-2">
                        {(selMt.kpis || kpiList.map(k => ({ ...k, current: '', notes: '' }))).map((kpi, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg flex items-center gap-3">
                            <div className="flex-1"><p className="text-xs font-medium text-slate-700">{kpi.name}</p><p className="text-xs text-slate-400">Target: {kpi.target}</p></div>
                            <input value={kpi.current || ''} onChange={e => updateKpi(selMt.id, i, 'current', e.target.value)} placeholder="Current" className="w-20 px-2 py-1.5 bg-white rounded text-xs" />
                            <input value={kpi.notes || ''} onChange={e => updateKpi(selMt.id, i, 'notes', e.target.value)} placeholder="Notes" className="w-32 px-2 py-1.5 bg-white rounded text-xs" />
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {(selMt.type === 'Family Advisory Council' || selMt.frequency === 'Quarterly') && (
                    <Section title="Quarterly Review" icon={Building2} defaultOpen={false}>
                      <div className="space-y-2">
                        {(selMt.quarterlyReview || quarterlyAreas.map(a => ({ area: a, summary: '', recommendations: '' }))).map((q, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg">
                            <p className="text-xs font-medium text-slate-700 mb-2">{q.area}</p>
                            <div className="grid grid-cols-2 gap-2">
                              <div><label className="text-xs text-slate-400">Summary</label><textarea value={q.summary || ''} onChange={e => updateQuarterly(selMt.id, i, 'summary', e.target.value)} className="w-full mt-1 p-2 bg-white rounded text-xs resize-none h-12" /></div>
                              <div><label className="text-xs text-slate-400">Recommendations</label><textarea value={q.recommendations || ''} onChange={e => updateQuarterly(selMt.id, i, 'recommendations', e.target.value)} className="w-full mt-1 p-2 bg-white rounded text-xs resize-none h-12" /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><div className="p-5 border-b border-slate-100"><h3 className="text-lg font-semibold">New Patient</h3></div><div className="p-5 space-y-3"><Input label="Case ID *" value={newPt.caseId} onChange={v => setNewPt({ ...newPt, caseId: v })} placeholder="BM-001" /><div className="grid grid-cols-2 gap-3"><Input label="First Name" value={newPt.firstName} onChange={v => setNewPt({ ...newPt, firstName: v })} /><Input label="Last Name" value={newPt.lastName} onChange={v => setNewPt({ ...newPt, lastName: v })} /></div><Input label="Diagnosis" value={newPt.primaryDx} onChange={v => setNewPt({ ...newPt, primaryDx: v })} placeholder="ASD Level 2" /></div><div className="p-5 bg-slate-50 flex gap-3"><button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-white text-slate-600 font-medium rounded-xl text-sm">Cancel</button><button onClick={addPatient} disabled={!newPt.caseId} className="flex-1 py-2.5 bg-slate-900 text-white font-medium rounded-xl text-sm disabled:opacity-50">Add</button></div></div></div>}

      {showAddMt && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><div className="p-5 border-b border-slate-100"><h3 className="text-lg font-semibold">New MDT Meeting</h3></div><div className="p-5 space-y-3"><div><label className="text-xs font-medium text-slate-400 uppercase">Patient *</label><select value={newMt.patientId} onChange={e => setNewMt({ ...newMt, patientId: e.target.value })} className="w-full mt-1 p-2.5 bg-slate-50 border-0 rounded-lg text-sm"><option value="">Select patient...</option>{patients.map(p => <option key={p.id} value={p.id}>{p.caseId} - {p.firstName} {p.lastName}</option>)}</select></div><Select label="Meeting Type" value={newMt.type} onChange={v => setNewMt({ ...newMt, type: v })} options={meetingTypes} /><Select label="Frequency" value={newMt.frequency} onChange={v => setNewMt({ ...newMt, frequency: v })} options={frequencies} /><div className="grid grid-cols-2 gap-3"><Input label="Date *" type="date" value={newMt.date} onChange={v => setNewMt({ ...newMt, date: v })} /><Input label="Time" type="time" value={newMt.time} onChange={v => setNewMt({ ...newMt, time: v })} /></div></div><div className="p-5 bg-slate-50 flex gap-3"><button onClick={() => setShowAddMt(false)} className="flex-1 py-2.5 bg-white text-slate-600 font-medium rounded-xl text-sm">Cancel</button><button onClick={addMeeting} disabled={!newMt.patientId || !newMt.date} className="flex-1 py-2.5 bg-slate-900 text-white font-medium rounded-xl text-sm disabled:opacity-50">Add</button></div></div></div>}
    </div>
  );
}

const CheckCircle2 = ({ className }) => <Check className={className} />;
