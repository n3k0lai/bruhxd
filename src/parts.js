import { PropertyBinding } from 'three';

// Parts registry for Miia (2018 Mazda MX-5 ND Club).
//
// The glTF groups geometry by material rather than by physical part, so one
// mesh can hold several real parts (e.g. "Body kit" is every painted panel).
// Each entry below is the smallest addressable unit the current model allows.
// Splitting finer (hood vs. doors vs. trunk lid) needs the .blend re-segmented.
//
// Fields
//   id        stable key, used in URLs / API / future docs (?part=soft-top)
//   label     human name
//   category  exterior | wheels | chassis | interior | lighting | scenery
//   meshes    exact glTF node names
//   material  palette key from materials.js; null keeps the glTF material
//   anchor    hotspot position. 'auto' = centre of the part's bounding box,
//             [x, y, z] = normalised car box (x +1 = driver/left side,
//             y 0 = ground .. 1 = top, z -1 = rear .. +1 = nose), null = no hotspot
//   notes     free text for documentation
//   changed   why the material differs from the original site, if it does

export const PARTS = [
    // ── exterior ──────────────────────────────────────────────
    { id: 'body', label: 'Body panels', category: 'exterior',
      meshes: ['Body kit', 'Body kit -- Internal'], material: 'PearlWhite', anchor: [1.0, 0.45, 0.05],
      notes: 'Pearl white paint (Mazda Snowflake White Pearl Mica, 25D, confirm on the door-jamb label). Single mesh: hood, fenders, doors, trunk lid, bumpers.' },
    { id: 'soft-top', label: 'Soft top (stowed)', category: 'exterior',
      meshes: ['Soft Top'], material: null, anchor: [0, 0.75, -0.42], notes: 'Manual cloth top, folded.' },
    { id: 'wind-blocker', label: 'Wind blocker (between roll hoops)', category: 'interior',
      meshes: ['Back top-down panel'], material: 'MaroonCloth', anchor: 'auto',
      notes: 'Mesh panel between the headrests / roll hoops.' },
    { id: 'glass', label: 'Windshield & glass', category: 'exterior',
      meshes: ['Glass Parts 1'], material: 'Glass', anchor: [0, 0.82, 0.12], notes: '' },
    { id: 'windshield-trim', label: 'Windshield frame trim', category: 'exterior',
      meshes: ['Glass Windshield Trim'], material: 'BlackPlastic', anchor: null, notes: '',
      changed: 'Was caught by the "glass" rule and rendered as clear glass; it is the black A-pillar/header trim.' },
    { id: 'mirrors', label: 'Mirrors', category: 'exterior',
      meshes: ['Side & Rearvide Mirrors'], material: 'PearlWhite', anchor: [1.0, 0.66, 0.2],
      notes: 'Side mirrors and interior rear-view mirror share one mesh.',
      changed: 'Was chrome. ND mirror caps are body colour. Interior mirror shares the mesh, so it is pearl too until the mesh is split.' },
    { id: 'grille', label: 'Grille, vents & radiator', category: 'exterior',
      meshes: ['Vents / Grills', 'Front Grill Corner Accents', 'Radiator'], material: 'BlackPlastic', anchor: [0, 0.28, 1.0],
      notes: 'Upper grille, corner intakes, radiator face.',
      changed: 'Had no material (rendered default light grey). ND grille is black.' },
    { id: 'lower-trim', label: 'Lower trim & dark exterior accents', category: 'exterior',
      meshes: ['Corner Accents', 'Trimming 1'], material: null, anchor: [1.0, 0.12, 0.62],
      notes: 'Lower bumper/sill trim. Club aero (front air dam, side sills, rear lip) is not modelled.',
      changed: '"Corner Accents" had no material (light grey); now BlackPlastic via override below.', overrides: { 'Corner Accents': 'BlackPlastic' } },
    { id: 'emblems', label: 'Emblems', category: 'exterior',
      meshes: ['Chrome Emblems'], material: 'Chrome', anchor: null, notes: '' },
    { id: 'front-plate', label: 'Front plate (offset)', category: 'exterior',
      meshes: ['front plate'], material: null, anchor: 'auto', notes: 'BRUHXD plate, offset mount.' },
    { id: 'rear-plate', label: 'Rear plate', category: 'exterior',
      meshes: ['rear plate'], material: null, anchor: 'auto', notes: 'BRUHXD plate.' },
    { id: 'antenna', label: 'Antenna', category: 'exterior',
      meshes: ['Antannae'], material: 'BlackPlastic', anchor: 'auto', notes: 'Rear fender mast.' },
    { id: 'exhaust', label: 'Exhaust tips', category: 'exterior',
      meshes: ['exhaust'], material: 'RawMetal', anchor: 'auto', notes: 'Dual tips.' },

    // ── lighting ──────────────────────────────────────────────
    { id: 'headlights', label: 'Headlights', category: 'lighting',
      meshes: ['Headlight accents'], material: null, anchor: [0.72, 0.56, 0.9], notes: 'LED headlights.' },
    { id: 'signals', label: 'Front lamps / side signals', category: 'lighting',
      meshes: ['side-body signals'], material: null, anchor: null, notes: '' },
    { id: 'taillights', label: 'Tail lights', category: 'lighting',
      meshes: ['Brake Lights', 'Brake light Accents'], material: 'RedGlass', anchor: [0.66, 0.6, -0.95], notes: '' },

    // ── wheels & chassis ─────────────────────────────────────
    { id: 'wheels', label: 'Wheels', category: 'wheels',
      meshes: ['Rims'], material: 'BlackMetal', anchor: [1.0, 0.22, 0.7], notes: 'Dark wheels. All four share one mesh.' },
    { id: 'tyres', label: 'Tyres', category: 'wheels',
      meshes: ['Tyres'], material: null, anchor: null, notes: '' },
    { id: 'brakes', label: 'Brake rotors', category: 'wheels',
      meshes: ['Brake Rotors'], material: 'RawMetal', anchor: null, notes: '' },
    { id: 'suspension', label: 'Suspension', category: 'chassis',
      meshes: ['Suspension'], material: 'RawMetal', anchor: null, notes: '' },
    { id: 'chassis', label: 'Chassis / underbody', category: 'chassis',
      meshes: ['Vehicle base'], material: 'RawMetal', anchor: null, notes: '' },

    // ── interior ──────────────────────────────────────────────
    { id: 'seats', label: 'Seats', category: 'interior',
      meshes: ['Seats Base', 'Seat Back Headrest', 'Seat Accents'], material: 'BlackCloth', anchor: [0.48, 0.62, -0.18],
      notes: 'Headrests carry the speakers on the real car.' },
    { id: 'seatbelts', label: 'Seatbelts', category: 'interior',
      meshes: ['Seatbelts'], material: 'BlackCloth', anchor: null,
      notes: 'Retractors sit in the rear bulkhead. Keep carpet and storage clear of the webbing path and pretensioner.' },
    { id: 'dashboard', label: 'Dashboard & gauges', category: 'interior',
      meshes: ['Dashboard', 'Dashboard Main Console', 'Dashboard Dials', 'Dashboard Dials Accents',
               'Dashboard UI Accents 1', 'Dashboard UI Accents 2', 'Dashboard UI Accents 3'], material: 'BlackPlastic', anchor: null, notes: '' },
    { id: 'infotainment', label: 'Infotainment (MZD Connect)', category: 'interior',
      meshes: ['Infotainment Display', 'Dasboard Infotainments Controls and buttons'], material: 'BlackPlastic', anchor: 'auto',
      notes: 'CMU screen and commander knob.' },
    { id: 'steering', label: 'Steering wheel', category: 'interior',
      meshes: ['Steering Wheel'], material: 'BlackPlastic', anchor: 'auto', notes: '' },
    { id: 'shifter', label: 'Shifter', category: 'interior',
      meshes: ['Shifter brace', 'Shifter Accent'], material: 'BlackPlastic', anchor: null, notes: '6-speed manual.' },
    { id: 'speakers', label: 'Speaker modules', category: 'interior',
      meshes: ['Speaker Modules'], material: 'BlackPlastic', anchor: null, notes: '',
      changed: 'Had no material (light grey).' },
    { id: 'floormats', label: 'Floor mats', category: 'interior',
      meshes: ['Floormats'], material: 'BlackCloth', anchor: null, notes: '' },
    { id: 'cabin-trim', label: 'Cabin trim', category: 'interior',
      meshes: ['Internal Top Trimming', 'Controls 1', 'Accent Trimming', 'Door Armrest', 'Internals',
               'Internal chromatic parts', 'Door Internal Panels', 'Cabin Parts', 'Small Details',
               'Internal Cabin', 'Trimming 2', 'Additional Chromatic Accents'], material: null, anchor: null,
      notes: 'Door cards, armrests, console, bulkhead trim.',
      changed: 'Parts with no material (light grey) now BlackPlastic, chrome-named ones Chrome.',
      overrides: { 'Controls 1': 'BlackPlastic', 'Accent Trimming': 'BlackPlastic', 'Door Armrest': 'BlackPlastic',
                   'Door Internal Panels': 'BlackPlastic', 'Small Details': 'BlackPlastic', 'Internal Cabin': 'BlackPlastic',
                   'Trimming 2': 'BlackPlastic', 'Internal chromatic parts': 'Chrome', 'Additional Chromatic Accents': 'Chrome' } },

    // ── scenery from the source .blend (hidden) ──────────────
    { id: 'scenery', label: 'Studio floor & backdrop', category: 'scenery',
      meshes: ['Floor', 'backdrop'], material: null, anchor: null, hidden: true, notes: 'Left over from the source scene.' },
];

// GLTFLoader sanitises node names (spaces -> "_", drops "/" etc.), so key the
// lookup by the sanitised form and compare objects the same way.
export const meshKey = (name) => PropertyBinding.sanitizeNodeName(name);
export const PART_BY_MESH = new Map();
for (const p of PARTS) for (const m of p.meshes) PART_BY_MESH.set(meshKey(m), p);
