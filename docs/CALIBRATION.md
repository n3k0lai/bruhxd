# Calibration: the Miata model as a scale reference

`public/Miata-mx-5.gltf` is used as the dimensional reference for making parts
for Miia (2018 MX-5 Club soft top, 205/45R17, stock Bilstein dampers). This
file records how close the model is to the factory car, what still has to be
measured on the real car, and the scan-and-apply workflow that relies on it.

Re-run the numbers with:

```sh
python3 tools/measure.py        # needs numpy
```

It reads the glTF directly and applies the node transforms. The runtime tweaks
in `src/car.js` (ride-height offset, recentring, generated calipers) are not
applied.

## Verdict

**The model is 1:1 in metres. No scale factor is needed.** Length, width,
wheelbase and both tracks are all within 0.35% of the factory figures (7 mm or
less end to end). The X and Z axes agree, so the proportions are sound.

There are two caveats:

- **Ride height is not trustworthy.** Above the hubs, the arches sit about
  35 to 47 mm higher than forum-reported stock ND figures. Ground clearance is
  also about 10 mm over Mazda's laden figure. Vertical positions measured from
  the ground are therefore suspect until Miia's hub-to-lip heights are in.
  Measure from the hub centres or from body features instead, which are fine.
- **Height can't be checked against spec.** Mazda's 1,240 mm is with the top
  up, and the model only has the stowed top.

Because the scale is right, `src/car.js` gets no scale constant and the glTF
is not edited. `STANCE_DROP_M` is 0, which is the model as exported. Set it
from the real hub-to-lip measurement below if the web view should match Miia's
actual ride height.

## Model vs factory

Model values come from `tools/measure.py`. "Spec" means Mazda's US figures for
the 2018 soft top on 17-inch wheels.

| Dimension | Model | Spec | Error |
|---|---:|---:|---:|
| Overall length | 3,908 mm | 3,915 mm | −0.18% |
| Overall width, without mirrors | 1,737 mm | 1,735 mm | +0.12% |
| Width with mirrors | 1,888 mm | not published | measure |
| Height | 1,212 mm (windshield header, top stowed) | 1,240 mm (top up) | n/a |
| Wheelbase | 2,308 mm | 2,310 mm | −0.09% |
| Front track (tyre centres) | 1,500 mm | 1,495 mm | +0.33% ¹ |
| Rear track (tyre centres) | 1,504 mm | 1,505 mm | −0.07% |
| Tyre OD | 616 mm rear, 620 mm front | 616.3 mm ² | 0.0% / +0.6% |
| Min. ground clearance | 145 mm (between axles) | 135 mm (laden) | +7% ³ |
| Hub centre to arch lip | 404–409 mm front, 418 mm rear | ~368 / ~371 mm (14.5 / 14.6 in) ⁴ | +10% / +13% |
| Front / rear overhang | 762 / 831 mm | — | — |

Mean scale error across length, width, wheelbase and both tracks is about
+0.02%, so the scale factor is **1.000**.

1. The front wheels are modelled slightly steered. The front centres come from
   tyre bounding boxes and could be off by a few millimetres.
2. 205/45R17: 2 × 205 × 0.45 + 17 × 25.4 = 184.5 + 431.8 = **616.3 mm**
   unloaded. A loaded tyre is a few millimetres shorter.
3. Mazda's figure is laden. The model is unladen. Some of the gap is genuine.
4. This is not a factory spec. It's a commonly quoted stock ND figure, and
   real cars vary by more than half an inch. Use Miia's own measurement.

Sources:

- Mazda 2018 MX-5 owner's manual, Specifications (length, width, height,
  tread, wheelbase):
  https://www.mazdausa.com/static/manuals/2018/mx5/contents/10020105.html
- Mazda USA 2018 MX-5 spec deck (Club 17-inch: 58.9 / 59.17 in track,
  48.8 in height, 5.32 in laden ground clearance, P205/45 R17):
  https://news.mazdausa.com/download/2018-Mazda-MX-5-Spec-Deck.pdf
- Mazda USA 2018 MX-5 Club features and specs:
  https://www.mazdausa.com/siteassets/pdf/features--specs/2018/mx5-st/2018_mazda_mx5_st_features_specs.pdf
- Stock ND hub-to-fender figure, Karcepts on the miata.net forum:
  https://forum.miata.net/vb/showthread.php?t=601937

## Model frame and reference points

**glTF frame:**
- Units are metres.
- +Y is up.
- +Z points to the nose.
- +X is the driver's (left) side.
- The ground (bottom of the tyres) is at y = −0.011.

**Blender frame:** the glTF importer maps (x, y, z) to (x, −z, y). In
Blender, Z is up, the nose points towards −Y, and the ground is at Z = −0.011.

These are good anchor points for scaling a scan. They come from the model and
agree with the factory wheelbase and track.

| Point | glTF (x, y, z) m | Blender (X, Y, Z) m |
|---|---|---|
| FL hub centre | +0.753, 0.299, +1.186 | +0.753, −1.186, 0.299 |
| FR hub centre | −0.748, 0.299, +1.186 | −0.748, −1.186, 0.299 |
| RL hub centre | +0.752, 0.298, −1.123 | +0.752, +1.123, 0.298 |
| RR hub centre | −0.752, 0.298, −1.123 | −0.752, +1.123, 0.298 |

The front hub z values are the average of the rotor centre (1.185) and the
tyre boxes.

The interior meshes (seats, bulkhead trim, cabin) are only approximate and
have not been checked against the car. **Don't fit a part to the model's
interior.** Use real measurements and use the model only for context.

## Measurements to take on Miia

You'll need a 5 m tape, a plumb bob (or a string with a nut tied on), masking
tape, a straightedge, and digital calipers. Park on the flattest ground you
can find, with the tyres at normal pressure, the wheels straight, and the top
down. The tank should be about half full with nobody in the car. Write every
number in mm.

1. **Wheelbase, both sides.** Hang the plumb line from the hub centre (the
   centre cap) at the front and rear wheel on one side. Mark the ground under
   each one with tape and measure between the marks. Repeat on the other side.
   Expect about 2,310 mm, with the two sides within 5 mm of each other.
2. **Track at the hubs, front and rear.** Plumb from the centre of the tyre
   tread (the middle of the contact patch) on the left and the right and
   measure between the marks. You can also measure outside-sidewall to
   outside-sidewall and inside to inside, then average the two. Expect about
   1,495 mm front and 1,505 mm rear.
3. **Overall length.** Plumb from the furthest point of the front bumper and
   of the rear bumper, ignoring the plates, and measure between the floor
   marks. Expect about 3,915 mm.
4. **Overall width.** Plumb from the widest body point, which is usually the
   front fender or rear quarter, and then from the mirror caps with the
   mirrors unfolded. Expect about 1,735 mm for the body. Record the mirror
   width; the model has 1,888 mm.
5. **Arch lip height at each corner (stock Bilsteins).** Measure vertically
   from the centre cap to the lowest edge of the fender lip directly above
   it. Then measure from the ground to that same lip edge. Bounce each corner
   and let it settle before you measure. This sets `STANCE_DROP_M`: the model
   is at 404–409 mm front and 418 mm rear, hub to lip.
6. **Rear bulkhead cavity behind the seats (W × H × D).** Remove the trim
   first, as planned for the carpet job. Measure width at the bottom, the
   middle and the top, wall to wall. Measure height from the floor of the
   cavity to the top edge. Measure depth fore-aft at the bottom and at the
   top. Photograph it with a ruler in frame. Also note where the belt
   retractors, the webbing path and the pretensioners sit, measured from one
   corner: anything printed must keep clear of them.
7. **Roll bar mount bolt spacing.** For every mounting point the bar uses
   (per its install instructions), measure centre-to-centre between the bolts
   left to right. Then measure fore-aft between each side's front and rear
   bolts, and measure both diagonals to check for squareness. Caliper the bolt
   head size and thread pitch where you can get at them. This tells us
   whether the bar clears the cavity carpet and whether the LED channel can
   share the mounts.
8. **Door opening.** Measure the horizontal width at the sill, the beltline
   and the top. Measure height from the sill top to the top of the opening at
   the B-pillar end. Measure the diagonal. These are a good check for
   scanned interior parts.

When the numbers are in, add them to the table above as a "Miia" column. If
the wheelbase and tracks agree with the model within about 0.5%, the model is
confirmed as a reference for Miia specifically and not just the factory car.

## Scan-and-apply workflow

1. **Scan.** Use Polycam (LiDAR or photo mode) to scan the area or part. Put
   masking tape crosses on 2 or more features whose distances you can measure
   with a tape or calipers, as far apart as possible: hub centres, bolt heads,
   panel corners. Write those distances down. Export the scan as GLB or OBJ.
2. **Import into Blender.** Open `public/Miata-mx-5.gltf` at scale 1.0. It is
   already metric, so leave the importer settings alone. Then import the scan.
   Set the scene units to metric with a unit scale of 1.0, and work in mm.
3. **Scale the scan.** Measure the scan's distance between reference A and
   reference B, using the MeasureIt add-on or by snapping two vertices and
   reading the edge length. Scale factor = real distance ÷ scan distance.
   Apply it, then check the second pair of references. They should agree
   within about 1 mm; if they don't, the scan is warped, so rescan. Apply the
   scale with Ctrl+A.
4. **Place the scan.** Snap the scan onto the model using shared features,
   such as hub centres or the bulkhead edges. The model gives context (body
   lines, clearances to the belts and the top). The scan and the calipers are
   the truth for fit.
5. **Fix the mounting points.** Scans are accurate to around ±1–3 mm, which
   isn't good enough for holes. Caliper every mounting hole: diameter, centre
   to centre, and distance to a datum edge. Model the holes as clean geometry
   at those numbers rather than relying on the scan's surface. Add a 0.2 to
   0.4 mm hole clearance for the printer.
6. **Design the part.** Model the part against the scaled scan. Keep walls
   at 2 mm or more and use 4+ perimeters on load paths. Orient the part so the
   layer lines aren't loaded in peel. Use heat-set inserts in place of printed
   threads.
7. **Print a fit test first.** Do a thin, fast slice of just the mounting
   face and holes, and test it on the car. Adjust, then print the full part.
8. **Print.** Use PETG for parts inside the cabin, out of the sun. Use ASA for
   anything in direct sun or near heat. On an Ender 3, ASA wants an enclosure
   and no drafts. Check that rook's OctoPrint has no active job before you
   queue anything.
9. **Record it.** Add the part to `src/parts.js` with its notes, and keep the
   scaled scan and final STL alongside the build notes.
