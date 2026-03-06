import React, { useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import * as THREE from "three";
import { GLTFLoader } from "three-stdlib";
import { OrbitControls } from "three-stdlib";
import { useDesign } from '../context/DesignContext';
import { getModelById } from '../utils/modelRegistry';

export default function Viewer3D() {
  const mountRef = useRef(null);
  const navigate = useNavigate();
  const { room, items } = useDesign();

  useEffect(() => {
    if (!mountRef.current) return;

    // Clear any existing canvas first
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(
      room.width / 2,
      room.height * 1.5,
      room.length + room.length * 0.8
    );

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // Fixed: was PCFSoftShadowMap (deprecated)
    mountRef.current.appendChild(renderer.domElement);

    // === LIGHTS ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(room.width, room.height * 2, room.length);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.4);
    pointLight.position.set(room.width / 2, room.height - 0.3, room.length / 2);
    scene.add(pointLight);

    // === ROOM ===
    // Coordinate system:
    // Origin (0,0,0) = back-left corner at floor level
    // X: 0 → room.width  (left to right)
    // Y: 0 → room.height (floor to ceiling)
    // Z: 0 → room.length (back to front)

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(room.width, room.length);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(room.floorColor),
      roughness: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(room.width / 2, 0, room.length / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(room.wallColor),
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    // Back wall (z = 0)
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(room.width, room.height, 0.05),
      wallMaterial
    );
    backWall.position.set(room.width / 2, room.height / 2, 0);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left wall (x = 0)
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, room.height, room.length),
      wallMaterial
    );
    leftWall.position.set(0, room.height / 2, room.length / 2);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right wall (x = room.width)
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, room.height, room.length),
      wallMaterial
    );
    rightWall.position.set(room.width, room.height / 2, room.length / 2);
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // === ORBIT CONTROLS ===
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(room.width / 2, room.height / 4, room.length / 2);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.update();

    // === LOAD FURNITURE ===
    const loader = new GLTFLoader();
    const loadedModels = [];

    console.log("=== 3D VIEWER ===");
    console.log("Room:", room.width, "x", room.length, "x", room.height);
    console.log("Items:", items.length);

    items.forEach((item) => {
      const modelData = getModelById(item.modelId);
      if (!modelData) {
        console.warn("Model not found:", item.modelId);
        return;
      }

      loader.load(
        modelData.modelPath,
        (gltf) => {
          const model = gltf.scene;

          // Step 1: Get the model's bounding box BEFORE scaling
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);

          // Step 2: Recenter the model so its bottom-center is at origin
          // This ensures consistent positioning regardless of model origin
          model.position.set(
            -center.x,       // Center horizontally
            -box.min.y,      // Bottom sits at y=0
            -center.z        // Center depth-wise
          );

          // Step 3: Wrap in a group for clean transforms
          const group = new THREE.Group();
          group.add(model);

          // Step 4: Apply scale
          const finalScale = modelData.defaultScale * item.scale;
          group.scale.set(finalScale, finalScale, finalScale);

          // Step 5: Position from 2D editor (meters)
          // x: left-right in room (0 to room.width)
          // z: top-bottom in 2D = back-front in 3D (0 to room.length)
          group.position.set(
            item.x,
            modelData.yOffset,
            item.z
          );

          // Step 6: Rotation
          group.rotation.y = THREE.MathUtils.degToRad(item.rotation) + modelData.defaultRotationY;

          // Step 7: Shadows
          group.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          scene.add(group);
          loadedModels.push(group);

          console.log(`✓ ${modelData.name} → pos(${item.x.toFixed(2)}, ${modelData.yOffset}, ${item.z.toFixed(2)}) | modelSize(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})`);
        },
        undefined,
        (error) => {
          console.error(`✗ Error loading ${modelData.name}:`, error);
        }
      );
    });

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      controls.dispose();
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [room, items]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={mountRef} style={{ width: "100vw", height: "100vh" }} />

      {/* Back button */}
      <button
        onClick={() => navigate('/editor-2d')}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '10px 20px',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          zIndex: 10
        }}
      >
        ← Back to Editor
      </button>

      {/* Info panel */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '15px',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '14px',
          zIndex: 10
        }}
      >
        <div><strong>Room:</strong> {room.width}m × {room.length}m × {room.height}m</div>
        <div><strong>Items:</strong> {items.length}</div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#aaa' }}>
          Drag to rotate • Scroll to zoom • Right-click to pan
        </div>
      </div>

      {/* Debug panel */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          padding: '15px',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          borderRadius: '8px',
          fontSize: '11px',
          maxWidth: '400px',
          maxHeight: '200px',
          overflow: 'auto',
          zIndex: 10
        }}
      >
        <strong>Items ({items.length}):</strong>
        {items.length === 0 && <div style={{ color: '#e74c3c' }}>No items! Go back to 2D Editor and place furniture.</div>}
        {items.map((item, idx) => {
          const model = getModelById(item.modelId);
          return (
            <div key={idx} style={{ marginTop: '4px' }}>
              {model?.name}: x={item.x.toFixed(2)}m, z={item.z.toFixed(2)}m, rot={item.rotation}°, scale={item.scale}x
            </div>
          );
        })}
      </div>
    </div>
  );
}