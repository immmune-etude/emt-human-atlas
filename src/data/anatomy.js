export const MODEL_MANIFEST_URL = 'https://raw.githubusercontent.com/ashemag/human-atlas/main/public/models/atlas.json'
export const MODEL_BASE_URL = 'https://raw.githubusercontent.com/ashemag/human-atlas/main/public/models'

export const SYSTEMS = [
  { id: 'skeletal', name: 'Skeleton', color: '#e3dcc1', description: 'Bones, joints, and the supporting framework used for trauma localization and movement assessment.' },
  { id: 'muscular', name: 'Muscles', color: '#a95f56', description: 'Skeletal muscle groups that generate movement and may be involved in strain, crush, burn, and traumatic injury.' },
  { id: 'cardiac', name: 'Heart', color: '#bd615b', description: 'The cardiac pump and central structures relevant to perfusion, arrest, and ischemic complaints.' },
  { id: 'sensory', name: 'Sensory organs', color: '#a8c1c7', description: 'Structures of sight, hearing, and balance that may be assessed in neurologic or traumatic complaints.' },
  { id: 'arterial', name: 'Arteries', color: '#c95548', description: 'Arterial circulation, especially important in hemorrhage, perfusion, pulse checks, and vascular emergencies.' },
  { id: 'venous', name: 'Veins', color: '#587ea1', description: 'Venous circulation and return pathways relevant to bleeding, edema, and vascular assessment.' },
  { id: 'nervous', name: 'Nervous system', color: '#d5b667', description: 'Brain, spinal cord, and peripheral nerves involved in consciousness, movement, sensation, and autonomic function.' },
  { id: 'respiratory', name: 'Respiratory', color: '#bb8e97', description: 'Upper and lower airways, lungs, and structures relevant to oxygenation and ventilation.' },
  { id: 'digestive', name: 'Digestive', color: '#b6926e', description: 'Abdominal viscera relevant to pain, bleeding, trauma, vomiting, and metabolic complaints.' },
  { id: 'urinary', name: 'Urinary', color: '#b67d68', description: 'Kidneys, ureters, bladder, and urinary structures relevant to abdominal, pelvic, and systemic complaints.' },
  { id: 'lymphatic', name: 'Lymphatic', color: '#879d7e', description: 'Lymphatic and immune structures that help contextualize swelling and systemic illness.' },
  { id: 'endocrine', name: 'Endocrine', color: '#c5a19c', description: 'Hormone-producing organs involved in glucose regulation, stress responses, and metabolic emergencies.' },
  { id: 'reproductive', name: 'Reproductive', color: '#bda19c', description: 'Reproductive anatomy represented in the adult male BodyParts3D reference.' },
  { id: 'integumentary', name: 'Body surface', color: '#ba9b7d', description: 'Outer body surface used as a spatial reference for burns, wounds, hemorrhage, and surface findings.' },
  { id: 'connective', name: 'Connective tissue', color: '#adc1ba', description: 'Ligaments, cartilage, and other supporting tissues involved in stability and musculoskeletal injury.' },
]

export const DEFAULT_VISIBLE = SYSTEMS.filter((s) => s.id !== 'integumentary').map((s) => s.id)
export const SYSTEM_MAP = Object.fromEntries(SYSTEMS.map((s) => [s.id, s]))
export const QUICK_STRUCTURES = ['heart','brain','lung','trachea','femur','humerus','liver','spleen','stomach','kidney','urinary bladder','aorta','carotid artery','spinal cord','diaphragm']

export const EMT_STRUCTURE_NOTES = {
  heart: 'Consider perfusion, rhythm, cardiac arrest, ischemia, and shock. Chest complaints require rapid assessment and destination planning.',
  brain: 'Assess mental status, speech, pupils, motor symmetry, glucose when indicated, onset time, and seizure or trauma history.',
  lung: 'Assess respiratory rate, depth, effort, chest rise, lung sounds, oxygenation, and signs of fatigue or asymmetry.',
  trachea: 'Airway patency and position matter in trauma and severe respiratory distress. Do not delay airway support for a detailed exam.',
  femur: 'Femur injury can hide significant blood loss. Check deformity, bleeding, distal circulation, sensation, and movement.',
  humerus: 'Assess deformity, bleeding, tenderness, and distal neurovascular status before and after splinting.',
  liver: 'Right upper abdominal trauma can involve major internal bleeding. Monitor perfusion and transport priority.',
  spleen: 'Left upper abdominal trauma can produce concealed hemorrhage and referred pain. Reassess for shock.',
  kidney: 'Flank pain or trauma can involve renal injury, bleeding, or urinary findings. Evaluate mechanism and perfusion.',
  aorta: 'Major vascular pathology can present with abrupt chest, back, or abdominal pain and shock. Rapid transport is critical.',
  'spinal cord': 'Assess motor and sensory function with trauma. Use spinal motion restriction according to mechanism, findings, and protocol.',
  diaphragm: 'The diaphragm is the primary muscle of ventilation. Fatigue or impaired movement can contribute to respiratory failure.',
}

export function noteForStructure(name = '', system = '') {
  const lower = name.toLowerCase()
  const key = Object.keys(EMT_STRUCTURE_NOTES).find((item) => lower.includes(item))
  return key ? EMT_STRUCTURE_NOTES[key] : (SYSTEM_MAP[system]?.description || 'Use anatomy findings in context with the patient presentation, mechanism, vital signs, and local EMS protocol.')
}

export function remoteModelUrl(url = '') {
  const file = url.split('/').pop()
  return `${MODEL_BASE_URL}/${file}`
}
