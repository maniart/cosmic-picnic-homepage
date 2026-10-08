'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Public handle — lets parent spawn ripples or pulse the wave energy
// ---------------------------------------------------------------------------
export interface SceneHandle {
  spawnRipple: (cx: number, cy: number) => void;
  pulse: () => void;
}

interface Props {
  /** Called the first time the user clicks the canvas (audio start gate) */
  onFirstInteraction?: () => void;
  /** Called on every subsequent canvas click (play chime) */
  onChime?: () => void;
  /** Whether sound is enabled (suppresses chime callback when muted) */
  soundOn?: boolean;
  /** Whether audio has already started */
  audioStarted?: boolean;
}

// ---------------------------------------------------------------------------
const SceneCanvas = forwardRef<SceneHandle, Props>(function SceneCanvas(
  { onFirstInteraction, onChime, soundOn = true, audioStarted = false },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const figRef   = useRef<HTMLImageElement>(null);

  // Internal mutable refs so event handlers always see current prop values
  const soundOnRef      = useRef(soundOn);
  const audioStartedRef = useRef(audioStarted);
  useEffect(() => { soundOnRef.current = soundOn; }, [soundOn]);
  useEffect(() => { audioStartedRef.current = audioStarted; }, [audioStarted]);

  // Expose spawnRipple / pulse to parent
  const spawnRippleRef = useRef<(cx: number, cy: number) => void>(() => {});
  const pulseRef       = useRef<() => void>(() => {});
  useImperativeHandle(ref, () => ({
    spawnRipple: (cx, cy) => spawnRippleRef.current(cx, cy),
    pulse: () => pulseRef.current(),
  }));

  // Refs for callbacks that may change between renders
  const onFirstRef = useRef(onFirstInteraction);
  const onChimeRef = useRef(onChime);
  useEffect(() => { onFirstRef.current = onFirstInteraction; }, [onFirstInteraction]);
  useEffect(() => { onChimeRef.current = onChime; }, [onChime]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // ── Reduced motion ─────────────────────────────────────────────────────
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    el.appendChild(renderer.domElement);

    // ── Scene / camera ──────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b26, 0.016);
    const cam = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
    cam.position.set(0, 0, 10);

    // ── Colour constants ────────────────────────────────────────────────────
    const WARM = 0xffecc4;
    const GOLD = 0xe1ad66;

    // ── Helpers ─────────────────────────────────────────────────────────────
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    function additive(m: THREE.Material) {
      m.blending       = THREE.CustomBlending;
      m.blendEquation  = THREE.AddEquation;
      m.blendSrc       = THREE.SrcAlphaFactor;
      m.blendDst       = THREE.OneFactor;
      m.blendSrcAlpha  = THREE.OneFactor;
      m.blendDstAlpha  = THREE.OneFactor;
      return m;
    }

    function lineMat(color: number, opacity: number) {
      const m = additive(new THREE.LineBasicMaterial({
        color, transparent: true, opacity, depthWrite: false, fog: true,
      })) as THREE.LineBasicMaterial;
      m.userData.base = opacity;
      return m;
    }

    function mkLine(pts: THREE.Vector3[], m: THREE.Material, loop = false) {
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      return loop ? new THREE.LineLoop(g, m) : new THREE.Line(g, m);
    }

    // Distance-fade helper — fades objects into view as camera approaches
    const far = (objZ: number, d0: number) =>
      clamp((d0 - (cam.position.z - objZ)) / 10, 0, 1);

    function fadeGroup(obj: THREE.Object3D, f: number) {
      obj.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (mat && mat.userData.base != null) {
          (mat as THREE.MeshBasicMaterial).opacity = mat.userData.base * f;
        }
      });
    }

    function canvasTex(draw: (g: CanvasRenderingContext2D) => void) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d')!;
      draw(g);
      return new THREE.CanvasTexture(c);
    }

    // ── Stars ───────────────────────────────────────────────────────────────
    const N = 9000;
    const pos   = new Float32Array(N * 3);
    const size  = new Float32Array(N);
    const phase = new Float32Array(N);
    const col   = new Float32Array(N * 3);
    const palette = [[1, 0.96, 0.86], [1, 0.84, 0.48], [1, 0.76, 0.36]];

    for (let i = 0; i < N; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 140;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 2] = 30 - Math.random() * 230;
      size[i]        = Math.random() < 0.07 ? 3 + Math.random() * 3 : 0.8 + Math.random() * 1.8;
      phase[i]       = Math.random();
      const p = palette[Math.random() < 0.3 ? 0 : Math.random() < 0.6 ? 1 : 2];
      col[i * 3] = p[0]; col[i * 3 + 1] = p[1]; col[i * 3 + 2] = p[2];
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('aSize',    new THREE.BufferAttribute(size, 1));
    starGeo.setAttribute('aPhase',   new THREE.BufferAttribute(phase, 1));
    starGeo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));

    const starU = { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } };
    const starMat = new THREE.ShaderMaterial({
      uniforms: starU,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        attribute vec3  aColor;
        uniform float uTime;
        uniform float uPR;
        varying float vA;
        varying vec3  vC;
        void main() {
          vec4  mv = modelViewMatrix * vec4(position, 1.0);
          float tw = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(uTime * (0.5 + fract(aPhase * 7.0) * 2.4) + aPhase * 6.2831), 2.0);
          float dz = -mv.z;
          vA = tw * clamp(1.6 - dz / 90.0, 0.25, 1.0);
          vC = aColor;
          gl_PointSize = max(1.4 * uPR, aSize * uPR * (110.0 / dz) * (0.8 + 0.3 * tw));
          gl_Position  = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vA;
        varying vec3  vC;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          a = a * a + 0.6 * smoothstep(0.18, 0.0, d);
          a = min(1.0, a * vA * 1.4);
          gl_FragColor = vec4(vC * a, a);
        }
      `,
    });
    starMat.blending      = THREE.CustomBlending;
    starMat.blendEquation = THREE.AddEquation;
    starMat.blendSrc      = THREE.OneFactor;
    starMat.blendDst      = THREE.OneFactor;
    starMat.blendSrcAlpha = THREE.OneFactor;
    starMat.blendDstAlpha = THREE.OneFactor;

    const starPts = new THREE.Points(starGeo, starMat);
    starPts.frustumCulled = false;
    scene.add(starPts);

    // ── Sprite textures ─────────────────────────────────────────────────────
    const sparkTex = canvasTex((g) => {
      g.translate(64, 64);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, 30);
      rg.addColorStop(0, 'rgba(255,240,200,0.55)');
      rg.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = rg; g.fillRect(-64, -64, 128, 128);
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo(0, -60); g.quadraticCurveTo(5, -5, 60, 0);
      g.quadraticCurveTo(5, 5, 0, 60); g.quadraticCurveTo(-5, 5, -60, 0);
      g.quadraticCurveTo(-5, -5, 0, -60);
      g.fill();
    });

    const glowTex = canvasTex((g) => {
      const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      rg.addColorStop(0,    'rgba(255,250,235,1)');
      rg.addColorStop(0.15, 'rgba(255,225,150,0.8)');
      rg.addColorStop(1,    'rgba(244,194,91,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    });

    // ── Sparkle sprites ─────────────────────────────────────────────────────
    const sparkles: THREE.Sprite[] = [];
    ([
      [-4.5,  3.2,  -1], [ 4.2, -1.2,   1], [ 3.8,  3.8,  -3],
      [-6,   -2,   -14], [ 7,    2,    -24], [-2.5,  4,   -30],
      [ 3,   -3,   -38], [-7,    1,    -55], [ 6,   -2.5, -64],
      [-4,    3,   -76], [ 5,    2.5,  -86], [-6.5, -1,   -92],
    ] as [number, number, number][]).forEach(([x, y, z], i) => {
      const s = new THREE.Sprite(
        additive(new THREE.SpriteMaterial({
          map: sparkTex,
          color: i % 3 ? WARM : GOLD,
          transparent: true,
          depthWrite: false,
        })) as THREE.SpriteMaterial,
      );
      s.position.set(x, y, z);
      s.userData = { base: 0.35 + Math.random() * 0.45, ph: Math.random() * 6 };
      scene.add(s);
      sparkles.push(s);
    });

    // ── Wireframe globe builder ─────────────────────────────────────────────
    function globe(rad: number, lat: number, lon: number, m: THREE.Material) {
      const g = new THREE.Group();
      for (let i = 1; i < lat; i++) {
        const phi = Math.PI * i / lat, rr = rad * Math.sin(phi), y = rad * Math.cos(phi), pts: THREE.Vector3[] = [];
        for (let k = 0; k < 72; k++) {
          const a = k / 72 * Math.PI * 2;
          pts.push(new THREE.Vector3(rr * Math.cos(a), y, rr * Math.sin(a)));
        }
        g.add(mkLine(pts, m, true));
      }
      for (let j = 0; j < lon; j++) {
        const th = j / lon * Math.PI * 2, pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 48; k++) {
          const phi = Math.PI * k / 48;
          pts.push(new THREE.Vector3(rad * Math.sin(phi) * Math.cos(th), rad * Math.cos(phi), rad * Math.sin(phi) * Math.sin(th)));
        }
        g.add(mkLine(pts, m));
      }
      g.add(new THREE.Mesh(
        new THREE.SphereGeometry(rad * 0.985, 32, 24),
        new THREE.MeshBasicMaterial({ color: 0x0a1236, fog: true }),
      ));
      return g;
    }

    // ── Hero group ──────────────────────────────────────────────────────────
    const hero = new THREE.Group();
    scene.add(hero);

    // Figure plane (figure-ear.jpg: white lines on black, black→transparent via alpha map)
    const figTex = new THREE.Texture();
    const figImg = figRef.current;
    const loadFigure = () => { figTex.image = figImg; figTex.needsUpdate = true; };
    if (figImg) {
      if (figImg.complete && figImg.naturalWidth) loadFigure();
      else figImg.addEventListener('load', loadFigure, { once: true });
    }
    const figMat = additive(new THREE.MeshBasicMaterial({
      map: figTex, alphaMap: figTex,
      color: 0xfff0d0, transparent: true, depthWrite: false, fog: false,
    })) as THREE.MeshBasicMaterial;
    figMat.userData.base = 1;
    figMat.color.setRGB(1.6, 1.45, 1.15);
    figMat.map!.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const fig = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), figMat);
    fig.position.y = 0.6;
    hero.add(fig);

    // Earth
    const heroGlobe = new THREE.Group();
    heroGlobe.position.set(0, -3.9, 0);
    heroGlobe.rotation.z = 0.41;
    hero.add(heroGlobe);

    const ER = 1.5;
    const earth = globe(ER, 9, 18, lineMat(0x9fb8ff, 0.16));
    (earth.children[earth.children.length - 1] as THREE.Mesh).material =
      new THREE.MeshBasicMaterial({ color: 0x0b1a48, fog: true });
    heroGlobe.add(earth);

    // Blue atmosphere sprite
    const atmoTex = canvasTex((g) => {
      const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      rg.addColorStop(0.6,  'rgba(120,160,255,0)');
      rg.addColorStop(0.7,  'rgba(140,180,255,0.55)');
      rg.addColorStop(0.78, 'rgba(110,150,255,0.18)');
      rg.addColorStop(1,    'rgba(90,130,255,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    });
    const atmo = new THREE.Sprite(
      additive(new THREE.SpriteMaterial({ map: atmoTex, transparent: true, depthWrite: false, fog: false })) as THREE.SpriteMaterial,
    );
    atmo.material.userData.base = 0.9;
    atmo.scale.set(ER * 2 / 0.7, ER * 2 / 0.7, 1);
    atmo.position.set(0, -3.9, 0);
    hero.add(atmo);

    // Moon
    const MR = ER * 0.273, MO = 3.1;
    const lunar = new THREE.Group();
    lunar.position.set(0, -3.9, 0);
    lunar.rotation.set(0.12, 0, 0.089);
    hero.add(lunar);

    // Orbit ring
    const orbitPts: THREE.Vector3[] = [];
    for (let k = 0; k < 128; k++) {
      const a = k / 128 * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(MO * Math.cos(a), 0, -MO * Math.sin(a)));
    }
    lunar.add(mkLine(orbitPts, lineMat(WARM, 0.14), true));

    // Moon canvas texture with maria, craters, Tycho/Copernicus rays
    const moonTex = (() => {
      const W = 1024, H = 512;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d')!;
      const P = (lat: number, lon: number): [number, number] => [(0.5 + lon / 360) * W, (0.5 - lat / 180) * H];
      g.fillStyle = '#9a9384'; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 2600; i++) {
        const v = (120 + Math.random() * 60) | 0;
        g.fillStyle = `rgba(${v},${v - 6},${v - 16},0.35)`;
        g.beginPath(); g.arc(Math.random() * W, Math.random() * H, Math.random() * 3 + 0.5, 0, 7); g.fill();
      }
      g.filter = 'blur(7px)'; g.fillStyle = '#4f4b45';
      ([
        [33, -16, 17, 1], [28, 17, 10, 1], [8, 31, 12, 1.2], [17, 59, 7, 1.3],
        [-8, 51, 9, 0.8], [-15, 35, 5, 1], [-21, -17, 10, 1.1], [18, -57, 24, 0.75],
        [-5, -45, 14, 0.7], [-24, -39, 5, 1], [56, 0, 6, 6], [-3, -5, 6, 1],
      ] as [number, number, number, number][]).forEach(([la, lo, r, sx]) => {
        const [x, y] = P(la, lo);
        const ry = r / 180 * H, rx = ry * sx / Math.max(0.2, Math.cos(la * Math.PI / 180));
        g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
      });
      g.filter = 'none';
      for (let i = 0; i < 260; i++) {
        const x = Math.random() * W, y = H * 0.08 + Math.random() * H * 0.84;
        const r = Math.random() < 0.9 ? 1 + Math.random() * 3 : 4 + Math.random() * 6;
        g.strokeStyle = 'rgba(70,66,60,0.45)'; g.lineWidth = 1;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
        g.strokeStyle = 'rgba(220,214,200,0.35)';
        g.beginPath(); g.arc(x + 0.7, y + 0.7, r, 3.6, 5.6); g.stroke();
      }
      const ray = (la: number, lo: number, n: number, len: number, a: number) => {
        const [x, y] = P(la, lo);
        g.strokeStyle = `rgba(235,230,215,${a})`;
        for (let i = 0; i < n; i++) {
          const t = Math.random() * 6.283, l = len * (0.4 + Math.random() * 0.6);
          g.lineWidth = 1 + Math.random() * 1.5;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(t) * l * 1.3, y + Math.sin(t) * l); g.stroke();
        }
        g.fillStyle = 'rgba(245,240,228,0.9)';
        g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill();
      };
      ray(-43, -11, 26, 150, 0.22); ray(10, -20, 16, 60, 0.2);
      ray(8, -38, 10, 35, 0.2);    ray(24, -47, 6, 18, 0.3);
      const tx = new THREE.CanvasTexture(c);
      tx.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tx;
    })();

    const moonMat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        map:  { value: moonTex },
        uSun: { value: new THREE.Vector3(0.85, 0.22, -0.48).normalize() },
        uOp:  { value: 1 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vV = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform vec3  uSun;
        uniform float uOp;
        varying vec2 vUv;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vec3  n   = normalize(vN);
          vec3  tex = texture2D(map, vUv).rgb * vec3(1.0, 0.95, 0.84);
          float ndl = dot(n, uSun);
          float day = smoothstep(-0.06, 0.18, ndl) * (0.35 + 0.65 * clamp(ndl, 0.0, 1.0));
          float limb = 0.55 + 0.45 * pow(max(dot(n, normalize(vV)), 0.0), 0.5);
          vec3  c = tex * (day * 1.55 * limb + 0.045) + vec3(1.0, 0.85, 0.55) * pow(max(ndl, 0.0), 8.0) * 0.06;
          gl_FragColor = vec4(c, uOp);
        }
      `,
    });
    moonMat.userData.base = 1;

    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(MR, 48, 32), moonMat);
    moonMesh.rotation.y = Math.PI;
    const moon = new THREE.Group();
    moon.add(moonMesh);
    lunar.add(moon);

    // Real coastlines via TopoJSON
    const coastMat = lineMat(WARM, 0.95);
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
      .then(res => res.json())
      .then((topo: {
        transform: { scale: [number,number], translate: [number,number] };
        arcs: [number,number][][];
      }) => {
        const [sx, sy] = topo.transform.scale;
        const [tx, ty] = topo.transform.translate;
        const rr = ER * 1.004, D = Math.PI / 180;
        const toV = (lon: number, lat: number) => new THREE.Vector3(
          rr * Math.cos(lat * D) * Math.cos(lon * D),
          rr * Math.sin(lat * D),
          -rr * Math.cos(lat * D) * Math.sin(lon * D),
        );
        const coast = new THREE.Group();
        topo.arcs.forEach(arc => {
          let x = 0, y = 0;
          const pts: THREE.Vector3[] = [];
          arc.forEach(([dx, dy]) => { x += dx; y += dy; pts.push(toV(x * sx + tx, y * sy + ty)); });
          if (pts.length > 1) coast.add(mkLine(pts, coastMat));
        });
        earth.add(coast);
      })
      .catch(() => {/* silently skip if offline */});

    // ── Sine-wave ribbon ────────────────────────────────────────────────────
    const WL = 11, WP = 180;
    const waves = new THREE.Group();
    waves.position.set(0, -1.6, -42);
    waves.rotation.y = -0.12;
    scene.add(waves);
    const waveLines: THREE.Line[] = [];
    for (let i = 0; i < WL; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(WP * 3), 3));
      const l = new THREE.Line(g, lineMat(i % 4 === 0 ? GOLD : WARM, 0.75));
      waves.add(l); waveLines.push(l);
    }

    // ── Ring galaxy ─────────────────────────────────────────────────────────
    const galaxy = new THREE.Group();
    galaxy.position.set(5.5, 2.8, -54);
    galaxy.rotation.set(-1.1, 0.25, 0.35);
    scene.add(galaxy);
    const rings: THREE.LineLoop[] = [];
    for (let i = 0; i < 8; i++) {
      const rr = 0.45 + i * 0.48, pts: THREE.Vector3[] = [];
      for (let k = 0; k < 96; k++) {
        const a = k / 96 * Math.PI * 2;
        pts.push(new THREE.Vector3(rr * Math.cos(a) + i * 0.06, rr * Math.sin(a), 0));
      }
      const l = mkLine(pts, lineMat(WARM, 0.8 - i * 0.05), true) as THREE.LineLoop;
      galaxy.add(l); rings.push(l);
    }
    const core = new THREE.Sprite(
      additive(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false })) as THREE.SpriteMaterial,
    );
    core.material.userData.base = 1;
    core.scale.set(1.6, 1.6, 1);
    galaxy.add(core);

    // ── Two small wire planets ───────────────────────────────────────────────
    const planet2 = globe(0.85, 7, 12, lineMat(GOLD, 0.7));
    planet2.position.set(-5.5, 3.2, -60);
    scene.add(planet2);

    const planet3 = globe(0.5, 6, 10, lineMat(WARM, 0.6));
    planet3.position.set(6.5, -2.4, -72);
    scene.add(planet3);

    // ── Grid floor ──────────────────────────────────────────────────────────
    const grid = new THREE.Group();
    grid.position.set(0, -3.4, -94);
    scene.add(grid);
    const gp: number[] = [];
    const cols = 14, rows = 9, cell = 1.2;
    const hx = cols * cell / 2, hz = rows * cell / 2, dep = 0.7;
    for (let i = 0; i <= cols; i++) {
      const x = -hx + i * cell;
      gp.push(x, 0, -hz, x, 0, hz, x, 0, hz, x, -dep, hz);
    }
    for (let j = 0; j <= rows; j++) {
      const z = -hz + j * cell;
      gp.push(-hx, 0, z, hx, 0, z);
    }
    gp.push(
      -hx, -dep, hz, hx, -dep, hz,
      -hx,    0, -hz, -hx, -dep, -hz, -hx, -dep, -hz, -hx, -dep, hz,
       hx,    0, -hz,  hx, -dep, -hz,  hx, -dep, -hz,  hx, -dep, hz,
    );
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
    grid.add(new THREE.LineSegments(gg, lineMat(WARM, 0.55)));

    // ── Ripple + meteor pools ────────────────────────────────────────────────
    const ripples: THREE.Group[] = [];
    const meteors: THREE.Line[]  = [];
    const circle: THREE.Vector3[] = [];
    for (let k = 0; k < 96; k++) {
      const a = k / 96 * Math.PI * 2;
      circle.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    const circleGeo = new THREE.BufferGeometry().setFromPoints(circle);

    let energy = 0, nextMeteor = 2, prog = 0, st = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const look  = new THREE.Vector3();

    // Expose spawnRipple
    spawnRippleRef.current = (cx, cy) => {
      const v = new THREE.Vector3(
        (cx / window.innerWidth) * 2 - 1,
        -(cy / window.innerHeight) * 2 + 1,
        0.5,
      ).unproject(cam).sub(cam.position).normalize();
      const g = new THREE.Group();
      g.position.copy(cam.position.clone().add(v.multiplyScalar(9)));
      g.lookAt(cam.position);
      for (let i = 0; i < 4; i++) {
        const l = new THREE.LineLoop(circleGeo, lineMat(i === 0 ? GOLD : WARM, 0.9));
        l.scale.setScalar(0.01);
        g.add(l);
      }
      g.userData.age = 0;
      scene.add(g);
      ripples.push(g);
      energy = 1;
    };

    pulseRef.current = () => { energy = Math.max(energy, 0.7); };

    // ── Event handlers ───────────────────────────────────────────────────────
    const onMove = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest?.('input,button,select,textarea,a,label,form,[role=dialog]')) return;
      spawnRippleRef.current(e.clientX, e.clientY);
      if (!audioStartedRef.current) {
        onFirstRef.current?.();
      } else if (soundOnRef.current) {
        onChimeRef.current?.();
      }
    };

    const onResize = () => {
      cam.aspect = window.innerWidth / window.innerHeight;
      cam.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('resize',      onResize);

    // ── Animation loop ───────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let rafId = 0;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const dt     = Math.min(clock.getDelta(), 0.05);
      const motion = reduced ? 0.15 : 1;
      st += dt * (reduced ? 0.3 : 1);
      const t = st;

      starU.uTime.value = t;

      // Camera scroll
      const se  = document.scrollingElement || document.documentElement;
      const max = Math.max(1, se.scrollHeight - window.innerHeight);
      prog += (clamp(se.scrollTop / max, 0, 1) - prog) * Math.min(1, dt * 3);
      mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 2);
      mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 2);

      const endE = clamp((prog - 0.7) / 0.3, 0, 1);
      const ease = endE * endE * (3 - 2 * endE);
      const cz   = 10 - 92 * prog;
      const yb   = -0.6 * ease;

      cam.position.set(
        mouse.x * 0.9 * motion + Math.sin(t * 0.13) * 0.35 * motion,
        yb - mouse.y * 0.5 * motion + Math.sin(t * 0.17 + 1) * 0.2 * motion,
        cz,
      );
      look.set(cam.position.x * 0.3, yb - 1.6 * ease - mouse.y * 0.25 * motion, cz - 14);
      cam.lookAt(look);
      cam.rotation.z += Math.sin(t * 0.09) * 0.012 * motion;

      // Hero group — horizon layout: { x:0, y:1.3, s:0.55 }
      const tg = { x: 0, y: 1.3, s: 0.55 };
      const k  = Math.min(1, dt * 3);
      hero.position.x += (tg.x - hero.position.x) * k;
      hero.position.y += (tg.y - hero.position.y) * k;
      hero.scale.setScalar(hero.scale.x + (tg.s - hero.scale.x) * k);
      fadeGroup(hero, clamp((cz - 1.5) / 5, 0, 1));
      heroGlobe.rotation.y = t * 0.15;

      // Moon orbit
      {
        const a = t * Math.PI * 2 / 48;
        moon.position.set(MO * Math.cos(a), 0, -MO * Math.sin(a));
        moon.rotation.y = a;
        moonMat.uniforms.uOp.value = (moonMat as THREE.Material & { opacity?: number }).opacity ?? 1;
      }

      // Wave ribbon
      energy *= Math.pow(0.4, dt);
      const amp = 1 + energy * 0.9;
      waveLines.forEach((l, i) => {
        const a = l.geometry.attributes.position.array as Float32Array;
        for (let p = 0; p < WP; p++) {
          const x   = -15 + 30 * p / (WP - 1);
          const env = Math.exp(-Math.pow(x / 10, 2));
          a[p * 3]     = x;
          a[p * 3 + 1] = env * amp * (
            1.5  * Math.sin(x * 0.50 + t * 0.45 + i * 0.09) +
            0.7  * Math.sin(x * 1.25 - t * 0.70 + i * 0.16) +
            0.25 * Math.sin(x * 2.60 + t * 1.10)
          ) + i * 0.13;
          a[p * 3 + 2] = -i * 0.32;
        }
        l.geometry.attributes.position.needsUpdate = true;
      });
      fadeGroup(waves, clamp((cz + 40) / 6, 0, 1) * far(-42, 34));

      // Galaxy rings
      rings.forEach((l, i) => { l.rotation.z = t * (0.12 - i * 0.011); });
      fadeGroup(galaxy,  clamp((cz + 52) / 6, 0, 1) * far(-54, 40));
      fadeGroup(planet2, far(-60, 40));
      fadeGroup(planet3, far(-72, 40));
      fadeGroup(grid,    far(-94, 40));
      planet2.rotation.y =  t * 0.2;
      planet3.rotation.y = -t * 0.25;

      // Sparkle flicker
      sparkles.forEach(s => {
        const v = s.userData.base * (0.75 + 0.25 * Math.sin(t * 1.3 + s.userData.ph));
        s.scale.set(v, v, 1);
        (s.material as THREE.SpriteMaterial).opacity =
          clamp((cz - s.position.z - 1) / 4, 0, 1) * (0.6 + 0.4 * Math.sin(t * 0.9 + s.userData.ph));
      });

      // Meteors (disabled under reduced motion)
      if (!reduced && st > nextMeteor) {
        nextMeteor = st + 2.5 + Math.random() * 4;
        const mg = new THREE.BufferGeometry();
        mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        const ml = new THREE.Line(mg, lineMat(WARM, 0.9));
        ml.frustumCulled = false;
        ml.userData = {
          p:   new THREE.Vector3(cam.position.x + 10 + Math.random() * 25, cam.position.y + 6 + Math.random() * 10, cz - 35 - Math.random() * 25),
          d:   new THREE.Vector3(-1, -0.42, 0).normalize(),
          age: 0,
        };
        scene.add(ml);
        meteors.push(ml);
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const ml = meteors[i], u = ml.userData;
        u.age += dt;
        u.p.addScaledVector(u.d, dt * 28);
        const a = ml.geometry.attributes.position.array as Float32Array;
        const tail = (u.p as THREE.Vector3).clone().addScaledVector(u.d, -3.5);
        a[0] = u.p.x; a[1] = u.p.y; a[2] = u.p.z;
        a[3] = tail.x; a[4] = tail.y; a[5] = tail.z;
        ml.geometry.attributes.position.needsUpdate = true;
        (ml.material as THREE.LineBasicMaterial).opacity = 0.9 * Math.sin(Math.PI * clamp(u.age / 1.3, 0, 1));
        if (u.age > 1.3) {
          scene.remove(ml);
          ml.geometry.dispose();
          (ml.material as THREE.Material).dispose();
          meteors.splice(i, 1);
        }
      }

      // Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const g = ripples[i];
        g.userData.age += dt;
        g.children.forEach((child, j) => {
          const a = g.userData.age - j * 0.16;
          const l = child as THREE.LineLoop;
          l.scale.setScalar(a > 0 ? 0.15 + a * 2.2 : 0.01);
          (l.material as THREE.LineBasicMaterial).opacity = a > 0 ? Math.max(0, 1 - a / 1.9) * 0.85 : 0;
        });
        if (g.userData.age > 2.6) {
          scene.remove(g);
          g.children.forEach(l => {
            const mat = (l as THREE.LineLoop).material;
            if (Array.isArray(mat)) mat.forEach(m => m.dispose()); else mat.dispose();
          });
          ripples.splice(i, 1);
        }
      }

      renderer.render(scene, cam);
    };

    tick();

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('resize',      onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once — state is managed via refs

  return (
    <>
      {/* Hidden preload for the figure texture */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={figRef}
        src="/figure-ear.jpg"
        alt=""
        aria-hidden
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      {/* Three.js mounts here */}
      <div
        ref={mountRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background: 'radial-gradient(120% 90% at 50% 25%, #15245a 0%, #0a1238 45%, #050820 100%)',
        }}
      />
    </>
  );
});

export default SceneCanvas;
