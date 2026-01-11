import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, UserPlus, X, CheckCircle, Circle, Plus, Trash2, Lock, Eye, AlertCircle, Save, Loader, RefreshCw } from 'lucide-react';

const SUPABASE_URL = 'https://igkwugfefllkutthnjwi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlna3d1Z2ZlZmxsa3V0dGhuandpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNTUxMTIsImV4cCI6MjA4MzczMTExMn0.w9vE39YSYiwGRl9saT9pUpde57XMTTyUjDw-v2sc12o';

const supabase = {
  from: (table) => ({
    select: async () => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
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
const emptyITP = () => ({ goals: [], signoffs: { parent: { signed: false, date: '' }, socialWorker: { signed: false, date: '' }, psychiatry: { signed: false, date: '' }, psychology: { signed: false, date: '' }, aba: { signed: false, date: '' }, slp: { signed: false, date: '' }, ot: { signed: false, date: '' } }, finalized: false, finalizedDate: '', editRequests: [] });

const toDb = (p) => ({
  case_id: p.caseId,
  first_name: p.firstName,
  last_name: p.lastName,
  dob: p.dob || null,
  parent_name: p.parentName,
  insurance: p.insurance,
  primary_dx: p.primaryDx,
  parent_intake_complete: p.parentIntakeComplete,
  diagnostic_assessments: p.diagnosticAssessments,
  social_work_assessments: p.socialWorkAssessments,
  itp: p.itp,
  treatment_start_date: p.treatmentStartDate || null
});

const fromDb = (r) => ({
  id: r.id,
  caseId: r.case_id,
  firstName: r.first_name || '',
  lastName: r.last_name || '',
  dob: r.dob || '',
  parentName: r.parent_name || '',
  insurance: r.insurance || '',
  primaryDx: r.primary_dx || '',
  parentIntakeComplete: r.parent_intake_complete || false,
  diagnosticAssessments: r.diagnostic_assessments || { ABA: [], Psychiatry: [], Psychology: [], SLP: [], OT: [] },
  socialWorkAssessments: r.social_work_assessments || [],
  itp: r.itp || emptyITP(),
  treatmentStartDate: r.treatment_start_date || null
});

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [patientTab, setPatientTab] = useState('info');
  const [phaseFilter, setPhaseFilter] = useState("All");
  const [showPreview, setShowPreview] = useState(null);
  const [showFinalize, setShowFinalize] = useState(null);
  const [editReason, setEditReason] = useState('');
  const [showEditReq, setShowEditReq] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newPt, setNewPt] = useState({ caseId: '', firstName: '', lastName: '', dob: '', parentName: '', insurance: '', primaryDx: '' });

  const loadPatients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('patients').select();
    if (!error && data) setPatients(data.map(fromDb));
    setLoading(false);
  };

  useEffect(() => { loadPatients(); }, []);

  const savePatient = async (pt) => {
    setSaving(true);
    await supabase.from('patients').update(toDb(pt)).eq('id', pt.id);
    setLastSaved(new Date().toLocaleTimeString());
    setSaving(false);
  };

  const getPhase = (p) => {
    if (p.treatmentStartDate) return "Treatment";
    const diagDone = p.parentIntakeComplete && Object.values(p.diagnosticAssessments).flat().length === Object.values(diagAssess).flat().length;
    if (!diagDone) return "Diagnostic";
    if (p.socialWorkAssessments.length < swAssess.length) return "Assessment";
    const allSigned = Object.values(p.itp.signoffs).every(s => s.signed);
    return (p.itp.finalized || allSigned) ? "Ready for Treatment" : "ITP Development";
  };

  const phaseColors = { "Diagnostic": "bg-amber-100 text-amber-800", "Assessment": "bg-blue-100 text-blue-800", "ITP Development": "bg-purple-100 text-purple-800", "Ready for Treatment": "bg-indigo-100 text-indigo-800", "Treatment": "bg-green-100 text-green-800" };
  const phaseDots = { "Diagnostic": "bg-amber-500", "Assessment": "bg-blue-500", "ITP Development": "bg-purple-500", "Ready for Treatment": "bg-indigo-500", "Treatment": "bg-green-500" };

  const getDiagProg = (p) => Math.round(((Object.values(p.diagnosticAssessments).flat().length + (p.parentIntakeComplete ? 1 : 0)) / (Object.values(diagAssess).flat().length + 1)) * 100);
  const getSWProg = (p) => Math.round((p.socialWorkAssessments.length / swAssess.length) * 100);
  const getITPProg = (p) => Math.round((Object.values(p.itp.signoffs).filter(s => s.signed).length / 7) * 100);
  const allSigned = (p) => Object.values(p.itp.signoffs).every(s => s.signed);

  const stats = { total: patients.length, diagnostic: patients.filter(p => getPhase(p) === "Diagnostic").length, assessment: patients.filter(p => getPhase(p) === "Assessment").length, itp: patients.filter(p => getPhase(p) === "ITP Development").length, treatment: patients.filter(p => getPhase(p) === "Treatment").length };
  const filtered = phaseFilter === "All" ? patients : patients.filter(p => getPhase(p) === phaseFilter);

  const updatePt = async (id, u) => {
    const updated = patients.map(p => p.id === id ? { ...p, ...u } : p);
    setPatients(updated);
    const pt = updated.find(p => p.id === id);
    await savePatient(pt);
  };

  const toggleDiag = async (id, disc, a) => {
    const updated = patients.map(p => p.id === id ? { ...p, diagnosticAssessments: { ...p.diagnosticAssessments, [disc]: p.diagnosticAssessments[disc].includes(a) ? p.diagnosticAssessments[disc].filter(x => x !== a) : [...p.diagnosticAssessments[disc], a] } } : p);
    setPatients(updated);
    await savePatient(updated.find(p => p.id === id));
  };

  const toggleSW = async (id, a) => {
    const updated = patients.map(p => p.id === id ? { ...p, socialWorkAssessments: p.socialWorkAssessments.includes(a) ? p.socialWorkAssessments.filter(x => x !== a) : [...p.socialWorkAssessments, a] } : p);
    setPatients(updated);
    await savePatient(updated.find(p => p.id === id));
  };

  const toggleSign = async (id, role) => {
    const pt = patients.find(p => p.id === id);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, signoffs: { ...p.itp.signoffs, [role]: { signed: !p.itp.signoffs[role].signed, date: !p.itp.signoffs[role].signed ? new Date().toISOString().split('T')[0] : '' } } } } : p);
    setPatients(updated);
    await savePatient(updated.find(p => p.id === id));
  };

  const finalize = async (id) => {
    const updated = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, finalized: true, finalizedDate: new Date().toISOString().split('T')[0] } } : p);
    setPatients(updated);
    await savePatient(updated.find(p => p.id === id));
    setShowFinalize(null);
  };

  const reqEdit = async (id, reason) => {
    const updated = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, editRequests: [...p.itp.editRequests, { date: new Date().toISOString().split('T')[0], reason }] } } : p);
    setPatients(updated);
    await savePatient(updated.find(p => p.id === id));
    setShowEditReq(null);
    setEditReason('');
  };

  const unlock = async (id) => {
    const updated = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, finalized: false, finalizedDate: '' } } : p);
    setPatients(updated);
    await savePatient(updated.find(p => p.id === id));
  };

  const addGoal = async (id) => {
    const pt = patients.find(p => p.id === id);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === id ? { ...p, itp: { ...p.itp, goals: [...p.itp.goals, { id: Date.now(), discipline: '', domain: '', longTermGoal: '', shortTermGoals: [{ goal: '', measure: '', criteria: '' }] }] } } : p);
    setPatients(updated);
    await savePatient(updated.find(p => p.id === id));
  };

  const updateGoal = async (pId, gId, f, v) => {
    const pt = patients.find(p => p.id === pId);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.map(g => g.id === gId ? { ...g, [f]: v } : g) } } : p);
    setPatients(updated);
    await savePatient(updated.find(p => p.id === pId));
  };

  const removeGoal = async (pId, gId) => {
    const pt = patients.find(p => p.id === pId);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.filter(g => g.id !== gId) } } : p);
    setPatients(updated);
    await savePatient(updated.find(p => p.id === pId));
  };

  const addSTG = async (pId, gId) => {
    const pt = patients.find(p => p.id === pId);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.map(g => g.id === gId ? { ...g, shortTermGoals: [...g.shortTermGoals, { goal: '', measure: '', criteria: '' }] } : g) } } : p);
    setPatients(updated);
    await savePatient(updated.find(p => p.id === pId));
  };

  const updateSTG = async (pId, gId, idx, f, v) => {
    const pt = patients.find(p => p.id === pId);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.map(g => g.id === gId ? { ...g, shortTermGoals: g.shortTermGoals.map((s, i) => i === idx ? { ...s, [f]: v } : s) } : g) } } : p);
    setPatients(updated);
    await savePatient(updated.find(p => p.id === pId));
  };

  const removeSTG = async (pId, gId, idx) => {
    const pt = patients.find(p => p.id === pId);
    if (pt.itp.finalized) return;
    const updated = patients.map(p => p.id === pId ? { ...p, itp: { ...p.itp, goals: p.itp.goals.map(g => g.id === gId ? { ...g, shortTermGoals: g.shortTermGoals.filter((_, i) => i !== idx) } : g) } } : p);
    setPatients(updated);
    await savePatient(updated.find(p => p.id === pId));
  };

  const deletePt = async (id) => {
    if (confirm('Delete this patient?')) {
      await supabase.from('patients').delete().eq('id', id);
      setPatients(patients.filter(p => p.id !== id));
    }
  };

  const addPatient = async () => {
    if (!newPt.caseId) return;
    const pt = { ...newPt, parentIntakeComplete: false, diagnosticAssessments: { ABA: [], Psychiatry: [], Psychology: [], SLP: [], OT: [] }, socialWorkAssessments: [], itp: emptyITP(), treatmentStartDate: null };
    const { data, error } = await supabase.from('patients').insert([toDb(pt)]);
    if (!error && data) {
      setPatients([...patients, fromDb(data[0])]);
    }
    setNewPt({ caseId: '', firstName: '', lastName: '', dob: '', parentName: '', insurance: '', primaryDx: '' });
    setShowAdd(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-indigo-600" /><span className="ml-2">Loading...</span></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-3">
          <div><h1 className="text-xl font-bold text-gray-900">Bright Minds Pilot</h1><p className="text-gray-500 text-xs">Social Worker Dashboard</p></div>
          <div className="flex items-center gap-2">
            <button onClick={loadPatients} className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600"><RefreshCw className="w-3 h-3" />Refresh</button>
            <div className="text-xs text-gray-500">{saving ? <><Loader className="w-3 h-3 animate-spin inline" /> Saving...</> : lastSaved && <><Save className="w-3 h-3 text-green-600 inline" /> Saved {lastSaved}</>}</div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3 text-xs text-green-800">
          <strong>✓ Shared Database:</strong> All team members see the same data. Use case IDs (e.g., BM-001) for privacy.
        </div>

        <div className="grid grid-cols-5 gap-2 mb-3">
          {[{l:'Total',v:stats.total,c:'bg-gray-500'},{l:'Diagnostic',v:stats.diagnostic,c:'bg-amber-500'},{l:'Assessment',v:stats.assessment,c:'bg-blue-500'},{l:'ITP',v:stats.itp,c:'bg-purple-500'},{l:'Treatment',v:stats.treatment,c:'bg-green-500'}].map(s => (
            <div key={s.l} className="bg-white rounded-lg p-2 shadow-sm border"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${s.c}`}></div><div><p className="text-lg font-bold">{s.v}</p><p className="text-xs text-gray-500">{s.l}</p></div></div></div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-1 flex-wrap">{["All", "Diagnostic", "Assessment", "ITP Development", "Ready for Treatment", "Treatment"].map(s => (<button key={s} onClick={() => setPhaseFilter(s)} className={`px-2 py-1 rounded-full text-xs font-medium ${phaseFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}>{s}</button>))}</div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium"><UserPlus className="w-3 h-3" />Add Patient</button>
        </div>

        {showAdd && (
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-3">
            <div className="flex justify-between items-center mb-3"><p className="font-semibold">Add New Patient</p><button onClick={() => setShowAdd(false)}><X className="w-4 h-4" /></button></div>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <input type="text" value={newPt.caseId} onChange={e => setNewPt({...newPt, caseId: e.target.value})} placeholder="Case ID (e.g. BM-002) *" className="border rounded-lg p-2 text-sm" />
              <input type="text" value={newPt.firstName} onChange={e => setNewPt({...newPt, firstName: e.target.value})} placeholder="First Name/Initial" className="border rounded-lg p-2 text-sm" />
              <input type="text" value={newPt.lastName} onChange={e => setNewPt({...newPt, lastName: e.target.value})} placeholder="Last Name/Initial" className="border rounded-lg p-2 text-sm" />
              <input type="text" value={newPt.primaryDx} onChange={e => setNewPt({...newPt, primaryDx: e.target.value})} placeholder="Primary Diagnosis" className="border rounded-lg p-2 text-sm" />
            </div>
            <button onClick={addPatient} disabled={!newPt.caseId} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">Add Patient</button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border">
          {filtered.length === 0 ? <p className="text-center py-8 text-gray-500">No patients yet. Add your first patient above!</p> : filtered.map(pt => {
            const phase = getPhase(pt);
            const locked = pt.itp.finalized;
            return (
              <div key={pt.id} className="border-b last:border-b-0">
                <div className="p-2 cursor-pointer hover:bg-gray-50" onClick={() => { setExpandedId(expandedId === pt.id ? null : pt.id); setPatientTab('info'); }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className={`w-1.5 h-6 rounded-full ${phaseDots[phase]}`}></div><div><p className="font-semibold text-sm">{pt.caseId} {pt.firstName && `- ${pt.firstName} ${pt.lastName}`}</p><p className="text-xs text-gray-500">{pt.primaryDx}</p></div></div>
                    <div className="flex items-center gap-2">{locked && <Lock className="w-3 h-3 text-green-600" />}<span className={`px-2 py-0.5 rounded-full text-xs font-medium ${phaseColors[phase]}`}>{phase}</span>{expandedId === pt.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}</div>
                  </div>
                </div>
                {expandedId === pt.id && (
                  <div className="px-2 pb-2 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex gap-1">{['info','diagnostic','assessment','itp','treatment'].map(t => (<button key={t} onClick={e => { e.stopPropagation(); setPatientTab(t); }} className={`px-2 py-1 rounded text-xs font-medium capitalize ${patientTab === t ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}>{t === 'itp' ? 'ITP' : t}</button>))}</div>
                      <button onClick={e => { e.stopPropagation(); deletePt(pt.id); }} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                    
                    {patientTab === 'info' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-500">Case ID</p><input type="text" value={pt.caseId} onChange={e => updatePt(pt.id, {caseId: e.target.value})} onClick={e => e.stopPropagation()} className="text-sm w-full font-medium focus:outline-none" /></div>
                        <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-500">Name</p><input type="text" value={`${pt.firstName} ${pt.lastName}`} onChange={e => { const [f,...l] = e.target.value.split(' '); updatePt(pt.id, {firstName: f || '', lastName: l.join(' ') || ''}); }} onClick={e => e.stopPropagation()} className="text-sm w-full font-medium focus:outline-none" /></div>
                        <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-500">DOB</p><input type="date" value={pt.dob} onChange={e => updatePt(pt.id, {dob: e.target.value})} onClick={e => e.stopPropagation()} className="text-sm w-full font-medium focus:outline-none" /></div>
                        <div className="bg-white p-2 rounded border"><p className="text-xs text-gray-500">Diagnosis</p><input type="text" value={pt.primaryDx} onChange={e => updatePt(pt.id, {primaryDx: e.target.value})} onClick={e => e.stopPropagation()} className="text-sm w-full font-medium focus:outline-none" /></div>
                      </div>
                    )}

                    {patientTab === 'diagnostic' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center"><p className="text-xs font-semibold text-amber-700">DIAGNOSTIC PHASE</p><span className="text-xs">{getDiagProg(pt)}%</span></div>
                        <div className="bg-white p-2 rounded border"><button onClick={e => { e.stopPropagation(); updatePt(pt.id, { parentIntakeComplete: !pt.parentIntakeComplete }); }} className="flex items-center gap-2">{pt.parentIntakeComplete ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-gray-400" />}<span className="text-sm">Parent Intake</span></button></div>
                        {Object.entries(diagAssess).map(([disc, items]) => (
                          <div key={disc} className="bg-white p-2 rounded border"><p className="text-xs font-medium mb-1">{disc}</p><div className="flex flex-wrap gap-1">{items.map(a => { const done = pt.diagnosticAssessments[disc]?.includes(a); return (<button key={a} onClick={e => { e.stopPropagation(); toggleDiag(pt.id, disc, a); }} className={`px-2 py-0.5 rounded text-xs ${done ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{done && '✓ '}{a}</button>); })}</div></div>
                        ))}
                      </div>
                    )}

                    {patientTab === 'assessment' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center"><p className="text-xs font-semibold text-blue-700">ASSESSMENT PHASE</p><span className="text-xs">{getSWProg(pt)}%</span></div>
                        <div className="bg-white p-2 rounded border"><div className="flex flex-wrap gap-1">{swAssess.map(a => { const done = pt.socialWorkAssessments.includes(a); return (<button key={a} onClick={e => { e.stopPropagation(); toggleSW(pt.id, a); }} className={`px-2 py-0.5 rounded text-xs ${done ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{done && '✓ '}{a}</button>); })}</div></div>
                      </div>
                    )}

                    {patientTab === 'itp' && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2"><p className="text-xs font-semibold text-purple-700">ITP</p>{locked && <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded"><Lock className="w-3 h-3" />Finalized</span>}</div>
                          <div className="flex gap-1">
                            <button onClick={e => { e.stopPropagation(); setShowPreview(pt); }} className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"><Eye className="w-3 h-3" />Preview</button>
                            {locked ? <button onClick={e => { e.stopPropagation(); setShowEditReq(pt.id); }} className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs"><AlertCircle className="w-3 h-3" />Request Edit</button> : allSigned(pt) && <button onClick={e => { e.stopPropagation(); setShowFinalize(pt.id); }} className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs"><Lock className="w-3 h-3" />Finalize</button>}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">Sign-offs: {getITPProg(pt)}%</div>
                        {pt.itp.editRequests.length > 0 && <div className="bg-amber-50 p-2 rounded border border-amber-200">{pt.itp.editRequests.map((r, i) => <div key={i} className="text-xs flex justify-between"><span>{r.date}: {r.reason}</span><button onClick={e => { e.stopPropagation(); unlock(pt.id); }} className="text-indigo-600 underline">Unlock</button></div>)}</div>}
                        <div className="bg-white p-2 rounded border">
                          <div className="flex justify-between items-center mb-2"><p className="text-xs font-semibold">Goals</p>{!locked && <button onClick={e => { e.stopPropagation(); addGoal(pt.id); }} className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs"><Plus className="w-3 h-3" />Add</button>}</div>
                          {pt.itp.goals.map(g => (
                            <div key={g.id} className="border rounded p-2 mb-2 bg-gray-50">
                              <div className="flex gap-2 mb-2">
                                <select value={g.discipline} onChange={e => updateGoal(pt.id, g.id, 'discipline', e.target.value)} onClick={e => e.stopPropagation()} disabled={locked} className="text-xs border rounded p-1 disabled:bg-gray-100"><option value="">Discipline</option>{itpDisc.map(d => <option key={d} value={d}>{d}</option>)}</select>
                                <input type="text" value={g.domain} onChange={e => updateGoal(pt.id, g.id, 'domain', e.target.value)} onClick={e => e.stopPropagation()} disabled={locked} placeholder="Domain" className="flex-1 text-xs border rounded p-1 disabled:bg-gray-100" />
                                {!locked && <button onClick={e => { e.stopPropagation(); removeGoal(pt.id, g.id); }} className="text-red-500"><Trash2 className="w-3 h-3" /></button>}
                              </div>
                              <textarea value={g.longTermGoal} onChange={e => updateGoal(pt.id, g.id, 'longTermGoal', e.target.value)} onClick={e => e.stopPropagation()} disabled={locked} placeholder="Long Term Goal" className="w-full text-xs border rounded p-1 mb-2 h-10 disabled:bg-gray-100" />
                              <p className="text-xs text-gray-500 mb-1">Short Term Goals:</p>
                              {g.shortTermGoals.map((stg, idx) => (
                                <div key={idx} className="flex gap-1 mb-1">
                                  <input type="text" value={stg.goal} onChange={e => updateSTG(pt.id, g.id, idx, 'goal', e.target.value)} onClick={e => e.stopPropagation()} disabled={locked} placeholder="Goal" className="flex-1 text-xs border rounded p-1 disabled:bg-gray-100" />
                                  <input type="text" value={stg.measure} onChange={e => updateSTG(pt.id, g.id, idx, 'measure', e.target.value)} onClick={e => e.stopPropagation()} disabled={locked} placeholder="Measure" className="w-20 text-xs border rounded p-1 disabled:bg-gray-100" />
                                  <input type="text" value={stg.criteria} onChange={e => updateSTG(pt.id, g.id, idx, 'criteria', e.target.value)} onClick={e => e.stopPropagation()} disabled={locked} placeholder="Criteria" className="w-24 text-xs border rounded p-1 disabled:bg-gray-100" />
                                  {!locked && <button onClick={e => { e.stopPropagation(); removeSTG(pt.id, g.id, idx); }} className="text-red-400"><X className="w-3 h-3" /></button>}
                                </div>
                              ))}
                              {!locked && <button onClick={e => { e.stopPropagation(); addSTG(pt.id, g.id); }} className="text-xs text-purple-600">+ Add STG</button>}
                            </div>
                          ))}
                          {pt.itp.goals.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No goals yet</p>}
                        </div>
                        <div className="bg-white p-2 rounded border">
                          <p className="text-xs font-semibold mb-2">Sign-offs</p>
                          <div className="grid grid-cols-4 gap-2">
                            {[{k:'parent',l:'Parent'},{k:'socialWorker',l:'SW'},{k:'psychiatry',l:'Psych'},{k:'psychology',l:'Psychol'},{k:'aba',l:'ABA'},{k:'slp',l:'SLP'},{k:'ot',l:'OT'}].map(r => (
                              <button key={r.k} onClick={e => { e.stopPropagation(); toggleSign(pt.id, r.k); }} disabled={locked} className={`p-2 rounded border text-xs text-left ${pt.itp.signoffs[r.k].signed ? 'bg-green-50 border-green-300' : 'bg-gray-50'} disabled:opacity-75`}>
                                <div className="flex items-center gap-1">{pt.itp.signoffs[r.k].signed ? <CheckCircle className="w-3 h-3 text-green-600" /> : <Circle className="w-3 h-3 text-gray-400" />}<span className="font-medium">{r.l}</span></div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {patientTab === 'treatment' && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-green-700 mb-2">TREATMENT</p>
                        {pt.treatmentStartDate ? <p className="text-sm text-green-700">Started: {pt.treatmentStartDate}</p> : getPhase(pt) === "Ready for Treatment" ? <button onClick={e => { e.stopPropagation(); updatePt(pt.id, { treatmentStartDate: new Date().toISOString().split('T')[0] }); }} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium">Start Treatment</button> : <p className="text-xs text-gray-500">Complete ITP first</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {showFinalize && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-4 max-w-sm"><h3 className="font-bold mb-2">Finalize ITP?</h3><p className="text-sm text-gray-600 mb-4">The ITP will be locked.</p><div className="flex gap-2 justify-end"><button onClick={() => setShowFinalize(null)} className="px-3 py-1.5 border rounded text-sm">Cancel</button><button onClick={() => finalize(showFinalize)} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm">Finalize</button></div></div></div>}
        {showEditReq && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="bg-white rounded-lg p-4 max-w-sm"><h3 className="font-bold mb-2">Request Edit</h3><textarea value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Reason..." className="w-full border rounded p-2 text-sm h-20 mb-4" /><div className="flex gap-2 justify-end"><button onClick={() => { setShowEditReq(null); setEditReason(''); }} className="px-3 py-1.5 border rounded text-sm">Cancel</button><button onClick={() => reqEdit(showEditReq, editReason)} disabled={!editReason} className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm disabled:opacity-50">Submit</button></div></div></div>}
        {showPreview && <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto"><div className="sticky top-0 bg-white border-b p-3 flex justify-between"><h2 className="font-bold">ITP Preview - {showPreview.caseId}</h2><button onClick={() => setShowPreview(null)}><X className="w-5 h-5" /></button></div><div className="p-6"><h1 className="text-lg font-bold text-center text-teal-700 mb-4">alkalma - Individualized Treatment Plan</h1><div className="border p-3 mb-4"><p><strong>Case ID:</strong> {showPreview.caseId}</p><p><strong>DOB:</strong> {showPreview.dob}</p><p><strong>Diagnosis:</strong> {showPreview.primaryDx}</p></div><h3 className="font-bold mb-2 bg-gray-100 p-2">Goals</h3>{showPreview.itp.goals.length === 0 ? <p className="text-gray-500 text-sm">No goals added yet.</p> : showPreview.itp.goals.map(g => <div key={g.id} className="border mb-3 p-3"><p className="font-semibold text-sm">{g.discipline} - {g.domain}</p><p className="text-sm mt-1"><strong>LTG:</strong> {g.longTermGoal}</p>{g.shortTermGoals.map((s,i) => <p key={i} className="text-xs mt-1 ml-4">• {s.goal} ({s.measure}: {s.criteria})</p>)}</div>)}<h3 className="font-bold mt-4 mb-2 bg-gray-100 p-2">Signatures</h3><div className="grid grid-cols-2 gap-2 text-sm">{Object.entries(showPreview.itp.signoffs).map(([k,v]) => <div key={k} className="flex justify-between border p-2"><span className="capitalize">{k}</span><span>{v.signed ? `✓ ${v.date}` : '—'}</span></div>)}</div>{showPreview.itp.finalized && <div className="mt-4 p-3 bg-green-100 border border-green-500 rounded text-center"><p className="font-bold text-green-800">✓ FINALIZED {showPreview.itp.finalizedDate}</p></div>}</div></div></div>}
      </div>
    </div>
  );
}
