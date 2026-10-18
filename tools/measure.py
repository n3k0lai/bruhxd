#!/usr/bin/env python3
"""Measure the Miata glTF in world space (metres, glTF Y-up, +Z = nose).

Usage: python3 tools/measure.py [public/Miata-mx-5.gltf]
Prints overall bounds, wheel centres, wheelbase, track and tyre size.
Needs numpy only. Applies node transforms (TRS) the same way three.js does,
but NOT the runtime tweaks in src/car.js (stance drop, recentring).
"""
import json, os, sys
import numpy as np

path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'public', 'Miata-mx-5.gltf')
g = json.load(open(path))
bin_ = open(os.path.join(os.path.dirname(path), g['buffers'][0]['uri']), 'rb').read()

def quat_mat(q):
    x, y, z, w = q
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                     [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                     [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])

def local(n):
    if 'matrix' in n: return np.array(n['matrix']).reshape(4, 4).T
    M = np.eye(4)
    R = quat_mat(n.get('rotation', [0, 0, 0, 1])) * np.array(n.get('scale', [1, 1, 1]))
    M[:3, :3] = R; M[:3, 3] = n.get('translation', [0, 0, 0])
    return M

def positions(mesh_idx):
    out = []
    for prim in g['meshes'][mesh_idx]['primitives']:
        a = g['accessors'][prim['attributes']['POSITION']]
        bv = g['bufferViews'][a['bufferView']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = bv.get('byteStride', 12)
        raw = np.frombuffer(bin_, dtype=np.uint8, count=stride * (a['count'] - 1) + 12, offset=off)
        arr = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], 12), strides=(stride, 1)).copy()
        out.append(arr.view(np.float32).reshape(-1, 3))
    return np.concatenate(out)

world = {}
def walk(i, parent):
    n = g['nodes'][i]; M = parent @ local(n)
    if 'mesh' in n:
        p = positions(n['mesh'])
        world[n['name']] = (np.c_[p, np.ones(len(p))] @ M.T)[:, :3]
    for c in n.get('children', []): walk(c, M)
for i in g['scenes'][0]['nodes']: walk(i, np.eye(4))

SCENERY = {'Floor', 'backdrop'}
car = np.concatenate([v for k, v in world.items() if k not in SCENERY])
mm = lambda v: f'{v*1000:7.0f} mm'
lo, hi = car.min(0), car.max(0)
print('Overall (all visible car meshes)')
print('  length (Z):', mm(hi[2]-lo[2]), '  width (X):', mm(hi[0]-lo[0]), '  height (Y):', mm(hi[1]-lo[1]))
nomir = np.concatenate([v for k, v in world.items() if k not in SCENERY | {'Side & Rearvide Mirrors'}])
print('  width excl. mirrors:', mm(np.ptp(nomir[:, 0])))
body = world['Body kit']
print('  Body kit only: L', mm(np.ptp(body[:, 2])), ' W', mm(np.ptp(body[:, 0])), ' H', mm(np.ptp(body[:, 1])))
ground = world['Tyres'][:, 1].min()
print('  ground (tyre bottom) y =', mm(ground), '; roof/top y =', mm(hi[1]))

print('\nWheels (Tyres mesh split by quadrant)')
t = world['Tyres']; cz = (t[:, 2].min() + t[:, 2].max()) / 2
centres = {}
for name, sx, sz in [('FL', 1, 1), ('FR', -1, 1), ('RL', 1, -1), ('RR', -1, -1)]:
    q = t[(np.sign(t[:, 0]) == sx) & (np.sign(t[:, 2] - cz) == sz)]
    c = (q.min(0) + q.max(0)) / 2; centres[name] = c
    print(f'  {name}: centre x={c[0]:+.4f} y={c[1]:.4f} z={c[2]:+.4f}  OD(vert)={mm(np.ptp(q[:,1]))} OD(long)={mm(np.ptp(q[:,2]))} width={mm(np.ptp(q[:,0]))}')
wb = ((centres['FL'][2] - centres['RL'][2]) + (centres['FR'][2] - centres['RR'][2])) / 2
print('  wheelbase:', mm(wb))
print('  front track (tyre centre):', mm(centres['FL'][0] - centres['FR'][0]))
print('  rear track  (tyre centre):', mm(centres['RL'][0] - centres['RR'][0]))
r = world['Rims']
fr = r[(r[:, 0] > 0) & (r[:, 2] > cz)]
print('  rim (FL) outer dia approx:', mm(max(np.ptp(fr[:, 1]), np.ptp(fr[:, 2]))))
print('  front overhang:', mm(hi[2] - centres['FL'][2]), '  rear overhang:', mm(centres['RL'][2] - lo[2]))
# Ground clearance: lowest chassis/body point between the axles, above tyre bottom.
mid = np.concatenate([world[k] for k in ('Vehicle base', 'Body kit', 'exhaust', 'Body kit -- Internal')])
mid = mid[(mid[:, 2] < centres['FL'][2] - 0.35) & (mid[:, 2] > centres['RL'][2] + 0.35)]
print('  min underside between axles above ground:', mm(mid[:, 1].min() - ground))

# Width without the mirror caps (the Body kit mesh includes them near z = 0).
nm = body[np.abs(body[:, 2]) > 0.3]
print('\nBody width excl. mirror caps (|z| > 0.3 m):', mm(np.ptp(nm[:, 0])))
# Height to the windshield header (top is stowed, so this is the highest roof point; antenna excluded).
noant = np.concatenate([v for k, v in world.items() if k not in SCENERY | {'Antannae'}])
print('Height to windshield header (antenna excluded):', mm(noant[:, 1].max() - ground))
# Fender lip: lowest body vertex directly above each wheel centre (within +/-30 mm fore-aft, over the tyre width).
print('Arch lip above each wheel centre (model ride height):')
for name, c in centres.items():
    s = body[(np.abs(body[:, 2] - c[2]) < 0.03) & (np.abs(np.abs(body[:, 0]) - abs(c[0])) < 0.09)
             & (np.sign(body[:, 0]) == np.sign(c[0])) & (body[:, 1] > c[1] + 0.2)]
    lip = s[:, 1].min()
    print(f'  {name}: ground-to-lip {mm(lip - ground)}   hub-centre-to-lip {mm(lip - c[1])}')
