# Roll bar mock-up and the mods menu

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

**Bar presets:** `caliper-red`, `top-maroon` and `miia-silver` are the
favourites and show first in every picker. `miia-silver` uses the real
MiiaSilver pearl material. The rest are `satin-black` (the default),
`gloss-black`, `gunmetal`, `white` and `baby-blue`.

**LED presets:** the same three favourites, plus `white`, `baby-blue`,
`magenta` and `amber`.

**Console:**
- `__bruhxd.rollbar('gloss-black' | '#hex' | true | false)`
- `__bruhxd.led(true | false | colour)`
- `__bruhxd.mods({ ... })`
- `__bruhxd.background([a, b] | null)`
- `__bruhxd.floor(bool)`
- `__bruhxd.view({ x, y, zoom, target: [x, y, z] })` frames a close-up around
  a point in the glTF frame.

## What was removed, and how

The glTF groups geometry by material, so the pieces behind the seats share
meshes with unrelated parts. `car.js` `carveMesh` splits them out at load
time: it moves the triangles whose centroid falls inside a box into a new mesh.
The vertex buffers are shared, so this costs nothing and the glTF is untouched.
The boxes live in `parts.js` (`carve`).

| Part | Carved from | Toggle |
|---|---|---|
| `hoop-covers` (the two hoop-shaped covers behind the headrests) | `Seat Back Headrest` | `hoops` |
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
