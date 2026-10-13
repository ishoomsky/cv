import { Component, AfterViewInit, OnDestroy, HostListener, inject } from '@angular/core';
import type * as T from 'three';

// three.js is loaded on demand (dynamic import → its own chunk) only when the
// planet is enabled, so it never weighs on the initial bundle.
let THREE: typeof import('three');
import { SpaceService } from '../space.service';

// Relative so it resolves against <base href> on both dev (/) and Pages (/cv/).
const TEX = 'textures/planet/';

// Longitude (°E) to anchor toward the camera. Israel sits at ~35°E.
// SphereGeometry maps longitude λ so that rotating the globe by (270° − λ)
// about Y brings that meridian to face the camera (+z).
const ANCHOR_LON = 35;

// Temporarily off: the globe is the heaviest layer (WebGL + ~MBs of textures).
// While false nothing is initialised or downloaded, the canvas is hidden and the
// intro loader is dismissed straight away (it's normally driven by the texture
// download). Flip back to true to bring the planet back.
export const PLANET_ENABLED = false;

@Component({
  selector: 'app-planet',
  templateUrl: './planet.component.html',
  standalone: true,
  styleUrls: ['./planet.component.scss']
})
export class PlanetComponent implements AfterViewInit, OnDestroy {
  private canvas!: HTMLCanvasElement;
  private renderer?: T.WebGLRenderer;
  private scene!: T.Scene;
  private camera!: T.PerspectiveCamera;

  private earth!: T.Mesh;
  private clouds!: T.Mesh;
  private earthGroup!: T.Group;
  private space = inject(SpaceService);
  // Current (eased) pose. Starts at the default (Home) pose, so a deep link to
  // another page flies the globe into place on load.
  private pose = { ...this.space.planet };

  private frameId = 0;
  private loaderHidden = false;
  private loaderTimeout = 0;
  // The WebGL render is the most expensive per-frame work on the page. At rest
  // the globe turns ~2px a second, so 15fps is visually identical; while it
  // moves (page change, Home scroll) it renders at 30fps. Rotation and easing
  // are dt-scaled, so speeds don't depend on the frame rate.
  private static readonly IDLE_FRAME_MS = 1000 / 15;
  private static readonly MOVING_FRAME_MS = 1000 / 30;
  private lastFrame = 0;
  private sunDir!: T.Vector3;
  private destroyed = false;
  // Reduced-motion: hold the globe still and render on demand instead of spinning.
  private reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  // Phones: the globe is hidden (display: none in the SCSS, same breakpoint), so
  // skip the WebGL render too. Textures still load — they drive the intro loader.
  private hiddenMq = window.matchMedia('(max-width: 700px)');

  async ngAfterViewInit() {
    this.canvas = document.getElementById('planetCanvas') as HTMLCanvasElement;
    if (!PLANET_ENABLED) {
      this.canvas.style.display = 'none';
      this.hideLoader();
      return;
    }
    // Safety net: never let a failed/slow asset (three.js chunk or textures)
    // trap the user on the loader.
    this.loaderTimeout = window.setTimeout(() => this.hideLoader(), 9000);
    try {
      THREE = await import('three');
    } catch {
      this.hideLoader();
      return;
    }
    if (this.destroyed) return;
    this.earthGroup = new THREE.Group();
    this.sunDir = new THREE.Vector3(-0.7, 0.35, 0.6).normalize();
    this.initThree();
    this.buildEarth();
    this.applyPose();
    if (this.reduceMotion) this.renderStill();
    // Runs in reduced-motion too (no spin) so page changes can still move the globe.
    this.animate();
  }

  ngOnDestroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.loaderTimeout);
    this.renderer?.dispose();
  }

  // ── Intro loader ──────────────────────────────────────────────────────────

  // Fade the spinner out (after the first Earth frame has painted) and signal
  // SpaceService.introReady, which starts the first-load entrance.
  private hideLoader() {
    if (this.loaderHidden) return;
    this.loaderHidden = true;
    clearTimeout(this.loaderTimeout);
    const el = document.getElementById('app-loader');
    requestAnimationFrame(() => {
      this.space.markIntroReady();
      if (!el) return;
      el.classList.add('hidden');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    });
  }

  // ── Scene setup ───────────────────────────────────────────────────────────

  private initThree() {
    // A soft, dimmed full-screen globe doesn't need full retina resolution: cap
    // the pixel ratio at 1.5 (~44% fewer pixels than 2x per frame). At that
    // density MSAA buys nothing visible, so it's only kept on 1x screens.
    const dpr = Math.min(window.devicePixelRatio, 1.5);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,        // let nebula + stars show through
      antialias: dpr < 1.5,
      powerPreference: 'high-performance',
    });
    this.renderer!.setPixelRatio(dpr);
    this.renderer!.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      40, window.innerWidth / window.innerHeight, 0.1, 100
    );
    this.camera.position.set(0, 0, 3.4);
    this.camera.lookAt(0, 0, 0);

    this.earthGroup.rotation.z = THREE.MathUtils.degToRad(23.5); // axial tilt
    this.scene.add(this.earthGroup);
  }

  // ── Earth, clouds, atmosphere ─────────────────────────────────────────────

  private buildEarth() {
    // The intro spinner stays up until the textures are in.
    const manager = new THREE.LoadingManager();
    manager.onLoad  = () => { this.hideLoader(); if (this.reduceMotion) this.renderStill(); };
    manager.onError = () => this.hideLoader(); // never leave the loader stuck

    const loader = new THREE.TextureLoader(manager);
    const day      = loader.load(TEX + 'earth_atmos_2048.jpg');
    const night    = loader.load(TEX + 'earth_lights_2048.png');
    const specular = loader.load(TEX + 'earth_specular_2048.jpg');
    const normal   = loader.load(TEX + 'earth_normal_2048.jpg');
    const cloudTex = loader.load(TEX + 'earth_clouds_1024.png');
    [day, night].forEach(t => (t.colorSpace = THREE.SRGBColorSpace));

    const geo = new THREE.SphereGeometry(1, 96, 96);

    // Custom shader: smooth day/night terminator + glowing city lights +
    // ocean specular glint. Lit by a single sun direction in world space.
    const earthMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture:   { value: day },
        nightTexture: { value: night },
        specularMap:  { value: specular },
        normalMap:    { value: normal },
        sunDirection: { value: this.sunDir },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D specularMap;
        uniform vec3 sunDirection;
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;

        void main() {
          vec3 N = normalize(vWorldNormal);
          vec3 L = normalize(sunDirection);
          float sun = dot(N, L);

          // Soft terminator between lit and dark hemispheres.
          float dayAmount = smoothstep(-0.18, 0.30, sun);

          vec3 dayColor   = texture2D(dayTexture, vUv).rgb;
          vec3 nightColor = texture2D(nightTexture, vUv).rgb;

          // Boost & warm the city lights, only visible on the dark side.
          vec3 lights = nightColor * vec3(1.6, 1.35, 0.9) * (1.0 - dayAmount);
          vec3 color  = mix(vec3(0.0), dayColor, dayAmount) + lights;

          // Ocean specular highlight (specular map: water bright, land dark).
          float ocean = texture2D(specularMap, vUv).r;
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 halfV   = normalize(L + viewDir);
          float specv  = pow(max(dot(N, halfV), 0.0), 30.0) * ocean * dayAmount;
          color += vec3(0.5, 0.6, 0.7) * specv;

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    this.earth = new THREE.Mesh(geo, earthMat);
    this.earthGroup.add(this.earth);

    // Cloud shell — lit by a directional light so it darkens on the night side.
    // The PNG carries cloud shape in its alpha channel (RGB is white), so use
    // it as `map` (alpha → transparency), NOT alphaMap (which would read a flat
    // green channel and paint the whole sphere solid white).
    cloudTex.colorSpace = THREE.SRGBColorSpace;
    const cloudMat = new THREE.MeshPhongMaterial({
      map: cloudTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
    });
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 96, 96), cloudMat);
    this.earthGroup.add(this.clouds);

    // Anchor the starting view on Israel (~35°E) facing the camera.
    const anchor = THREE.MathUtils.degToRad(270 - ANCHOR_LON);
    this.earth.rotation.y = anchor;
    this.clouds.rotation.y = anchor;

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.copy(this.sunDir);
    this.scene.add(sunLight);
    this.scene.add(new THREE.AmbientLight(0x223344, 0.6));

    this.addAtmosphere();
  }

  // ── Atmosphere ────────────────────────────────────────────────────────────
  // A single soft back-facing shell hugging the surface — no outer halo bleeding
  // into space. The brightness ramps gently from the surface to the horizon
  // (low fresnel power = soft transition), brightens toward the sun, and picks
  // up a faint warm tint along the terminator.

  private addAtmosphere() {
    const atmMat = new THREE.ShaderMaterial({
      uniforms: { sunDirection: { value: this.sunDir } },
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */`
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 sunDirection;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 N = normalize(vWorldNormal);
          vec3 V = normalize(cameraPosition - vWorldPos);
          float fres = 1.0 - abs(dot(V, N));
          // Low power → gentle, gradual falloff from surface to horizon.
          float rim  = pow(fres, 1.6);

          float sun     = dot(N, normalize(sunDirection));
          float dayMask = smoothstep(-0.35, 0.30, sun); // fades out on night side

          // Gentle deep-blue → cyan ramp, no hard white-hot core.
          vec3 deep = vec3(0.12, 0.38, 0.92);
          vec3 cyan = vec3(0.45, 0.74, 1.0);
          vec3 col  = mix(deep, cyan, smoothstep(0.10, 0.95, fres));

          // Faint warm band on the lit side of the terminator.
          float term = exp(-pow(sun * 2.6, 2.0));
          col = mix(col, vec3(1.0, 0.52, 0.28), term * 0.35 * dayMask);

          float intensity = rim * (0.14 + 0.95 * dayMask);
          gl_FragColor = vec4(col * intensity, intensity);
        }
      `,
    });
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.02, 96, 96), atmMat);
    this.earthGroup.add(atmosphere);
  }

  // ── Loop & resize ─────────────────────────────────────────────────────────

  private animate = (now = performance.now()) => {
    this.frameId = requestAnimationFrame(this.animate);
    if (this.hiddenMq.matches) return;
    const elapsed = now - this.lastFrame;
    if (elapsed < (this.flying() ? PlanetComponent.MOVING_FRAME_MS : PlanetComponent.IDLE_FRAME_MS)) return;
    this.lastFrame = now;
    // dt in 60fps-frame units, clamped so a background-tab pause doesn't jump.
    const dt = Math.min(elapsed / (1000 / 60), 4);
    const moved = this.easePose(dt);
    if (this.reduceMotion) {
      // Still globe: only repaint when a page change actually moved it.
      if (moved) this.renderStill();
      return;
    }
    this.earth.rotation.y   += 0.00008 * dt;
    this.clouds.rotation.y  += 0.00012 * dt; // clouds drift slightly faster
    this.renderer!.render(this.scene, this.camera);
  };

  // One-off render for reduced-motion mode (no spin).
  private renderStill = () => this.renderer!.render(this.scene, this.camera);

  /** Whether the globe is still easing towards its page's pose. */
  private flying() {
    const t = this.space.planet, p = this.pose;
    return Math.abs(t.x - p.x) + Math.abs(t.y - p.y) + Math.abs(t.scale - p.scale) + Math.abs(t.opacity - p.opacity) > 4e-4;
  }

  // Ease the current pose towards the page's target pose (SpaceService.planet),
  // dt-scaled so the ~1s flight is frame-rate independent. Reduced motion snaps.
  // Returns whether anything changed.
  private easePose(dt: number) {
    const target = this.space.planet, pose = this.pose;
    const k = this.reduceMotion ? 1 : Math.min(1, 0.055 * dt);
    let moved = false;
    for (const key of ['x', 'y', 'scale', 'opacity'] as const) {
      const d = target[key] - pose[key];
      if (Math.abs(d) < 1e-4) continue;
      pose[key] += d * k;
      moved = true;
    }
    if (moved) this.applyPose();
    return moved;
  }

  // x is a fraction of the visible half-width, so poses hold across aspect ratios.
  // The visible half-height at z=3.4 / fov 40 is ~1.24. Portrait screens are too
  // narrow to park the globe beside the copy, so drop it lower instead.
  private applyPose() {
    const aspect = window.innerWidth / window.innerHeight;
    const halfWidth = 3.4 * Math.tan(THREE.MathUtils.degToRad(20)) * aspect;
    const { x, y, scale, opacity } = this.pose;
    this.earthGroup.position.set(halfWidth * x, aspect < 1 ? y - 0.6 : y, 0);
    this.earthGroup.scale.setScalar(scale);
    this.canvas.style.opacity = String(opacity);
  }

  @HostListener('window:resize')
  onResize() {
    if (!this.renderer) return;  // disabled, or three.js not loaded yet
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.applyPose();
    this.renderer!.setSize(w, h);
    if (this.reduceMotion) this.renderStill();
  }
}
