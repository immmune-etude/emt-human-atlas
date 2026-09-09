export const ASSESSMENT_ACTIONS = [
  { id:'scene-safety', label:'Scene safety + PPE', group:'Scene', description:'Identify hazards, standard precautions, number of patients, mechanism/nature of illness, and need for resources.' },
  { id:'primary-assessment', label:'Primary assessment (ABCDE)', group:'Primary', description:'Find and treat immediate threats to airway, breathing, circulation, disability, and exposure.' },
  { id:'bleeding-control', label:'Immediate hemorrhage control', group:'Primary', description:'Control catastrophic external bleeding before a lengthy assessment.' },
  { id:'history', label:'OPQRST + SAMPLE history', group:'History', description:'Obtain focused symptom and medical history without delaying lifesaving care.' },
  { id:'full-vitals', label:'Full vital signs', group:'Assessment', description:'Obtain and trend respiratory status, pulse, blood pressure, oxygenation, skin signs, mental status, and other indicated measurements.' },
  { id:'stroke-screen', label:'Stroke / neurologic screen', group:'Assessment', description:'Use a validated local stroke screen and document focal deficits.' },
  { id:'last-known-well', label:'Last-known-well time', group:'History', description:'Determine when the patient was last known at neurologic baseline and when symptoms were discovered.' },
  { id:'spinal-assessment', label:'Spinal motion restriction assessment', group:'Trauma', description:'Apply local selective spinal motion restriction criteria and neurologic assessment.' },
  { id:'burn-assessment', label:'Estimate burn extent / severity', group:'Trauma', description:'Estimate involved body surface, depth, airway risk, circumferential injury, and associated trauma.' },
  { id:'position-comfort', label:'Position for comfort / physiology', group:'Treatment', description:'Choose patient position based on breathing, perfusion, injury, mental status, and protocol.' },
  { id:'request-als', label:'Request ALS / additional resources', group:'Resources', description:'Escalate when advanced airway, vascular access, advanced medication, or critical care may be needed.' },
  { id:'transport', label:'Initiate priority transport', group:'Transport', description:'Move toward definitive care with destination choice appropriate to the emergency and system.' },
  { id:'prenotify', label:'Hospital prenotification', group:'Transport', description:'Provide time-sensitive prenotification when indicated by local system.' },
  { id:'reassess', label:'Focused reassessment', group:'Reassessment', description:'Repeat ABCs, intervention effectiveness, symptoms, and vital signs.' },
]

const expected = (...rows) => rows.map(([id, points, rationale, critical = false]) => ({ id, points, rationale, critical }))

export const SCENARIOS = [
  {
    id:'acs', title:'Crushing chest pressure', category:'Medical · Cardiac', difficulty:'Intermediate',
    patient:'58-year-old adult', dispatch:'Chest pain at an office building',
    scene:'The patient is seated at a desk, pale and diaphoretic, reporting central pressure that began 25 minutes ago and radiates toward the left arm. They can speak in full sentences.',
    criticalThreat:'Possible acute coronary syndrome with risk of malignant dysrhythmia or deterioration.',
    baseline:{hr:104, rr:20, spo2:95, sbp:154, dbp:92, gcs:15, glucose:null, etco2:null, temp:37.0, rhythm:'Sinus tachycardia', skin:'Pale / moist', airway:'Patent', lungs:'Clear bilaterally'},
    affectedQueries:['heart','left coronary artery','aorta','left arm'],
    objective:'Recognize a time-sensitive cardiac presentation, assess for immediate threats, use protocol-appropriate aspirin, avoid reflex oxygen when not indicated, and expedite definitive evaluation.',
    expected: expected(
      ['scene-safety',5,'Establish scene safety and standard precautions.'],
      ['primary-assessment',10,'Confirm airway, breathing, circulation, mental status, and immediate stability.',true],
      ['history',6,'Characterize the pain and identify medications, allergies, bleeding history, and cardiac risk.'],
      ['full-vitals',6,'Trend perfusion and oxygenation.'],
      ['aspirin',12,'Aspirin is commonly indicated for suspected ACS after contraindication checks.',true],
      ['ecg',6,'Early ECG acquisition is valuable where available and within system capability.'],
      ['transport',10,'Do not delay definitive cardiac evaluation for nonessential on-scene tasks.',true],
      ['prenotify',5,'Early notification can activate the receiving system when indicated.'],
      ['reassess',8,'Reassess pain, ABCs, rhythm/vitals, and treatment response.',true]
    ),
    avoid:[{id:'oxygen',reason:'Supplemental oxygen should be driven by clinical need and protocol rather than given automatically to every chest-pain patient.'}],
    deterioration:{afterSeconds:240, hr:+8, sbp:-14, spo2:-1, gcs:-1, message:'The patient looks more ill and says the pressure is worsening.'},
    responses:{aspirin:{message:'Aspirin given after indication and contraindication checks.'}, oxygen:{message:'Oxygen applied; verify that the patient actually meets your protocol indication.'}, nitroglycerin:{sbp:-10,message:'Nitroglycerin assistance considered; prescription, blood pressure, contraindications, and local authorization must all be checked.'}}
  },
  {
    id:'anaphylaxis', title:'Food-triggered anaphylaxis', category:'Medical · Allergy', difficulty:'Critical',
    patient:'23-year-old adult', dispatch:'Difficulty breathing after eating',
    scene:'The patient has facial swelling, diffuse hives, hoarse speech, wheezing, and rapidly worsening dizziness. A friend reports a known severe nut allergy.',
    criticalThreat:'Anaphylaxis with upper-airway swelling, bronchospasm, and distributive shock.',
    baseline:{hr:128, rr:30, spo2:91, sbp:86, dbp:54, gcs:14, glucose:null, etco2:null, temp:37.1, rhythm:'Sinus tachycardia', skin:'Flushed / hives', airway:'Threatened — hoarse', lungs:'Diffuse wheeze'},
    affectedQueries:['larynx','trachea','lung','bronchus','skin'],
    objective:'Identify anaphylaxis early, prioritize protocol-authorized epinephrine, and prepare for rapid airway/ventilatory deterioration and shock.',
    expected: expected(
      ['scene-safety',4,'Use PPE and rapidly identify likely trigger.'],
      ['primary-assessment',12,'Airway and breathing threats are immediately present.',true],
      ['epinephrine',18,'Epinephrine is the key first-line medication when anaphylaxis criteria are met.',true],
      ['oxygen',6,'Support oxygenation while monitoring work of breathing.'],
      ['bvm',8,'Have BVM immediately available if ventilation becomes inadequate.',true],
      ['request-als',6,'Advanced airway and additional treatment may be required.'],
      ['transport',10,'Rapid transport should proceed while treatment continues.',true],
      ['reassess',10,'Frequent airway, breathing, perfusion, and recurrence reassessment is essential.',true]
    ),
    avoid:[{id:'oral-glucose',reason:'Oral intake is inappropriate in a patient with severe airway swelling.'}],
    deterioration:{afterSeconds:90, hr:+10, sbp:-12, spo2:-4, gcs:-2, message:'The patient becomes quieter, more cyanotic, and increasingly drowsy.'},
    responses:{epinephrine:{hr:+4,sbp:+18,spo2:+3,gcs:+1,message:'After epinephrine, perfusion begins to improve. Airway swelling and bronchospasm still require close reassessment.'}, bvm:{spo2:+5,rr:-4,message:'Ventilatory support improves oxygenation.'}, albuterol:{spo2:+2,message:'Bronchodilator may help bronchospasm but does not replace epinephrine in anaphylaxis.'}}
  },
  {
    id:'opioid', title:'Opioid-associated respiratory depression', category:'Medical · Toxicology', difficulty:'Critical',
    patient:'Adult, unknown age', dispatch:'Unresponsive person in a restroom',
    scene:'The patient is supine, cyanotic around the lips, with very slow shallow respirations. Drug paraphernalia is nearby, but the exact substance is unknown.',
    criticalThreat:'Severe hypoventilation. Ventilation is the immediate physiologic problem regardless of cause.',
    baseline:{hr:58, rr:5, spo2:78, sbp:102, dbp:64, gcs:6, glucose:null, etco2:62, temp:36.3, rhythm:'Sinus bradycardia', skin:'Cool / pale', airway:'Needs positioning', lungs:'Shallow / diminished'},
    affectedQueries:['brain','brain stem','lung','trachea'],
    objective:'Prioritize airway positioning and effective ventilation before antidote-first thinking, then use naloxone while considering alternative causes of unresponsiveness.',
    expected: expected(
      ['scene-safety',6,'PPE and sharps awareness are especially important in this scene.'],
      ['primary-assessment',12,'Confirm inadequate breathing and pulse promptly.',true],
      ['airway-position',12,'Open and maintain the airway.',true],
      ['bvm',18,'Provide effective ventilation immediately.',true],
      ['naloxone',10,'Use naloxone for suspected opioid-associated respiratory depression according to protocol.'],
      ['glucometer',5,'Check glucose without delaying ventilation.'],
      ['transport',8,'Monitor for recurrent respiratory depression and alternate pathology.',true],
      ['reassess',9,'Trend ventilation, oxygenation, mental status, and airway protection.',true]
    ),
    avoid:[],
    deterioration:{afterSeconds:75, hr:-8, sbp:-8, spo2:-5, gcs:-1, etco2:+8, message:'Respirations become nearly absent and cyanosis deepens.'},
    responses:{'airway-position':{spo2:+1,message:'The airway is better positioned, but breathing remains inadequate.'}, bvm:{rr:10,spo2:+13,etco2:-12,message:'Effective BVM ventilation produces visible chest rise and improves oxygenation.'}, naloxone:{rr:+6,gcs:+3,spo2:+4,etco2:-8,message:'Respiratory drive and mental status begin to improve. Continue airway support and reassessment.'}}
  },
  {
    id:'asthma', title:'Severe bronchospasm', category:'Medical · Respiratory', difficulty:'Intermediate',
    patient:'19-year-old adult', dispatch:'Severe shortness of breath',
    scene:'The patient is upright, speaking in two- to three-word phrases with accessory muscle use and diffuse expiratory wheezing. A rescue inhaler is nearby.',
    criticalThreat:'Severe bronchospasm with risk of fatigue and respiratory failure.',
    baseline:{hr:122, rr:32, spo2:89, sbp:146, dbp:88, gcs:15, glucose:null, etco2:48, temp:37.0, rhythm:'Sinus tachycardia', skin:'Cool / moist', airway:'Patent', lungs:'Diffuse expiratory wheeze'},
    affectedQueries:['lung','bronchus','trachea','diaphragm'],
    objective:'Recognize severe bronchospasm, administer protocol-authorized bronchodilator therapy, support oxygenation, and watch for signs of fatigue or silent chest.',
    expected: expected(
      ['scene-safety',4,'Standard precautions and quick environmental scan.'],
      ['primary-assessment',12,'Severity is determined by breathing effort, speech, mental status, oxygenation, and ventilation.',true],
      ['stethoscope',5,'Lung sounds help characterize airflow and response to therapy.'],
      ['albuterol',14,'Bronchodilator therapy is indicated when authorized and criteria are met.',true],
      ['oxygen',7,'Support oxygenation based on severity and protocol.'],
      ['bvm',6,'Prepare to assist ventilation if fatigue or inadequate breathing develops.'],
      ['transport',9,'Severe or refractory respiratory distress requires prompt transport.',true],
      ['reassess',10,'Reassess speech, work of breathing, air movement, oxygenation, and mental status.',true]
    ),
    avoid:[],
    deterioration:{afterSeconds:180, hr:+6, rr:-8, spo2:-5, gcs:-2, etco2:+8, message:'The patient is tiring. Wheezing is becoming quieter despite worse air movement.'},
    responses:{albuterol:{rr:-4,spo2:+4,etco2:-4,message:'Air movement improves and the patient can speak longer phrases.'}, oxygen:{spo2:+4,message:'Oxygenation improves, but work of breathing still needs treatment and reassessment.'}, bvm:{spo2:+5,etco2:-6,message:'Assisted ventilation supports a tiring patient.'}}
  },
  {
    id:'stroke', title:'Acute focal neurologic deficit', category:'Medical · Neurologic', difficulty:'Intermediate',
    patient:'71-year-old adult', dispatch:'Sudden weakness and slurred speech',
    scene:'Family reports the patient was normal 35 minutes ago. The patient has facial asymmetry, dysarthria, and weakness in one arm.',
    criticalThreat:'Time-sensitive stroke syndrome. Destination and onset timing directly affect definitive treatment options.',
    baseline:{hr:88, rr:18, spo2:96, sbp:188, dbp:104, gcs:14, glucose:108, etco2:null, temp:36.9, rhythm:'Irregular pulse', skin:'Warm / dry', airway:'Patent', lungs:'Clear'},
    affectedQueries:['brain','cerebrum','carotid artery','arm'],
    objective:'Perform a validated stroke assessment, establish last-known-well, identify glucose mimics, protect the airway, and expedite stroke-system transport.',
    expected: expected(
      ['scene-safety',4,'Establish safety and obtain immediate family history.'],
      ['primary-assessment',10,'Confirm airway, breathing, perfusion, and mental status.',true],
      ['stroke-screen',15,'Document focal neurologic deficits using the local stroke tool.',true],
      ['last-known-well',15,'Last-known-well is a critical treatment-system data point.',true],
      ['glucometer',10,'Hypoglycemia can mimic stroke and must be identified.',true],
      ['transport',12,'Transport rapidly to the protocol-appropriate stroke destination.',true],
      ['prenotify',7,'Stroke prenotification reduces delay to hospital evaluation.'],
      ['reassess',7,'Monitor airway and neurologic changes en route.']
    ),
    avoid:[{id:'oral-glucose',reason:'Do not give oral intake when swallowing safety is uncertain and glucose is not low.'}],
    deterioration:{afterSeconds:300, gcs:-1, message:'Speech becomes slightly more difficult and weakness persists.'},
    responses:{glucometer:{message:'Glucose is 108 mg/dL, making hypoglycemia less likely as the cause.'}}
  },
  {
    id:'hypoglycemia', title:'Confusion with diaphoresis', category:'Medical · Endocrine', difficulty:'Basic',
    patient:'46-year-old adult', dispatch:'Diabetic patient acting strangely',
    scene:'The patient is confused and sweaty on the kitchen floor. Family says diabetes medication was taken but lunch was skipped.',
    criticalThreat:'Neuroglycopenia from severe hypoglycemia with risk of seizure, loss of airway protection, or injury.',
    baseline:{hr:112, rr:18, spo2:97, sbp:138, dbp:82, gcs:13, glucose:42, etco2:null, temp:36.6, rhythm:'Sinus tachycardia', skin:'Cool / sweaty', airway:'Patent', lungs:'Clear'},
    affectedQueries:['brain','pancreas','liver'],
    objective:'Recognize hypoglycemia as a reversible cause of altered mental status, verify glucose, determine whether oral treatment is safe, and reassess for persistent neurologic deficits.',
    expected: expected(
      ['scene-safety',4,'Standard precautions and scene clues.'],
      ['primary-assessment',10,'Altered mental status requires airway and breathing assessment first.',true],
      ['glucometer',16,'Confirm hypoglycemia with a glucose measurement.',true],
      ['oral-glucose',14,'If the patient can safely swallow and protect the airway, oral glucose is appropriate per protocol.',true],
      ['stroke-screen',5,'Persistent deficits after glucose correction warrant neurologic evaluation.'],
      ['reassess',12,'Recheck mental status and glucose according to protocol.',true],
      ['transport',5,'Determine disposition according to response, cause, and local policy.']
    ),
    avoid:[],
    deterioration:{afterSeconds:180, gcs:-2, hr:+6, glucose:-6, message:'The patient becomes increasingly drowsy and less cooperative.'},
    responses:{glucometer:{message:'Glucose confirms severe hypoglycemia.'}, 'oral-glucose':{gcs:+2,glucose:+35,hr:-8,message:'The patient becomes more oriented and less diaphoretic. Continue reassessment.'}}
  },
  {
    id:'hemorrhage', title:'Life-threatening leg hemorrhage', category:'Trauma · Bleeding', difficulty:'Critical',
    patient:'34-year-old adult', dispatch:'Industrial accident with heavy bleeding',
    scene:'A deep lower-leg laceration is producing brisk ongoing bleeding. The floor is visibly blood-stained and the patient is pale, frightened, and weak.',
    criticalThreat:'Catastrophic external hemorrhage with evolving hemorrhagic shock.',
    baseline:{hr:132, rr:26, spo2:96, sbp:92, dbp:58, gcs:15, glucose:null, etco2:null, temp:36.2, rhythm:'Sinus tachycardia', skin:'Pale / cool', airway:'Patent', lungs:'Clear'},
    affectedQueries:['right tibia','right fibula','right leg','popliteal artery','femoral artery'],
    objective:'Control catastrophic bleeding immediately, recognize shock, prevent heat loss, and expedite definitive trauma care.',
    expected: expected(
      ['scene-safety',6,'Ensure machinery hazards are controlled and use PPE.'],
      ['bleeding-control',16,'Catastrophic hemorrhage takes priority over a routine head-to-toe sequence.',true],
      ['tourniquet',18,'A tourniquet is appropriate for life-threatening extremity hemorrhage when indicated.',true],
      ['primary-assessment',10,'Complete ABC assessment immediately after initial hemorrhage control.',true],
      ['blanket',6,'Prevent hypothermia, which can worsen trauma physiology.'],
      ['request-als',5,'Additional resuscitative capability may be useful depending on system.'],
      ['transport',12,'Definitive hemorrhage control requires rapid transport.',true],
      ['reassess',10,'Confirm bleeding remains controlled and reassess perfusion.',true]
    ),
    avoid:[],
    deterioration:{afterSeconds:75, hr:+12, sbp:-14, gcs:-2, message:'Bleeding continues and the patient becomes more confused and weak.'},
    responses:{tourniquet:{hr:-6,sbp:+4,message:'Visible bleeding stops after proper tourniquet placement. Shock still requires rapid transport and reassessment.'}, 'pressure-dressing':{message:'Pressure dressing alone is not reliably controlling this catastrophic extremity bleed.'}, blanket:{temp:+0.1,message:'The patient is covered to reduce heat loss.'}}
  },
  {
    id:'penetrating-chest', title:'Penetrating chest trauma', category:'Trauma · Chest', difficulty:'Critical',
    patient:'29-year-old adult', dispatch:'Stabbing with breathing difficulty',
    scene:'The patient has a penetrating wound to the right anterior chest, severe dyspnea, and diminished breath sounds on that side. There is bubbling at the wound.',
    criticalThreat:'Open chest injury with risk of worsening pneumothorax, hypoxia, and shock.',
    baseline:{hr:126, rr:32, spo2:87, sbp:98, dbp:62, gcs:15, glucose:null, etco2:null, temp:36.4, rhythm:'Sinus tachycardia', skin:'Pale / clammy', airway:'Patent', lungs:'Right diminished'},
    affectedQueries:['right lung','right pleura','rib','thorax'],
    objective:'Identify an open chest wound, seal it appropriately, support breathing, monitor for deterioration, and transport rapidly.',
    expected: expected(
      ['scene-safety',8,'Scene safety is essential in violent trauma.'],
      ['primary-assessment',12,'Rapidly assess airway, breathing, hemorrhage, perfusion, and mental status.',true],
      ['chest-seal',16,'Seal the open chest wound using protocol-appropriate equipment.',true],
      ['oxygen',7,'Support oxygenation.'],
      ['request-als',6,'Advanced interventions may become necessary with deterioration.'],
      ['transport',14,'This patient needs rapid trauma-system transport.',true],
      ['reassess',12,'Monitor respiratory status after seal placement and watch for worsening physiology.',true]
    ),
    avoid:[],
    deterioration:{afterSeconds:120, hr:+8, sbp:-12, spo2:-5, gcs:-1, message:'Dyspnea worsens and the patient becomes increasingly restless.'},
    responses:{'chest-seal':{spo2:+2,message:'The open wound is covered. Continue close respiratory reassessment for deterioration.'}, oxygen:{spo2:+4,message:'Oxygenation improves somewhat, but the underlying injury remains time-sensitive.'}}
  },
  {
    id:'pulmonary-edema', title:'Acute pulmonary edema', category:'Medical · Respiratory/Cardiac', difficulty:'Advanced',
    patient:'67-year-old adult', dispatch:'Severe shortness of breath',
    scene:'The patient is sitting bolt upright, markedly dyspneic, with diffuse crackles, cool clammy skin, and a history of heart failure.',
    criticalThreat:'Severe respiratory distress likely from cardiogenic pulmonary edema with risk of respiratory failure.',
    baseline:{hr:118, rr:34, spo2:82, sbp:176, dbp:106, gcs:15, glucose:null, etco2:34, temp:36.8, rhythm:'Sinus tachycardia', skin:'Cool / clammy', airway:'Patent', lungs:'Diffuse crackles'},
    affectedQueries:['lung','heart','left ventricle','pulmonary vein'],
    objective:'Recognize pulmonary edema, support oxygenation and ventilation, consider CPAP when criteria are met, and expedite advanced care.',
    expected: expected(
      ['scene-safety',4,'Standard precautions.'],
      ['primary-assessment',12,'Respiratory severity and fatigue risk are immediate priorities.',true],
      ['stethoscope',5,'Auscultation supports the pulmonary-edema pattern.'],
      ['oxygen',8,'Treat hypoxemia.'],
      ['cpap',16,'CPAP can improve oxygenation and work of breathing in appropriate patients when authorized.',true],
      ['request-als',7,'Advanced treatment may be required.'],
      ['transport',10,'Do not prolong scene time in severe respiratory distress.',true],
      ['reassess',10,'Trend mental status, oxygenation, blood pressure, and tolerance of CPAP.',true]
    ),
    avoid:[],
    deterioration:{afterSeconds:150, rr:+4, spo2:-4, gcs:-1, message:'The patient is tiring and can no longer speak complete sentences.'},
    responses:{cpap:{rr:-7,spo2:+9,message:'Work of breathing decreases and oxygen saturation improves. Continue monitoring blood pressure and tolerance.'}, oxygen:{spo2:+4,message:'Oxygenation improves somewhat, but respiratory mechanics remain poor.'}}
  },
  {
    id:'cardiac-arrest', title:'Witnessed adult cardiac arrest', category:'Resuscitation', difficulty:'Critical',
    patient:'52-year-old adult', dispatch:'Person collapsed, not breathing normally',
    scene:'Bystanders saw a sudden collapse less than two minutes ago. The patient is unresponsive with agonal respirations and no palpable pulse.',
    criticalThreat:'Cardiac arrest. High-quality CPR and early defibrillation dominate the first minutes.',
    baseline:{hr:0, rr:0, spo2:null, sbp:0, dbp:0, gcs:3, glucose:null, etco2:null, temp:36.7, rhythm:'Unknown until AED', skin:'Pale / cyanotic', airway:'Unresponsive', lungs:'No effective breathing'},
    affectedQueries:['heart','brain','sternum','lung'],
    objective:'Minimize delay to compressions and AED analysis, provide coordinated ventilation, and avoid unnecessary interruptions.',
    expected: expected(
      ['scene-safety',5,'Rapid safety check and PPE.'],
      ['primary-assessment',14,'Confirm unresponsiveness, abnormal breathing, and pulselessness according to training.',true],
      ['cpr',20,'Immediate high-quality chest compressions are essential.',true],
      ['aed',20,'Early rhythm analysis and defibrillation when indicated improve survival.',true],
      ['bvm',10,'Coordinate effective ventilation with resuscitation.',true],
      ['request-als',5,'Activate additional resuscitation resources.'],
      ['reassess',8,'Continue protocol-directed cycles with minimal interruption.',true]
    ),
    avoid:[{id:'transport',reason:'Immediate transport before establishing effective resuscitation may be inappropriate in many systems; follow local cardiac-arrest protocol.'}],
    deterioration:{afterSeconds:9999, message:'Cardiac arrest continues until effective resuscitation actions occur.'},
    responses:{cpr:{etco2:18,message:'High-quality compressions are underway.'}, aed:{message:'AED attached. Follow device prompts and minimize pauses around analysis/shock.'}, bvm:{message:'Ventilations are coordinated with the resuscitation.'}}
  },
  {
    id:'seizure', title:'Generalized seizure, now postictal', category:'Medical · Neurologic', difficulty:'Basic',
    patient:'31-year-old adult', dispatch:'Active seizure',
    scene:'On arrival, tonic-clonic activity has just stopped. The patient is confused, breathing spontaneously, and has a small amount of oral secretions.',
    criticalThreat:'Postictal airway compromise, hypoxia, recurrent seizure, trauma, or a reversible cause such as hypoglycemia.',
    baseline:{hr:116, rr:22, spo2:93, sbp:142, dbp:84, gcs:11, glucose:96, etco2:null, temp:37.2, rhythm:'Sinus tachycardia', skin:'Warm / sweaty', airway:'Secretions present', lungs:'Clear'},
    affectedQueries:['brain','mouth','tongue','lung'],
    objective:'Protect the patient from injury, manage airway/secretions, assess reversible causes, and reassess neurologic recovery.',
    expected: expected(
      ['scene-safety',5,'Protect yourself and create a safe area around the patient.'],
      ['primary-assessment',12,'Postictal airway and breathing require immediate attention.',true],
      ['suction',8,'Suction secretions if they threaten the airway.'],
      ['glucometer',8,'Glucose is a key reversible cause of seizure/altered mental status.'],
      ['full-vitals',5,'Look for hypoxia, fever, perfusion changes, and other clues.'],
      ['history',5,'Ask witnesses about duration, prior seizures, medications, toxins, and trauma.'],
      ['transport',7,'Transport decision depends on recovery, cause, recurrence, and protocol.'],
      ['reassess',10,'Monitor for recurrent seizure and improving mental status.',true]
    ),
    avoid:[{id:'oral-glucose',reason:'Do not place oral glucose or other objects in the mouth of a patient who cannot safely swallow.'}],
    deterioration:{afterSeconds:240, spo2:-2, message:'Secretions persist and the patient remains confused.'},
    responses:{suction:{spo2:+2,message:'Oral secretions are cleared and airway sounds improve.'}, glucometer:{message:'Glucose is 96 mg/dL.'}}
  },
  {
    id:'heat-stroke', title:'Exertional heat stroke', category:'Environmental', difficulty:'Advanced',
    patient:'20-year-old adult', dispatch:'Collapsed athlete in extreme heat',
    scene:'The patient collapsed during a race, is confused and combative, and is extremely hot to the touch. Teammates report progressive confusion before collapse.',
    criticalThreat:'Hyperthermia with central nervous system dysfunction — a time-critical heat emergency.',
    baseline:{hr:148, rr:30, spo2:97, sbp:104, dbp:64, gcs:12, glucose:118, etco2:null, temp:41.2, rhythm:'Sinus tachycardia', skin:'Hot / flushed', airway:'Patent', lungs:'Clear'},
    affectedQueries:['brain','skin','heart'],
    objective:'Recognize heat stroke from hyperthermia plus CNS dysfunction, begin rapid cooling without delaying transport-system priorities, and reassess temperature and mental status.',
    expected: expected(
      ['scene-safety',4,'Move to a safe cooling environment and use PPE.'],
      ['primary-assessment',10,'Confirm airway, breathing, perfusion, and neurologic status.',true],
      ['thermometer',10,'Accurate temperature assessment supports recognition and treatment trending.',true],
      ['glucometer',4,'Check for a glucose mimic in altered mental status.'],
      ['position-comfort',4,'Position and protect the altered patient safely.'],
      ['transport',10,'Coordinate rapid cooling and definitive care according to local protocol.',true],
      ['reassess',10,'Trend temperature, mental status, perfusion, and airway.',true]
    ),
    avoid:[{id:'blanket',reason:'Routine warming is inappropriate in a hyperthermic heat-stroke patient.'}],
    deterioration:{afterSeconds:180, hr:+6, sbp:-10, gcs:-2, temp:+0.2, message:'The patient becomes less responsive as hyperthermia persists.'},
    responses:{thermometer:{message:'Temperature confirms severe hyperthermia.'}}
  },
  {
    id:'burns', title:'Partial-thickness burns with airway concern', category:'Trauma · Burns', difficulty:'Advanced',
    patient:'41-year-old adult', dispatch:'House fire victim',
    scene:'The patient escaped an enclosed-space fire. There are painful burns to the anterior torso and both arms, soot around the mouth, and a progressively hoarse voice.',
    criticalThreat:'Burn injury with possible inhalation injury and evolving airway edema.',
    baseline:{hr:124, rr:26, spo2:94, sbp:118, dbp:74, gcs:15, glucose:null, etco2:null, temp:36.0, rhythm:'Sinus tachycardia', skin:'Burned / warm', airway:'Hoarse — concerning', lungs:'Scattered wheeze'},
    affectedQueries:['skin','chest','arm','larynx','trachea'],
    objective:'Identify inhalation-injury warning signs, estimate burn severity, support airway/oxygenation, prevent hypothermia, and transport to the appropriate destination.',
    expected: expected(
      ['scene-safety',10,'Ensure fire, smoke, and structural hazards are controlled.',true],
      ['primary-assessment',14,'Airway changes after an enclosed-space burn can progress rapidly.',true],
      ['burn-assessment',10,'Estimate extent, depth, locations, circumferential involvement, and associated trauma.'],
      ['oxygen',8,'Support oxygenation according to inhalation-exposure protocol.'],
      ['burn-sheet',7,'Cover burns with appropriate dry sterile material and avoid hypothermia.'],
      ['blanket',5,'Temperature management is important after significant burns.'],
      ['request-als',6,'Airway deterioration may require advanced management.'],
      ['transport',12,'Destination and early transport are important for significant burns/inhalation injury.',true],
      ['reassess',10,'Repeat airway, breathing, voice, and perfusion assessment.',true]
    ),
    avoid:[{id:'cold-pack',reason:'Large-area aggressive cooling can worsen hypothermia; follow burn protocol.'}],
    deterioration:{afterSeconds:150, rr:+4, spo2:-3, gcs:-1, message:'Hoarseness worsens and the patient is having more difficulty moving air.'},
    responses:{oxygen:{spo2:+3,message:'Oxygenation improves, but airway swelling remains a concern.'}, 'burn-sheet':{message:'Burns are protected while avoiding unnecessary cooling.'}, blanket:{temp:+0.2,message:'Heat loss is reduced.'}}
  },
  {
    id:'femur-fracture', title:'Isolated mid-shaft femur fracture', category:'Trauma · Orthopedic', difficulty:'Intermediate',
    patient:'27-year-old adult', dispatch:'Motorcycle crash',
    scene:'The patient is alert after a low-speed collision. One thigh is visibly deformed and very painful. There is no obvious major external bleeding.',
    criticalThreat:'Potential significant occult blood loss, neurovascular compromise, and pain from a major long-bone fracture.',
    baseline:{hr:116, rr:22, spo2:98, sbp:112, dbp:72, gcs:15, glucose:null, etco2:null, temp:36.5, rhythm:'Sinus tachycardia', skin:'Pale / dry', airway:'Patent', lungs:'Clear'},
    affectedQueries:['femur','thigh','femoral artery'],
    objective:'Perform a complete trauma assessment, check distal neurovascular function, select appropriate splinting, and reassess after immobilization.',
    expected: expected(
      ['scene-safety',6,'Traffic and mechanism hazards must be controlled.'],
      ['primary-assessment',10,'Exclude immediate ABC threats and major bleeding.',true],
      ['spinal-assessment',5,'Use local selective spinal motion restriction criteria.'],
      ['full-vitals',5,'Assess for shock and establish a trend.'],
      ['traction-splint',14,'Traction splinting may be appropriate for a qualifying isolated mid-shaft femur injury under protocol.',true],
      ['blanket',4,'Prevent heat loss.'],
      ['transport',8,'Transport for definitive orthopedic and trauma evaluation.'],
      ['reassess',10,'Repeat distal circulation, sensation, movement, pain, and vitals after splinting.',true]
    ),
    avoid:[{id:'tourniquet',reason:'A tourniquet is not indicated without life-threatening external extremity hemorrhage.'}],
    deterioration:{afterSeconds:300, hr:+6, sbp:-8, message:'Pain and pallor increase; occult blood loss remains a concern.'},
    responses:{'traction-splint':{hr:-5,message:'The limb is stabilized and pain improves somewhat. Recheck distal neurovascular status.'}, 'sam-splint':{message:'A moldable splint may not provide the intended traction for a qualifying isolated mid-shaft femur fracture; follow device/protocol selection.'}}
  }
]

export const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((scenario) => [scenario.id, scenario]))

export function cloneVitals(vitals) { return { ...vitals } }

export function applyVitalDelta(vitals, delta = {}) {
  const next = { ...vitals }
  for (const [key, value] of Object.entries(delta)) {
    if (key === 'message' || value == null) continue
    if (typeof value === 'number' && typeof next[key] === 'number') next[key] += value
    else next[key] = value
  }
  if (typeof next.hr === 'number') next.hr = Math.max(0, Math.round(next.hr))
  if (typeof next.rr === 'number') next.rr = Math.max(0, Math.round(next.rr))
  if (typeof next.spo2 === 'number') next.spo2 = Math.max(0, Math.min(100, Math.round(next.spo2)))
  if (typeof next.sbp === 'number') next.sbp = Math.max(0, Math.round(next.sbp))
  if (typeof next.dbp === 'number') next.dbp = Math.max(0, Math.round(next.dbp))
  if (typeof next.gcs === 'number') next.gcs = Math.max(3, Math.min(15, Math.round(next.gcs)))
  if (typeof next.glucose === 'number') next.glucose = Math.max(0, Math.round(next.glucose))
  if (typeof next.etco2 === 'number') next.etco2 = Math.max(0, Math.round(next.etco2))
  if (typeof next.temp === 'number') next.temp = Math.round(next.temp * 10) / 10
  return next
}
