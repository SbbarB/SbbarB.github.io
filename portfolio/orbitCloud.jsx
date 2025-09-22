import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const ElectronOrbitalAnimation = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const orbitalRef = useRef(null);
  const animationIdRef = useRef(null);
  const [currentOrbital, setCurrentOrbital] = useState(0);

  // Fixed number of particles
  const PARTICLE_COUNT = 3500;

  // Generate orbital positions
  const generateOrbitalPositions = (type) => {
    const positions = [];
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let x, y, z;
      
      switch (type) {
        case 's': // Spherical orbital
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(1 - 2 * Math.random());
          const r = 2 + Math.random() * 0.8;
          
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
          break;
          
        case 'px': // p orbital along x-axis
          const theta_px = Math.random() * Math.PI * 2;
          const phi_px = Math.acos(1 - 2 * Math.random());
          const r_px = 2.5 * Math.abs(Math.sin(phi_px)) + Math.random() * 0.4;
          
          x = r_px * Math.sin(phi_px) * Math.cos(theta_px);
          y = r_px * Math.sin(phi_px) * Math.sin(theta_px) * 0.4;
          z = r_px * Math.cos(phi_px) * 0.4;
          
          // Ensure dumbbell shape
          if (Math.abs(x) < 0.3) {
            x = x > 0 ? 0.3 + Math.random() * 2 : -0.3 - Math.random() * 2;
          }
          break;
          
        case 'py': // p orbital along y-axis
          const theta_py = Math.random() * Math.PI * 2;
          const phi_py = Math.acos(1 - 2 * Math.random());
          const r_py = 2.5 * Math.abs(Math.sin(phi_py)) + Math.random() * 0.4;
          
          x = r_py * Math.sin(phi_py) * Math.cos(theta_py) * 0.4;
          y = r_py * Math.sin(phi_py) * Math.sin(theta_py);
          z = r_py * Math.cos(phi_py) * 0.4;
          
          // Ensure dumbbell shape
          if (Math.abs(y) < 0.3) {
            y = y > 0 ? 0.3 + Math.random() * 2 : -0.3 - Math.random() * 2;
          }
          break;
          
        case 'pz': // p orbital along z-axis
          const theta_pz = Math.random() * Math.PI * 2;
          const phi_pz = Math.acos(1 - 2 * Math.random());
          const r_pz = 2.5 * Math.abs(Math.cos(phi_pz)) + Math.random() * 0.4;
          
          x = r_pz * Math.sin(phi_pz) * Math.cos(theta_pz) * 0.4;
          y = r_pz * Math.sin(phi_pz) * Math.sin(theta_pz) * 0.4;
          z = r_pz * Math.cos(phi_pz);
          
          // Ensure dumbbell shape
          if (Math.abs(z) < 0.3) {
            z = z > 0 ? 0.3 + Math.random() * 2 : -0.3 - Math.random() * 2;
          }
          break;
          
        case 'd': // d orbital (cloverleaf pattern)
          const theta_d = Math.random() * Math.PI * 2;
          const phi_d = Math.random() * Math.PI;
          const r_d = 2.2 * Math.abs(Math.sin(2 * theta_d) * Math.sin(phi_d)) + Math.random() * 0.5;
          
          x = r_d * Math.sin(phi_d) * Math.cos(theta_d);
          y = r_d * Math.sin(phi_d) * Math.sin(theta_d);
          z = r_d * Math.cos(phi_d) * 0.7;
          break;
          
        default:
          x = y = z = 0;
      }
      
      positions.push(x, y, z);
    }
    
    return new Float32Array(positions);
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 8);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create particle system
    const geometry = new THREE.BufferGeometry();
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    
    // Set monotone colors
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const grayValue = 0.2 + Math.random() * 0.2; // Varying shades of gray
      colors[i * 3] = grayValue;     // R
      colors[i * 3 + 1] = grayValue; // G
      colors[i * 3 + 2] = grayValue; // B
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    // Orbital types and initial setup
    const orbitalTypes = ['s', 'px', 'py', 'pz', 'd'];
    let currentIndex = 0;
    
    // Generate all orbital configurations
    const orbitalConfigs = {};
    orbitalTypes.forEach(type => {
      orbitalConfigs[type] = generateOrbitalPositions(type);
    });

    // Set initial positions
    const currentPositions = orbitalConfigs[orbitalTypes[currentIndex]].slice();
    geometry.setAttribute('position', new THREE.BufferAttribute(currentPositions, 3));

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    orbitalRef.current = particles;

    // Animation variables
    let displayTime = 0;
    let isTransitioning = false;
    let transitionProgress = 0;
    let nextIndex = 1;
    let startPositions = null;
    let targetPositions = null;
    
    const DISPLAY_DURATION = 5; // 5 seconds
    const TRANSITION_DURATION = 2; // 2 seconds for morphing

    // Smooth interpolation function
    const smoothstep = (t) => {
      return t * t * (3 - 2 * t);
    };

    // Animation loop
    const animate = () => {
      // Continuous rotation
      if (particles) {
        particles.rotation.y += 0.008;
        particles.rotation.x += 0.003;
      }

      if (!isTransitioning) {
        displayTime += 0.016;
        
        if (displayTime >= DISPLAY_DURATION) {
          // Start transition
          isTransitioning = true;
          transitionProgress = 0;
          nextIndex = (currentIndex + 1) % orbitalTypes.length;
          
          startPositions = currentPositions.slice();
          targetPositions = orbitalConfigs[orbitalTypes[nextIndex]];
          
          displayTime = 0;
        }
      } else {
        // Handle morphing transition
        transitionProgress += 0.016 / TRANSITION_DURATION;
        
        if (transitionProgress >= 1) {
          // Complete transition
          currentIndex = nextIndex;
          setCurrentOrbital(currentIndex);
          isTransitioning = false;
          transitionProgress = 0;
          
          // Copy final positions
          for (let i = 0; i < currentPositions.length; i++) {
            currentPositions[i] = targetPositions[i];
          }
        } else {
          // Smooth interpolation between positions
          const t = smoothstep(transitionProgress);
          
          for (let i = 0; i < currentPositions.length; i++) {
            currentPositions[i] = startPositions[i] + (targetPositions[i] - startPositions[i]) * t;
          }
        }
        
        // Update geometry
        geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  const orbitalNames = ['1s', '2px', '2py', '2pz', '3d'];

  return (
    <div className="w-full h-screen bg-white flex flex-col">
      <div className="flex-1 relative" ref={mountRef} />
      
      {/* Info overlay */}
      <div className="absolute top-6 left-6 text-black font-mono">
        <div className="text-lg font-light tracking-wider mb-2">
          ELECTRON ORBITAL
        </div>
        <div className="text-3xl font-thin tracking-widest">
          {orbitalNames[currentOrbital]}
        </div>
        <div className="text-sm opacity-70 mt-2">
          quantum state visualization
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 right-6 text-black font-mono text-xs opacity-70">
        <div>MORPHING: ACTIVE</div>
        <div>ROTATION: CONTINUOUS</div>
      </div>
    </div>
  );
};

export default ElectronOrbitalAnimation;