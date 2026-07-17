import { Component, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import * as THREE from 'three';

// Relative so it resolves against <base href> on both dev (/) and Pages (/cv/).
const TEX = 'textures/planet/';

// Longitude (°E) to anchor toward the camera. Israel sits at ~35°E.
// SphereGeometry maps longitude λ so that rotating the globe by (270° − λ)
// about Y brings that meridian to face the camera (+z).
const ANCHOR_LON = 35;

@Component({
  selector: 'app-planet',
  templateUrl: './planet.component.html',
  standalone: true,
  styleUrls: ['./planet.component.scss']
})
export class PlanetComponent implements AfterViewInit, OnDestroy {
  private canvas!: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  private earth!: THREE.Mesh;
  private clouds!: THREE.Mesh;
  private earthGroup = new THREE.Group();

  private frameId = 0;
  private loaderHidden = false;
  private loaderTimeout = 0;
  // The WebGL render is the most expensive per-frame work on the page, and the
  // globe spin is far too slow for 60fps to matter — cap the loop at ~30fps
  // (rotation is dt-scaled below so the spin rate is unchanged).
  private static readonly FRAME_MS = 1000 / 30;
  private lastFrame = 0;
  private readonly sunDir = new THREE.Vector3(-0.7, 0.35, 0.6).normalize();
  // Reduced-motion: hold the globe still and render on demand instead of spinning.
  private reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  ngAfterViewInit() {
    this.canvas = document.getElementById('planetCanvas') as HTMLCanvasElement;
    this.initThree();
    this.buildEarth();
    if (this.reduceMotion) this.renderStill();
    else this.animate();
    // Safety net: never let a failed/slow asset trap the user on the loader.
    this.loaderTimeout = window.setTimeout(() => this.hideLoader(), 9000);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.loaderTimeout);
    this.renderer?.dispose();
  }

  // ── Intro loader ──────────────────────────────────────────────────────────

  private updateLoader(progress: number) {
    const pct = Math.round(Math.min(1, progress) * 100);
    const fill = document.getElementById('ldr-fill');
    const label = document.getElementById('ldr-pct');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = pct + '%';
  }

  private hideLoader() {
    if (this.loaderHidden) return;
    this.loaderHidden = true;
    clearTimeout(this.loaderTimeout);
    const el = document.getElementById('app-loader');
    if (!el) return;
    this.updateLoader(1);
    // Let the first Earth frame paint, then fade the loader out and remove it.
    requestAnimationFrame(() => {
      el.classList.add('hidden');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    });
  }

  // ── Scene setup ───────────────────────────────────────────────────────────

  private initThree() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,        // let nebula + stars show through
      antialias: true,
    });
    // A full-screen WebGL background doesn't need full retina resolution on
    // small screens: on mobile viewports (below the 1200px desktop breakpoint —
    // keep in sync with the `desktop` mixin in _design-tokens.scss) cap DPR at
    // 1.5 instead of 2, which renders ~44% fewer pixels per frame.
    const mobile = window.matchMedia('(max-width: 1199px)').matches;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      40, window.innerWidth / window.innerHeight, 0.1, 100
    );
    this.camera.position.set(0, 0, 3.4);
    this.camera.lookAt(0, 0, 0);

    // Shift the globe to the lower-right so the HUD panel sits over empty space.
    this.earthGroup.position.set(0.95, -0.55, 0);
    this.earthGroup.rotation.z = THREE.MathUtils.degToRad(23.5); // axial tilt
    this.scene.add(this.earthGroup);
  }

  // ── Earth, clouds, atmosphere ─────────────────────────────────────────────

  private buildEarth() {
    // Drive the intro loader from real texture-download progress.
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => this.updateLoader(loaded / total);
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
    const elapsed = now - this.lastFrame;
    if (elapsed < PlanetComponent.FRAME_MS) return;
    this.lastFrame = now;
    // dt in 60fps-frame units, clamped so a background-tab pause doesn't jump.
    const dt = Math.min(elapsed / (1000 / 60), 4);
    this.earth.rotation.y   += 0.00008 * dt;
    this.clouds.rotation.y  += 0.00012 * dt; // clouds drift slightly faster
    this.renderer.render(this.scene, this.camera);
  };

  // One-off render for reduced-motion mode (no spin, no rAF loop).
  private renderStill = () => this.renderer.render(this.scene, this.camera);

  @HostListener('window:resize')
  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.reduceMotion) this.renderStill();
  }
}
