import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

export type ShaderAnimationProps = {
  className?: string;
  /** Canvas layer opacity (lines over transparent clear) */
  canvasOpacity?: number;
};

/**
 * Full-bleed WebGL line shader (Three.js). Vite + React — no `"use client"`.
 * Original art adapted from shadcn-style snippet; uses npm `three` (not CDN).
 */
export function ShaderAnimation({ className, canvasOpacity = 0.38 }: ShaderAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    camera: THREE.OrthographicCamera | null;
    scene: THREE.Scene | null;
    renderer: THREE.WebGLRenderer | null;
    material: THREE.ShaderMaterial | null;
    geometry: THREE.PlaneGeometry | null;
    uniforms: { time: { value: number }; resolution: { value: THREE.Vector2 } } | null;
    animationId: number | null;
    resizeObserver: ResizeObserver | null;
    onWinResize: (() => void) | null;
  }>({
    camera: null,
    scene: null,
    renderer: null,
    material: null,
    geometry: null,
    uniforms: null,
    animationId: null,
    resizeObserver: null,
    onWinResize: null,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const vertexShader = `
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;

      uniform vec2 resolution;
      uniform float time;

      float random (in float x) {
        return fract(sin(x) * 1e4);
      }

      float random (vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);

        vec2 fMosaicScal = vec2(4.0, 2.0);
        vec2 vScreenSize = vec2(256.0, 256.0);
        uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
        uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);

        float t = time * 0.06 + random(uv.x) * 0.4;
        float lineWidth = 0.0008;

        vec3 color = vec3(0.0);
        for (int j = 0; j < 3; j++) {
          for (int i = 0; i < 5; i++) {
            color[j] += lineWidth * float(i * i) /
              abs(fract(t - 0.01 * float(j) + float(i) * 0.01) * 1.0 - length(uv));
          }
        }

        vec3 rgb = vec3(color[2], color[1], color[0]);
        rgb = mix(rgb, vec3(0.15, 0.72, 0.52), 0.42);
        gl_FragColor = vec4(rgb, 1.0);
      }
    `;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 1;

    const scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      time: { value: 1.0 },
      resolution: { value: new THREE.Vector2() },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    sceneRef.current = {
      camera,
      scene,
      renderer,
      material,
      geometry,
      uniforms,
      animationId: null,
      resizeObserver: null,
      onWinResize: null,
    };

    const resize = () => {
      const r = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      renderer.setSize(w, h, false);
      uniforms.resolution.value.set(renderer.domElement.width, renderer.domElement.height);
    };

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(container);
    sceneRef.current.resizeObserver = ro;

    const onWinResize = () => resize();
    window.addEventListener('resize', onWinResize);
    sceneRef.current.onWinResize = onWinResize;

    const animate = () => {
      const ref = sceneRef.current;
      ref.animationId = requestAnimationFrame(animate);
      uniforms.time.value += 0.05;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      const ref = sceneRef.current;
      if (ref.animationId != null) cancelAnimationFrame(ref.animationId);
      ref.animationId = null;
      ref.resizeObserver?.disconnect();
      ref.resizeObserver = null;
      if (ref.onWinResize) window.removeEventListener('resize', ref.onWinResize);
      ref.onWinResize = null;
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      ref.camera = null;
      ref.scene = null;
      ref.renderer = null;
      ref.material = null;
      ref.geometry = null;
      ref.uniforms = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('pointer-events-none absolute inset-0 z-0 overflow-hidden', className)}
      style={{ opacity: canvasOpacity }}
      aria-hidden
    />
  );
}
