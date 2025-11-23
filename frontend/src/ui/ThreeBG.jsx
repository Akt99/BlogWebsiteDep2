
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export default function ThreeBG() {
  const ref = useRef(null);

  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;

    // Wait until container has size before initializing renderer (CRITICAL)
    const { clientWidth: w, clientHeight: h } = mount;
    if (w === 0 || h === 0) return; // prevents zero-size framebuffer crash

    let renderer = null;
    let composer = null;
    let raf = null;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.015);

    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
    camera.position.set(0, 0, 8);

    // Create renderer SAFELY
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.4));
    renderer.domElement.style.pointerEvents = "none";

    // append renderer safely
    mount.appendChild(renderer.domElement);

    // particles
    const radius = 3.6;
    const count = 5000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const phi = Math.random() * Math.PI * 2;
      const cosTheta = Math.random() * 2 - 1;
      const theta = Math.acos(cosTheta);
      const r = radius + (Math.random() - 0.5) * 0.06;
      pos.set(
        [
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.sin(theta) * Math.sin(phi),
          r * Math.cos(theta),
        ],
        i * 3
      );
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.06,
      color: new THREE.Color("#10B981"),
      transparent: true,
      opacity: 0.85,
    });

    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    // bloom
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.35, 0.06));

    // animate
    const animate = () => {
      particles.rotation.y += 0.002;
      composer.render();
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    // resize observer
    const obs = new ResizeObserver(() => {
      if (!renderer) return;
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (width < 5 || height < 5) return; // prevent crash
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer?.setSize(width, height);
    });
    obs.observe(mount);

    // cleanup (VERY defensive)
    return () => {
      try { obs.disconnect(); } catch {}
      try { cancelAnimationFrame(raf); } catch {}
      try { mount.removeChild(renderer.domElement); } catch {}
      try { composer?.dispose(); } catch {}
      try { renderer?.dispose(); } catch {}
      try { geo?.dispose(); } catch {}
      try { mat?.dispose(); } catch {}
    };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: -10,
        pointerEvents: "none",
      }}
    ></div>
  );
}
