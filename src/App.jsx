import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, ChevronRight, Clock3, Focus, GraduationCap, HeartPulse, Info, Layers3, Package, Pause, Play, RotateCcw, RotateCw, Search, Stethoscope, X } from 'lucide-react'
import AtlasScene from './components/AtlasScene.jsx'
import { DEFAULT_VISIBLE, MODEL_MANIFEST_URL, QUICK_STRUCTURES, SYSTEMS, SYSTEM_MAP, noteForStructure } from './data/anatomy.js'
import { ASSESSMENT_ACTIONS, SCENARIOS, applyVitalDelta, cloneVitals } from './data/scenarios.js'
import { EQUIPMENT, EQUIPMENT_BY_ID, EQUIPMENT_CATEGORIES, targetMatches } from './data/equipment.js'

const INITIAL_SCENE = { explode:0, visible:DEFAULT_VISIBLE, selected:[], affected:[], isolate:false, view:'three-quarter', rotate:false, reset:0 }
const TOOL_IDS = new Set(EQUIPMENT.map((item) => item.id))
const ACTION_MAP = Object.fromEntries(ASSESSMENT_ACTIONS.map((item) => [item.id, item]))

function formatElapsed(seconds) {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
function vitalText(value, suffix = '') { return value == null ? '—' : `${value}${suffix}` }
function findAffectedIds(atlas, scenario) {
  if (!atlas || !scenario) return []
  const ids = new Set()
  for (const rawQuery of scenario.affectedQueries || []) {
    const query = rawQuery.toLowerCase()
    const match = atlas.concepts.filter((concept) => concept.name.toLowerCase().includes(query)).sort((a,b) => a.name.length - b.name.length)[0]
    if (match) match.elements.forEach((id) => ids.add(id))
  }
  return [...ids]
}
function scoreState(scenario, log) {
  if (!scenario) return { score:0, criticalDone:0, criticalTotal:0, completed:[], missed:[] }
  const actions = new Set(log.filter((entry) => entry.kind === 'action' && entry.correct !== false).map((entry) => entry.id))
  const available = scenario.expected.reduce((sum,item) => sum + item.points, 0)
  const completed = scenario.expected.filter((item) => actions.has(item.id))
  const earned = completed.reduce((sum,item) => sum + item.points, 0)
  const penalties = log.reduce((sum,entry) => sum + (entry.penalty || 0), 0)
  const critical = scenario.expected.filter((item) => item.critical)
  return {
    score: available ? Math.max(0, Math.min(100, Math.round(((earned - penalties) / available) * 100))) : 0,
    criticalDone: critical.filter((item) => actions.has(item.id)).length,
    criticalTotal: critical.length,
    completed,
    missed: scenario.expected.filter((item) => !actions.has(item.id)),
  }
}
function IconButton({ label, active=false, children, ...props }) {
  return <button className={`icon-button ${active ? 'is-active' : ''}`} aria-label={label} title={label} {...props}>{children}</button>
}

function SystemPanel({ atlas, scene, setScene, open, onClose }) {
  const counts = useMemo(() => {
    const result = Object.fromEntries(SYSTEMS.map((system) => [system.id, 0]))
    atlas?.parts.forEach((part) => { result[part.system] = (result[part.system] || 0) + 1 })
    return result
  }, [atlas])
  const activeSystems = SYSTEMS.filter((system) => counts[system.id] > 0)
  const visibleCount = atlas?.parts.filter((part) => scene.visible.includes(part.system) || scene.selected.includes(part.id) || scene.affected.includes(part.id)).length || 0
  const preset = (visible) => setScene((current) => ({ ...current, visible, selected:[], isolate:false }))
  const toggle = (systemId) => setScene((current) => ({ ...current, isolate:false, visible:current.visible.includes(systemId) ? current.visible.filter((id) => id !== systemId) : [...current.visible, systemId] }))
  return <aside className={`glass systems-panel ${open ? 'mobile-open' : ''}`}>
    <div className="panel-title-row"><div><span className="panel-kicker">ANATOMY</span><strong>Systems</strong></div><div className="panel-title-actions"><span className="count-badge">{activeSystems.length}</span><IconButton label="Close systems" onClick={onClose}><X size={17}/></IconButton></div></div>
    <div className="preset-row"><button onClick={() => preset(activeSystems.map((s) => s.id))}>All</button><button onClick={() => preset(['skeletal'])}>Skeleton</button><button onClick={() => preset(['cardiac','respiratory','digestive','urinary','endocrine','reproductive'])}>Organs</button></div>
    <div className="system-list">{activeSystems.map((system) => <div className={`system-row ${scene.visible.includes(system.id) ? 'enabled' : ''}`} key={system.id}>
      <button className="system-name" onClick={() => preset([system.id])}><span className="system-dot" style={{background:system.color}}/><span>{system.name}</span><span className="system-count">{counts[system.id]}</span></button>
      <button className={`toggle ${scene.visible.includes(system.id) ? 'on' : ''}`} onClick={() => toggle(system.id)} aria-label={`Toggle ${system.name}`}><span/></button>
    </div>)}</div>
    <div className="panel-foot"><span>{visibleCount.toLocaleString()} pieces visible</span><button onClick={() => preset([])}>Hide all</button></div>
  </aside>
}

function VitalsCard({ scenario, vitals, elapsed, running, onToggle }) {
  if (!scenario || !vitals) return null
  return <section className="glass vitals-card">
    <div className="vitals-head"><div><span className="panel-kicker">PATIENT MONITOR</span><strong>{scenario.patient}</strong></div><button className="time-button" onClick={onToggle}>{running ? <Pause size={14}/> : <Play size={14}/>} {formatElapsed(elapsed)}</button></div>
    <div className="vitals-grid"><div><span>HR</span><strong>{vitalText(vitals.hr)}</strong></div><div><span>BP</span><strong>{vitals.sbp == null ? '—' : `${vitals.sbp}/${vitals.dbp}`}</strong></div><div><span>RR</span><strong>{vitalText(vitals.rr)}</strong></div><div><span>SpO₂</span><strong>{vitalText(vitals.spo2,'%')}</strong></div><div><span>GCS</span><strong>{vitalText(vitals.gcs)}</strong></div><div><span>Glucose</span><strong>{vitalText(vitals.glucose)}</strong></div></div>
    <div className="vital-details"><span><b>Airway</b>{vitals.airway}</span><span><b>Lungs</b>{vitals.lungs}</span><span><b>Skin</b>{vitals.skin}</span><span><b>ETCO₂</b>{vitalText(vitals.etco2)}</span></div>
  </section>
}

function ScenarioPanel({ scenario, score, log, onAction, onOpenEquipment, onEnd }) {
  const relevantActionIds = useMemo(() => [...new Set(['scene-safety','primary-assessment','history','full-vitals','transport','reassess', ...scenario.expected.map((item) => item.id).filter((id) => ACTION_MAP[id])])], [scenario])
  const done = new Set(log.filter((entry) => entry.kind === 'action').map((entry) => entry.id))
  return <section className="glass scenario-panel">
    <div className="scenario-heading"><div><span className="panel-kicker">LIVE SCENARIO · {scenario.difficulty.toUpperCase()}</span><h2>{scenario.title}</h2></div><div className="score-orb"><span>{score.score}</span><small>SCORE</small></div></div>
    <div className="dispatch-box"><span>DISPATCH</span><p>{scenario.dispatch}</p><small>{scenario.scene}</small></div>
    <div className="threat-line"><AlertTriangle size={15}/><span>{scenario.criticalThreat}</span></div>
    <div className="action-section-head"><strong>Assessment & operations</strong><button onClick={onOpenEquipment}><Package size={15}/> Open ambulance</button></div>
    <div className="action-grid">{relevantActionIds.map((id) => { const action=ACTION_MAP[id]; if(!action)return null; return <button key={id} className={done.has(id) ? 'done' : ''} onClick={() => onAction(id)}><span>{action.label}</span>{done.has(id) ? <CheckCircle2 size={15}/> : <ChevronRight size={15}/>}</button> })}</div>
    <div className="scenario-footer"><span>{score.criticalDone}/{score.criticalTotal} critical priorities completed</span><button onClick={onEnd}>End & debrief</button></div>
  </section>
}

function StructureInspector({ selectedPart, selectedConcept, scene, setScene, armedTool, onOpenEquipment }) {
  if (!selectedPart) return <section className="glass inspector-card empty-inspector"><div className="inspector-icon"><Focus size={20}/></div><span className="panel-kicker">ANATOMY INSPECTOR</span><strong>Select a structure</strong><p>Click directly on the 3D body or search by anatomical name. Scenario-affected anatomy is highlighted in warm orange.</p>{armedTool && <div className="armed-callout"><Stethoscope size={16}/><span><b>{armedTool.name} armed.</b> Select a target on the body.</span></div>}</section>
  const system = SYSTEM_MAP[selectedPart.system]
  const match = armedTool ? targetMatches(armedTool, selectedPart.name) : null
  return <section className="glass inspector-card"><div className="structure-accent" style={{background:system?.color}}/><span className="panel-kicker">{system?.name?.toUpperCase() || 'ANATOMY'}</span><h3>{selectedConcept?.name || selectedPart.name}</h3><p>{noteForStructure(selectedConcept?.name || selectedPart.name, selectedPart.system)}</p><div className="meta-grid"><span>Atlas reference<b>{selectedConcept?.id || selectedPart.conceptId}</b></span><span>Selected pieces<b>{scene.selected.length}</b></span></div>{armedTool && <div className={`target-check ${match ? 'valid' : 'invalid'}`}>{match ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}<span>{match ? `${armedTool.name} can be applied to this target.` : `${armedTool.name} is not normally used on this structure.`}</span></div>}<div className="inspector-actions"><button className={`primary ${scene.isolate ? 'active' : ''}`} onClick={() => setScene((current) => ({...current,isolate:!current.isolate,explode:0}))}><Focus size={16}/>{scene.isolate ? 'Show surrounding anatomy' : 'Isolate structure'}</button><button onClick={onOpenEquipment}><Package size={16}/>Choose a tool</button></div></section>
}

function EquipmentDrawer({ open, onClose, onUse, armedTool }) {
  const [query,setQuery]=useState(''); const [category,setCategory]=useState('All')
  const filtered=EQUIPMENT.filter((tool)=>{const text=`${tool.name} ${tool.category} ${tool.scope} ${tool.use}`.toLowerCase(); return (category==='All'||tool.category===category)&&(!query||text.includes(query.toLowerCase()))})
  return <aside className={`equipment-drawer ${open ? 'open' : ''}`} aria-hidden={!open}><div className="drawer-head"><div><span className="panel-kicker">AMBULANCE INVENTORY</span><h2>Equipment & medications</h2></div><IconButton label="Close equipment" onClick={onClose}><X size={20}/></IconButton></div><p className="drawer-note">Inventory and medication scope vary by service and jurisdiction. This simulator teaches recognition and decision-making, not a universal dosing protocol.</p><div className="equipment-search"><Search size={17}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search BVM, tourniquet, naloxone…"/></div><div className="category-chips"><button className={category==='All'?'active':''} onClick={()=>setCategory('All')}>All</button>{EQUIPMENT_CATEGORIES.map((item)=><button key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div><div className="equipment-grid">{filtered.map((tool)=><article className={`equipment-card ${armedTool?.id===tool.id?'armed':''}`} key={tool.id}><div className="equipment-card-head"><div className="tool-icon"><Package size={17}/></div><span className="scope-pill">{tool.scope}</span></div><h3>{tool.name}</h3><p>{tool.use}</p><button onClick={()=>onUse(tool)}>{tool.requiresTarget?'Select, then target body':tool.action}<ChevronRight size={15}/></button></article>)}</div></aside>
}

function ScenarioLibrary({ open,onClose,onStart }) {
  return <aside className={`scenario-library ${open?'open':''}`} aria-hidden={!open}><div className="drawer-head"><div><span className="panel-kicker">SCENARIO LIBRARY</span><h2>Choose a patient</h2></div><IconButton label="Close scenarios" onClick={onClose}><X size={20}/></IconButton></div><p className="drawer-note">Cases accelerate time so you can practice recognition, sequencing, tool selection, anatomy targeting, treatment response, transport decisions, and reassessment.</p><div className="scenario-library-grid">{SCENARIOS.map((scenario)=><button key={scenario.id} onClick={()=>onStart(scenario.id)}><div><span className={`difficulty ${scenario.difficulty.toLowerCase()}`}>{scenario.difficulty}</span><small>{scenario.category}</small></div><strong>{scenario.title}</strong><p>{scenario.dispatch}</p><span className="case-open">Start case <ChevronRight size={15}/></span></button>)}</div></aside>
}

function Debrief({ scenario,score,log,onReplay,onChooseCase,onClose }) {
  if(!scenario)return null
  return <section className="debrief-overlay"><div className="debrief-shell glass"><div className="debrief-head"><div><span className="panel-kicker">POST-CALL DEBRIEF</span><h2>{scenario.title}</h2><p>{scenario.objective}</p></div><IconButton label="Close debrief" onClick={onClose}><X size={20}/></IconButton></div><div className="debrief-metrics"><div><span>{score.score}</span><small>Overall score</small></div><div><span>{score.criticalDone}/{score.criticalTotal}</span><small>Critical priorities</small></div><div><span>{log.filter((e)=>e.kind==='action').length}</span><small>Actions taken</small></div></div><div className="debrief-columns"><div><h3><CheckCircle2 size={17}/>Completed priorities</h3><div className="review-list">{score.completed.length?score.completed.map((item)=><div className="review-row good" key={item.id}><strong>{ACTION_MAP[item.id]?.label||EQUIPMENT_BY_ID[item.id]?.name||item.id}</strong><p>{item.rationale}</p></div>):<p className="empty-review">No scored priorities completed yet.</p>}</div></div><div><h3><AlertTriangle size={17}/>Missed / review</h3><div className="review-list">{score.missed.length?score.missed.map((item)=><div className={`review-row ${item.critical?'critical':''}`} key={item.id}><strong>{ACTION_MAP[item.id]?.label||EQUIPMENT_BY_ID[item.id]?.name||item.id}{item.critical?' · critical':''}</strong><p>{item.rationale}</p></div>):<p className="empty-review">All scored priorities were addressed.</p>}</div></div></div><div className="timeline-review"><h3><Clock3 size={17}/>Call timeline</h3><div>{log.length?log.map((entry,index)=><div className={`timeline-entry ${entry.correct===false?'bad':entry.kind}`} key={`${entry.id}-${index}`}><time>{formatElapsed(entry.at)}</time><span><b>{entry.label}</b>{entry.detail&&<small>{entry.detail}</small>}</span></div>):<p>No actions recorded.</p>}</div></div><div className="debrief-actions"><button onClick={onChooseCase}>Choose another case</button><button className="primary" onClick={onReplay}>Replay case</button></div></div></section>
}

function SourceModal({ open,onClose }) {
  if(!open)return null
  return <div className="modal-backdrop"><section className="source-modal glass"><div className="drawer-head"><div><span className="panel-kicker">SOURCE · SAFETY · SCOPE</span><h2>About EMT Human Atlas</h2></div><IconButton label="Close source information" onClick={onClose}><X size={20}/></IconButton></div><div className="source-copy"><p><b>3D anatomy:</b> BodyParts3D 4.0 adult male reference anatomy, accessed through the browser-optimized model packaging created by the open-source Human Atlas project. BodyParts3D data is CC BY 4.0; the Human Atlas application code is MIT licensed.</p><p><b>Training scope:</b> This application is an educational simulator, not medical direction, a clinical decision support tool, or a substitute for skills verification. EMS scope, medications, contraindications, doses, destination rules, and procedures vary by jurisdiction and medical director.</p><p><b>Simulation design:</b> Medication cards intentionally avoid jurisdiction-specific dosing. Scenarios focus on recognition, prioritization, anatomy, intervention choice, response, transport, and reassessment.</p><div className="source-links"><a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noreferrer">Human Atlas source</a><a href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html" target="_blank" rel="noreferrer">BodyParts3D license</a><a href="https://lifesciencedb.jp/bp3d/" target="_blank" rel="noreferrer">BodyParts3D project</a></div></div></section></div>
}

export default function App() {
  const [atlas,setAtlas]=useState(null), [modelProgress,setModelProgress]=useState(0), [modelError,setModelError]=useState('')
  const [scene,setScene]=useState(INITIAL_SCENE), [systemsOpen,setSystemsOpen]=useState(false), [equipmentOpen,setEquipmentOpen]=useState(false), [scenarioLibraryOpen,setScenarioLibraryOpen]=useState(false), [sourceOpen,setSourceOpen]=useState(false), [debriefOpen,setDebriefOpen]=useState(false)
  const [query,setQuery]=useState(''), [searchOpen,setSearchOpen]=useState(false), [selectedConcept,setSelectedConcept]=useState(null), [scenarioId,setScenarioId]=useState(null), [vitals,setVitals]=useState(null), [elapsed,setElapsed]=useState(0), [running,setRunning]=useState(false), [deteriorated,setDeteriorated]=useState(false), [log,setLog]=useState([]), [armedToolId,setArmedToolId]=useState(null), [toast,setToast]=useState('')
  const toastTimer=useRef(null)
  const activeScenario=SCENARIOS.find((item)=>item.id===scenarioId)||null
  const armedTool=armedToolId?EQUIPMENT_BY_ID[armedToolId]:null
  const partMap=useMemo(()=>new Map(atlas?.parts.map((part)=>[part.id,part])||[]),[atlas])
  const conceptMap=useMemo(()=>new Map(atlas?.concepts.map((concept)=>[concept.id,concept])||[]),[atlas])
  const selectedPart=scene.selected.length?partMap.get(scene.selected[0]):null
  const score=useMemo(()=>scoreState(activeScenario,log),[activeScenario,log])
  const notify=(message)=>{setToast(message);window.clearTimeout(toastTimer.current);toastTimer.current=window.setTimeout(()=>setToast(''),3200)}
  useEffect(()=>()=>window.clearTimeout(toastTimer.current),[])
  useEffect(()=>{const c=new AbortController(); fetch(MODEL_MANIFEST_URL,{signal:c.signal}).then((r)=>{if(!r.ok)throw new Error('The anatomy catalogue could not be loaded.');return r.json()}).then(setAtlas).catch((e)=>{if(e.name!=='AbortError')setModelError(e.message||'Could not load the anatomy catalogue.')}); return()=>c.abort()},[])
  useEffect(()=>{if(!atlas||!activeScenario)return;setScene((current)=>({...current,affected:findAffectedIds(atlas,activeScenario),isolate:false}))},[atlas,activeScenario])
  useEffect(()=>{if(!running||!activeScenario)return;const timer=window.setInterval(()=>setElapsed((value)=>value+10),1000);return()=>window.clearInterval(timer)},[running,activeScenario])
  useEffect(()=>{if(!activeScenario||!vitals||deteriorated||elapsed<activeScenario.deterioration.afterSeconds)return;setDeteriorated(true);setVitals((current)=>applyVitalDelta(current,activeScenario.deterioration));setLog((current)=>[...current,{kind:'event',id:'deterioration',label:'Patient deterioration',detail:activeScenario.deterioration.message,at:elapsed}]);notify(activeScenario.deterioration.message)},[elapsed,activeScenario,vitals,deteriorated])
  const searchResults=useMemo(()=>{if(!atlas)return[];const term=query.trim().toLowerCase();if(!term)return QUICK_STRUCTURES.map((quick)=>atlas.concepts.find((c)=>c.name.toLowerCase()===quick)||atlas.concepts.find((c)=>c.name.toLowerCase().includes(quick))).filter(Boolean).slice(0,10);return atlas.concepts.filter((c)=>c.name.toLowerCase().includes(term)||c.id.toLowerCase().includes(term)).sort((a,b)=>a.name.length-b.name.length).slice(0,14)},[atlas,query])
  const selectConcept=(concept)=>{setSelectedConcept(concept);setScene((current)=>({...current,selected:concept.elements,isolate:false,rotate:false}));setSearchOpen(false);setQuery('')}
  const recordAction=(id,detail='',targetPart=null)=>{
    if(!activeScenario){const label=ACTION_MAP[id]?.label||EQUIPMENT_BY_ID[id]?.name||id;setLog((current)=>[...current,{kind:'action',id,label,detail,at:elapsed,correct:true}]);notify(`${label} recorded in free-practice mode.`);return}
    const expectedItem=activeScenario.expected.find((item)=>item.id===id), avoid=activeScenario.avoid.find((item)=>item.id===id), duplicate=log.some((entry)=>entry.kind==='action'&&entry.id===id&&entry.correct!==false)
    let correct=true,penalty=0,feedback=detail
    if(avoid){correct=false;penalty=8;feedback=avoid.reason}else if(expectedItem){feedback=expectedItem.rationale}else if(!TOOL_IDS.has(id)){feedback=ACTION_MAP[id]?.description||'Action recorded.'}else{feedback=detail||'Reasonable equipment choice; it is not a scored priority in this case.'}
    if(duplicate&&id!=='reassess')feedback=`Repeated action. ${feedback}`
    const label=ACTION_MAP[id]?.label||EQUIPMENT_BY_ID[id]?.name||id
    setLog((current)=>[...current,{kind:'action',id,label:targetPart?`${label} → ${targetPart.name}`:label,detail:feedback,at:elapsed,correct,penalty:duplicate?0:penalty}])
    const response=activeScenario.responses?.[id];if(response){setVitals((current)=>applyVitalDelta(current,response));if(response.message)notify(response.message)}else if(avoid)notify(avoid.reason);else if(expectedItem?.critical)notify(`Critical priority completed: ${label}`)
  }
  const handlePartSelect=(partId)=>{const part=partMap.get(partId);if(!part)return;const concept=conceptMap.get(part.conceptId)||{id:part.conceptId,name:part.name,elements:[part.id]};setSelectedConcept(concept);setScene((current)=>({...current,selected:[partId],isolate:false,rotate:false}));if(armedTool){const valid=targetMatches(armedTool,part.name);if(valid)recordAction(armedTool.id,`${armedTool.action} on ${part.name}.`,part);else{setLog((current)=>[...current,{kind:'action',id:armedTool.id,label:`${armedTool.name} → ${part.name}`,detail:`Target mismatch: ${armedTool.name} is not normally applied to this structure.`,at:elapsed,correct:false,penalty:4}]);notify(`${armedTool.name}: choose a more appropriate anatomical target.`)}setArmedToolId(null)}}
  const useTool=(tool)=>{if(tool.requiresTarget){setArmedToolId(tool.id);setEquipmentOpen(false);notify(`${tool.name} armed — select the intended structure on the 3D body.`);return}recordAction(tool.id,tool.action);setEquipmentOpen(false)}
  const startScenario=(id)=>{const scenario=SCENARIOS.find((item)=>item.id===id);if(!scenario)return;setScenarioId(id);setVitals(cloneVitals(scenario.baseline));setElapsed(0);setRunning(true);setDeteriorated(false);setLog([]);setArmedToolId(null);setDebriefOpen(false);setScenarioLibraryOpen(false);setEquipmentOpen(false);setSelectedConcept(null);setScene((current)=>({...INITIAL_SCENE,reset:current.reset+1,affected:atlas?findAffectedIds(atlas,scenario):[]}));notify(`Scenario started: ${scenario.title}`)}
  const resetAtlas=()=>{setSelectedConcept(null);setArmedToolId(null);setScene((current)=>({...INITIAL_SCENE,affected:current.affected,reset:current.reset+1}))}
  const endScenario=()=>{setRunning(false);setDebriefOpen(true)}
  return <main className="app-shell">
    {atlas&&<AtlasScene atlas={atlas} state={scene} onSelect={handlePartSelect} onProgress={setModelProgress} onError={setModelError}/>}<div className="visual-vignette"/>
    <header className="identity-block"><div className="eyebrow"><span className="status-dot"/> EMT SIMULATION · INTERACTIVE ANATOMY</div><h1>EMT Human Atlas <span>3D</span></h1><p>{atlas?atlas.parts.length.toLocaleString():'2,234'} modeled pieces <b>·</b> BodyParts3D <b>·</b> scenario lab</p></header>
    <nav className="top-actions"><button className="search-trigger" onClick={()=>setSearchOpen(true)}><Search size={17}/><span>Find a structure</span><kbd>/</kbd></button><button onClick={()=>setScenarioLibraryOpen(true)}><GraduationCap size={17}/><span>Scenarios</span></button><button onClick={()=>setEquipmentOpen(true)}><Package size={17}/><span>Ambulance</span></button><IconButton label="Source and safety information" onClick={()=>setSourceOpen(true)}><Info size={18}/></IconButton></nav>
    <SystemPanel atlas={atlas} scene={scene} setScene={setScene} open={systemsOpen} onClose={()=>setSystemsOpen(false)}/>
    {activeScenario&&<VitalsCard scenario={activeScenario} vitals={vitals} elapsed={elapsed} running={running} onToggle={()=>setRunning((value)=>!value)}/>}<div className="inspector-wrap"><StructureInspector selectedPart={selectedPart} selectedConcept={selectedConcept} scene={scene} setScene={setScene} armedTool={armedTool} onOpenEquipment={()=>setEquipmentOpen(true)}/></div>{activeScenario&&<ScenarioPanel scenario={activeScenario} score={score} log={log} onAction={recordAction} onOpenEquipment={()=>setEquipmentOpen(true)} onEnd={endScenario}/>} 
    <nav className="view-controls glass">{[['three-quarter','¾'],['front','F'],['side','S'],['back','B']].map(([view,label])=><button key={view} className={scene.view===view?'active':''} onClick={()=>setScene((current)=>({...current,view,rotate:false,reset:current.reset+1}))}>{label}</button>)}<i/><button className={scene.rotate?'active':''} disabled={scene.explode>.42} onClick={()=>setScene((current)=>({...current,rotate:!current.rotate}))}>{scene.rotate?<Pause size={16}/>:<RotateCw size={17}/>}</button><button onClick={resetAtlas}><RotateCcw size={16}/></button></nav>
    <div className="scene-caption"><span/><b>{scene.isolate?(selectedConcept?.name||selectedPart?.name||'SELECTED STRUCTURE'):scene.explode>.9?'ANATOMICAL INVENTORY':scene.explode>.08?'SEPARATED ANATOMY':activeScenario?'LIVE PATIENT · ANATOMY OVERLAY':'ADULT HUMAN · MALE REFERENCE'}</b><span/></div>
    <div className="bottom-dock glass"><button className="mobile-system-button" onClick={()=>setSystemsOpen(true)}><Layers3 size={18}/><span>Systems</span></button><div className="explode-block"><div><label htmlFor="explode">Explode anatomy</label><output>{Math.round(scene.explode*100)}%</output></div><input id="explode" type="range" min="0" max="100" value={Math.round(scene.explode*100)} onChange={(e)=>setScene((current)=>({...current,explode:Number(e.target.value)/100,rotate:false,view:Number(e.target.value)>80?'front':current.view}))}/><div className="range-labels"><span>Assembled</span><span>Every piece</span></div></div><button className="dock-reset" onClick={resetAtlas}><RotateCcw size={17}/><span>Reset</span></button></div>
    <footer className="app-footer"><span>Drag to orbit <b>·</b> Scroll / pinch to zoom <b>·</b> Click to inspect</span><button onClick={()=>setSourceOpen(true)}>Educational simulator · local EMS protocol controls practice</button></footer>
    {!activeScenario&&<button className="start-scenario-cta glass" onClick={()=>setScenarioLibraryOpen(true)}><HeartPulse size={19}/><span><small>PRACTICE MODE</small><b>Start a patient scenario</b></span><ChevronRight size={18}/></button>}
    {armedTool&&<div className="tool-armed-banner glass"><div><Stethoscope size={18}/><span><small>TOOL ARMED</small><b>{armedTool.name}</b></span></div><p>Select the intended anatomical target on the 3D body.</p><button onClick={()=>setArmedToolId(null)}><X size={16}/></button></div>}
    {searchOpen&&<div className="search-overlay" onMouseDown={(e)=>{if(e.target===e.currentTarget)setSearchOpen(false)}}><section className="search-panel glass"><div className="search-panel-input"><Search size={19}/><input autoFocus value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Heart, femur, carotid artery, cranial nerve…"/><IconButton label="Close search" onClick={()=>setSearchOpen(false)}><X size={18}/></IconButton></div><div className="search-results">{searchResults.map((concept)=><button key={concept.id} onClick={()=>selectConcept(concept)}><span><b>{concept.name}</b><small>{concept.id}</small></span><span>{concept.elements.length} {concept.elements.length===1?'piece':'pieces'} <ChevronRight size={14}/></span></button>)}{!searchResults.length&&<p>No anatomical structures match your search.</p>}</div></section></div>}
    <EquipmentDrawer open={equipmentOpen} onClose={()=>setEquipmentOpen(false)} onUse={useTool} armedTool={armedTool}/><ScenarioLibrary open={scenarioLibraryOpen} onClose={()=>setScenarioLibraryOpen(false)} onStart={startScenario}/>{debriefOpen&&<Debrief scenario={activeScenario} score={score} log={log} onReplay={()=>activeScenario&&startScenario(activeScenario.id)} onChooseCase={()=>{setDebriefOpen(false);setScenarioLibraryOpen(true)}} onClose={()=>setDebriefOpen(false)}/>}<SourceModal open={sourceOpen} onClose={()=>setSourceOpen(false)}/>
    {modelProgress<100&&!modelError&&atlas&&<div className="loading-card glass"><Activity size={18}/><div><b>Preparing 3D anatomy</b><span>{modelProgress}% · streaming browser-optimized geometry</span><i><em style={{width:`${modelProgress}%`}}/></i></div></div>}{!atlas&&!modelError&&<div className="loading-card glass"><Activity size={18}/><div><b>Loading anatomy catalogue</b><span>Connecting to the BodyParts3D reference model…</span></div></div>}{modelError&&<div className="loading-card error-card glass"><AlertTriangle size={18}/><div><b>3D anatomy could not load</b><span>{modelError}</span><button onClick={()=>window.location.reload()}>Reload viewer</button></div></div>}{toast&&<div className="toast glass" aria-live="polite">{toast}</div>}
  </main>
}
