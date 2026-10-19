# Mods menu: roll bar, body kit, scene

The hamburger menu (top left) opens a drawer of car and scene toggles. The
default is stock: nothing changes unless a URL param or the menu turns
something on. Every change is mirrored to the URL, so a view can be shared.

| Param | Values | Effect |
|---|---|---|
| `rollbar` | `on`, `off`, preset, hex (`d3101b`) | Roll bar plus colour. Turning it on hides the hoop covers. |
| `mock=rollbar` | | Alias for `rollbar=on`. |
| `hoops` | `on` / `off` | Stock hoop covers and wind blocker. Defaults to the opposite of `rollbar`. |
| `shielding` | `off` | Hides the plastic bulkhead trim behind the seats. |
| `led` | `on`, `off`, preset, hex | LED strip under the bar's top tube. Only shown when the bar is on. |
| `bg` | `rrggbb,rrggbb` | Background gradient stops. The default is `ff0000,ffd600`. |
| `floor` | `on` / `off` | Outlined 0.5 m grid on the true ground plane. |
| `kit` | `on` / `off` | Widebody mock-up (approximation of the Rocket Bunny / Pandem ND V2 kit). Pushes the wheels out. |
| `rivets` | `off` | Hides the black flare rivets. |
| `spoiler` | `duck`, `lip`, `wing` | Spoiler mock-up. The default is none. |
| `seats` | preset, hex | Seat upholstery colour (inserts and bolsters). The default is `stock-black`. |
| `mirrors` | `pearl` / `black` | Mirror caps. The default is gloss black, like the real car. |

**Bar presets:** `caliper-red`, `top-maroon` and `miia-silver` are the
favourites and show first in every picker. `miia-silver` uses the real
MiiaSilver pearl material. The rest are `satin-black` (the default),
`gloss-black`, `gunmetal`, `white` and `baby-blue`.

**LED presets:** the same three favourites, plus `white`, `baby-blue`,
`magenta` and `amber`.

**Seat presets:** the same three favourites (as matte fabric), plus
`stock-black` (the default), `prisma-ultra` (NRG Prisma Ultra light-grey
Alcantara), `tan`, `oxblood`, `white`, `grey` and `baby-blue`.
`top-maroon` everywhere is the top's Dark Cherry (`521a18`).

**Copy config link** (bottom of the drawer) copies a `https://bruhxd.com/?…`
URL with the current mods as query params, for sharing a look.

**Console:**
- `__bruhxd.rollbar('gloss-black' | '#hex' | true | false)`
- `__bruhxd.led(true | false | colour)`
- `__bruhxd.mods({ ... })`
- `__bruhxd.background([a, b] | null)`
- `__bruhxd.floor(bool)`
- `__bruhxd.mods({ kit: true, spoiler: 'wing' })`
- `__bruhxd.seats('tan' | '#hex' | null)`
- `__bruhxd.mirrors('pearl' | 'black')`
- `__bruhxd.view({ x, y, zoom, target: [x, y, z] })` frames a close-up around
  a point in the glTF frame.

## What was removed, and how

The glTF groups geometry by material, so the pieces behind the seats share
meshes with unrelated parts. `car.js` `carveMesh` splits them out at load
time: it moves the triangles whose centroid falls inside a box into a new mesh.
The vertex buffers are shared, so this costs nothing and the glTF is untouched.
The boxes live in `parts.js` (`carve`). With `whole: true` only connected
pieces lying entirely inside the box move, so a neighbour poking into the box
(a headrest, a body panel) stays intact.

| Part | Carved from | Toggle |
|---|---|---|
| `hoop-covers` (the two hoop-shaped covers behind the headrests): rear shell | `Seat Back Headrest` | `hoops` |
| `hoop-covers-front` (the seat-facing front shell of each cover) | `Internals` (whole pieces) | `hoops` |
| `wind-blocker` frame (the panel was already its own mesh) | `Controls 1` | `hoops` |
| `bulkhead-trim` (plastic shielding) | `Cabin Parts` | `shielding` |

The factory aluminium hoops under the covers **are not in the model**. The
covers are solid, so hiding them removes the whole stock hoop as far as the
model is concerned.

## The bar

`rollbar.js` builds it procedurally from TubeGeometry. It's based on the Hard
Dog "ND Sport" bar sold by Flyin' Miata (20-19020, double diagonals), using
FM's photos and description:

- 1.75 in (44.5 mm) DOM tube.
- A full-width main hoop with its legs at x = ±0.53 m. The hoop stands where
  the covers were and drops through the upper bulkhead trim beside the belts.
- Top tube at y = 1.20 m, about level with the windshield header ("as tall as
  possible").
- Rear legs leave the top tube inboard (x = ±0.30) and run back and down,
  outboard, to the deck.
- A harness bar at y = 0.95 m.
- Optional LED strip with a halo and a short-range light.

All positions are eyeballed against the model and the photos. Replace the
constants in `ROLLBAR` with the real drawing or tape measurements (see
docs/CALIBRATION.md) before you use the mock-up for fitment.

## Body mock-ups (approximations)

`body.js` builds these procedurally at 1:1 scale. They're fitted by
ray-casting the model's "Body kit" surface and painted in MiiaSilver. Shapes
and sizes are eyeballed from product photos, not taken from drawings, so
don't use them for fitment or ordering.

**Widebody**, after the Rocket Bunny / Pandem ND V2 kit from TRA Kyoto. The
published parts list is a front lip, front over-fenders (+40 mm per side),
rear over-fenders (+80 mm per side), a rear diffuser and an optional duck
wing. The mock-up includes:
- Bolt-on over-fenders, swept around each arch, with exposed black rivets.
- The front lip and the rear diffuser. The diffuser fins are kept clear of
  the exhaust.
- A slim sill extension. The official kit has no side skirts, so this is
  extra.
- Wheels pushed out by 30 mm front and 65 mm rear to fill the flares. The
  merged wheel meshes are carved per wheel at load for this.

**Spoilers:**
- Rocket Bunny-style ducktail, about 55–60 mm kick.
- Small trunk lip, about 22 mm.
- Generic GT wing: 1.44 m span, 260 mm chord, top at y ≈ 1.13 m, on plate
  uprights with endplates. It's black; the other parts are body colour.

## Needs real Blender work

- **Split the meshes properly.** Re-segment the .blend so the hoop covers,
  wind blocker frame and bulkhead trim are their own objects. The runtime
  carve boxes are a stand-in.
- **Bulkhead trim.** In the model it's a single plain shell. The storage hatch
  doors, the speaker grille and the notches the bar passes through aren't
  modelled, so the hoop legs just intersect the trim.
- **Stowed top.** The model's top cover starts right behind the hoops
  (z ≈ −0.85 m), with none of the real gap between the bulkhead and the folded
  top. The rear legs therefore pass through the edge of the cover rather than
  dropping into that gap.
- **Factory aluminium hoops.** Not modelled. Add them if anyone wants a "stock
  with covers off" view.
- **Seat backs.** They reach z ≈ −0.82 m, which is why the main hoop sits at
  −0.84 m. Check this against the real car.
- **Widebody and spoilers.** These are rough lofts. A proper version needs
  the kit modelled from measurements or a scan, with the arch openings cut
  into the body. The flares currently sit over the stock arch rather than
  replacing it.
- **Wheels.** The Tyres, Rims and Brake Rotors meshes hold all four wheels.
  They're carved per wheel at runtime; splitting them in the .blend would be
  cleaner.
