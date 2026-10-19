import { PropertyBinding } from 'three';

// Parts registry for Miia: 2018 Mazda MX-5 Miata Club convertible (ND) with the
// Brembo/BBS package, Ceramic Metallic (47A). Black BBS forged wheels, red
// Brembo front calipers (rears painted red to match), maroon soft top, black
// interior, stock Bilstein dampers.
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
//   carve     [{ from, name, min, max }]: split triangles inside a box out of a
//             merged mesh into a new mesh `name` (car.js carveMesh)
//   mod       menu toggle that shows/hides the part (mods.js)
//   changed   why the material differs from the original site, if it does

// Per-wheel carve boxes for a merged wheel mesh (all four wheels share one
// mesh), so each wheel (and its caliper) can be fitted on its own.
const quadrants = (from) => [['FL', 1, 1], ['FR', -1, 1], ['RL', 1, -1], ['RR', -1, -1]].map(([k, sx, sz]) => ({
    from, name: `${from}-${k}`,
    min: [sx > 0 ? 0 : -2, -1, sz > 0 ? 0 : -3], max: [sx > 0 ? 2 : 0, 2, sz > 0 ? 3 : 0],
}));
const wheelMeshes = (from) => [from, ...['FL', 'FR', 'RL', 'RR'].map((k) => `${from}-${k}`)];

// Seat bolsters / headrest fronts inside "Internals": whole pieces in a box
// around each seat back and each cushion's side bolsters (mirrored per side),
// minus rear-facing triangles (the hard seat-back shell).
const seatBolsters = () => [1, -1].flatMap((s) => [
    { min: [0.08, 0.25, -0.8], max: [0.68, 1.2, -0.4] },   // back + headrest
    { min: [0.08, 0.2, -0.6], max: [0.68, 0.45, 0.05] },   // cushion bolsters
].map(({ min, max }) => ({
    from: 'Internals', name: 'seat-bolsters', whole: true, keepFacing: { dir: [0, 0, -1], dot: 0.5 },
    min: [s > 0 ? min[0] : -max[0], min[1], min[2]], max: [s > 0 ? max[0] : -min[0], max[1], max[2]],
})));

export const PARTS = [
    // ── exterior ──────────────────────────────────────────────
    { id: 'body', label: 'Body panels', category: 'exterior',
      meshes: ['Body kit', 'Body kit -- Internal'], material: 'MiiaSilver', anchor: [1.0, 0.45, 0.05],
      notes: 'Light muted silver with a pearl shimmer (Mazda Ceramic Metallic, paint code 47A). Single mesh: hood, fenders, doors, trunk lid, bumpers.',
      changed: 'Was PearlWhite (bright white). Retuned to MiiaSilver to match the real paint.' },
    { id: 'soft-top', label: 'Soft top (stowed)', category: 'exterior',
      meshes: ['Soft Top'], material: 'MaroonTop', anchor: [0, 0.75, -0.42],
      notes: 'Manual cloth top in deep maroon, folded. Only the stowed top is modelled.',
      changed: 'Was the glTF default; now maroon fabric.' },
    { id: 'wind-blocker', label: 'Wind blocker (between roll hoops)', category: 'interior',
      meshes: ['Back top-down panel', 'wind-blocker-frame'], material: 'BlackCloth', anchor: 'auto',
      carve: [{ from: 'Controls 1', name: 'wind-blocker-frame', min: [-0.26, 0.89, -0.86], max: [0.26, 1.02, -0.77] }],
      overrides: { 'wind-blocker-frame': 'BlackPlastic' }, mod: 'hoops',
      notes: 'Mesh panel between the headrests / roll hoops, with its frame (carved out of "Controls 1"). It clips to the hoop covers, so it is hidden with them.',
      changed: 'Was maroon; the maroon is the soft top, the interior is black.' },
    { id: 'glass', label: 'Windshield & glass', category: 'exterior',
      meshes: ['Glass Parts 1'], material: 'Glass', anchor: [0, 0.82, 0.12], notes: '' },
    { id: 'windshield-trim', label: 'Windshield frame trim', category: 'exterior',
      meshes: ['Glass Windshield Trim'], material: 'BlackPlastic', anchor: null, notes: '',
      changed: 'Was caught by the "glass" rule and rendered as clear glass; it is the black A-pillar/header trim.' },
    { id: 'mirrors', label: 'Mirrors', category: 'exterior',
      meshes: ['mirror-caps', 'Side & Rearvide Mirrors'], material: 'PianoBlack', anchor: [1.0, 0.66, 0.2],
      carve: [1, -1].map((s) => ({ from: 'Body kit', name: 'mirror-caps', whole: true,
          min: [s > 0 ? 0.75 : -1.0, 0.75, -0.06], max: [s > 0 ? 1.0 : -0.75, 0.95, 0.2] })),
      overrides: { 'Side & Rearvide Mirrors': 'MirrorGlass' },
      notes: 'Mirror caps are gloss black on Miia (like the ND Club); the drawer / ?mirrors=pearl switches them to the body pearl. The caps were part of the body mesh and are carved out at load (whole piece only, so no panel slivers). "Side & Rearvide Mirrors" is only the glass faces (both side mirrors and the interior mirror). Housing backs and arms are in "Trimming 1" (black plastic).',
      changed: 'Was body-colour caps with silver-painted glass; now gloss-black caps and mirror glass.' },
    { id: 'grille', label: 'Grille, vents & radiator', category: 'exterior',
      meshes: ['Vents / Grills', 'Front Grill Corner Accents', 'Radiator'], material: 'BlackPlastic', anchor: [0, 0.28, 1.0],
      notes: 'Upper grille, corner intakes, radiator face.',
      changed: 'Had no material (rendered default light grey). ND grille is black.' },
    { id: 'lower-trim', label: 'Lower trim & dark exterior accents', category: 'exterior',
      meshes: ['Corner Accents', 'Trimming 1'], material: null, anchor: [1.0, 0.12, 0.62],
      notes: 'Lower bumper/sill trim. Club aero (front air dam, side sills, rear lip) is not modelled.',
      changed: '"Corner Accents" (no material, light grey) and "Trimming 1" (glTF Darkparts grey) now BlackPlastic.', overrides: { 'Corner Accents': 'BlackPlastic', 'Trimming 1': 'BlackPlastic' } },
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
    { id: 'wheels', label: 'Wheels (BBS forged, black)', category: 'wheels',
      meshes: wheelMeshes('Rims'), carve: quadrants('Rims'), material: 'BBSBlack', anchor: [1.0, 0.22, 0.7],
      notes: 'BBS 17in forged wheels in black (Brembo/BBS package). All four share one mesh; the spoke design is the source model\'s, not the BBS pattern.',
      changed: 'Was BlackMetal (mirror-finish black); now satin-gloss forged black.' },
    { id: 'calipers', label: 'Brembo calipers', category: 'wheels',
      meshes: [], generated: true, material: 'BremboRed', anchor: [1.0, 0.24, 0.5],
      notes: 'Bright red Brembo 4-piston fronts (trailing the hub), smaller red rears (ahead of it). Not in the source model: car.js adds simple arc-shaped stand-ins, each fitted at load to its own wheel (disc centre, steer angle and axle from the per-wheel rotor mesh; clearance from the rim barrel and spokes) and parented to that rotor, so they follow the steered fronts.' },
    { id: 'tyres', label: 'Tyres', category: 'wheels',
      meshes: wheelMeshes('Tyres'), carve: quadrants('Tyres'), material: null, anchor: null, notes: '' },
    { id: 'brakes', label: 'Brake rotors', category: 'wheels',
      meshes: wheelMeshes('Brake Rotors'), carve: quadrants('Brake Rotors'), material: 'RawMetal', anchor: null, notes: 'Discs only; the model has no caliper geometry (see calipers).' },
    { id: 'suspension', label: 'Suspension', category: 'chassis',
      meshes: ['Suspension'], material: 'RawMetal', anchor: null,
      notes: 'Stock Bilstein dampers on the real car. The model has stock hub/knuckle geometry only; ride height can be corrected in car.js (STANCE_DROP_M, currently 0) by moving the body over the wheels. See docs/CALIBRATION.md.' },
    { id: 'chassis', label: 'Chassis / underbody', category: 'chassis',
      meshes: ['Vehicle base'], material: 'RawMetal', anchor: null, notes: '' },

    // ── interior ──────────────────────────────────────────────
    { id: 'seats', label: 'Seats', category: 'interior',
      meshes: ['Seats Base', 'Seat Back Headrest', 'Seat Accents', 'seat-bolsters'], material: 'Alcantara', anchor: [0.48, 0.62, -0.18],
      upholstery: ['Seats Base', 'seat-bolsters'],
      carve: seatBolsters(),
      notes: 'Black, with bright red stitching on the real car (stitching is not modelled). Headrests carry the speakers. "Seats Base" is the quilted inserts; the bolsters and headrest fronts were merged into "Internals" and are carved out at load (seat-bolsters), leaving the rear-facing plastic seat-back shells there. Upholstery colour: drawer / ?seats= (seats.js). The hoop covers behind the seats were carved out of "Seat Back Headrest" into their own part (hoop-covers).',
      changed: 'Was BlackCloth (flat black); now matte suede with sheen. Bolsters were BlackPlastic (part of "Internals"); now upholstery too.' },
    { id: 'seatbelts', label: 'Seatbelts', category: 'interior',
      meshes: ['Seatbelts'], material: 'BlackCloth', anchor: null,
      notes: 'Retractors sit in the rear bulkhead. Keep carpet and storage clear of the webbing path and pretensioner.' },
    { id: 'hoop-covers', label: 'Roll hoop covers', category: 'interior',
      meshes: ['hoop-covers', 'hoop-covers-front'], material: 'Alcantara', anchor: 'auto',
      carve: [{ from: 'Seat Back Headrest', name: 'hoop-covers', min: [-0.6, 0.85, -0.9], max: [0.6, 1.2, -0.74] },
              // The seat-facing front shell of each cover lives in "Internals", a
              // few cm from the headrest backs: take only the pieces that sit
              // wholly in the box, so the headrests stay put.
              { from: 'Internals', name: 'hoop-covers-front', min: [0.15, 0.83, -0.845], max: [0.56, 1.18, -0.735], whole: true },
              { from: 'Internals', name: 'hoop-covers-front', min: [-0.56, 0.83, -0.845], max: [-0.15, 1.18, -0.735], whole: true }],
      overrides: { 'hoop-covers-front': 'BlackPlastic' },
      mod: 'hoops',
      notes: 'The two hoop-shaped covers behind the headrests, over the factory aluminium hoops: rear shell (carved from "Seat Back Headrest") and seat-facing front shell (carved from "Internals"). They come off for an aftermarket bar. The aluminium hoops themselves are not modelled (the covers are solid), so hiding the covers removes the whole stock hoop.' },
    { id: 'bulkhead-trim', label: 'Rear bulkhead trim (plastic shielding)', category: 'interior',
      meshes: ['bulkhead-trim'], material: 'BlackPlastic', anchor: 'auto',
      carve: [{ from: 'Cabin Parts', name: 'bulkhead-trim', min: [-0.75, 0.3, -0.95], max: [0.75, 0.92, -0.58] }],
      mod: 'shielding',
      notes: 'Plastic panels behind the seats (storage hatches, speaker grille). They stay with a roll bar; the bar drops through notches in the upper edge. The model has them as one plain shell carved out of "Cabin Parts"; hatch doors and grille are not modelled.' },
    { id: 'rollbar', label: 'Roll bar (mock-up)', category: 'interior',
      meshes: [], generated: true, material: null, anchor: [0, 0.93, -0.45], mod: 'rollbar',
      notes: 'Hard Dog ND Sport bar (Flyin\' Miata 20-19020) with double diagonals: 1.75 in DOM tube, full-width main hoop on the factory hoop mounts, rear legs to the deck, harness bar. Procedural stand-in (rollbar.js), positions eyeballed from photos; toggle and recolour it from the menu.' },
    { id: 'dashboard', label: 'Dashboard & gauges', category: 'interior',
      meshes: ['Dashboard', 'Dashboard Main Console', 'Dashboard Dials', 'Dashboard Dials Accents',
               'Dashboard UI Accents 1', 'Dashboard UI Accents 2', 'Dashboard UI Accents 3'], material: 'BlackPlastic', anchor: null, notes: '' },
    { id: 'infotainment', label: 'Infotainment (MZD Connect)', category: 'interior',
      meshes: ['Infotainment Display', 'Dasboard Infotainments Controls and buttons', 'cmu-bezel'], material: 'BlackPlastic', anchor: 'auto',
      carve: [{ from: 'Internal chromatic parts', name: 'cmu-bezel', min: [-0.14, 0.78, 0.12], max: [0.062, 0.91, 0.21] }],
      overrides: { 'cmu-bezel': 'PianoBlack' },
      notes: 'CMU screen and commander knob. The frame around the screen is gloss piano-black on the real car; it was merged into the chrome trim mesh and is carved out at load.',
      changed: 'Screen surround was chrome (part of "Internal chromatic parts"); now its own piano-black piece.' },
    { id: 'steering', label: 'Steering wheel', category: 'interior',
      meshes: ['Steering Wheel'], material: 'BlackLeather', anchor: 'auto',
      notes: 'Black leather with red stitching on the real car (one mesh, stitching not modelled).',
      changed: 'Was BlackPlastic; now black leather.' },
    { id: 'shifter', label: 'Shifter', category: 'interior',
      meshes: ['Shifter brace', 'Shifter Accent'], material: 'BlackPlastic', anchor: null,
      notes: '6-speed manual. "Shifter Accent" is the thin seam strip on the boot, shown as red stitching.',
      overrides: { 'Shifter Accent': 'RedStitch' }, changed: 'Boot seam strip now red stitching.' },
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
      changed: 'Parts with no material (light grey) or the glTF "Darkparts" grey now BlackPlastic (interior is black); armrests suede; chrome-named ones Chrome.',
      overrides: { 'Internal Top Trimming': 'BlackPlastic', 'Internals': 'BlackPlastic', 'Cabin Parts': 'BlackPlastic',
                   'Controls 1': 'BlackPlastic', 'Accent Trimming': 'BlackPlastic',
                   'Door Internal Panels': 'BlackPlastic', 'Door Armrest': 'Alcantara', 'Small Details': 'BlackPlastic', 'Internal Cabin': 'BlackPlastic',
                   'Trimming 2': 'BlackPlastic', 'Internal chromatic parts': 'Chrome', 'Additional Chromatic Accents': 'Chrome' } },

    // ── body mock-ups (generated, approximations; see body.js) ──
    { id: 'spoiler', label: 'Spoiler (mock-up)', category: 'exterior',
      meshes: [], generated: true, material: null, anchor: null, mod: 'spoiler',
      notes: 'Approximations: Rocket Bunny-style ducktail, small trunk lip, or a GT wing on uprights.' },

    // ── scenery from the source .blend (hidden) ──────────────
    { id: 'scenery', label: 'Studio floor & backdrop', category: 'scenery',
      meshes: ['Floor', 'backdrop'], material: null, anchor: null, hidden: true, notes: 'Left over from the source scene.' },
];

// GLTFLoader sanitises node names (spaces -> "_", drops "/" etc.), so key the
// lookup by the sanitised form and compare objects the same way.
export const meshKey = (name) => PropertyBinding.sanitizeNodeName(name);
export const PART_BY_MESH = new Map();
for (const p of PARTS) for (const m of p.meshes) PART_BY_MESH.set(meshKey(m), p);
