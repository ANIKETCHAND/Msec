import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function CyberFace3D({ className = '' }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animationFrameId;
    let renderer, scene, camera;
    let facePoints = null;
    let wireframeMesh = null;
    let scanLaser = null;
    let radarRings = [];
    let backgroundParticles = null;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    // 1. Scene & Depth Fog
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060B18, 0.0014);

    // 2. Perspective Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 1, 2500);
    camera.position.set(0, 20, 440);

    // 3. WebGL Renderer with full transparency
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
      return;
    }

    // 4. Lights: MediShield Electric Blue, Cyan and Emerald Accents
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00E5FF, 3.0, 800);
    pointLight.position.set(0, 120, 250);
    scene.add(pointLight);

    const blueLight = new THREE.PointLight(0x1677FF, 2.5, 700);
    blueLight.position.set(-200, -50, 200);
    scene.add(blueLight);

    const emeraldLight = new THREE.PointLight(0x10B981, 2.0, 700);
    emeraldLight.position.set(200, -80, 200);
    scene.add(emeraldLight);

    // Group to hold all face elements for synchronized 3D rotation
    const faceGroup = new THREE.Group();
    // Position slightly above center so eyes & brow frame behind the headline
    faceGroup.position.set(0, 25, 0);
    scene.add(faceGroup);

    // 5. Floating Cyber Ambient Particles (Constellation Dust)
    const bgCount = 600;
    const bgGeo = new THREE.BufferGeometry();
    const bgPos = new Float32Array(bgCount * 3);
    const bgColors = new Float32Array(bgCount * 3);
    const cBlue = new THREE.Color('#1677FF');
    const cCyan = new THREE.Color('#06B6D4');
    const cEmerald = new THREE.Color('#10B981');

    for (let i = 0; i < bgCount; i++) {
      const idx = i * 3;
      bgPos[idx] = (Math.random() - 0.5) * 1400;
      bgPos[idx + 1] = (Math.random() - 0.5) * 1000;
      bgPos[idx + 2] = (Math.random() - 0.5) * 800 - 100;

      const pick = Math.random();
      const col = pick < 0.5 ? cBlue : (pick < 0.8 ? cCyan : cEmerald);
      bgColors[idx] = col.r;
      bgColors[idx + 1] = col.g;
      bgColors[idx + 2] = col.b;
    }
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
    bgGeo.setAttribute('color', new THREE.BufferAttribute(bgColors, 3));

    const bgMat = new THREE.PointsMaterial({
      size: 2.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    backgroundParticles = new THREE.Points(bgGeo, bgMat);
    scene.add(backgroundParticles);

    // 6. Perimeter Radar Rings
    const ringRadii = [210, 260, 320];
    ringRadii.forEach((radius, i) => {
      const ringGeo = new THREE.RingGeometry(radius, radius + 1.2, 80);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i === 0 ? 0x06B6D4 : (i === 1 ? 0x1677FF : 0x10B981),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.22 - i * 0.05,
        wireframe: true
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2 + (i * 0.12);
      ringMesh.rotation.y = i * 0.25;
      scene.add(ringMesh);
      radarRings.push(ringMesh);
    });

    // 7. Scanning Laser Beam across the face
    const laserGeo = new THREE.PlaneGeometry(420, 2.5);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x00E5FF,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    scanLaser = new THREE.Mesh(laserGeo, laserMat);
    scanLaser.position.set(0, 0, 110);
    faceGroup.add(scanLaser);

    // 8. Load & Sample the Cyber Mask Image
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

      // Sample every 2nd pixel for rich typographic resolution
      const step = 2;
      const positions = [];
      const origPositions = [];
      const colors = [];
      const phases = [];

      const aspect = imgW / imgH;
      // Large scale to fill the background majestically
      const targetW = 320;
      const targetH = targetW / aspect;

      for (let y = 0; y < imgH; y += step) {
        for (let x = 0; x < imgW; x += step) {
          const pixelIndex = (y * imgW + x) * 4;
          const r = imgData[pixelIndex];
          const g = imgData[pixelIndex + 1];
          const b = imgData[pixelIndex + 2];
          const a = imgData[pixelIndex + 3];

          // Compute perceived luminance
          const luminance = (r * 0.299 + g * 0.587 + b * 0.114) * (a / 255);

          // Threshold: ignore black backdrop
          if (luminance > 16) {
            const nx = (x / imgW - 0.5) * 2;
            const ny = -(y / imgH - 0.5) * 2;

            const px = nx * (targetW / 2);
            const py = ny * (targetH / 2);

            // True anatomical depth curvature
            const cylindricalCurve = Math.cos(nx * 1.35) * 55 - (nx * nx * 22);
            const verticalContour = Math.cos(ny * 1.2) * 25;
            const depthDisplacement = (luminance / 255) * 62;

            const pz = cylindricalCurve + verticalContour + depthDisplacement;

            positions.push(px, py, pz);
            origPositions.push(px, py, pz);

            // Palette: Bright glowing Silver, Electric Cyan & MediShield Blue
            const brightness = luminance / 255;
            let pr, pg, pb;

            if (brightness > 0.72) {
              pr = 0.92 + brightness * 0.08;
              pg = 0.98 + brightness * 0.02;
              pb = 1.0;
            } else if (brightness > 0.38) {
              pr = 0.12 + brightness * 0.35;
              pg = 0.72 + brightness * 0.28;
              pb = 1.0;
            } else {
              pr = 0.08 + brightness * 0.25;
              pg = 0.4 + brightness * 0.35;
              pb = 0.8 + brightness * 0.2;
            }

            colors.push(pr, pg, pb);
            phases.push(Math.random() * Math.PI * 2);
          }
        }
      }

      // Create Particle Geometry
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('origPosition', new THREE.Float32BufferAttribute(origPositions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setAttribute('phase', new THREE.Float32BufferAttribute(phases, 1));

      // Circular Glow Point Texture
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 32;
      pCanvas.height = 32;
      const pCtx = pCanvas.getContext('2d');
      const grad = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.35, 'rgba(0, 229, 255, 0.85)');
      grad.addColorStop(0.7, 'rgba(22, 119, 255, 0.3)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 32, 32);

      const pTexture = new THREE.CanvasTexture(pCanvas);

      const material = new THREE.PointsMaterial({
        size: 3.6,
        map: pTexture,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      facePoints = new THREE.Points(geometry, material);
      faceGroup.add(facePoints);

      // Subtle Wireframe Hologram Surface behind particles
      const wirePlaneGeo = new THREE.PlaneGeometry(targetW, targetH, 32, 32);
      const wirePos = wirePlaneGeo.attributes.position;
      for (let i = 0; i < wirePos.count; i++) {
        const vx = wirePos.getX(i);
        const vy = wirePos.getY(i);
        const nx = vx / (targetW / 2);
        const ny = vy / (targetH / 2);
        const vz = (Math.cos(nx * 1.35) * 45) + (Math.cos(ny * 1.2) * 18);
        wirePos.setZ(i, vz);
      }
      wirePlaneGeo.computeVertexNormals();

      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x06B6D4,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending
      });
      wireframeMesh = new THREE.Mesh(wirePlaneGeo, wireMat);
      faceGroup.add(wireframeMesh);
    };

    // 9. Pointer Tracking for Interactive Gaze
    const animState = {
      targetRotX: 0,
      targetRotY: 0,
      pulseTime: -999,
      isHovered: false,
    };

    const handleMouseMove = (e) => {
      // Normalize mouse to window coordinates
      const mx = (e.clientX / window.innerWidth) * 2 - 1;
      const my = -(e.clientY / window.innerHeight) * 2 - 1;

      // Subtle, realistic head turn
      animState.targetRotY = mx * 0.45;
      animState.targetRotX = -my * 0.28;
      animState.isHovered = true;
    };

    const handleMouseLeave = () => {
      animState.targetRotX = 0;
      animState.targetRotY = 0;
      animState.isHovered = false;
    };

    const handleClick = () => {
      animState.pulseTime = performance.now() * 0.001;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleClick);

    // 10. Resize Handling
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // 11. 60 FPS Animation Loop
    const animate = (currentTime) => {
      animationFrameId = requestAnimationFrame(animate);

      const now = currentTime * 0.001;

      // Smooth Head Tracking Lerp
      if (animState.isHovered) {
        faceGroup.rotation.y += (animState.targetRotY - faceGroup.rotation.y) * 0.05;
        faceGroup.rotation.x += (animState.targetRotX - faceGroup.rotation.x) * 0.05;
      } else {
        const idleSwayY = Math.sin(now * 0.5) * 0.15;
        const idleSwayX = Math.cos(now * 0.35) * 0.06;
        faceGroup.rotation.y += (idleSwayY - faceGroup.rotation.y) * 0.03;
        faceGroup.rotation.x += (idleSwayX - faceGroup.rotation.x) * 0.03;
      }

      // Subtle breathing on Z axis
      faceGroup.position.z = Math.sin(now * 1.2) * 8;

      // Laser Scan Bar
      if (scanLaser) {
        const scanY = Math.sin(now * 1.5) * 160;
        scanLaser.position.y = scanY;
        scanLaser.material.opacity = 0.35 + Math.sin(now * 2.8) * 0.2;
      }

      // Radar Rings Rotation
      radarRings.forEach((ring, i) => {
        ring.rotation.z = now * (0.15 + i * 0.08) * (i % 2 === 0 ? 1 : -1);
      });

      // Background Starfield Rotation
      if (backgroundParticles) {
        backgroundParticles.rotation.y = now * 0.015;
        backgroundParticles.rotation.x = Math.sin(now * 0.01) * 0.04;
      }

      // Individual Particle Wave & EMP Shockwave
      if (facePoints && facePoints.geometry) {
        const posAttr = facePoints.geometry.attributes.position;
        const origPos = facePoints.geometry.attributes.origPosition;
        const phaseAttr = facePoints.geometry.attributes.phase;

        const pulseElapsed = now - animState.pulseTime;
        const isPulsing = pulseElapsed > 0 && pulseElapsed < 2.5;

        const count = posAttr.count;
        const laserY = scanLaser ? scanLaser.position.y : 0;

        for (let i = 0; i < count; i++) {
          const ox = origPos.getX(i);
          const oy = origPos.getY(i);
          const oz = origPos.getZ(i);
          const phase = phaseAttr.getX(i);

          let dz = Math.sin(now * 2.0 + phase) * 2.2;

          // Proximity to laser line illuminates depth
          const distToLaser = Math.abs(oy - laserY);
          if (distToLaser < 20) {
            dz += (20 - distToLaser) * 1.2;
          }

          // Click EMP shockwave ripple
          if (isPulsing) {
            const waveFront = pulseElapsed * 240;
            const dist = Math.sqrt(ox * ox + oy * oy);
            const delta = dist - waveFront;
            if (Math.abs(delta) < 45) {
              const strength = Math.cos(delta * 0.07) * Math.max(0, 1 - pulseElapsed * 0.4);
              dz += strength * 42;
            }
          }

          posAttr.setXYZ(i, ox, oy, oz + dz);
        }

        posAttr.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      if (container && renderer && renderer.domElement && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      if (renderer) renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden ${className}`}
      style={{ zIndex: 1 }}
    />
  );
}
