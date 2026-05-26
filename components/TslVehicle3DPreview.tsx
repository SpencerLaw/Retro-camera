import React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type TslVehicle3DPreviewProps = {
  wrapColor: string;
  wrapImageUrl?: string | null;
  modelLabel: string;
  isDayMode: boolean;
};

type VehicleBodyResult = {
  group: THREE.Group;
  wrapMaterials: THREE.MeshStandardMaterial[];
};

function createWheel() {
  const wheel = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.34, 40),
    new THREE.MeshStandardMaterial({ color: '#050608', metalness: 0.18, roughness: 0.62 }),
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  tire.receiveShadow = true;

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.36, 32),
    new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.7, roughness: 0.28 }),
  );
  cap.rotation.z = Math.PI / 2;

  wheel.add(tire, cap);
  return wheel;
}

function createBodyBox(
  geometry: THREE.BufferGeometry,
  material: THREE.MeshStandardMaterial,
  position: [number, number, number],
  scale?: [number, number, number],
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (scale) {
    mesh.scale.set(...scale);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createVehicleBody(wrapColor: string): VehicleBodyResult {
  const group = new THREE.Group();
  group.name = '模型为本站自建预览';

  const wrapMaterial = new THREE.MeshStandardMaterial({
    color: wrapColor,
    metalness: 0.32,
    roughness: 0.48,
  });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: '#0b1018',
    metalness: 0.18,
    roughness: 0.22,
    transparent: true,
    opacity: 0.88,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({ color: '#050608', metalness: 0.35, roughness: 0.48 });
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: '#eef2ff',
    emissive: '#f8fafc',
    emissiveIntensity: 0.22,
    roughness: 0.18,
  });

  const lowerBody = createBodyBox(new THREE.BoxGeometry(5.6, 0.72, 1.86), wrapMaterial, [0, 0.72, 0]);
  const frontBody = createBodyBox(new THREE.BoxGeometry(1.65, 0.5, 1.78), wrapMaterial, [2.08, 1.08, 0]);
  frontBody.rotation.z = -0.1;
  const rearBody = createBodyBox(new THREE.BoxGeometry(1.35, 0.56, 1.82), wrapMaterial, [-2.12, 1.08, 0]);
  rearBody.rotation.z = 0.08;
  const cabin = createBodyBox(new THREE.BoxGeometry(2.72, 0.82, 1.58), wrapMaterial, [-0.18, 1.42, 0], [1, 1, 1]);
  cabin.rotation.z = -0.06;

  const windshield = createBodyBox(new THREE.BoxGeometry(1.0, 0.08, 1.34), glassMaterial, [1.24, 1.72, 0]);
  windshield.rotation.z = -0.55;
  const roofGlass = createBodyBox(new THREE.BoxGeometry(1.42, 0.08, 1.36), glassMaterial, [-0.28, 1.9, 0]);
  const rearGlass = createBodyBox(new THREE.BoxGeometry(0.82, 0.08, 1.28), glassMaterial, [-1.35, 1.7, 0]);
  rearGlass.rotation.z = 0.46;

  const frontLight = createBodyBox(new THREE.BoxGeometry(0.08, 0.08, 1.46), lightMaterial, [2.94, 1.06, 0]);
  const rearLight = createBodyBox(new THREE.BoxGeometry(0.08, 0.08, 1.4), lightMaterial, [-2.86, 1.05, 0]);
  const frontBumper = createBodyBox(new THREE.BoxGeometry(0.18, 0.38, 1.82), trimMaterial, [2.94, 0.48, 0]);
  const rearBumper = createBodyBox(new THREE.BoxGeometry(0.18, 0.36, 1.82), trimMaterial, [-2.94, 0.48, 0]);
  const sideSkirt = createBodyBox(new THREE.BoxGeometry(4.9, 0.16, 0.12), trimMaterial, [0, 0.32, 0.98]);
  const sideSkirtBack = createBodyBox(new THREE.BoxGeometry(4.9, 0.16, 0.12), trimMaterial, [0, 0.32, -0.98]);

  const wheels = [
    [-1.88, 0.38, 1.05],
    [1.82, 0.38, 1.05],
    [-1.88, 0.38, -1.05],
    [1.82, 0.38, -1.05],
  ].map(([x, y, z]) => {
    const wheel = createWheel();
    wheel.position.set(x, y, z);
    return wheel;
  });

  group.add(
    lowerBody,
    frontBody,
    rearBody,
    cabin,
    windshield,
    roofGlass,
    rearGlass,
    frontLight,
    rearLight,
    frontBumper,
    rearBumper,
    sideSkirt,
    sideSkirtBack,
    ...wheels,
  );

  group.rotation.y = -0.45;
  return { group, wrapMaterials: [wrapMaterial] };
}

const TslVehicle3DPreview: React.FC<TslVehicle3DPreviewProps> = ({
  wrapColor,
  wrapImageUrl,
  modelLabel,
  isDayMode,
}) => {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const rendererRef = React.useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = React.useRef<OrbitControls | null>(null);
  const wrapMaterialsRef = React.useRef<THREE.MeshStandardMaterial[]>([]);
  const textureRef = React.useRef<THREE.Texture | null>(null);

  React.useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDayMode ? '#e5e7eb' : '#111827');

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(4.7, 2.4, 4.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.enablePan = false;
    controls.minDistance = 4;
    controls.maxDistance = 9.5;
    controls.target.set(0, 0.95, 0);
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight('#ffffff', '#94a3b8', 1.8));
    const keyLight = new THREE.DirectionalLight('#ffffff', 3.2);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#c7d2fe', 1.2);
    fillLight.position.set(-5, 3, -4);
    scene.add(fillLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(4.3, 80),
      new THREE.MeshStandardMaterial({
        color: isDayMode ? '#d1d5db' : '#020617',
        metalness: 0,
        roughness: 0.86,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const { group, wrapMaterials } = createVehicleBody(wrapColor);
    wrapMaterialsRef.current = wrapMaterials;
    scene.add(group);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      const nextWidth = Math.max(320, width);
      const nextHeight = Math.max(300, height);
      const isNarrow = nextWidth < 640;
      renderer.setSize(nextWidth, nextHeight, false);
      camera.aspect = nextWidth / nextHeight;
      camera.position.set(isNarrow ? 6.4 : 4.7, isNarrow ? 2.7 : 2.4, isNarrow ? 6.5 : 4.8);
      camera.updateProjectionMatrix();
      controls.minDistance = isNarrow ? 5.2 : 4;
      controls.maxDistance = isNarrow ? 11 : 9.5;
      controls.update();
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    let frameId = 0;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      textureRef.current?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((item) => {
        if (item instanceof THREE.Mesh) {
          item.geometry.dispose();
          const materials = Array.isArray(item.material) ? item.material : [item.material];
          materials.forEach((material) => material.dispose());
        }
      });
      rendererRef.current = null;
      controlsRef.current = null;
      wrapMaterialsRef.current = [];
      textureRef.current = null;
    };
  }, [isDayMode, wrapColor]);

  React.useEffect(() => {
    wrapMaterialsRef.current.forEach((material) => {
      material.color.set(wrapColor);
      material.needsUpdate = true;
    });
  }, [wrapColor]);

  React.useEffect(() => {
    let cancelled = false;
    const materials = wrapMaterialsRef.current;

    const clearTexture = () => {
      textureRef.current?.dispose();
      textureRef.current = null;
      materials.forEach((material) => {
        material.map = null;
        material.color.set(wrapColor);
        material.needsUpdate = true;
      });
    };

    if (!wrapImageUrl || materials.length === 0) {
      clearTexture();
      return undefined;
    }

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      wrapImageUrl,
      (texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }

        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1.45, 1.08);
        texture.offset.set(0.02, 0.02);
        texture.anisotropy = 8;
        textureRef.current?.dispose();
        textureRef.current = texture;

        materials.forEach((material) => {
          material.map = texture;
          material.color.set('#ffffff');
          material.needsUpdate = true;
        });
      },
      undefined,
      clearTexture,
    );

    return () => {
      cancelled = true;
    };
  }, [wrapImageUrl, wrapColor]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={mountRef} className="h-full min-h-[420px] w-full" aria-label={`${modelLabel} 三维渲染预览`} />
    </div>
  );
};

export default TslVehicle3DPreview;
