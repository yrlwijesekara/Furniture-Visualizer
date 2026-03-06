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

    // Camera - positioned to see the entire room
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(
      room.width / 2,             // Center X
      room.height * 1.5,          // Above room
      room.length + room.length   // Behind room
    );

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // === LIGHTS ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(room.width, room.height * 2, room.length);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -room.width;
    directionalLight.shadow.camera.right = room.width;
    directionalLight.shadow.camera.top = room.length;
    directionalLight.shadow.camera.bottom = -room.length;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.4);
    pointLight.position.set(room.width / 2, room.height - 0.3, room.length / 2);
    scene.add(pointLight);

    // === ROOM GEOMETRY ===
    // Coordinate system:
    // Origin (0, 0, 0) = bottom-left-back corner of room
    // X-axis: left to right (0 to room.width)
    // Y-axis: bottom to top (0 to room.height)
    // Z-axis: back to front (0 to room.length)

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
    const wallThickness = 0.05;

    // Back wall (z = 0)
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(room.width, room.height, wallThickness),
      wallMaterial
    );
    backWall.position.set(room.width / 2, room.height / 2, 0);
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left wall (x = 0)
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, room.height, room.length),
      wallMaterial
    );
    leftWall.position.set(0, room.height / 2, room.length / 2);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right wall (x = room.width)
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, room.height, room.length),
      wallMaterial
    );
    rightWall.position.set(room.width, room.height / 2, room.length / 2);
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // === AXES HELPER (debug - remove in production) ===
    // Red = X (width), Green = Y (height), Blue = Z (length)
    const axesHelper = new THREE.AxesHelper(2);
    scene.add(axesHelper);

    // === ORBIT CONTROLS ===
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(room.width / 2, room.height / 4, room.length / 2);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI / 2; // Don't go below floor
    controls.update();

    // === LOAD FURNITURE ===
    const loader = new GLTFLoader();
    const loadedModels = [];

    console.log("=== 3D VIEWER DEBUG ===");
    console.log("Room:", { width: room.width, length: room.length, height: room.height });
    console.log("Items to load:", items.length);

    items.forEach((item) => {
      const modelData = getModelById(item.modelId);
      if (!modelData) {
        console.warn("Model not found:", item.modelId);
        return;
      }

      console.log(`Loading: ${modelData.name} | 2D pos: (${item.x.toFixed(2)}, ${item.z.toFixed(2)}) meters`);

      loader.load(
        modelData.modelPath,
        (gltf) => {
          const model = gltf.scene;

          // Calculate bounding box to properly position model
          const box = new THREE.Box3().setFromObject(model);
          const modelSize = new THREE.Vector3();
          box.getSize(modelSize);

          // Apply scale
          const finalScale = modelData.defaultScale * item.scale;
          model.scale.set(finalScale, finalScale, finalScale);

          // Position: Direct mapping from 2D editor
          // 2D: x = left to right (0 to room.width)
          // 2D: z = top to bottom  (0 to room.length) 
          // 3D: x = left to right  (0 to room.width)   ✓ same
          // 3D: z = back to front  (0 to room.length)  ✓ same
          // 3D: y = height (model sits on floor)
          model.position.set(
            item.x,
            modelData.yOffset,
            item.z
          );

          // Rotation
          const totalRotation = THREE.MathUtils.degToRad(item.rotation) + modelData.defaultRotationY;
          model.rotation.y = totalRotation;

          // Shadows
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          scene.add(model);
          loadedModels.push(model);

          console.log(`  → 3D position: (${model.position.x.toFixed(2)}, ${model.position.y.toFixed(2)}, ${model.position.z.toFixed(2)})`);
        },
        undefined,
        (error) => {
          console.error(`Error loading ${modelData.name}:`, error);
        }
      );
    });

    // Handle resize
    const handleResize = () => {
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
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
          maxWidth: '350px',
          maxHeight: '200px',
          overflow: 'auto',
          zIndex: 10
        }}
      >
        <strong>Item Positions (meters):</strong>
        {items.map((item, idx) => {
          const model = getModelById(item.modelId);
          return (
            <div key={idx} style={{ marginTop: '4px' }}>
              {model?.name}: x={item.x.toFixed(2)}, z={item.z.toFixed(2)}, rot={item.rotation}°
            </div>
          );
        })}
      </div>
    </div>
  );
}