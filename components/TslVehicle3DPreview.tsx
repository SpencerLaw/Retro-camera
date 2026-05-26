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

function createBodyShellGeometry() {
  const depth = 1.72;
  const shape = new THREE.Shape();

  shape.moveTo(-2.96, 0.46);
  shape.bezierCurveTo(-2.86, 0.66, -2.62, 0.86, -2.22, 0.98);
  shape.bezierCurveTo(-1.8, 1.08, -1.22, 1.16, -0.82, 1.31);
  shape.bezierCurveTo(-0.3, 1.5, 0.46, 1.54, 1.06, 1.38);
  shape.bezierCurveTo(1.7, 1.22, 2.38, 0.94, 2.78, 0.7);
  shape.bezierCurveTo(2.98, 0.58, 3.02, 0.49, 2.94, 0.43);
  shape.bezierCurveTo(2.46, 0.34, 1.42, 0.31, 0.08, 0.32);
  shape.bezierCurveTo(-1.24, 0.32, -2.38, 0.36, -2.96, 0.46);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 16,
    bevelSize: 0.065,
    bevelThickness: 0.08,
    curveSegments: 42,
    steps: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function createPaintMaterial(wrapColor: string) {
  return new THREE.MeshPhysicalMaterial({
    color: wrapColor,
    metalness: 0.48,
    roughness: 0.32,
    clearcoat: 0.72,
    clearcoatRoughness: 0.28,
  });
}

function createGlassMaterial() {
  return new THREE.MeshStandardMaterial({
    color: '#05070b',
    metalness: 0.22,
    roughness: 0.18,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
}

function createPanel(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0],
  scale: [number, number, number] = [1, 1, 1],
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createSideWindow(
  material: THREE.Material,
  position: [number, number, number],
  scale: [number, number, number],
) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.18);
  shape.bezierCurveTo(-0.42, 0.06, -0.22, 0.2, 0.08, 0.22);
  shape.lineTo(0.5, 0.14);
  shape.bezierCurveTo(0.43, -0.06, 0.22, -0.17, -0.12, -0.2);
  shape.lineTo(-0.5, -0.18);

  const geometry = new THREE.ShapeGeometry(shape, 24);
  return createPanel(geometry, material, position, [0, 0, 0], scale);
}

function addMirroredSideParts(group: THREE.Group, material: THREE.Material) {
  const sideZ = 0.895;
  const sideScale: [number, number, number] = [1, 1, 1];
  const farScale: [number, number, number] = [-1, 1, 1];

  [
    [sideZ, sideScale],
    [-sideZ, farScale],
  ].forEach(([z, scale]) => {
    const side = Number(z);
    const meshScale = scale as [number, number, number];
    group.add(createSideWindow(material, [-0.55, 1.24, side], [1.55 * meshScale[0], 1, 1]));
    group.add(createSideWindow(material, [1.06, 1.14, side], [1.05 * meshScale[0], 0.82, 1]));
    group.add(
      createPanel(
        new THREE.PlaneGeometry(0.46, 0.18),
        material,
        [-2.34, 0.9, side],
        [0, 0, -0.1],
        [meshScale[0], 1, 1],
      ),
    );
  });
}

function createArchShadow(material: THREE.Material, x: number, z: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.48, -0.02);
  shape.bezierCurveTo(-0.44, 0.28, -0.22, 0.44, 0, 0.45);
  shape.bezierCurveTo(0.22, 0.44, 0.44, 0.28, 0.48, -0.02);
  shape.lineTo(0.36, -0.02);
  shape.bezierCurveTo(0.3, 0.18, 0.14, 0.3, 0, 0.31);
  shape.bezierCurveTo(-0.14, 0.3, -0.3, 0.18, -0.36, -0.02);
  shape.lineTo(-0.48, -0.02);

  const mesh = createPanel(new THREE.ShapeGeometry(shape, 28), material, [x, 0.34, z], [0, 0, 0], [1, 0.72, 1]);
  mesh.castShadow = false;
  return mesh;
}

function createTireAssembly(tireMaterial: THREE.Material, rimMaterial: THREE.Material, x: number, z: number) {
  const group = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.07, 14, 56), tireMaterial);
  tire.rotation.y = Math.PI / 2;
  tire.castShadow = true;
  tire.receiveShadow = true;

  const rim = new THREE.Mesh(new THREE.CircleGeometry(0.2, 40), rimMaterial);
  rim.rotation.y = Math.PI / 2;
  rim.position.z = z > 0 ? 0.015 : -0.015;
  rim.castShadow = true;

  group.add(tire, rim);
  group.position.set(x, 0.27, z);
  return group;
}

export function createVehicleBody(wrapColor: string): VehicleBodyResult {
  const group = new THREE.Group();
  group.name = '模型为本站自建预览';

  const wrapMaterial = createPaintMaterial(wrapColor);
  const glassMaterial = createGlassMaterial();
  const trimMaterial = new THREE.MeshStandardMaterial({ color: '#050608', metalness: 0.35, roughness: 0.5 });
  const archMaterial = new THREE.MeshStandardMaterial({
    color: '#07080a',
    metalness: 0.2,
    roughness: 0.72,
    transparent: true,
    opacity: 0.86,
  });
  const tireMaterial = new THREE.MeshStandardMaterial({ color: '#090a0d', metalness: 0.1, roughness: 0.64 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.82, roughness: 0.24 });
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: '#f8fafc',
    emissive: '#f8fafc',
    emissiveIntensity: 0.18,
    roughness: 0.2,
  });

  const body = createPanel(createBodyShellGeometry(), wrapMaterial, [0, 0, 0]);
  const hood = createPanel(new THREE.BoxGeometry(1.34, 0.035, 1.3), wrapMaterial, [2.02, 0.84, 0], [0, 0, -0.16]);
  const roofGlass = createPanel(new THREE.BoxGeometry(2.18, 0.052, 1.0), glassMaterial, [-0.22, 1.47, 0], [0, 0, -0.03]);

  addMirroredSideParts(group, glassMaterial);

  const frontLight = createPanel(new THREE.BoxGeometry(0.62, 0.045, 0.06), lightMaterial, [2.73, 0.78, 0.64], [0, 0.1, -0.12]);
  const frontLightFar = frontLight.clone();
  frontLightFar.position.z = -0.66;
  const rearLight = createPanel(new THREE.BoxGeometry(0.08, 0.08, 0.96), trimMaterial, [-2.82, 0.75, 0]);

  const mirrorNear = createPanel(new THREE.BoxGeometry(0.15, 0.08, 0.18), trimMaterial, [0.9, 0.96, 0.95]);
  const mirrorFar = mirrorNear.clone();
  mirrorFar.position.z = -0.98;

  [0.895, -0.895].forEach((z) => {
    group.add(createArchShadow(archMaterial, -2.02, z), createArchShadow(archMaterial, 1.65, z));
    group.add(createTireAssembly(tireMaterial, rimMaterial, -2.02, z), createTireAssembly(tireMaterial, rimMaterial, 1.65, z));
  });

  group.add(body, hood, roofGlass, frontLight, frontLightFar, rearLight, mirrorNear, mirrorFar);
  group.rotation.y = -0.34;
  group.rotation.x = 0.01;
  group.scale.setScalar(0.82);
  group.position.y = 0.05;
  return { group, wrapMaterials: [wrapMaterial] };
}

const TslVehicle3DPreview: React.FC<TslVehicle3DPreviewProps> = ({
  wrapColor,
  wrapImageUrl,
  modelLabel,
  isDayMode,
}) => {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
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

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(4.9, 2.15, 4.8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.42;
    controls.enablePan = false;
    controls.minDistance = 4.8;
    controls.maxDistance = 10.5;
    controls.target.set(0, 0.92, 0);
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight('#ffffff', '#9ca3af', 2.1));
    const keyLight = new THREE.DirectionalLight('#ffffff', 3.6);
    keyLight.position.set(4.5, 6, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight('#dbeafe', 1.4);
    fillLight.position.set(-5, 3, -4);
    scene.add(fillLight);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 3.8),
      new THREE.ShadowMaterial({ color: '#64748b', opacity: isDayMode ? 0.16 : 0.26 }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.02;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

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
      camera.position.set(isNarrow ? 8.8 : 6.2, isNarrow ? 3.05 : 2.4, isNarrow ? 8.9 : 6.0);
      camera.fov = isNarrow ? 38 : 32;
      camera.updateProjectionMatrix();
      controls.target.set(0, isNarrow ? 0.76 : 0.92, 0);
      controls.minDistance = isNarrow ? 7.4 : 5.4;
      controls.maxDistance = isNarrow ? 13 : 11;
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
        texture.repeat.set(1.02, 0.92);
        texture.offset.set(0.02, 0.03);
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
