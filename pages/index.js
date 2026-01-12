import { useState, useEffect } from 'react';
import { ChevronRight, Plus, X, Check, Lock, Eye, AlertCircle, RefreshCw, User, Calendar, FileText, Activity, Heart, Users, Clock } from 'lucide-react';

const SUPABASE_URL = 'https://igkwugfefllkutthnjwi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlna3d1Z2ZlZmxsa3V0dGhuandpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNTUxMTIsImV4cCI6MjA4MzczMTExMn0.w9vE39YSYiwGRl9saT9pUpde57XMTTyUjDw-v2sc12o';

const supabase = {
  from: (table) => ({
    select: async () => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=id.desc`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    insert: async (rows) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(rows)
      });
      const data = await res.json();
      return { data, error: res.ok ? null : data };
    },
    update: (row) => ({
      eq: async (col, val) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, {
          method: 'PATCH',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(row)
        });
        const data = await res.json();
        return { data, error: res.ok ? null : data };
      }
    }),
    delete: () => ({
      eq: async (col, val) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${val}`, {
          method: 'DELETE',
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        return { error: res.ok ? null : 'Delete failed' };
      }
    })
  })
};

const diagAssess = { ABA: ['FBA', 'ADOS-2', 'VB-MAPP', 'ABLLS-R', 'AFLS', 'Paired Choice', 'Vineland-3'], Psychiatry: ['DSM-5 Criteria', 'ADOS-2', 'Medical Review', 'Mental Status Exam'], Psychology: ['ADOS-2', 'ADI-R', 'WISC-V/WPPSI-IV', 'CBCL', 'ABAS-3'], SLP: ['CELF-5', 'PLS-5', 'PPVT-4', 'EVT-3', 'GFTA-3'], OT: ['Sensory Profile', 'PM-2', 'BOT-2', 'PDMS-2', 'GAS Baseline'] };
const swAssess = ['SES Assessment', 'Eco-Map', 'Genogram', 'Family Needs', 'CANS'];
const itpDisc = ['Psychiatry', 'Psychology', 'ABA', 'SLP', 'OT', 'Social Work'];
const meetingTypes = ['Team Huddle', 'Case Review', 'Program Review', 'Clinical Supervision', 'Family Council'];
const emptyITP = () => ({ goals: [], signoffs: { parent: { signed: false, date: '' }, socialWorker: { signed: false, date: '' }, psychiatry: { signed: false, date: '' }, psychology: { signed: false, date: '' }, aba: { signed: false, date: '' }, slp: { signed: false, date: '' }, ot: { signed: false, date: '' } }, finalized: false, finalizedDate: '', editRequests: [] });

const toDb = (p) => ({ case_id: p.caseId, first_name: p.firstName, last_name: p.lastName, dob: p.dob || null, parent_name: p.parentName, insurance: p.insurance, primary_dx: p.primaryDx, parent_intake_complete: p.parentIntakeComplete, diagnostic_assessments: p.diagnosticAssessments, social_work_assessments: p.socialWorkAssessments, itp: p.itp, treatment_start_date: p.treatmentStartDate || null });
const fromDb = (r) => ({ id: r.id, caseId: r.case_id, firstName: r.first_name || '', lastName: r.last_name || '', dob: r.dob || '', parentName: r.parent_name || '', insurance: r.insurance || '', primaryDx: r.primary_dx || '', parentIntakeComplete: r.parent_intake_complete || false, diagnosticAssessments: r.diagnostic_assessments || { ABA: [], Psychiatry: [], Psychology: [], SLP: [], OT: [] }, socialWorkAssessments: r.social_work_assessments || [], itp: r.itp || emptyITP(), treatmentStartDate: r.treatment_start_date || null });

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState('patients');
  const [selectedPt, setSelectedPt] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [activeSection, setActiveSection] = useState('info');
  const [showAdd, setShowAdd] = useState(false);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [newPt, setNewPt] = useState({ caseId: '', firstName: '', lastName: '', dob: '', primaryDx: '' });
  const [newMeeting, setNewMeeting] = useState({ patientId: '', date: '', time: '', type: '', notes: '' });

  const loadData = async () => {
    setLoading(true);
    const { data: pData } = await supabase.from('patients').select();
    if (pData) setPatients(pData.map(fromDb));
    const storedMeetings = typeof window !== 'undefined' ? localStorage.getItem('brightminds-meetings') : null;
    if (storedMeetings) setMeetings(JSON.parse(storedMeetings));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const saveMeetings = (m) => {
    setMeetings(m);
    if (typeof window !== 'undefined') localStorage.setItem('brightminds-meetings', JSON.stringify(m));
  };

  const savePatient = async (pt) => {
    setSaving(true);
    await supabase.from('patients').update(toDb(pt)).eq('id', pt.id);
    setSaving(false);
  };

  const getPhase = (p) => {
    if (p.treatmentStartDate) return { label: "Treatment", color: "emerald" };
    const diagDone = p.parentIntakeComplete && Object.values(p.diagnosticAssessments).flat().length === Object.values(diagAssess).flat().length;
    if (!diagDone) return { label: "Diagnostic", color: "amber" };
    if (p.socialWorkAssessments.length < swAssess.length) return { label: "Assessment", color: "blue" };
    const allSigned = Object.values(p.itp.signoffs).every(s => s.signed);
    return (p.itp.finalized || allSigned) ? { label: "Ready", color: "indigo" } : { label: "ITP", color: "violet" };
  };

  const getProgress = (p) => {
    const phase = getPhase(p).label;
    if (phase === "Diagnostic") return Math.round(((Object.values(p.diagnosticAssessments).flat().length + (p.parentIntakeComplete ? 1 : 0)) / (Object.values(diagAssess).flat().length + 1)) * 100);
    if (phase === "Assessment") return Math.round((p.socialWorkAssessments.length / swAssess.length) * 100);
    if (phase === "ITP") return Math.round((Object.values(p.itp.signoffs).filter(s => s.signed).length / 7) * 100);
    return 100;
  };

  const updatePt = async (id, u) => {
    const updated = patients.map(p => p.id === id ? { ...p, ...u } : p);
    setPatients(updated);
    const pt = updated.find(p => p.id === id);
    if (selectedPt?.id === id) setSelectedPt(pt);
    await savePatient(pt);
  };

  const toggleDiag = async (id, disc, a) => {
    const updated = patients.map(p => p.id === id ? { ...p, diagnosticAssessments: { ...p.diagnosticAssessments, [disc]: p.diagnosticAssessments[disc].includes(a) ? p.diagnosticAssessments[disc].filter(x => x !== a) : [...p.diagnosticAssessments[disc], a] } } : p);
    setPatients(updated);
    const pt = updated.find(p => p.id === id);
    if (selectedPt?.id === id) setSelectedPt(pt);
    await savePatient(pt);
  };

  const toggleSW = async (id, a) => {
    const updated = patients.map(p => p.id === id ? { ...p, socialWorkAssessments: p.socialWorkAssessments.includes(a) ? p.socialWorkAssessments.filter(x => x !== a) : [...p.socialWorkAssessments, a] } : p);
    setPatients(updated);
    const pt = updated.find(p => p.id === id);
    if (selectedPt?.id === id) setSelectedPt(pt);
    await savePatient(pt);
  };

  const toggleSign = async (id, role) => {
    const pt = patients.find(p => p.id === id);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, signoffs: { ...p.itp.signoffs, [role]: { signed: !p.itp.signoffs[role].signed, date: !p.itp.signoffs[role].signed ? new Date().toISOString().split('T')[0] : '' } } } } : p);
    setPatients(updated);
    const upt = updated.find(p => p.id === id);
    if (selectedPt?.id === id) setSelectedPt(upt);
    await savePatient(upt);
  };

  const finalize = async (id) => {
    const updated = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, finalized: true, finalizedDate: new Date().toISOString().split('T')[0] } } : p);
    setPatients(updated);
    const pt = updated.find(p => p.id === id);
    if (selectedPt?.id === id) setSelectedPt(pt);
    await savePatient(pt);
  };

  const unlock = async (id) => {
    const updated = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, finalized: false, finalizedDate: '', editRequests: [...p.itp.editRequests, { date: new Date().toISOString().split('T')[0], reason: 'Unlocked' }] } } : p);
    setPatients(updated);
    const pt = updated.find(p => p.id === id);
    if (selectedPt?.id === id) setSelectedPt(pt);
    await savePatient(pt);
  };

  const addGoal = async (id) => {
    const pt = patients.find(p => p.id === id);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, goals: [...p.itp.goals, { id: Date.now(), discipline: '', domain: '', longTermGoal: '', shortTermGoals: [{ goal: '', measure: '', criteria: '' }] }] } } : p);
    setPatients(updated);
    const upt = updated.find(p => p.id === id);
    if (selectedPt?.id === id) setSelectedPt(upt);
    await savePatient(upt);
  };

  const updateGoal = async (pId, gId, f, v) => {
    const pt = patients.find(p => p.id === pId);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.map(g => g.id === gId ? { ...g, [f]: v } : g) } } : p);
    setPatients(updated);
    const upt = updated.find(p => p.id === pId);
    if (selectedPt?.id === pId) setSelectedPt(upt);
    await savePatient(upt);
  };

  const removeGoal = async (pId, gId) => {
    const pt = patients.find(p => p.id === pId);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.filter(g => g.id !== gId) } } : p);
    setPatients(updated);
    const upt = updated.find(p => p.id === pId);
    if (selectedPt?.id === pId) setSelectedPt(upt);
    await savePatient(upt);
  };

  const addSTG = async (pId, gId) => {
    const pt = patients.find(p => p.id === pId);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.map(g => g.id === gId ? { ...g, shortTermGoals: [...g.shortTermGoals, { goal: '', measure: '', criteria: '' }] } : g) } } : p);
    setPatients(updated);
    const upt = updated.find(p => p.id === pId);
    if (selectedPt?.id === pId) setSelectedPt(upt);
    await savePatient(upt);
  };

  const updateSTG = async (pId, gId, idx, f, v) => {
    const pt = patients.find(p => p.id === pId);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.map(g => g.id === gId ? { ...g, shortTermGoals: g.shortTermGoals.map((s, i) => i === idx ? { ...s, [f]: v } : s) } : g) } } : p);
    setPatients(updated);
    const upt = updated.find(p => p.id === pId);
    if (selectedPt?.id === pId) setSelectedPt(upt);
    await savePatient(upt);
  };

  const deletePt = async (id) => {
    if (confirm('Delete this patient?')) {
      await supabase.from('patients').delete().eq('id', id);
      setPatients(patients.filter(p => p.id !== id));
      if (selectedPt?.id === id) setSelectedPt(null);
    }
  };

  const addPatient = async () => {
    if (!newPt.caseId) return;
    const pt = { ...newPt, parentIntakeComplete: false, diagnosticAssessments: { ABA: [], Psychiatry: [], Psychology: [], SLP: [], OT: [] }, socialWorkAssessments: [], itp: emptyITP(), treatmentStartDate: null };
    const { data } = await supabase.from('patients').insert([toDb(pt)]);
    if (data) setPatients([fromDb(data[0]), ...patients]);
    setNewPt({ caseId: '', firstName: '', lastName: '', dob: '', primaryDx: '' });
    setShowAdd(false);
  };

  const addMeeting = () => {
    if (!newMeeting.patientId || !newMeeting.date) return;
    const pt = patients.find(p => p.id === parseInt(newMeeting.patientId));
    const meeting = {
      id: Date.now(),
      ...newMeeting,
      patientId: parseInt(newMeeting.patientId),
      patientName: pt ? `${pt.caseId} - ${pt.firstName} ${pt.lastName}` : '',
      status: 'Scheduled',
      actionItems: [],
      notes: ''
    };
    saveMeetings([meeting, ...meetings]);
    setNewMeeting({ patientId: '', date: '', time: '', type: '', notes: '' });
    setShowAddMeeting(false);
  };

  const updateMeeting = (id, updates) => {
    const updated = meetings.map(m => m.id === id ? { ...m, ...updates } : m);
    saveMeetings(updated);
    if (selectedMeeting?.id === id) setSelectedMeeting(updated.find(m => m.id === id));
  };

  const deleteMeeting = (id) => {
    if (confirm('Delete this meeting?')) {
      saveMeetings(meetings.filter(m => m.id !== id));
      if (selectedMeeting?.id === id) setSelectedMeeting(null);
    }
  };

  const addActionItem = (meetingId) => {
    const meeting = meetings.find(m => m.id === meetingId);
    const updated = { ...meeting, actionItems: [...meeting.actionItems, { id: Date.now(), action: '', owner: '', deadline: '', status: 'Pending' }] };
    updateMeeting(meetingId, updated);
  };

  const updateActionItem = (meetingId, actionId, field, value) => {
    const meeting = meetings.find(m => m.id === meetingId);
    const updated = { ...meeting, actionItems: meeting.actionItems.map(a => a.id === actionId ? { ...a, [field]: value } : a) };
    updateMeeting(meetingId, updated);
  };

  const allSigned = (p) => Object.values(p.itp.signoffs).every(s => s.signed);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium tracking-wide">Loading</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Heart className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-800 tracking-tight">Bright Minds</h1>
              </div>
            </div>
            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full">
              <button
                onClick={() => { setActiveView('patients'); setSelectedMeeting(null); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeView === 'patients' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <User className="w-4 h-4 inline mr-1.5" />
                Patients
              </button>
              <button
                onClick={() => { setActiveView('meetings'); setSelectedPt(null); }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${activeView === 'meetings' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users className="w-4 h-4 inline mr-1.5" />
                MDT Meetings
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-slate-400">Saving...</span>}
            <button onClick={loadData} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
            {activeView === 'patients' ? (
              <button onClick={() => setShowAdd(true)} className="h-9 px-4 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-all hover:shadow-lg hover:shadow-slate-900/20 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>New Patient</span>
              </button>
            ) : (
              <button onClick={() => setShowAddMeeting(true)} className="h-9 px-4 bg-slate-900 text-white text-sm font-medium rounded-full hover:bg-slate-800 transition-all hover:shadow-lg hover:shadow-slate-900/20 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>New Meeting</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        {activeView === 'patients' && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total', value: patients.length, color: 'slate' },
              { label: 'Diagnostic', value: patients.filter(p => getPhase(p).label === "Diagnostic").length, color: 'amber' },
              { label: 'Assessment', value: patients.filter(p => getPhase(p).label === "Assessment").length, color: 'blue' },
              { label: 'ITP', value: patients.filter(p => getPhase(p).label === "ITP").length, color: 'violet' },
              { label: 'Treatment', value: patients.filter(p => getPhase(p).label === "Treatment").length, color: 'emerald' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm shadow-slate-200/50 border border-slate-100">
                <p className="text-3xl font-semibold text-slate-800">{s.value}</p>
                <p className="text-sm text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {activeView === 'meetings' && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total Meetings', value: meetings.length, color: 'slate' },
              { label: 'Scheduled', value: meetings.filter(m => m.status === 'Scheduled').length, color: 'blue' },
              { label: 'Completed', value: meetings.filter(m => m.status === 'Completed').length, color: 'emerald' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm shadow-slate-200/50 border border-slate-100">
                <p className="text-3xl font-semibold text-slate-800">{s.value}</p>
                <p className="text-sm text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-6">
          {/* Left Sidebar - List */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-700">{activeView === 'patients' ? 'Patients' : 'Meetings'}</h2>
              </div>
              <div className="divide-y divide-slate-50 max-h-[calc(100vh-320px)] overflow-auto">
                {activeView === 'patients' ? (
                  patients.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <User className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">No patients yet</p>
                    </div>
                  ) : patients.map(pt => {
                    const phase = getPhase(pt);
                    const progress = getProgress(pt);
                    const isSelected = selectedPt?.id === pt.id;
                    return (
                      <div
                        key={pt.id}
                        onClick={() => { setSelectedPt(pt); setActiveSection('info'); }}
                        className={`p-4 cursor-pointer transition-all ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-slate-700">{pt.caseId}</span>
                          <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-slate-600 rotate-90' : 'text-slate-300'}`} />
                        </div>
                        <p className="text-sm text-slate-400 mb-3">{pt.primaryDx || 'No diagnosis'}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${phase.color === 'amber' ? 'bg-amber-400' : phase.color === 'blue' ? 'bg-blue-400' : phase.color === 'violet' ? 'bg-violet-400' : phase.color === 'emerald' ? 'bg-emerald-400' : 'bg-slate-400'}`} style={{ width: `${progress}%` }} />
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${phase.color === 'amber' ? 'bg-amber-50 text-amber-600' : phase.color === 'blue' ? 'bg-blue-50 text-blue-600' : phase.color === 'violet' ? 'bg-violet-50 text-violet-600' : phase.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>{phase.label}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  meetings.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Calendar className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400">No meetings scheduled</p>
                    </div>
                  ) : meetings.map(m => {
                    const isSelected = selectedMeeting?.id === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMeeting(m)}
                        className={`p-4 cursor-pointer transition-all ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-slate-700">{m.type || 'Meeting'}</span>
                          <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-slate-600 rotate-90' : 'text-slate-300'}`} />
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{m.patientName}</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-xs text-slate-400">{m.date} {m.time}</span>
                          <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${m.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{m.status}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Detail */}
          <div className="flex-1">
            {activeView === 'patients' && !selectedPt && (
              <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400">Select a patient to view details</p>
              </div>
            )}

            {activeView === 'meetings' && !selectedMeeting && (
              <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400">Select a meeting to view details</p>
              </div>
            )}

            {/* Patient Detail */}
            {activeView === 'patients' && selectedPt && (
              <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-800">{selectedPt.caseId}</h2>
                      <p className="text-slate-400 mt-1">{selectedPt.firstName} {selectedPt.lastName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedPt.itp.finalized && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-sm font-medium">
                          <Lock className="w-3.5 h-3.5" />Finalized
                        </span>
                      )}
                      <button onClick={() => setShowPreview(selectedPt)} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <Eye className="w-4 h-4 text-slate-400" />
                      </button>
                      <button onClick={() => deletePt(selectedPt.id)} className="p-2 rounded-full hover:bg-red-50 transition-colors">
                        <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex border-b border-slate-100">
                  {['info', 'diagnostic', 'assessment', 'itp', 'treatment'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveSection(tab)}
                      className={`flex-1 py-4 text-sm font-medium transition-colors relative capitalize ${activeSection === tab ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {tab === 'itp' ? 'ITP' : tab}
                      {activeSection === tab && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-slate-800 rounded-full" />}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {activeSection === 'info' && (
                    <div className="grid grid-cols-2 gap-4">
                      {[{ label: 'Case ID', value: selectedPt.caseId, key: 'caseId' }, { label: 'Name', value: `${selectedPt.firstName} ${selectedPt.lastName}`, key: 'name' }, { label: 'Date of Birth', value: selectedPt.dob, key: 'dob', type: 'date' }, { label: 'Diagnosis', value: selectedPt.primaryDx, key: 'primaryDx' }].map(field => (
                        <div key={field.key}>
                          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{field.label}</label>
                          <input type={field.type || 'text'} value={field.value} onChange={e => { if (field.key === 'name') { const [f, ...l] = e.target.value.split(' '); updatePt(selectedPt.id, { firstName: f || '', lastName: l.join(' ') || '' }); } else { updatePt(selectedPt.id, { [field.key]: e.target.value }); } }} className="w-full mt-1 p-3 bg-slate-50 border-0 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSection === 'diagnostic' && (
                    <div className="space-y-6">
                      <div onClick={() => updatePt(selectedPt.id, { parentIntakeComplete: !selectedPt.parentIntakeComplete })} className={`p-4 rounded-xl cursor-pointer transition-all ${selectedPt.parentIntakeComplete ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-slate-50 border-2 border-transparent hover:border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${selectedPt.parentIntakeComplete ? 'bg-emerald-500' : 'bg-slate-200'}`}>{selectedPt.parentIntakeComplete && <Check className="w-4 h-4 text-white" strokeWidth={3} />}</div>
                          <span className={`font-medium ${selectedPt.parentIntakeComplete ? 'text-emerald-700' : 'text-slate-600'}`}>Parent Intake Complete</span>
                        </div>
                      </div>
                      {Object.entries(diagAssess).map(([disc, items]) => (
                        <div key={disc}>
                          <h4 className="text-sm font-semibold text-slate-700 mb-3">{disc}</h4>
                          <div className="flex flex-wrap gap-2">
                            {items.map(a => { const done = selectedPt.diagnosticAssessments[disc]?.includes(a); return (<button key={a} onClick={() => toggleDiag(selectedPt.id, disc, a)} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${done ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-slate-50 text-slate-500 border-2 border-transparent hover:border-slate-200'}`}>{done && <Check className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={3} />}{a}</button>); })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeSection === 'assessment' && (
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Social Work Assessments</h4>
                      <div className="flex flex-wrap gap-2">
                        {swAssess.map(a => { const done = selectedPt.socialWorkAssessments.includes(a); return (<button key={a} onClick={() => toggleSW(selectedPt.id, a)} className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${done ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-slate-50 text-slate-500 border-2 border-transparent hover:border-slate-200'}`}>{done && <Check className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={3} />}{a}</button>); })}
                      </div>
                    </div>
                  )}

                  {activeSection === 'itp' && (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-slate-700">Goals</h4>
                          {!selectedPt.itp.finalized && (<button onClick={() => addGoal(selectedPt.id)} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"><Plus className="w-4 h-4" /> Add Goal</button>)}
                        </div>
                        {selectedPt.itp.goals.length === 0 ? (<div className="p-8 bg-slate-50 rounded-xl text-center"><p className="text-slate-400 text-sm">No goals added yet</p></div>) : selectedPt.itp.goals.map(g => (
                          <div key={g.id} className="p-4 bg-slate-50 rounded-xl mb-3">
                            <div className="flex gap-3 mb-3">
                              <select value={g.discipline} onChange={e => updateGoal(selectedPt.id, g.id, 'discipline', e.target.value)} disabled={selectedPt.itp.finalized} className="px-3 py-2 bg-white rounded-lg text-sm border-0 focus:ring-2 focus:ring-slate-200"><option value="">Discipline</option>{itpDisc.map(d => <option key={d} value={d}>{d}</option>)}</select>
                              <input value={g.domain} onChange={e => updateGoal(selectedPt.id, g.id, 'domain', e.target.value)} disabled={selectedPt.itp.finalized} placeholder="Domain" className="flex-1 px-3 py-2 bg-white rounded-lg text-sm border-0 focus:ring-2 focus:ring-slate-200" />
                              {!selectedPt.itp.finalized && (<button onClick={() => removeGoal(selectedPt.id, g.id)} className="p-2 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>)}
                            </div>
                            <textarea value={g.longTermGoal} onChange={e => updateGoal(selectedPt.id, g.id, 'longTermGoal', e.target.value)} disabled={selectedPt.itp.finalized} placeholder="Long Term Goal" className="w-full px-3 py-2 bg-white rounded-lg text-sm border-0 focus:ring-2 focus:ring-slate-200 resize-none h-20 mb-3" />
                            <p className="text-xs font-medium text-slate-400 mb-2">Short Term Goals</p>
                            {g.shortTermGoals.map((stg, idx) => (
                              <div key={idx} className="flex gap-2 mb-2">
                                <input value={stg.goal} onChange={e => updateSTG(selectedPt.id, g.id, idx, 'goal', e.target.value)} disabled={selectedPt.itp.finalized} placeholder="Goal" className="flex-1 px-3 py-2 bg-white rounded-lg text-sm border-0" />
                                <input value={stg.measure} onChange={e => updateSTG(selectedPt.id, g.id, idx, 'measure', e.target.value)} disabled={selectedPt.itp.finalized} placeholder="Measure" className="w-24 px-3 py-2 bg-white rounded-lg text-sm border-0" />
                                <input value={stg.criteria} onChange={e => updateSTG(selectedPt.id, g.id, idx, 'criteria', e.target.value)} disabled={selectedPt.itp.finalized} placeholder="Criteria" className="w-28 px-3 py-2 bg-white rounded-lg text-sm border-0" />
                              </div>
                            ))}
                            {!selectedPt.itp.finalized && (<button onClick={() => addSTG(selectedPt.id, g.id)} className="text-xs text-slate-400 hover:text-slate-600 mt-1">+ Add Short Term Goal</button>)}
                          </div>
                        ))}
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-slate-700 mb-4">Sign-offs</h4>
                        <div className="grid grid-cols-4 gap-3">
                          {[{ k: 'parent', l: 'Parent' }, { k: 'socialWorker', l: 'Social Worker' }, { k: 'psychiatry', l: 'Psychiatry' }, { k: 'psychology', l: 'Psychology' }, { k: 'aba', l: 'ABA' }, { k: 'slp', l: 'SLP' }, { k: 'ot', l: 'OT' }].map(r => {
                            const signed = selectedPt.itp.signoffs[r.k].signed;
                            return (
                              <button key={r.k} onClick={() => toggleSign(selectedPt.id, r.k)} disabled={selectedPt.itp.finalized} className={`p-3 rounded-xl text-left transition-all ${signed ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-slate-50 border-2 border-transparent hover:border-slate-200'} ${selectedPt.itp.finalized ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${signed ? 'bg-emerald-500' : 'bg-slate-200'}`}>{signed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}</div>
                                  <span className={`text-sm font-medium ${signed ? 'text-emerald-700' : 'text-slate-600'}`}>{r.l}</span>
                                </div>
                                {signed && <p className="text-xs text-slate-400 ml-7">{selectedPt.itp.signoffs[r.k].date}</p>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {!selectedPt.itp.finalized && allSigned(selectedPt) && (<button onClick={() => finalize(selectedPt.id)} className="w-full py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"><Lock className="w-4 h-4" />Finalize ITP</button>)}
                      {selectedPt.itp.finalized && (<button onClick={() => unlock(selectedPt.id)} className="w-full py-3 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4" />Request Edit</button>)}
                    </div>
                  )}

                  {activeSection === 'treatment' && (
                    <div>
                      {selectedPt.treatmentStartDate ? (
                        <div className="p-6 bg-emerald-50 rounded-xl text-center">
                          <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-3"><Heart className="w-6 h-6 text-white" /></div>
                          <p className="text-emerald-700 font-medium">Treatment Started</p>
                          <p className="text-emerald-600 text-sm mt-1">{selectedPt.treatmentStartDate}</p>
                        </div>
                      ) : getPhase(selectedPt).label === "Ready" ? (
                        <button onClick={() => updatePt(selectedPt.id, { treatmentStartDate: new Date().toISOString().split('T')[0] })} className="w-full py-4 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors">Start Treatment</button>
                      ) : (
                        <div className="p-6 bg-slate-50 rounded-xl text-center"><p className="text-slate-400">Complete ITP and get all sign-offs first</p></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Meeting Detail */}
            {activeView === 'meetings' && selectedMeeting && (
              <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-800">{selectedMeeting.type || 'Meeting'}</h2>
                      <p className="text-slate-400 mt-1">{selectedMeeting.patientName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={selectedMeeting.status} onChange={e => updateMeeting(selectedMeeting.id, { status: e.target.value })} className={`px-3 py-1.5 rounded-full text-sm font-medium border-0 ${selectedMeeting.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                      <button onClick={() => deleteMeeting(selectedMeeting.id)} className="p-2 rounded-full hover:bg-red-50 transition-colors">
                        <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Date</label>
                      <input type="date" value={selectedMeeting.date} onChange={e => updateMeeting(selectedMeeting.id, { date: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 border-0 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Time</label>
                      <input type="time" value={selectedMeeting.time} onChange={e => updateMeeting(selectedMeeting.id, { time: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 border-0 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200" />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Meeting Notes</label>
                    <textarea value={selectedMeeting.notes || ''} onChange={e => updateMeeting(selectedMeeting.id, { notes: e.target.value })} placeholder="Add meeting notes..." className="w-full mt-1 p-3 bg-slate-50 border-0 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none h-32" />
                  </div>

                  {/* Action Items */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-slate-700">Action Items</h4>
                      <button onClick={() => addActionItem(selectedMeeting.id)} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Add Action
                      </button>
                    </div>
                    {(!selectedMeeting.actionItems || selectedMeeting.actionItems.length === 0) ? (
                      <div className="p-6 bg-slate-50 rounded-xl text-center">
                        <p className="text-slate-400 text-sm">No action items yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedMeeting.actionItems.map(action => (
                          <div key={action.id} className="p-4 bg-slate-50 rounded-xl">
                            <div className="flex gap-3 mb-3">
                              <input value={action.action} onChange={e => updateActionItem(selectedMeeting.id, action.id, 'action', e.target.value)} placeholder="Action item..." className="flex-1 px-3 py-2 bg-white rounded-lg text-sm border-0 focus:ring-2 focus:ring-slate-200" />
                              <select value={action.status} onChange={e => updateActionItem(selectedMeeting.id, action.id, 'status', e.target.value)} className={`px-3 py-2 rounded-lg text-sm border-0 ${action.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-600'}`}>
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </div>
                            <div className="flex gap-3">
                              <input value={action.owner} onChange={e => updateActionItem(selectedMeeting.id, action.id, 'owner', e.target.value)} placeholder="Owner" className="flex-1 px-3 py-2 bg-white rounded-lg text-sm border-0" />
                              <input type="date" value={action.deadline} onChange={e => updateActionItem(selectedMeeting.id, action.id, 'deadline', e.target.value)} className="px-3 py-2 bg-white rounded-lg text-sm border-0" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-semibold text-slate-800">New Patient</h3></div>
            <div className="p-6 space-y-4">
              <div><label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Case ID *</label><input type="text" value={newPt.caseId} onChange={e => setNewPt({ ...newPt, caseId: e.target.value })} placeholder="e.g. BM-001" className="w-full mt-1 p-3 bg-slate-50 border-0 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-slate-400 uppercase tracking-wider">First Name</label><input type="text" value={newPt.firstName} onChange={e => setNewPt({ ...newPt, firstName: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 border-0 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200" /></div>
                <div><label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Last Name</label><input type="text" value={newPt.lastName} onChange={e => setNewPt({ ...newPt, lastName: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 border-0 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200" /></div>
              </div>
              <div><label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Diagnosis</label><input type="text" value={newPt.primaryDx} onChange={e => setNewPt({ ...newPt, primaryDx: e.target.value })} placeholder="e.g. ASD Level 2" className="w-full mt-1 p-3 bg-slate-50 border-0 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200" /></div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3 bg-white text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
              <button onClick={addPatient} disabled={!newPt.caseId} className="flex-1 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50">Add Patient</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Meeting Modal */}
      {showAddMeeting && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100"><h3 className="text-lg font-semibold text-slate-800">New Meeting</h3></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Patient *</label>
                <select value={newMeeting.patientId} onChange={e => setNewMeeting({ ...newMeeting, patientId: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 border-0 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200">
                  <option value="">Select patient</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.caseId} - {p.firstName} {p.lastName}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Meeting Type</label>
                <select value={newMeeting.type} onChange={e => setNewMeeting({ ...newMeeting, type: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 border-0 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200">
                  <option value="">Select type</option>
                  {meetingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Date *</label><input type="date" value={newMeeting.date} onChange={e => setNewMeeting({ ...newMeeting, date: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 border-0 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200" /></div>
                <div><label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Time</label><input type="time" value={newMeeting.time} onChange={e => setNewMeeting({ ...newMeeting, time: e.target.value })} className="w-full mt-1 p-3 bg-slate-50 border-0 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200" /></div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button onClick={() => setShowAddMeeting(false)} className="flex-1 py-3 bg-white text-slate-600 font-medium rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
              <button onClick={addMeeting} disabled={!newMeeting.patientId || !newMeeting.date} className="flex-1 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50">Add Meeting</button>
            </div>
          </div>
        </div>
      )}
      {showPreview && <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"><div className="p-6 border-b border-slate-100 flex justify-between"><h3 className="text-lg font-semibold text-slate-800">Summary</h3><button onClick={() => setShowPreview(null)} className="p-2 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button></div><div className="p-6 space-y-4"><p className="font-medium text-slate-700">{showPreview.caseId} — {showPreview.firstName} {showPreview.lastName}</p><p className="text-sm text-slate-500">DOB: {showPreview.dob || 'N/A'} | Dx: {showPreview.primaryDx || 'N/A'}</p><div className="flex items-center gap-2"><span className="text-sm text-slate-500">Phase:</span><span className={`px-3 py-1 rounded-full text-sm font-medium ${phaseBadge(getPhase(showPreview).color)}`}>{getPhase(showPreview).label}</span></div><div className="text-sm text-slate-600 space-y-1"><p>Diagnostics: {Object.values(showPreview.diagnosticAssessments).flat().length}/{Object.values(diagAssess).flat().length}</p><p>SW: {showPreview.socialWorkAssessments.length}/{swAssess.length}</p><p>Goals: {showPreview.itp.goals.length}</p><p>Sign-offs: {Object.values(showPreview.itp.signoffs).filter(s => s.signed).length}/7</p></div></div></div></div>}
    </div>
  );
}
