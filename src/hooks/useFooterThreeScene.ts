import { useRef } from 'react';
import { colorsNumeric } from '../tokens';
import { useThreeScene, type ThreeSceneContext, type ThreeSceneHandle } from './useThreeScene';

/**
 * Footer low-poly scene — 1:1 with initFooterThree() in Portfolio.dc.html: 6
 * icosahedron/octahedron/tetrahedron/dodecahedron shapes drifting with
 * independent rotation speeds + a slow bob, plus group-level mouse parallax.
 *
 * NOT rendered anywhere currently — ported faithfully, but the source's own
 * `<canvas ref={setFooterCanvasRef}>` was never actually present in its markup,
 * so this scene has never been visible on the live site (confirmed by grep: the
 * ref callback exists but nothing attaches it). Kept as an available hook,
 * matching the current site's actual (not rendering) state — wire up a
 * `<canvas ref={canvasRef}>` only if that's a deliberate change, not a silent
 * migration side effect.
 */
export function useFooterThreeScene(enabled: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { failed } = useThreeScene(
    canvasRef,
    (ctx: ThreeSceneContext): ThreeSceneHandle => {
      const { THREE, mouseRef } = ctx;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
      camera.position.z = 12;

      const defs: { geo: () => import('three').BufferGeometry; p: [number, number, number] }[] = [
        { geo: () => new THREE.IcosahedronGeometry(1.5, 1), p: [-0.86, 0.52, -1] },
        { geo: () => new THREE.OctahedronGeometry(1.15, 0), p: [0.88, 0.6, -2.4] },
        { geo: () => new THREE.TetrahedronGeometry(1.0, 0), p: [0.8, -0.62, 0.2] },
        { geo: () => new THREE.IcosahedronGeometry(0.8, 0), p: [-0.82, -0.66, -0.6] },
        { geo: () => new THREE.DodecahedronGeometry(0.85, 0), p: [-0.32, 0.86, -3.2] },
        { geo: () => new THREE.OctahedronGeometry(0.7, 0), p: [0.36, -0.9, -2.0] },
      ];

      const group = new THREE.Group();
      const geometries: import('three').BufferGeometry[] = [];
      const shapes = defs.map((d, i) => {
        const geo = d.geo();
        geometries.push(geo);
        const pts = new THREE.Points(
          geo,
          new THREE.PointsMaterial({ color: colorsNumeric.redline, size: 0.055, transparent: true, opacity: 0.75 }),
        );
        const edgesGeo = new THREE.EdgesGeometry(geo);
        geometries.push(edgesGeo);
        const lines = new THREE.LineSegments(
          edgesGeo,
          new THREE.LineBasicMaterial({ color: colorsNumeric.slateMist, transparent: true, opacity: 0.3 }),
        );
        const g = new THREE.Group();
        g.add(pts, lines);
        g.userData = { sx: 0.0013 + i * 0.0004, sy: 0.0021 - i * 0.0003, ph: i * 1.7, nx: d.p[0], ny: d.p[1], z: d.p[2] };
        g.position.set(d.p[0], d.p[1], d.p[2]);
        group.add(g);
        return g;
      });
      scene.add(group);

      return {
        scene,
        camera,
        onResize: () => {
          const vH = 2 * Math.tan(((camera.fov * Math.PI) / 180) / 2) * camera.position.z;
          const vW = vH * camera.aspect;
          shapes.forEach((g) => {
            const u = g.userData as { nx: number; ny: number; x?: number; baseY?: number };
            u.x = u.nx * vW * 0.44;
            u.baseY = u.ny * vH * 0.42;
            g.position.x = u.x;
          });
        },
        onFrame: (nowMs) => {
          const t = nowMs * 0.001;
          shapes.forEach((g) => {
            const u = g.userData as { sx: number; sy: number; ph: number; ny: number; baseY?: number };
            g.rotation.x += u.sx;
            g.rotation.y += u.sy;
            g.position.y = (u.baseY == null ? u.ny : u.baseY) + Math.sin(t * 0.4 + u.ph) * 0.3;
          });
          const mouse = mouseRef.current;
          if (mouse) {
            group.rotation.y += ((mouse.x / window.innerWidth - 0.5) * 0.28 - group.rotation.y) * 0.03;
            group.rotation.x += ((mouse.y / window.innerHeight - 0.5) * 0.16 - group.rotation.x) * 0.03;
          }
        },
        dispose: () => {
          geometries.forEach((g) => g.dispose());
        },
      };
    },
    enabled,
  );

  return { canvasRef, failed };
}
