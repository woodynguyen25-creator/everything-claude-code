---
name: 3d-cinematic-web
description: "Build cinematic 3D web experiences using Three.js, React Three Fiber, Framer Motion, and GSAP. Emil Kowalski-inspired micro-interactions, scroll-driven storytelling, WebGL shaders, particle systems, and scroll-hijack narratives. Use for landing pages, hero sections, or any web experience where visual storytelling is the product."
origin: ECC
weight: heavy
---

# 3D Cinematic Web — Immersive Visual Storytelling

Build web experiences that feel like films, not websites. This skill covers the full stack for cinematic 3D web: React Three Fiber scenes, Framer Motion choreography, GSAP scroll narratives, Emil Kowalski-style micro-interactions, and shader effects.

## When to Activate

- Landing pages where the visual experience IS the product
- Hero sections with 3D elements (planets, objects, environments)
- Scroll-driven storytelling and parallax narratives
- Premium brand experiences (luxury, tech, creative agencies)
- Any request mentioning: Three.js, R3F, WebGL, cinematic, 3D, immersive, scroll-driven
- Portfolio sites with motion-first design

## The Emil Kowalski Philosophy

Emil Kowalski (emilkowal.ski) is the gold standard for physics-based, buttery-smooth UI micro-interactions. His principles:

1. **Feel before function** — Interactions should feel satisfying before they communicate meaning
2. **Spring physics, never linear** — `spring({ stiffness, damping, mass })` over `ease-in-out`
3. **Gesture continuity** — Drag, velocity, momentum. Never "snap to position" abruptly
4. **Delight in the details** — The hover state, the press state, the release — all choreographed
5. **Constraint = creativity** — Beautiful effects from CSS/Framer alone, not always WebGL

### Emil Kowalski Patterns

```tsx
// Spring physics for all interactions (never linear easing for UI)
import { motion, useSpring, useTransform } from 'framer-motion'

const springConfig = { stiffness: 300, damping: 30, mass: 1 }

// Magnetic button effect (his signature)
const MagneticButton = ({ children }) => {
  const x = useSpring(0, springConfig)
  const y = useSpring(0, springConfig)

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    x.set((e.clientX - centerX) * 0.3)
    y.set((e.clientY - centerY) * 0.3)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.button
      style={{ x, y }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.button>
  )
}

// Drag with momentum (vaul drawer pattern)
const DraggableDrawer = () => {
  const y = useMotionValue(0)
  const opacity = useTransform(y, [0, 300], [1, 0])

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 300 }}
      dragElastic={0.2}
      style={{ y, opacity }}
      onDragEnd={(_, info) => {
        if (info.velocity.y > 500 || info.offset.y > 150) {
          // dismiss
        }
      }}
    />
  )
}

// Staggered text reveal (letter by letter)
const AnimatedText = ({ text }) => {
  const letters = text.split('')
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.03 } } }}
    >
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: 20, rotateX: -90 },
            visible: { opacity: 1, y: 0, rotateX: 0 }
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          style={{ display: 'inline-block', transformOrigin: 'bottom' }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </motion.div>
  )
}

// Scroll velocity parallax
const ParallaxSection = ({ children, speed = 0.5 }) => {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', `${speed * 100}%`])

  return (
    <div ref={ref} style={{ overflow: 'hidden' }}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  )
}
```

---

## React Three Fiber (R3F) — 3D Scene Architecture

### Setup

```bash
npm install three @react-three/fiber @react-three/drei @react-three/postprocessing
```

### Scene Structure

```tsx
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { 
  OrbitControls, Environment, Stars, 
  useTexture, MeshDistortMaterial, Sphere
} from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing'
import { useRef } from 'react'
import * as THREE from 'three'

// Cinematic planet (Lucky Dog-style)
const Planet = ({ scrollProgress }) => {
  const meshRef = useRef()
  const [colorMap, normalMap, roughnessMap] = useTexture([
    '/textures/planet-color.jpg',
    '/textures/planet-normal.jpg',
    '/textures/planet-roughness.jpg',
  ])

  useFrame((state, delta) => {
    if (!meshRef.current) return
    // Slow rotation driven by time
    meshRef.current.rotation.y += delta * 0.05
    // Scale driven by scroll
    const targetScale = 1 + scrollProgress * 2
    meshRef.current.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.05
    )
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        map={colorMap}
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        roughness={0.7}
        metalness={0.1}
      />
    </mesh>
  )
}

// Atmospheric glow (additive blending)
const AtmosphereGlow = ({ color = '#ff00aa', radius = 1.05 }) => (
  <mesh>
    <sphereGeometry args={[radius, 32, 32]} />
    <meshBasicMaterial
      color={color}
      transparent
      opacity={0.15}
      side={THREE.BackSide}
      blending={THREE.AdditiveBlending}
      depthWrite={false}
    />
  </mesh>
)

// Orbit ring particles
const OrbitParticles = ({ count = 500, radius = 2 }) => {
  const points = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const spread = (Math.random() - 0.5) * 0.3
      arr[i * 3] = Math.cos(angle) * (radius + spread)
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.1
      arr[i * 3 + 2] = Math.sin(angle) * (radius + spread)
    }
    return arr
  }, [count, radius])

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.1
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.01} color="#ffffff" transparent opacity={0.6} />
    </points>
  )
}

// Deep starfield
const Starfield = ({ count = 3000 }) => {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count * 3; i++) {
      arr[i] = (Math.random() - 0.5) * 100
    }
    return arr
  }, [count])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.8} sizeAttenuation />
    </points>
  )
}

// Full cinematic scene
const CinematicScene = ({ scrollProgress }) => (
  <Canvas
    camera={{ position: [0, 0, 5], fov: 60 }}
    gl={{ antialias: true, alpha: true }}
    style={{ position: 'fixed', inset: 0, zIndex: 0 }}
  >
    <color attach="background" args={['#000008']} />
    <ambientLight intensity={0.1} />
    <pointLight position={[10, 10, 10]} intensity={1} color="#ff88aa" />
    <pointLight position={[-10, -5, -10]} intensity={0.5} color="#4444ff" />

    <Starfield />
    <Planet scrollProgress={scrollProgress} />
    <AtmosphereGlow color="#ff00aa" />
    <OrbitParticles />

    <EffectComposer>
      <Bloom intensity={1.5} luminanceThreshold={0.3} luminanceSmoothing={0.9} />
      <ChromaticAberration offset={[0.0005, 0.0005]} />
      <Noise opacity={0.03} />
    </EffectComposer>
  </Canvas>
)
```

---

## GSAP Scroll-Driven Storytelling

GSAP ScrollTrigger for narrative scroll sequences:

```bash
npm install gsap @gsap/react
```

```tsx
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Pin + scrub scroll narrative
const ScrollNarrative = () => {
  const containerRef = useRef()

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: 'top top',
        end: '+=500%',
        scrub: 1,         // smooth scrubbing
        pin: true,        // pin the section
        anticipatePin: 1, // prevent jump
      }
    })

    // Stage 1: text fade in
    tl.from('.stage-1', { opacity: 0, y: 50, duration: 1 })
    // Stage 2: planet scale up (communicate with R3F via ref/state)
    tl.to('.planet-scale', { '--scale': 3, duration: 2 })
    // Stage 3: orbit text appears
    tl.from('.orbit-text', { opacity: 0, letterSpacing: '0.5em', duration: 1 })
    // Stage 4: final CTA
    tl.from('.cta', { opacity: 0, scale: 0.8, duration: 1 })

  }, { scope: containerRef })

  return (
    <div ref={containerRef} className="scroll-narrative">
      <div className="stage stage-1">SUPERCHARGE YOUR BUSINESS</div>
      <div className="stage orbit-text">BECOME IMPOSSIBLE TO MISS</div>
      <div className="stage cta">
        <button>Contact Us</button>
      </div>
    </div>
  )
}

// Orbiting text (CSS + GSAP)
const OrbitText = ({ text, radius = 120, duration = 20 }) => {
  const ref = useRef()

  useGSAP(() => {
    gsap.to(ref.current, {
      rotation: 360,
      duration,
      repeat: -1,
      ease: 'none'
    })
  })

  return (
    <svg ref={ref} viewBox="-150 -150 300 300" className="orbit-text-svg">
      <defs>
        <path id="orbit" d={`M ${radius},0 A ${radius},${radius} 0 1,1 ${radius - 0.001},0`} />
      </defs>
      <text fontSize="12" fill="currentColor" letterSpacing="4">
        <textPath href="#orbit">{text} • {text} • </textPath>
      </text>
    </svg>
  )
}
```

---

## Custom GLSL Shaders

For advanced effects (nebula, energy fields, distortion):

```tsx
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

// Custom nebula shader
const NebulaMaterial = shaderMaterial(
  { uTime: 0, uColor1: new THREE.Color('#ff00aa'), uColor2: new THREE.Color('#4400ff') },
  // Vertex
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment
  `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    varying vec2 vUv;

    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      float n = noise(uv * 3.0 + uTime * 0.1);
      vec3 color = mix(uColor1, uColor2, n);
      float alpha = smoothstep(0.0, 1.0, n) * 0.5;
      gl_FragColor = vec4(color, alpha);
    }
  `
)

extend({ NebulaMaterial })

// Use in component
const Nebula = () => {
  const materialRef = useRef()
  useFrame(({ clock }) => {
    if (materialRef.current) materialRef.current.uTime = clock.elapsedTime
  })

  return (
    <mesh>
      <planeGeometry args={[10, 10]} />
      <nebulaMaterial ref={materialRef} transparent depthWrite={false} />
    </mesh>
  )
}
```

---

## Fullscreen GLSL SDF Raymarching (Production Pattern)

The highest-quality cinematic orbs and volumetric objects are NOT Three.js meshes — they are **fullscreen shader quads** that raymarch Signed Distance Functions entirely in GLSL. This pattern was built and shipped for Lucky Dog Marketing's hero.

### Why Raymarching Over Meshes

- No polygon budget — the form is mathematically perfect at every resolution
- Complex organic shapes (tori, blended spheres, soft-body forms) impossible to mesh
- Surface texture via FBM noise runs in the fragment shader — no UV maps needed
- Physically-correct volumetric effects (subsurface scattering, cavity glow)

### The Shader Quad Setup (R3F)

The key insight: **ignore the camera entirely**. Use a `planeGeometry args={[2, 2]}` with `gl_Position = vec4(position.xy, 0.99, 1.0)` in the vertex shader. This clips to NDC space so the plane always covers the full screen regardless of camera position.

```tsx
// NebulaOrb.tsx — fullscreen shader quad pattern
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const VERT = /* glsl */ `
  void main() {
    // Clip-space fullscreen quad — ignores camera completely
    gl_Position = vec4(position.xy, 0.99, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec2  uResolution;

  void main() {
    vec2 uv = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y; // correct aspect ratio

    // ... raymarching code here ...

    gl_FragColor = vec4(color, alpha);
  }
`;

export function NebulaOrb() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const { size } = useThree();

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    materialRef.current.uniforms.uResolution.value = [size.width, size.height];
  });

  return (
    // renderOrder=1 renders on top of background (renderOrder=0)
    <mesh renderOrder={1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uTime:       { value: 0 },
          uResolution: { value: new THREE.Vector2(size.width, size.height) },
        }}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
```

### SDF Primitives and Boolean Operations

```glsl
// Smooth minimum — blends two SDFs with a soft boundary (k = blend radius)
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Torus SDF — t = vec2(major radius, tube radius)
float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

// Sphere SDF
float sdSphere(vec3 p, float r) { return length(p) - r; }

// Rotation matrices — drive multi-axis tumble from uTime
mat3 rotX(float a) {
  float s = sin(a), c = cos(a);
  return mat3(1,0,0, 0,c,-s, 0,s,c);
}
mat3 rotY(float a) {
  float s = sin(a), c = cos(a);
  return mat3(c,0,s, 0,1,0, -s,0,c);
}
mat3 rotZ(float a) {
  float s = sin(a), c = cos(a);
  return mat3(c,-s,0, s,c,0, 0,0,1);
}

// Scene SDF — 4 tori + sphere blended together, clipped to bounding sphere
float sceneSDF(vec3 p) {
  // Slow multi-axis rotation from time
  vec3 rp = rotY(uTime * 0.11) * rotX(uTime * 0.07) * rotZ(uTime * 0.05) * p;

  // Breathing scale pulse
  float pulse = 1.0 + 0.04 * sin(uTime * 0.8);
  rp /= pulse;

  float d = sdSphere(rp, 0.55);
  d = smin(d, sdTorus(rp,             vec2(0.50, 0.14)), 0.18);
  d = smin(d, sdTorus(rp * rotX(1.57), vec2(0.46, 0.11)), 0.18);
  d = smin(d, sdTorus(rp * rotZ(0.90), vec2(0.44, 0.10)), 0.16);
  d = smin(d, sdTorus(rp * rotX(2.30), vec2(0.42, 0.09)), 0.16);
  d *= pulse;

  // Clip to bounding sphere for clean silhouette
  float bound = sdSphere(p, 0.72);
  return max(d, bound);
}
```

### FBM Domain Warping for Surface Texture

Domain warping (warping the input to a noise function by another noise) creates the organic filament/tendril quality of nebula surfaces:

```glsl
float hash(vec3 p) {
  p = fract(p * vec3(127.1, 311.7, 74.7));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

// Smooth 3D value noise
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i),           hash(i+vec3(1,0,0)), u.x),
                 mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), u.x), u.y),
             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), u.x),
                 mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), u.x), u.y), u.z);
}

// 5-octave FBM
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.1 + vec3(1.7, 9.2, 4.3);
    a *= 0.5;
  }
  return v;
}

// Domain warp: warp p by fbm before sampling fbm again
// Creates tendrils, filaments, organic swirls
float warpedNoise(vec3 p, float t) {
  vec3 offset = vec3(
    fbm(p + vec3(0.0, 0.0, t * 0.12)),
    fbm(p + vec3(5.2, 1.3, t * 0.09)),
    fbm(p + vec3(1.7, 9.2, t * 0.07))
  );
  return fbm(p + 1.4 * offset + t * 0.05);
}
```

### Raymarcher Loop

```glsl
#define MAX_STEPS 110
#define SURF_DIST  0.0015
#define MAX_DIST   4.0

// Returns distance to surface, or MAX_DIST if no hit
float raymarch(vec3 ro, vec3 rd) {
  float d = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    float dist = sceneSDF(ro + rd * d);
    if (dist < SURF_DIST) return d;
    if (d > MAX_DIST)    return MAX_DIST;
    d += dist;
  }
  return MAX_DIST;
}

// Finite-difference surface normal (critical for lighting)
vec3 calcNormal(vec3 p) {
  const float eps = 0.001;
  return normalize(vec3(
    sceneSDF(p + vec3(eps, 0, 0)) - sceneSDF(p - vec3(eps, 0, 0)),
    sceneSDF(p + vec3(0, eps, 0)) - sceneSDF(p - vec3(0, eps, 0)),
    sceneSDF(p + vec3(0, 0, eps)) - sceneSDF(p - vec3(0, 0, eps))
  ));
}

// In main():
vec2 uv = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
uv.x *= uResolution.x / uResolution.y;

vec3 ro = vec3(0.0, 0.0, 2.2);            // camera origin
vec3 rd = normalize(vec3(uv, -1.4));      // ray direction (focal length = 1.4)

float dist = raymarch(ro, rd);
bool hit = dist < MAX_DIST;

if (hit) {
  vec3 p = ro + rd * dist;
  vec3 n = calcNormal(p);

  // Surface texture from domain-warped FBM
  float tex = warpedNoise(p * 2.8, uTime);

  // Map texture to palette
  vec3 c0 = vec3(0.04, 0.02, 0.12);  // deep void
  vec3 c1 = vec3(0.22, 0.32, 0.82);  // violet-blue
  vec3 c2 = vec3(0.54, 0.24, 0.80);  // rose-violet
  vec3 c3 = vec3(0.80, 0.24, 0.58);  // rose-pink
  vec3 c4 = vec3(0.88, 0.76, 0.96);  // warm lavender-white

  vec3 baseColor = tex < 0.25 ? mix(c0, c1, tex * 4.0)
                : tex < 0.50 ? mix(c1, c2, (tex - 0.25) * 4.0)
                : tex < 0.75 ? mix(c2, c3, (tex - 0.50) * 4.0)
                :               mix(c3, c4, (tex - 0.75) * 4.0);

  // Fresnel rim
  float fresnel = pow(1.0 - max(0.0, dot(n, -rd)), 3.0);

  // Two soft lights + specular
  vec3 L1 = normalize(vec3(0.6, 0.8, 1.0));
  float diff1 = max(0.0, dot(n, L1));
  vec3 spec = pow(max(0.0, dot(reflect(-L1, n), -rd)), 24.0) * vec3(0.80, 0.75, 1.00);

  vec3 color = baseColor * (0.3 + 0.7 * diff1) + spec * 0.5 + fresnel * c3 * 0.8;
  gl_FragColor = vec4(color, 1.0);
} else {
  gl_FragColor = vec4(0.0); // transparent — background shows through
}
```

### Multi-Layer Starfield Background (Shader Quad)

The same fullscreen quad pattern works for procedural starfields with zero geometry:

```glsl
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Per-cell star with shimmer
float stars(vec2 uv, float density, float seed) {
  vec2 id  = floor(uv * density + seed);
  vec2 gv  = fract(uv * density + seed) - 0.5;
  float h  = hash(id);
  if (h < 0.962) return 0.0;   // most cells empty
  float brightness = hash(id + vec2(3.1, 7.7));
  float size = 0.018 + brightness * 0.048;
  float shimmer = 0.82 + 0.18 * sin(uTime * (1.4 + brightness * 3.5) + h * 6.2832);
  return smoothstep(size, 0.0, length(gv)) * (0.28 + brightness * 0.72) * shimmer;
}

// Milky Way band — diagonal glow strip
float ca = cos(0.42), sa = sin(0.42);
vec2 centered = uv - 0.5;
vec2 rotUV = vec2(ca * centered.x - sa * centered.y,
                  sa * centered.x + ca * centered.y);
float band = exp(-rotUV.y * rotUV.y * 11.0);   // tight warm dust
float haze = exp(-rotUV.y * rotUV.y *  3.2);   // wide cool violet haze

// Layer stars from faint background to bright foreground
vec3 color = vec3(0.005, 0.003, 0.009);        // near-pure black base
color += vec3(0.055, 0.038, 0.018) * band;     // warm dust
color += vec3(0.018, 0.012, 0.048) * haze * 0.7;
color += vec3(0.74, 0.82, 1.00) * stars(uv, 460.0,  0.0) * 0.28;  // faint blue wash
color += vec3(0.86, 0.92, 1.00) * stars(uv, 160.0,  5.7) * 0.78;  // medium
color += vec3(1.00, 0.97, 0.90) * stars(uv,  50.0, 31.1) * 1.20;  // bright warm-white
color += vec3(0.86, 0.93, 1.00) * stars(uv,  22.0, 88.5) * 2.00;  // standout blue-white
color += vec3(0.80, 0.88, 1.00) * stars(uv, 500.0, 44.2) * band * 0.38; // band bonus
```

### Layering Two Shader Quads

Use `renderOrder` to stack a background quad under a transparent foreground quad:

```tsx
// Background — renderOrder=0, alpha=false (opaque)
<mesh renderOrder={0}>
  <planeGeometry args={[2, 2]} />
  <shaderMaterial depthTest={false} depthWrite={false} /* no transparent */ />
</mesh>

// Foreground orb — renderOrder=1, transparent
<mesh renderOrder={1}>
  <planeGeometry args={[2, 2]} />
  <shaderMaterial transparent depthTest={false} depthWrite={false} />
</mesh>
```

### Canvas Config for Shader-Heavy Scenes

```tsx
<Canvas
  camera={{ position: [0, 0, 1], fov: 75, near: 0.01, far: 100 }}
  gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
  dpr={[1, 1.5]}           // never exceed 1.5 — shader cost scales with pixel count
  performance={{ min: 0.5 }} // auto-drop DPR under load
>
```

### Shader Performance Rules

- **DPR cap at 1.5** — raymarching cost scales quadratically with resolution. Going 2x resolution costs 4x GPU time.
- **Step count tradeoff** — 80–120 steps is cinematic quality. Drop to 64 for mobile.
- **Bounding sphere clip** — always add a cheap outer sphere SDF so rays bail out early instead of exhausting all steps.
- **Avoid branching in GLSL** — use `smoothstep` and `mix` instead of `if/else` inside the raymarch loop.
- **`frameloop="demand"`** — set this when the canvas scrolls off-screen (use IntersectionObserver).

---

## Scroll-Synchronized 3D (R3F + Scroll)

Connect scroll position to 3D scene:

```tsx
// App.tsx — connect scroll to R3F
const useSmoothScroll = () => {
  const [scrollProgress, setScrollProgress] = useState(0)
  const scrollRef = useRef(0)
  const targetRef = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight
      targetRef.current = window.scrollY / max
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let rafId
    const tick = () => {
      scrollRef.current += (targetRef.current - scrollRef.current) * 0.05
      setScrollProgress(scrollRef.current)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return scrollProgress
}

// In useFrame — drive everything from scrollProgress
useFrame(() => {
  const s = scrollProgress
  // Camera zoom
  camera.position.z = 5 - s * 2
  // Planet rotation speed increases with scroll
  planetRef.current.rotation.y += 0.001 + s * 0.01
  // Glow intensity
  glowRef.current.material.opacity = 0.1 + s * 0.4
})
```

---

## Performance for Mobile

3D is expensive. These rules are non-negotiable:

```tsx
// 1. Detect device capability
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
const isLowEnd = navigator.hardwareConcurrency < 4

// 2. Reduce quality on mobile
const config = {
  dpr: isMobile ? 1 : Math.min(devicePixelRatio, 2),
  shadows: !isMobile,
  postprocessing: !isLowEnd,
  particleCount: isMobile ? 500 : 3000,
  geometryDetail: isMobile ? 32 : 128,
}

// 3. Pause animation when off-screen
const { ref, inView } = useInView({ threshold: 0.1 })
useFrame(() => {
  if (!inView) return  // skip frame when hidden
})

// 4. Canvas performance settings
<Canvas
  dpr={config.dpr}
  performance={{ min: 0.5 }}  // auto-reduce DPR under load
  frameloop={inView ? 'always' : 'never'}
>

// 5. Dispose textures when unmounting
useEffect(() => {
  return () => {
    texture.dispose()
    geometry.dispose()
    material.dispose()
  }
}, [])
```

---

## Cinematic Typography Patterns

Text that feels like a film title sequence:

```tsx
// Masked reveal (text slides in from behind a mask)
const MaskedReveal = ({ children }) => (
  <div style={{ overflow: 'hidden' }}>
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
    >
      {children}
    </motion.div>
  </div>
)

// Scramble text effect (Matrix-style reveal)
const ScrambleText = ({ text, duration = 1000 }) => {
  const [display, setDisplay] = useState(text)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  useEffect(() => {
    let iteration = 0
    const maxIterations = text.length * 3
    const interval = setInterval(() => {
      setDisplay(
        text.split('').map((char, i) => {
          if (i < Math.floor(iteration / 3)) return char
          return chars[Math.floor(Math.random() * chars.length)]
        }).join('')
      )
      iteration++
      if (iteration >= maxIterations) clearInterval(interval)
    }, duration / maxIterations)
    return () => clearInterval(interval)
  }, [text])

  return <span>{display}</span>
}

// Split-screen text with kinetic motion
const KineticHeadline = ({ line1, line2 }) => (
  <div className="kinetic">
    <motion.div
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 80, damping: 15 }}
    >
      {line1}
    </motion.div>
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 80, damping: 15, delay: 0.1 }}
    >
      {line2}
    </motion.div>
  </div>
)
```

---

## Stack Recommendations

| Goal | Stack |
|------|-------|
| Cinematic landing page | Vite + React + R3F + Framer Motion + GSAP |
| Maximum performance | Next.js + R3F + Framer Motion (no GSAP) |
| Fullscreen scroll narrative | React + GSAP ScrollTrigger + R3F |
| Simple 3D hero section | Vite + R3F + Framer Motion |
| Pure CSS micro-interactions | React + Framer Motion only (Emil Kowalski style) |
| Shader-heavy visuals | Vite + R3F + custom GLSL shaders |

---

## Pre-Delivery Checklist

- [ ] Mobile performance test — smooth at 60fps on mid-range phone?
- [ ] `prefers-reduced-motion` — 3D scene respects it (pause or simplify)
- [ ] Canvas disposes resources on unmount (textures, geometry, material)
- [ ] Scroll sync is smooth — no janky jumps between scroll position and 3D state
- [ ] Text remains legible — cinematic doesn't mean unreadable
- [ ] `frameloop="never"` or paused when canvas is off-screen
- [ ] Slop check — does this look like a template or genuinely crafted?
- [ ] Sound (if used) is off by default, toggle clearly visible
- [ ] Planet/3D object stays center stage — never drifts to side without intent
- [ ] PostProcessing (Bloom/Glitch) is tasteful — 1-2 effects max, not a stack

---

## Lucky Dog Marketing — V2 Implementation (Shipped)

This is the actual production implementation at `C:\Github Repos\lucky-dog-landing`. Use as a reference for clients requiring a similar cinematic hero.

**Stack:** Vite + React 19 + TypeScript + R3F + Framer Motion + Tailwind v4 + Express API

**Hero:** Two fullscreen GLSL shader quads stacked via `renderOrder`.
- Background (`renderOrder=0`): Milky Way starfield — 9 star density layers, diagonal band glow, subtle nebula color hints, shimmering stars via `sin(uTime)`
- Foreground (`renderOrder=1`, transparent): 4-tori SDF raymarcher with FBM domain-warped surface, violet-rose-pink palette, Fresnel rim lighting

**Locked palette (BASELINE — do not change without client approval):**
```
c0: vec3(0.04, 0.02, 0.12)  — deep void
c1: vec3(0.22, 0.32, 0.82)  — violet-blue
c2: vec3(0.54, 0.24, 0.80)  — rose-violet
c3: vec3(0.80, 0.24, 0.58)  — rose-pink
c4: vec3(0.88, 0.76, 0.96)  — warm lavender-white
Background base: vec3(0.005, 0.003, 0.009)  — near-pure black
```

**Canvas config:**
```tsx
<Canvas
  camera={{ position: [0, 0, 1], fov: 75, near: 0.01, far: 100 }}
  gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
  dpr={[1, 1.5]}
  performance={{ min: 0.5 }}
>
```

**Cinematic scroll (next phase — not yet built):** ~400vh GSAP ScrollTrigger journey:
- Hero → void descent (HookText hook phrases) → GLSL black hole → Kling AI hyperspace warp video → Veil Nebula galaxy zone (glass UI, service cards, contact form)
