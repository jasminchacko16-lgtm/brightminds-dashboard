import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, X, Check, Lock, RefreshCw, User, Calendar, FileText, Heart, Users, Target, School } from 'lucide-react';

const SUPABASE_URL = 'https://igkwugfefllkutthnjwi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlna3d1Z2ZlZmxsa3V0dGhuandpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNTUxMTIsImV4cCI6MjA4MzczMTExMn0.w9vE39YSYiwGRl9saT9pUpde57XMTTyUjDw-v2sc12o';

const supabase = {
  from: (t) => ({
    select: async () => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*&order=id.desc`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }); return { data: await r.json(), error: r.ok ? null : 'err' }; },
    insert: async (rows) => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}`, { method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(rows) }); return { data: await r.json(), error: r.ok ? null : 'err' }; },
    update: (row) => ({ eq: async (c, v) => { await fetch(`${SUPABASE_URL}/rest/v1/${t}?${c}=eq.${v}`, { method: 'PATCH', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(row) }); } }),
    delete: () => ({ eq: async (c, v) => { await fetch(`${SUPABASE_URL}/rest/v1/${t}?${c}=eq.${v}`, { method: 'DELETE', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }); } })
  })
};

const diagAssess = { ABA: ['FBA','VB-MAPP','ABLLS-R','Vineland-3'], Psychiatry: ['DSM-5','ADOS-2','Medical Review'], Psychology: ['ADOS-2','ADI-R','WISC-V'], SLP: ['CELF-5','PLS-5','PPVT-4'], OT: ['Sensory Profile','BOT-2','PDMS-2'] };
const swAssess = ['SES Assessment','Eco-Map','Genogram','Family Needs','CANS'];
const itpDisc = ['Psychiatry','Psychology','ABA','SLP','OT','Social Work'];
const schoolSupports = ['Classroom modifications','AAC supports','Behavioral strategies','Sensory accommodations','Academic adaptations','Joint data collection'];
const caregiverFreq = ['Weekly check-in (SW)','Bi-weekly review (ABA/SLP/OT)','Monthly MDT meeting'];

const measureTypes = ['Percent Correct', 'Frequency', 'Duration', 'Reduction', 'Independence Level'];
const timepoints = ['baseline', '3month', '6month', '9month', '12month'];
const tpLabels = { baseline: 'Baseline', '3month': '3-Month', '6month': '6-Month', '9month': '9-Month', '12month': '12-Month' };

const emptyITP = () => ({ 
  clinicians: '', careCoordinator: '', assessmentDate: '',
  goals: [], 
  caregiverTraining: { responsibilities: '', frequency: [] },
  schoolCollab: { schoolName: '', teacherName: '', contactInfo: '', existingGoals: '', itpAlignment: '', supports: [], carryover: { skills: '', homeReinforce: '', schoolReinforce: '' }, consentName: '', consentDate: '', consentSigned: false },
  signoffs: { parent: { signed: false, date: '' }, socialWorker: { signed: false, date: '' }, psychiatry: { signed: false, date: '' }, psychology: { signed: false, date: '' }, aba: { signed: false, date: '' }, slp: { signed: false, date: '' }, ot: { signed: false, date: '' } }, 
  finalized: false, finalizedDate: ''
});

// GAP Calculation Functions
const calcGapValue = (stg, tp) => {
  const val = parseFloat(stg.data?.[tp]?.value);
  if (isNaN(val)) return null;
  if (stg.measureType === 'Percent Correct' || stg.measureType === 'Independence Level') return val;
  if (stg.measureType === 'Frequency' || stg.measureType === 'Duration') {
    const target = parseFloat(stg.target);
    return target > 0 ? Math.min((val / target) * 100, 100) : null;
  }
  if (stg.measureType === 'Reduction') {
    const base = parseFloat(stg.data?.baseline?.value);
    const mast = parseFloat(stg.target);
    if (!isNaN(base) && base > mast) return Math.min(((base - val) / (base - mast)) * 100, 100);
  }
  return null;
};

const classifyGoal = (stg, tp) => {
  if (stg.mastered) return 'Mastered';
  const tpIdx = timepoints.indexOf(tp);
  if (tpIdx <= 0) return null;
  const curr = calcGapValue(stg, tp);
  const prev = calcGapValue(stg, timepoints[tpIdx - 1]);
  if (curr === null || prev === null) return null;
  const diff = curr - prev;
  if (diff <= -10) return 'Regressing';
  if (diff >= 10) return 'Progressing';
  return 'Maintaining';
};

const calcGapDistribution = (itp, tp) => {
  const allStgs = itp?.goals?.flatMap(g => g.shortTermGoals) || [];
  if (allStgs.length === 0) return null;
  const counts = { Regressing: 0, Maintaining: 0, Progressing: 0, Mastered: 0 };
  let classified = 0;
  allStgs.forEach(stg => {
    if (stg.mastered) { counts.Mastered++; classified++; }
    else {
      const cat = classifyGoal(stg, tp);
      if (cat) { counts[cat]++; classified++; }
    }
  });
  if (classified === 0) return null;
  return { total: classified, regressing: Math.round((counts.Regressing / classified) * 100), maintaining: Math.round((counts.Maintaining / classified) * 100), progressing: Math.round((counts.Progressing / classified) * 100), mastered: Math.round((counts.Mastered / classified) * 100) };
};

// Pie Chart Component
const GapPieChart = ({ gap }) => {
  if (!gap) return <div className="text-center text-slate-400 text-sm py-6">No GAP data yet. Add goal data to see progress.</div>;
  const data = [
    { label: 'Mastered', value: gap.mastered, color: '#10b981' },
    { label: 'Progressing', value: gap.progressing, color: '#3b82f6' },
    { label: 'Maintaining', value: gap.maintaining, color: '#f59e0b' },
    { label: 'Regressing', value: gap.regressing, color: '#ef4444' }
  ].filter(d => d.value > 0);
  if (data.length === 0) return <div className="text-center text-slate-400 text-sm py-6">No classified goals yet.</div>;
  let cum = 0;
  const slices = data.map(d => { const start = cum; cum += d.value; return { ...d, start, end: cum }; });
  const getCoord = (pct) => { const a = (pct / 100) * 2 * Math.PI - Math.PI / 2; return { x: 50 + 40 * Math.cos(a), y: 50 + 40 * Math.sin(a) }; };
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-28 h-28">
        {slices.map((s, i) => {
          if (s.value === 100) return <circle key={i} cx="50" cy="50" r="40" fill={s.color} />;
          const start = getCoord(s.start);
          const end = getCoord(s.end);
          const large = s.value > 50 ? 1 : 0;
          return <path key={i} d={`M50,50 L${start.x},${start.y} A40,40 0 ${large},1 ${end.x},${end.y} Z`} fill={s.color} />;
        })}
      </svg>
      <div className="space-y-1.5">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color }} />
            <span className="text-slate-600">{d.label}: {d.value}%</span>
          </div>
        ))}
        <div className="text-xs text-slate-400 pt-1 border-t border-slate-100">Total: {gap.total} goals</div>
      </div>
    </div>
  );
};

const toDb = (p) => ({ case_id: p.caseId, first_name: p.firstName, last_name: p.lastName, dob: p.dob || null, primary_dx: p.primaryDx, parent_intake_complete: p.parentIntakeComplete, diagnostic_assessments: p.diagnosticAssessments, social_work_assessments: p.socialWorkAssessments, itp: p.itp, treatment_start_date: p.treatmentStartDate || null });
const fromDb = (r) => ({ id: r.id, caseId: r.case_id || '', firstName: r.first_name || '', lastName: r.last_name || '', dob: r.dob || '', primaryDx: r.primary_dx || '', parentIntakeComplete: r.parent_intake_complete || false, diagnosticAssessments: r.diagnostic_assessments || { ABA: [], Psychiatry: [], Psychology: [], SLP: [], OT: [] }, socialWorkAssessments: r.social_work_assessments || [], itp: r.itp || emptyITP(), treatmentStartDate: r.treatment_start_date || null });

export default function App() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selPt, setSelPt] = useState(null);
  const [section, setSection] = useState('info');
  const [showAdd, setShowAdd] = useState(false);
  const [newPt, setNewPt] = useState({ caseId: '', firstName: '', lastName: '', primaryDx: '' });
  const [gapTp, setGapTp] = useState('3month');

  const load = async () => { 
    setLoading(true); 
    try { 
      const { data } = await supabase.from('patients').select(); 
      if (data && Array.isArray(data)) setPatients(data.map(fromDb)); 
    } catch (e) { console.error(e); } 
    setLoading(false); 
  };
  
  useEffect(() => { load(); }, []);

  const save = async (pt) => { setSaving(true); await supabase.from('patients').update(toDb(pt)).eq('id', pt.id); setSaving(false); };

  const getPhase = (p) => { 
    if (p.treatmentStartDate) return { label: "Treatment", color: "emerald" }; 
    if (!p.parentIntakeComplete) return { label: "Diagnostic", color: "amber" }; 
    if (p.socialWorkAssessments.length < swAssess.length) return { label: "Assessment", color: "blue" }; 
    return Object.values(p.itp.signoffs).every(s => s.signed) ? { label: "Ready", color: "indigo" } : { label: "ITP", color: "violet" }; 
  };

  const updatePt = async (id, u) => { 
    const upd = patients.map(p => p.id === id ? { ...p, ...u } : p); 
    setPatients(upd); 
    const pt = upd.find(p => p.id === id); 
    if (selPt?.id === id) setSelPt(pt); 
    await save(pt); 
  };

  const updateItp = async (id, field, value) => { 
    const pt = patients.find(p => p.id === id);
    const newItp = { ...pt.itp, [field]: value };
    await updatePt(id, { itp: newItp }); 
  };

  const toggleDiag = async (id, disc, a) => { 
    const pt = patients.find(p => p.id === id);
    const curr = pt.diagnosticAssessments[disc] || [];
    const newAssess = { ...pt.diagnosticAssessments, [disc]: curr.includes(a) ? curr.filter(x => x !== a) : [...curr, a] };
    await updatePt(id, { diagnosticAssessments: newAssess }); 
  };

  const toggleSW = async (id, a) => { 
    const pt = patients.find(p => p.id === id);
    const curr = pt.socialWorkAssessments || [];
    await updatePt(id, { socialWorkAssessments: curr.includes(a) ? curr.filter(x => x !== a) : [...curr, a] }); 
  };

  const toggleSign = async (id, role) => { 
    const pt = patients.find(p => p.id === id); 
    if (pt.itp.finalized) return; 
    const curr = pt.itp.signoffs[role];
    const newSignoffs = { ...pt.itp.signoffs, [role]: { signed: !curr.signed, date: !curr.signed ? new Date().toISOString().split('T')[0] : '' } };
    await updateItp(id, 'signoffs', newSignoffs);
  };

  const finalize = async (id) => { 
    await updateItp(id, 'finalized', true);
    await updateItp(id, 'finalizedDate', new Date().toISOString().split('T')[0]);
  };

  const unlock = async (id) => { 
    await updateItp(id, 'finalized', false);
  };

  // Goal management
  const addGoal = async (id) => { 
    const pt = patients.find(p => p.id === id); 
    if (pt.itp.finalized) return;
    const newGoal = { 
      id: Date.now(), 
      discipline: '', 
      domain: '', 
      longTermGoal: '', 
      shortTermGoals: [{ 
        id: Date.now(), 
        goal: '', 
        measureType: 'Percent Correct', 
        target: '80', 
        mastered: false,
        data: { baseline: { value: '' }, '3month': { value: '' }, '6month': { value: '' }, '9month': { value: '' }, '12month': { value: '' } }
      }] 
    };
    await updateItp(id, 'goals', [...(pt.itp.goals || []), newGoal]);
  };

  const updateGoal = async (pId, gId, field, value) => { 
    const pt = patients.find(p => p.id === pId); 
    if (pt.itp.finalized) return;
    const goals = pt.itp.goals.map(g => g.id === gId ? { ...g, [field]: value } : g);
    await updateItp(pId, 'goals', goals);
  };

  const removeGoal = async (pId, gId) => { 
    const pt = patients.find(p => p.id === pId); 
    if (pt.itp.finalized) return;
    await updateItp(pId, 'goals', pt.itp.goals.filter(g => g.id !== gId));
  };

  const addSTG = async (pId, gId) => { 
    const pt = patients.find(p => p.id === pId); 
    if (pt.itp.finalized) return;
    const newStg = { 
      id: Date.now(), 
      goal: '', 
      measureType: 'Percent Correct', 
      target: '80', 
      mastered: false,
      data: { baseline: { value: '' }, '3month': { value: '' }, '6month': { value: '' }, '9month': { value: '' }, '12month': { value: '' } }
    };
    const goals = pt.itp.goals.map(g => g.id === gId ? { ...g, shortTermGoals: [...g.shortTermGoals, newStg] } : g);
    await updateItp(pId, 'goals', goals);
  };

  const updateSTGData = async (pId, gId, sId, tp, value) => {
    const pt = patients.find(p => p.id === pId);
    const goals = pt.itp.goals.map(g => g.id === gId ? { 
      ...g, 
      shortTermGoals: g.shortTermGoals.map(s => s.id === sId ? { 
        ...s, 
        data: { ...s.data, [tp]: { value } } 
      } : s) 
    } : g);
    await updateItp(pId, 'goals', goals);
  };

  const toggleMastered = async (pId, gId, sId) => {
    const pt = patients.find(p => p.id === pId);
    const goals = pt.itp.goals.map(g => g.id === gId ? { 
      ...g, 
      shortTermGoals: g.shortTermGoals.map(s => s.id === sId ? { ...s, mastered: !s.mastered } : s) 
    } : g);
    await updateItp(pId, 'goals', goals);
  };

  const updateSTG = async (pId, gId, sId, field, value) => { 
    const pt = patients.find(p => p.id === pId);
    const goals = pt.itp.goals.map(g => g.id === gId ? { ...g, shortTermGoals: g.shortTermGoals.map(s => s.id === sId ? { ...s, [field]: value } : s) } : g);
    await updateItp(pId, 'goals', goals);
  };

  // School collaboration
  const updateSchoolCollab = async (id, field, value) => { 
    const pt = patients.find(p => p.id === id);
    const sc = { ...(pt.itp.schoolCollab || {}), [field]: value };
    await updateItp(id, 'schoolCollab', sc);
  };

  const toggleSchoolSupport = async (id, support) => { 
    const pt = patients.find(p => p.id === id);
    const curr = pt.itp.schoolCollab?.supports || [];
    const newSupports = curr.includes(support) ? curr.filter(s => s !== support) : [...curr, support];
    await updateSchoolCollab(id, 'supports', newSupports);
  };

  const toggleCaregiverFreq = async (id, freq) => { 
    const pt = patients.find(p => p.id === id);
    const curr = pt.itp.caregiverTraining?.frequency || [];
    const newFreq = curr.includes(freq) ? curr.filter(f => f !== freq) : [...curr, freq];
    const ct = { ...(pt.itp.caregiverTraining || {}), frequency: newFreq };
    await updateItp(id, 'caregiverTraining', ct);
  };

  const deletePt = async (id) => { 
    if (confirm('Delete?')) { 
      await supabase.from('patients').delete().eq('id', id); 
      setPatients(patients.filter(p => p.id !== id)); 
      if (selPt?.id === id) setSelPt(null); 
    } 
  };

  const addPatient = async () => { 
    if (!newPt.caseId) return; 
    const pt = { ...newPt, parentIntakeComplete: false, diagnosticAssessments: { ABA: [], Psychiatry: [], Psychology: [], SLP: [], OT: [] }, socialWorkAssessments: [], itp: emptyITP(), treatmentStartDate: null }; 
    const { data } = await supabase.from('patients').insert([toDb(pt)]); 
    if (data?.[0]) setPatients([fromDb(data[0]), ...patients]); 
    setNewPt({ caseId: '', firstName: '', lastName: '', primaryDx: '' }); 
    setShowAdd(false); 
  };

  const allSigned = (p) => Object.values(p.itp.signoffs).every(s => s.signed);
  const phaseBadge = (c) => c === 'amber' ? 'bg-amber-50 text-amber-600' : c === 'blue' ? 'bg-blue-50 text-blue-600' : c === 'violet' ? 'bg-violet-50 text-violet-600' : c === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600';

  // Components
  const Input = ({ label, value, onChange, type = 'text', disabled = false, className = '' }) => (
    <div className={className}>
      <label className="text-xs font-medium text-slate-400 uppercase">{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full mt-1 p-2 bg-slate-50 border-0 rounded-lg text-sm disabled:opacity-50" />
    </div>
  );

  const TextArea = ({ label, value, onChange, disabled = false, rows = 2 }) => (
    <div>
      <label className="text-xs font-medium text-slate-400 uppercase">{label}</label>
      <textarea value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} rows={rows} className="w-full mt-1 p-2 bg-slate-50 border-0 rounded-lg text-sm resize-none disabled:opacity-50" />
    </div>
  );

  const Section = ({ title, icon: Icon, children, open: defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
      <div className="border border-slate-200 rounded-xl mb-3 overflow-hidden">
        <button onClick={() => setOpen(!open)} className="w-full p-3 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-slate-500" />
            <span className="font-medium text-slate-700 text-sm">{title}</span>
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </button>
        {open && <div className="p-3 border-t border-slate-200">{children}</div>}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-semibold text-slate-800">Bright Minds</h1>
          </div>
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-slate-400">Saving...</span>}
            <button onClick={load} className="p-2 hover:bg-slate-100 rounded-full">
              <RefreshCw className="w-4 h-4 text-slate-400" />
            </button>
            <button onClick={() => setShowAdd(true)} className="h-8 px-3 bg-slate-900 text-white text-sm rounded-full flex items-center gap-1">
              <Plus className="w-4 h-4" />New Patient
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4 flex gap-4">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-3 border-b border-slate-100">
              <h2 className="font-medium text-slate-700 text-sm">Patients ({patients.length})</h2>
            </div>
            <div className="max-h-[calc(100vh-180px)] overflow-auto">
              {patients.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">No patients yet</div>
              ) : patients.map(pt => {
                const ph = getPhase(pt);
                return (
                  <div key={pt.id} onClick={() => { setSelPt(pt); setSection('info'); }} className={`p-3 cursor-pointer border-b border-slate-50 ${selPt?.id === pt.id ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-slate-700 text-sm">{pt.caseId}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${phaseBadge(ph.color)}`}>{ph.label}</span>
                    </div>
                    <p className="text-xs text-slate-400">{pt.firstName} {pt.lastName}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1">
          {!selPt ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">Select a patient to view details</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Patient Header */}
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">{selPt.caseId} - {selPt.firstName} {selPt.lastName}</h2>
                  <p className="text-sm text-slate-400">{selPt.primaryDx || 'No diagnosis'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selPt.itp.finalized && <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full flex items-center gap-1"><Lock className="w-3 h-3" />Finalized</span>}
                  <button onClick={() => deletePt(selPt.id)} className="p-2 hover:bg-red-50 rounded-full">
                    <X className="w-4 h-4 text-slate-400 hover:text-red-500" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100">
                {['info', 'diagnostic', 'assessment', 'itp', 'treatment'].map(tab => (
                  <button key={tab} onClick={() => setSection(tab)} className={`px-4 py-3 text-sm font-medium capitalize ${section === tab ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-400'}`}>
                    {tab === 'itp' ? 'ITP' : tab}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="p-4 max-h-[calc(100vh-280px)] overflow-auto">
                {section === 'info' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Case ID" value={selPt.caseId} onChange={v => updatePt(selPt.id, { caseId: v })} />
                    <Input label="First Name" value={selPt.firstName} onChange={v => updatePt(selPt.id, { firstName: v })} />
                    <Input label="Last Name" value={selPt.lastName} onChange={v => updatePt(selPt.id, { lastName: v })} />
                    <Input label="DOB" type="date" value={selPt.dob} onChange={v => updatePt(selPt.id, { dob: v })} />
                    <Input label="Diagnosis" value={selPt.primaryDx} onChange={v => updatePt(selPt.id, { primaryDx: v })} className="col-span-2" />
                  </div>
                )}

                {section === 'diagnostic' && (
                  <div className="space-y-4">
                    <div onClick={() => updatePt(selPt.id, { parentIntakeComplete: !selPt.parentIntakeComplete })} className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 ${selPt.parentIntakeComplete ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selPt.parentIntakeComplete ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        {selPt.parentIntakeComplete && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm ${selPt.parentIntakeComplete ? 'text-emerald-700' : 'text-slate-600'}`}>Parent Intake Complete</span>
                    </div>
                    {Object.entries(diagAssess).map(([disc, items]) => (
                      <div key={disc}>
                        <h4 className="text-xs font-medium text-slate-500 mb-2">{disc}</h4>
                        <div className="flex flex-wrap gap-1">
                          {items.map(a => {
                            const done = selPt.diagnosticAssessments[disc]?.includes(a);
                            return (
                              <button key={a} onClick={() => toggleDiag(selPt.id, disc, a)} className={`px-2 py-1 rounded text-xs ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {done && <Check className="w-3 h-3 inline mr-1" />}{a}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {section === 'assessment' && (
                  <div>
                    <h4 className="text-xs font-medium text-slate-500 mb-2">Social Work Assessments</h4>
                    <div className="flex flex-wrap gap-1">
                      {swAssess.map(a => {
                        const done = selPt.socialWorkAssessments.includes(a);
                        return (
                          <button key={a} onClick={() => toggleSW(selPt.id, a)} className={`px-2 py-1 rounded text-xs ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {done && <Check className="w-3 h-3 inline mr-1" />}{a}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {section === 'itp' && (
                  <div>
                    {/* Patient & Clinician Info */}
                    <Section title="Patient & Clinician Info" icon={User}>
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Clinicians Seeing Patient" value={selPt.itp.clinicians} onChange={v => updateItp(selPt.id, 'clinicians', v)} disabled={selPt.itp.finalized} />
                        <Input label="Care Coordinator/SW Lead" value={selPt.itp.careCoordinator} onChange={v => updateItp(selPt.id, 'careCoordinator', v)} disabled={selPt.itp.finalized} />
                        <Input label="Assessment Completion Date" type="date" value={selPt.itp.assessmentDate} onChange={v => updateItp(selPt.id, 'assessmentDate', v)} disabled={selPt.itp.finalized} />
                      </div>
                    </Section>

                    {/* Goals */}
                    <Section title="Treatment Goals" icon={Target}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs text-slate-500">{selPt.itp.goals?.length || 0} goals</span>
                        {!selPt.itp.finalized && (
                          <button onClick={() => addGoal(selPt.id)} className="text-xs text-teal-600 flex items-center gap-1">
                            <Plus className="w-3 h-3" />Add Goal
                          </button>
                        )}
                      </div>
                      {(!selPt.itp.goals || selPt.itp.goals.length === 0) ? (
                        <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-400 text-xs">No goals added yet</div>
                      ) : selPt.itp.goals.map(g => (
                        <div key={g.id} className="p-3 bg-slate-50 rounded-lg mb-2">
                          <div className="flex gap-2 mb-2">
                            <select value={g.discipline} onChange={e => updateGoal(selPt.id, g.id, 'discipline', e.target.value)} disabled={selPt.itp.finalized} className="px-2 py-1 bg-white rounded text-xs">
                              <option value="">Discipline</option>
                              {itpDisc.map(d => <option key={d}>{d}</option>)}
                            </select>
                            <input value={g.domain} onChange={e => updateGoal(selPt.id, g.id, 'domain', e.target.value)} disabled={selPt.itp.finalized} placeholder="Domain" className="flex-1 px-2 py-1 bg-white rounded text-xs" />
                            {!selPt.itp.finalized && (
                              <button onClick={() => removeGoal(selPt.id, g.id)} className="text-slate-400 hover:text-red-500">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <textarea value={g.longTermGoal} onChange={e => updateGoal(selPt.id, g.id, 'longTermGoal', e.target.value)} disabled={selPt.itp.finalized} placeholder="Long Term Goal: PATIENT will [goal] for X consecutive days/weeks across X people and X settings." className="w-full px-2 py-1 bg-white rounded text-xs resize-none h-16 mb-2" />
                          <p className="text-xs text-slate-400 mb-1">Short Term Goals</p>
                          {g.shortTermGoals.map(s => (
                            <div key={s.id} className="p-2 bg-white rounded mb-1">
                              <div className="flex gap-1 mb-2">
                                <input value={s.goal} onChange={e => updateSTG(selPt.id, g.id, s.id, 'goal', e.target.value)} disabled={selPt.itp.finalized} placeholder="Short term goal" className="flex-1 px-2 py-1 bg-slate-50 rounded text-xs" />
                                <select value={s.measureType} onChange={e => updateSTG(selPt.id, g.id, s.id, 'measureType', e.target.value)} disabled={selPt.itp.finalized} className="px-2 py-1 bg-slate-50 rounded text-xs">
                                  {measureTypes.map(m => <option key={m}>{m}</option>)}
                                </select>
                                <input value={s.target} onChange={e => updateSTG(selPt.id, g.id, s.id, 'target', e.target.value)} disabled={selPt.itp.finalized} placeholder="Target" className="w-16 px-2 py-1 bg-slate-50 rounded text-xs" />
                                <button onClick={() => toggleMastered(selPt.id, g.id, s.id)} className={`px-2 py-1 rounded text-xs whitespace-nowrap ${s.mastered ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {s.mastered ? '✓ Mastered' : 'Mastered?'}
                                </button>
                              </div>
                              <div className="flex gap-1 items-center">
                                <span className="text-xs text-slate-400 w-12">Data:</span>
                                {timepoints.map(tp => (
                                  <div key={tp} className="flex-1">
                                    <input 
                                      value={s.data?.[tp]?.value || ''} 
                                      onChange={e => updateSTGData(selPt.id, g.id, s.id, tp, e.target.value)} 
                                      placeholder={tpLabels[tp]} 
                                      className="w-full px-1 py-0.5 bg-slate-50 rounded text-xs text-center" 
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {!selPt.itp.finalized && (
                            <button onClick={() => addSTG(selPt.id, g.id)} className="text-xs text-slate-400 mt-1">+ Add Short Term Goal</button>
                          )}
                        </div>
                      ))}
                    </Section>

                    {/* Caregiver Training */}
                    <Section title="Caregiver Training & Participation" icon={Users} open={false}>
                      <TextArea label="Caregiver Responsibilities" value={selPt.itp.caregiverTraining?.responsibilities} onChange={v => { const ct = { ...(selPt.itp.caregiverTraining || {}), responsibilities: v }; updateItp(selPt.id, 'caregiverTraining', ct); }} disabled={selPt.itp.finalized} />
                      <p className="text-xs text-slate-500 mt-3 mb-2">Expected Frequency</p>
                      <div className="space-y-1">
                        {caregiverFreq.map(f => {
                          const sel = selPt.itp.caregiverTraining?.frequency?.includes(f);
                          return (
                            <div key={f} onClick={() => !selPt.itp.finalized && toggleCaregiverFreq(selPt.id, f)} className={`p-2 rounded cursor-pointer text-xs flex items-center gap-2 ${sel ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                              <div className={`w-4 h-4 rounded flex items-center justify-center ${sel ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                {sel && <Check className="w-3 h-3 text-white" />}
                              </div>
                              {f}
                            </div>
                          );
                        })}
                      </div>
                    </Section>

                    {/* School Collaboration */}
                    <Section title="School Collaboration" icon={School} open={false}>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <Input label="School Name" value={selPt.itp.schoolCollab?.schoolName} onChange={v => updateSchoolCollab(selPt.id, 'schoolName', v)} disabled={selPt.itp.finalized} />
                        <Input label="Teacher/Inclusion Lead" value={selPt.itp.schoolCollab?.teacherName} onChange={v => updateSchoolCollab(selPt.id, 'teacherName', v)} disabled={selPt.itp.finalized} />
                        <Input label="Contact Info" value={selPt.itp.schoolCollab?.contactInfo} onChange={v => updateSchoolCollab(selPt.id, 'contactInfo', v)} disabled={selPt.itp.finalized} className="col-span-2" />
                      </div>
                      <TextArea label="Existing School Goals" value={selPt.itp.schoolCollab?.existingGoals} onChange={v => updateSchoolCollab(selPt.id, 'existingGoals', v)} disabled={selPt.itp.finalized} />
                      <TextArea label="ITP & School Goals Alignment" value={selPt.itp.schoolCollab?.itpAlignment} onChange={v => updateSchoolCollab(selPt.id, 'itpAlignment', v)} disabled={selPt.itp.finalized} />
                      
                      <p className="text-xs text-slate-500 mt-3 mb-2">School-Based Supports</p>
                      <div className="grid grid-cols-2 gap-1">
                        {schoolSupports.map(s => {
                          const sel = selPt.itp.schoolCollab?.supports?.includes(s);
                          return (
                            <div key={s} onClick={() => !selPt.itp.finalized && toggleSchoolSupport(selPt.id, s)} className={`p-2 rounded cursor-pointer text-xs flex items-center gap-2 ${sel ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                              <div className={`w-4 h-4 rounded flex items-center justify-center ${sel ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                {sel && <Check className="w-3 h-3 text-white" />}
                              </div>
                              {s}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs font-medium text-slate-600 mb-2">Carryover Plan</p>
                        <TextArea label="Key Skills to Generalize" value={selPt.itp.schoolCollab?.carryover?.skills} onChange={v => { const c = { ...(selPt.itp.schoolCollab?.carryover || {}), skills: v }; updateSchoolCollab(selPt.id, 'carryover', c); }} disabled={selPt.itp.finalized} rows={1} />
                        <TextArea label="Home Reinforcement" value={selPt.itp.schoolCollab?.carryover?.homeReinforce} onChange={v => { const c = { ...(selPt.itp.schoolCollab?.carryover || {}), homeReinforce: v }; updateSchoolCollab(selPt.id, 'carryover', c); }} disabled={selPt.itp.finalized} rows={1} />
                        <TextArea label="School Reinforcement" value={selPt.itp.schoolCollab?.carryover?.schoolReinforce} onChange={v => { const c = { ...(selPt.itp.schoolCollab?.carryover || {}), schoolReinforce: v }; updateSchoolCollab(selPt.id, 'carryover', c); }} disabled={selPt.itp.finalized} rows={1} />
                      </div>

                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs font-medium text-blue-700 mb-2">School Collaboration Consent</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Input label="Parent Name" value={selPt.itp.schoolCollab?.consentName} onChange={v => updateSchoolCollab(selPt.id, 'consentName', v)} disabled={selPt.itp.finalized} />
                          <Input label="Date" type="date" value={selPt.itp.schoolCollab?.consentDate} onChange={v => updateSchoolCollab(selPt.id, 'consentDate', v)} disabled={selPt.itp.finalized} />
                        </div>
                        <button onClick={() => !selPt.itp.finalized && updateSchoolCollab(selPt.id, 'consentSigned', !selPt.itp.schoolCollab?.consentSigned)} className={`mt-2 px-3 py-1.5 rounded text-xs ${selPt.itp.schoolCollab?.consentSigned ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {selPt.itp.schoolCollab?.consentSigned ? '✓ Consent Signed' : 'Mark as Signed'}
                        </button>
                      </div>
                    </Section>

                    {/* Sign-offs */}
                    <Section title="Sign-offs" icon={FileText}>
                      <div className="grid grid-cols-4 gap-2">
                        {[{ k: 'parent', l: 'Parent' }, { k: 'socialWorker', l: 'Social Worker' }, { k: 'psychiatry', l: 'Psychiatry' }, { k: 'psychology', l: 'Psychology' }, { k: 'aba', l: 'ABA' }, { k: 'slp', l: 'SLP' }, { k: 'ot', l: 'OT' }].map(r => {
                          const s = selPt.itp.signoffs[r.k]?.signed;
                          return (
                            <button key={r.k} onClick={() => toggleSign(selPt.id, r.k)} disabled={selPt.itp.finalized} className={`p-2 rounded-lg text-left ${s ? 'bg-emerald-50' : 'bg-slate-50'} ${selPt.itp.finalized ? 'opacity-60' : ''}`}>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${s ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                  {s && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className={`text-xs ${s ? 'text-emerald-700' : 'text-slate-500'}`}>{r.l}</span>
                              </div>
                              {s && <p className="text-xs text-slate-400 mt-1 ml-6">{selPt.itp.signoffs[r.k].date}</p>}
                            </button>
                          );
                        })}
                      </div>
                      
                      {!selPt.itp.finalized && allSigned(selPt) && (
                        <button onClick={() => finalize(selPt.id)} className="w-full mt-3 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2">
                          <Lock className="w-4 h-4" />Finalize ITP
                        </button>
                      )}
                      {selPt.itp.finalized && (
                        <button onClick={() => unlock(selPt.id)} className="w-full mt-3 py-2 bg-slate-200 text-slate-600 text-sm font-medium rounded-lg">
                          Unlock for Editing
                        </button>
                      )}
                    </Section>
                  </div>
                )}

                {section === 'treatment' && (
                  <div>
                    {selPt.treatmentStartDate ? (
                      <div className="p-6 bg-emerald-50 rounded-lg text-center">
                        <Heart className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                        <p className="text-emerald-700 font-medium">Treatment Started</p>
                        <p className="text-emerald-600 text-sm">{selPt.treatmentStartDate}</p>
                      </div>
                    ) : getPhase(selPt).label === "Ready" ? (
                      <button onClick={() => updatePt(selPt.id, { treatmentStartDate: new Date().toISOString().split('T')[0] })} className="w-full py-3 bg-emerald-500 text-white font-medium rounded-lg">
                        Start Treatment
                      </button>
                    ) : (
                      <div className="p-6 bg-slate-50 rounded-lg text-center text-slate-400">
                        Complete ITP and get all sign-offs first
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">New Patient</h3>
            </div>
            <div className="p-4 space-y-3">
              <Input label="Case ID *" value={newPt.caseId} onChange={v => setNewPt({ ...newPt, caseId: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" value={newPt.firstName} onChange={v => setNewPt({ ...newPt, firstName: v })} />
                <Input label="Last Name" value={newPt.lastName} onChange={v => setNewPt({ ...newPt, lastName: v })} />
              </div>
              <Input label="Diagnosis" value={newPt.primaryDx} onChange={v => setNewPt({ ...newPt, primaryDx: v })} />
            </div>
            <div className="p-4 bg-slate-50 flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-white text-slate-600 rounded-lg text-sm">Cancel</button>
              <button onClick={addPatient} disabled={!newPt.caseId} className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm disabled:opacity-50">Add Patient</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
