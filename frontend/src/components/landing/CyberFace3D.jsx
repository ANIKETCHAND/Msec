import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Shield,
  Eye,
  RefreshCw,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Maximize2
} from 'lucide-react';

export default function CyberFace3D({ className = '', onPersonaSelect }) {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState('quantum'); // 'quantum' | 'hologram' | 'radar'
  const [isHovered, setIsHovered] = useState(false);
  const [scanStatus, setScanStatus] = useState('IoMT DEFENSIVE SCAN // ACTIVE');
  const [faceStats, setFaceStats] = useState({ particles: 0, fps: 60 });
  const [pulseCount, setPulseCount] = useState(0);

  // References to communicate with the Three.js animation loop without re-triggering effects
  const animStateRef = useRef({
    mode: 'quantum',
    mouseX: 0,
    mouseY: 0,
    targetRotX: 0,
    targetRotY: 0,
    pulseTime: -999,
    autoRotate: true,
  });

  useEffect(() => {
    animStateRef.current.mode = activeMode;
  }, [activeMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId;
    let renderer, scene, camera;
    let facePoints = null;
    let meshSurface = null;
    let wireframeMesh = null;
    let scanLaser = null;
    let radarRings = [];
    let backgroundParticles = null;
    let floatingNodes = [];

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 500;

    // 1. Scene & Camera Setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050814, 0.0018);

    camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(0, 0, 360);

    // 2. WebGL Renderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0); // Transparent canvas
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.error('[CyberFace3D] WebGL init error:', e);
      setLoading(false);
      return;
    }

    // 3. Subtle Cyber Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00D8FF, 2.5, 600);
    pointLight.position.set(50, 100, 200);
    scene.add(pointLight);

    const accentLight = new THREE.PointLight(0x1677FF, 2.0, 500);
    accentLight.position.set(-150, -50, 150);
    scene.add(accentLight);

    const emeraldLight = new THREE.PointLight(0x10B981, 1.8, 500);
    emeraldLight.position.set(100, -120, 180);
    scene.add(emeraldLight);

    // Group to hold all face elements for cohesive rotation
    const faceGroup = new THREE.Group();
    scene.add(faceGroup);

    // 4. Floating Cyber Ambient Particles (Constellation Dust)
    const bgCount = 400;
    const bgGeo = new THREE.BufferGeometry();
    const bgPos = new Float32Array(bgCount * 3);
    const bgColors = new Float32Array(bgCount * 3);
    const c1 = new THREE.Color('#1677FF');
    const c2 = new THREE.Color('#06B6D4');
    const c3 = new THREE.Color('#10B981');

    for (let i = 0; i < bgCount; i++) {
      const idx = i * 3;
      bgPos[idx] = (Math.random() - 0.5) * 800;
      bgPos[idx + 1] = (Math.random() - 0.5) * 800;
      bgPos[idx + 2] = (Math.random() - 0.5) * 600 - 100;

      const pick = Math.random();
      const col = pick < 0.5 ? c1 : (pick < 0.8 ? c2 : c3);
      bgColors[idx] = col.r;
      bgColors[idx + 1] = col.g;
      bgColors[idx + 2] = col.b;
    }
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
    bgGeo.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));

    const bgMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    backgroundParticles = new THREE.Points(bgGeo, bgMat);
    scene.add(backgroundParticles);

    // 5. Radar Rings (Defensive IoMT Scanner Rings)
    const ringRadii = [140, 175, 210];
    ringRadii.forEach((radius, i) => {
      const ringGeo = new THREE.RingGeometry(radius, radius + 1.2, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x06B6D4 : (i === 1 ? 0x1677FF : 0x10B981),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.28 - i * 0.06,
        wireframe: true
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2 + (i * 0.15);
      ringMesh.rotation.y = i * 0.2;
      scene.add(ringMesh);
      radarRings.push(ringMesh);
    });

    // 6. Laser Scan Bar (Defensive Penetration Scanner)
    const laserGeo = new THREE.PlaneGeometry(280, 2);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    scanLaser = new THREE.Mesh(laserGeo, laserMat);
    scanLaser.position.set(0, 0, 80);
    faceGroup.add(scanLaser);

    // 7. Load & Parse the Face Mask Image to Construct 3D Facial Topography
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/assets/cyber_mask.png';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgW = img.width;
      const imgH = img.height;
      canvas.width = imgW;
      canvas.height = imgH;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, imgW, imgH).data;

      // Sample every 2nd or 3rd pixel for optimal density & 60 FPS performance
      const step = 2;
      const positions = [];
      const origPositions = [];
      const colors = [];
      const phases = [];
      const scales = [];

      const aspect = imgW / imgH;
      const targetW = 200;
      const targetH = targetW / aspect;

      let validCount = 0;

      for (let y = 0; y < imgH; y += step) {
        for (let x = 0; x < imgW; x += step) {
          const pixelIndex = (y * imgW + x) * 4;
          const r = imgData[pixelIndex];
          const g = imgData[pixelIndex + 1];
          const b = imgData[pixelIndex + 2];
          const a = imgData[pixelIndex + 3];

          // Compute perceived luminance
          const luminance = (r * 0.299 + g * 0.587 + b * 0.114) * (a / 255);

          // Threshold: ignore purely dark background
          if (luminance > 18) {
            validCount++;

            // Normalized coordinates (-1 to 1)
            const nx = (x / imgW - 0.5) * 2;
            const ny = -(y / imgH - 0.5) * 2;

            // 3D positioning with natural facial depth curvature
            const px = nx * (targetW / 2);
            const py = ny * (targetH / 2);

            // Anthropomorphic facial curvature: nose and cheeks project forward, temples curve backward
            const distFromCenter = Math.sqrt(nx * nx + ny * ny);
            const cylindricalCurve = Math.cos(nx * 1.35) * 38 - (nx * nx * 15);
            const verticalContour = Math.cos(ny * 1.2) * 16;
            
            // Depth displacement derived from typographic brightness (brighter typography = raised facial features)
            const depthDisplacement = (luminance / 255) * 44;

            const pz = cylindricalCurve + verticalContour + depthDisplacement;

            positions.push(px, py, pz);
            origPositions.push(px, py, pz);

            // Palette grading: Electric Cyan, Crisp Silver & MediShield Cyber Blue
            const brightness = luminance / 255;
            let pr, pg, pb;

            if (brightness > 0.75) {
              // High highlights: crisp cyber white / silver
              pr = 0.88 + brightness * 0.12;
              pg = 0.95 + brightness * 0.05;
              pb = 1.0;
            } else if (brightness > 0.4) {
              // Midtones: electric blue / cyan
              pr = 0.15 + brightness * 0.4;
              pg = 0.65 + brightness * 0.35;
              pb = 1.0;
            } else {
              // Shadow typography: deep cobalt & teal
              pr = 0.05 + brightness * 0.3;
              pg = 0.3 + brightness * 0.4;
              pb = 0.7 + brightness * 0.3;
            }

            colors.push(pr, pg, pb);
            phases.push(Math.random() * Math.PI * 2);
            scales.push(0.8 + Math.random() * 0.8);
          }
        }
      }

      setFaceStats({ particles: validCount, fps: 60 });

      // Create Particle Geometry
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('origPosition', new THREE.Float32BufferAttribute(origPositions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));
      geometry.setAttribute('scale', new THREE.Float32BufferAttribute(scales, 1));

      // Circular Glow Point Texture created programmatically
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 32;
      pCanvas.height = 32;
      const pCtx = pCanvas.getContext('2d');
      const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(0, 216, 255, 0.8)');
      grad.addColorStop(0.7, 'rgba(22, 119, 255, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 32, 32);

      const pTexture = new THREE.CanvasTexture(pCanvas);

      const material = new THREE.PointsMaterial({
        size: 3.2,
        map: pTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      facePoints = new THREE.Points(geometry, material);
      faceGroup.add(facePoints);

      // Create Secondary Wireframe Hologram Mesh for 'hologram' and 'radar' modes
      const wirePlaneGeo = new THREE.PlaneGeometry(targetW, targetH, 36, 36);
      const wirePos = wirePlaneGeo.attributes.position;
      for (let i = 0; i < wirePos.count; i++) {
        const vx = wirePos.getX(i);
        const vy = wirePos.getY(i);
        const nx = vx / (targetW / 2);
        const ny = vy / (targetH / 2);
        const vz = (Math.cos(nx * 1.35) * 32) + (Math.cos(ny * 1.2) * 12);
        wirePos.setZ(i, vz);
      }
      wirePlaneGeo.computeVertexNormals();

      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x06B6D4,
        wireframe: true,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
      });
      wireframeMesh = new THREE.Mesh(wirePlaneGeo, wireMat);
      wireframeMesh.visible = false;
      faceGroup.add(wireframeMesh);

      setLoading(false);
    };

    img.onerror = (err) => {
      console.warn('[CyberFace3D] Image load error:', err);
      setLoading(false);
    };

    // 8. Mouse & Pointer Tracking for Smooth 3D Gaze Interactivity
    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      animStateRef.current.mouseX = mouseX;
      animStateRef.current.mouseY = mouseY;
      animStateRef.current.targetRotY = mouseX * 0.65;
      animStateRef.current.targetRotX = -mouseY * 0.45;
      animStateRef.current.autoRotate = false;
    };

    const handleMouseLeave = () => {
      animStateRef.current.targetRotX = 0;
      animStateRef.current.targetRotY = 0;
      animStateRef.current.autoRotate = true;
      setIsHovered(false);
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    const handleCanvasClick = (e) => {
      // Trigger EMP / Security Scan Ripple shockwave
      animStateRef.current.pulseTime = performance.now() * 0.001;
      setPulseCount(p => p + 1);
      setScanStatus('DEFENSIVE EMP PULSE TRIGGERED // CRYPTO INTEGRITY VERIFIED');
      setTimeout(() => {
        setScanStatus('IoMT DEFENSIVE SCAN // ACTIVE');
      }, 3000);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('click', handleCanvasClick);

    // 9. Resize Observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // 10. Animation Loop (60-120 FPS Buttery Smooth)
    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsTimer = 0;

    const animate = (currentTime) => {
      animationFrameId = requestAnimationFrame(animate);

      const now = currentTime * 0.001;
      const delta = Math.min((currentTime - lastTime) * 0.001, 0.1);
      lastTime = currentTime;

      // FPS tracking
      frameCounter++;
      fpsTimer += delta;
      if (fpsTimer >= 1.0) {
        setFaceStats(prev => ({ ...prev, fps: frameCounter }));
        frameCounter = 0;
        fpsTimer = 0;
      }

      // Smooth Rotation Lerp to follow visitor cursor
      if (animStateRef.current.autoRotate) {
        const idleSwayY = Math.sin(now * 0.6) * 0.18;
        const idleSwayX = Math.cos(now * 0.4) * 0.08;
        faceGroup.rotation.y += (idleSwayY - faceGroup.rotation.y) * 0.04;
        faceGroup.rotation.x += (idleSwayX - faceGroup.rotation.x) * 0.04;
      } else {
        faceGroup.rotation.y += (animStateRef.current.targetRotY - faceGroup.rotation.y) * 0.07;
        faceGroup.rotation.x += (animStateRef.current.targetRotX - faceGroup.rotation.x) * 0.07;
      }

      // Subtle breathing motion on Z axis
      faceGroup.position.z = Math.sin(now * 1.4) * 6;

      // Animate Laser Scan Line up and down across the face
      if (scanLaser) {
        const scanY = Math.sin(now * 1.6) * 110;
        scanLaser.position.y = scanY;
        scanLaser.material.opacity = 0.4 + Math.sin(now * 3) * 0.25;
      }

      // Rotate Defensive Radar Rings
      radarRings.forEach((ring, i) => {
        ring.rotation.z = now * (0.2 + i * 0.1) * (i % 2 === 0 ? 1 : -1);
      });

      // Slowly rotate background starfield
      if (backgroundParticles) {
        backgroundParticles.rotation.y = now * 0.02;
        backgroundParticles.rotation.x = Math.sin(now * 0.015) * 0.05;
      }

      // Animate Individual Face Particles
      if (facePoints && facePoints.geometry) {
        const posAttr = facePoints.geometry.attributes.position;
        const origPos = facePoints.geometry.attributes.origPosition;
        const phaseAttr = facePoints.geometry.attributes.phase;
        const colorAttr = facePoints.geometry.attributes.color;

        const pulseElapsed = now - animStateRef.current.pulseTime;
        const isPulsing = pulseElapsed > 0 && pulseElapsed < 2.5;

        const count = posAttr.count;
        const laserY = scanLaser ? scanLaser.position.y : 0;
        const currentMode = animStateRef.current.mode;

        for (let i = 0; i < count; i++) {
          const ox = origPos.getX(i);
          const oy = origPos.getY(i);
          const oz = origPos.getZ(i);
          const phase = phaseAttr.getX(i);

          // Natural particle subtle breathing
          let dz = Math.sin(now * 2.2 + phase) * 1.8;

          // Proximity to laser line highlights depth
          const distToLaser = Math.abs(oy - laserY);
          if (distToLaser < 16) {
            dz += (16 - distToLaser) * 1.1;
          }

          // Interactive Click EMP Shockwave Ripple
          if (isPulsing) {
            const waveFront = pulseElapsed * 180;
            const distFromCenter = Math.sqrt(ox * ox + oy * oy);
            const waveDelta = distFromCenter - waveFront;
            if (Math.abs(waveDelta) < 35) {
              const waveStrength = Math.cos(waveDelta * 0.08) * Math.max(0, 1 - pulseElapsed * 0.4);
              dz += waveStrength * 32;
            }
          }

          // Mode adjustments
          if (currentMode === 'hologram') {
            // Quantum glitch flutter
            if (Math.random() < 0.003) {
              dz += (Math.random() - 0.5) * 15;
            }
          } else if (currentMode === 'radar') {
            // Segmented scan wave
            dz += Math.sin(ox * 0.05 + now * 4) * 2;
          }

          posAttr.setXYZ(i, ox, oy, oz + dz);
        }

        posAttr.needsUpdate = true;
      }

      // Toggle Wireframe visibility based on mode
      if (wireframeMesh) {
        wireframeMesh.visible = (animStateRef.current.mode === 'hologram' || animStateRef.current.mode === 'radar');
        wireframeMesh.rotation.z = Math.sin(now * 0.5) * 0.02;
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // 11. Cleanup on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('click', handleCanvasClick);
        if (renderer && renderer.domElement && renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      }
      if (renderer) renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div className={`relative flex flex-col select-none ${className}`}>
      {/* 3D Viewport Outer Frame with Cyber HUD Styling */}
      <div className="relative w-full aspect-square max-w-[480px] mx-auto rounded-2xl bg-gradient-to-b from-[#090D1A]/95 via-[#0A1128]/90 to-[#040814]/95 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] overflow-hidden backdrop-blur-xl group">
        
        {/* Top HUD Telemetry Bar */}
        <div className="absolute top-0 inset-x-0 z-20 px-4 py-2.5 bg-gradient-to-b from-[#060B19]/90 to-transparent flex items-center justify-between text-[11px] font-mono border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-cyan-300 font-semibold tracking-wider">DEFENSIVE CYBER SENTINEL</span>
            <span className="text-neutral-500 hidden sm:inline">|</span>
            <span className="text-neutral-400 hidden sm:inline">THREE.JS 3D MESH</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400/80">
            <span className="px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
              {faceStats.fps} FPS
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/30">
              {faceStats.particles.toLocaleString()} NODES
            </span>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#070B18]/90 text-cyan-400 font-mono text-xs gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="tracking-widest">INITIALIZING 3D CYBER TOPOGRAPHY...</span>
            <span className="text-[10px] text-neutral-500">Sampling biometric typography vertices</span>
          </div>
        )}

        {/* Three.js Canvas Container */}
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ minHeight: '380px' }}
        />

        {/* Corner HUD Reticle Accents */}
        <div className="absolute top-10 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute top-10 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute bottom-12 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-400/60 pointer-events-none" />
        <div className="absolute bottom-12 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-400/60 pointer-events-none" />

        {/* Floating Cyber Data Badges */}
        <div className="absolute top-14 left-4 z-10 hidden sm:flex flex-col gap-1.5 pointer-events-none">
          <div className="px-2 py-1 rounded bg-[#091024]/80 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 backdrop-blur-md shadow-xs">
            <span className="text-cyan-500 font-bold mr-1">◆</span> TARGET: IoMT SURFACE
          </div>
          <div className="px-2 py-1 rounded bg-[#091024]/80 border border-blue-500/30 text-[10px] font-mono text-blue-300 backdrop-blur-md shadow-xs">
            <span className="text-blue-500 font-bold mr-1">◆</span> ENCRYPTION: AES-256
          </div>
        </div>

        <div className="absolute top-14 right-4 z-10 hidden sm:flex flex-col gap-1.5 pointer-events-none text-right">
          <div className="px-2 py-1 rounded bg-[#091024]/80 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 backdrop-blur-md shadow-xs">
            ML ACCURACY: 99.8% <span className="text-emerald-500 font-bold ml-1">◆</span>
          </div>
          <div className="px-2 py-1 rounded bg-[#091024]/80 border border-purple-500/30 text-[10px] font-mono text-purple-300 backdrop-blur-md shadow-xs">
            TAMPER SEAL: SHA-256 <span className="text-purple-500 font-bold ml-1">◆</span>
          </div>
        </div>

        {/* Interactive Click Pulse Indicator */}
        <div className="absolute bottom-14 inset-x-0 z-20 flex items-center justify-center pointer-events-none">
          <span className="px-3 py-1 rounded-full bg-[#091024]/85 border border-cyan-500/40 text-[11px] font-mono text-cyan-300 shadow-md backdrop-blur-md flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>CLICK TO TRIGGER EMP PULSE WAVE</span>
            {pulseCount > 0 && <span className="text-emerald-400 font-bold">({pulseCount})</span>}
          </span>
        </div>

        {/* Bottom Interactive Mode Controls Bar */}
        <div className="absolute bottom-0 inset-x-0 z-20 px-3 py-2 bg-[#060A17]/95 border-t border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-neutral-400 uppercase hidden sm:inline mr-1">RENDER:</span>
            <button
              type="button"
              onClick={() => setActiveMode('quantum')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all cursor-pointer flex items-center gap-1 ${
                activeMode === 'quantum'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Quantum Cloud</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('hologram')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all cursor-pointer flex items-center gap-1 ${
                activeMode === 'hologram'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Hologram Wire</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('radar')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-all cursor-pointer flex items-center gap-1 ${
                activeMode === 'radar'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200 border border-transparent'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Threat Radar</span>
            </button>
          </div>

          <div className="text-[10px] font-mono text-neutral-400 hidden md:flex items-center gap-1">
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>Move mouse to steer gaze</span>
          </div>
        </div>
      </div>

      {/* Under-canvas Live Status Ticker */}
      <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[11px] font-mono flex items-center justify-between text-neutral-400 max-w-[480px] mx-auto w-full">
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-neutral-200 truncate">{scanStatus}</span>
        </div>
        <span className="text-cyan-400 shrink-0 font-semibold text-[10px]">VERIFIED 2026</span>
      </div>
    </div>
  );
}
