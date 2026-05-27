import React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

type TslVehicle3DPreviewProps = {
  wrapColor: string;
  wrapImageUrl?: string | null;
  modelUrl?: string | null;
  objModelUrl?: string | null;
  mtlModelUrl?: string | null;
  vehicleImageUrl?: string | null;
  modelLabel: string;
  isDayMode: boolean;
};

type PreviewModelMode = 'gltf' | 'obj';

type PreparedModel = {
  group: THREE.Group;
  paintMeshes: THREE.Mesh[];
  paintTargets: MaterialTarget[];
  wrapTargets: MaterialTarget[];
  trimTargets: MaterialTarget[];
  box: THREE.Box3;
  mode: PreviewModelMode;
};

type MaterialTarget = {
  mesh: THREE.Mesh;
  materialIndex: number | null;
};

type MaterialSlot = MaterialTarget & {
  material: THREE.Material;
};

const PAINT_MATERIAL_HINTS = ['exterior', 'paint', 'paintrough', 'cover', 'exteriorfade', 'paintskybox'];
const EXCLUDED_MATERIAL_HINTS = [
  'glass',
  'window',
  'mirror',
  'light',
  'chrome',
  'rubber',
  'grille',
  'aluminum',
  'leather',
  'carpet',
  'plastic',
  'suede',
  'chargeport',
  'screen',
  'plate',
  'seatbelt',
  'decor',
  'rim',
  'tire',
  'wheel',
  'brake',
  'headlight',
  'taillight',
  'interior',
];
const EXCLUDED_MESH_HINTS = [
  'wheel',
  'fender',
  'liner',
  'arch',
  'trim',
  'bumper_inner',
  'welliner',
  'splash',
  'guard',
  'undercarriage',
  'undertray',
  'skirt',
  'sensor',
];
const HIDDEN_HELPER_HINTS = [
  'shadow',
  'ground',
  'plane',
  'floor',
  'projection',
  'plates',
  'plate_eu',
  'plate_us',
  'sensor',
  'undercarriage',
  'undertray',
  'roof_sensor',
  'door_sensor',
];
const BASE_PAINT_COLOR = new THREE.Color(0xc4c4c4);
const OBJ_PAINT_MATERIAL_NAMES = ['CarPaint', 'CarPaint.001'];

const MODEL_OPENING_ROTATION = new Map<string, number>([
  ['ModelS_2021.glb', 0],
  ['ModelS_Plaid_2025.glb', 0],
  ['ModelX_2021.glb', 0],
]);

const MODEL_OFFSETS = new Map<string, THREE.Vector3>([
  ['ModelS_2021.glb', new THREE.Vector3(-1.8, -0.3, 0)],
  ['ModelS_Plaid_2025.glb', new THREE.Vector3(-1.8, -0.3, 0)],
  ['ModelX_2021.glb', new THREE.Vector3(-1.35, -1.2, 0)],
]);

const SX_UV0_ALLOWLIST = new Map<string, Set<string>>([
  ['ModelS_2021.glb', new Set(['mesh_9_1', 'Hood_Hinge_1', 'Hood_Hinge_2'])],
  ['ModelS_Plaid_2025.glb', new Set(['mesh_9_1', 'Hood_Hinge_1', 'Hood_Hinge_2'])],
  ['ModelX_2021.glb', new Set(['mesh_7_1', 'mesh_8_1', 'Hood_Hinge_1', 'Hood_Hinge_2'])],
]);

const FORCE_BLACK_TRIM = new Map<string, Set<string>>([
  [
    'ModelS_2021.glb',
    new Set([
      'mesh_0',
      'mesh_0_2',
      'mesh_0_3',
      'mesh_24_3',
      'mesh_30_1',
      'mesh_35_3',
      'mesh_41_1',
      'mesh_46',
      'mesh_47',
      'mesh_48',
      'mesh_49_1',
      'mesh_125_2',
      'mesh_125_3',
      'mesh_128_2',
      'mesh_128_3',
      'mesh_128_4',
    ]),
  ],
  [
    'ModelS_Plaid_2025.glb',
    new Set([
      'mesh_0',
      'mesh_0_2',
      'mesh_0_3',
      'mesh_24_3',
      'mesh_30_1',
      'mesh_35_3',
      'mesh_41_1',
      'mesh_46',
      'mesh_47',
      'mesh_48',
      'mesh_49_1',
      'mesh_125_2',
      'mesh_125_3',
      'mesh_128_2',
      'mesh_128_3',
      'mesh_128_4',
    ]),
  ],
  [
    'ModelX_2021.glb',
    new Set([
      'mesh_0_2',
      'mesh_0_5',
      'mesh_23_1',
      'mesh_30_1',
      'mesh_37_1',
      'mesh_45_1',
      'mesh_126',
      'mesh_126_1',
      'mesh_126_2',
      'mesh_129_1',
      'mesh_129_2',
    ]),
  ],
]);

function getModelFileName(modelUrl?: string | null) {
  if (!modelUrl) {
    return '';
  }

  try {
    return decodeURIComponent(new URL(modelUrl).pathname.split('/').pop() || '');
  } catch {
    return modelUrl.split('/').pop() || '';
  }
}

function materialName(mesh: THREE.Mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.map((material) => material?.name || '').join(' ').toLowerCase();
}

function materialSlotName(slot: MaterialSlot) {
  return (slot.material.name || '').toLowerCase();
}

function getMeshMaterialSlots(mesh: THREE.Mesh): MaterialSlot[] {
  if (Array.isArray(mesh.material)) {
    return mesh.material
      .map((material, materialIndex) => ({ mesh, materialIndex, material }))
      .filter((slot): slot is MaterialSlot => Boolean(slot.material));
  }

  return [{ mesh, materialIndex: null, material: mesh.material }];
}

function assignTargetMaterial(target: MaterialTarget, material: THREE.Material) {
  if (Array.isArray(target.mesh.material) && target.materialIndex !== null) {
    const nextMaterials = target.mesh.material.slice();
    nextMaterials[target.materialIndex] = material;
    target.mesh.material = nextMaterials;
    return;
  }

  target.mesh.material = material;
}

function assignAllMeshMaterials(mesh: THREE.Mesh, createMaterial: () => THREE.Material) {
  getMeshMaterialSlots(mesh).forEach((slot) => {
    assignTargetMaterial(slot, createMaterial());
  });
}

function meshName(mesh: THREE.Mesh) {
  return (mesh.name || '').toLowerCase();
}

function parentName(mesh: THREE.Mesh) {
  return (mesh.parent?.name || '').toLowerCase();
}

function includesAny(value: string, hints: string[]) {
  return hints.some((hint) => value.includes(hint));
}

function makePaintMaterial(color: THREE.Color | string) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.08,
    roughness: 0.5,
  });
}

function makeObjPaintMaterial(color: THREE.Color | string, texture?: THREE.Texture | null) {
  return new THREE.MeshStandardMaterial({
    color: texture ? 0xffffff : color,
    map: texture || null,
    metalness: 0.12,
    roughness: 0.38,
    envMapIntensity: 1,
    side: THREE.DoubleSide,
  });
}

function makePreviewPaintMaterial(mode: PreviewModelMode, color: THREE.Color | string) {
  return mode === 'obj' ? makeObjPaintMaterial(color) : makePaintMaterial(color);
}

function makeBlackTrimMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x05070a,
    metalness: 0.26,
    roughness: 0.72,
  });
}

function makeGlassMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.72,
    roughness: 0.12,
    transparent: true,
    opacity: 0.52,
  });
}

function copyUvToUv1(mesh: THREE.Mesh) {
  if (!mesh.geometry?.attributes?.uv) {
    return false;
  }

  const geometry = mesh.geometry.clone();
  const uv = geometry.attributes.uv;
  geometry.setAttribute('uv1', new THREE.BufferAttribute(uv.array.slice(0), uv.itemSize, uv.normalized));
  mesh.geometry = geometry;
  return true;
}

function hasUsableWrapUv(mesh: THREE.Mesh, modelFile: string) {
  if (mesh.geometry?.attributes?.uv1) {
    return hasTemplateUvRange(mesh);
  }

  if (SX_UV0_ALLOWLIST.get(modelFile)?.has(mesh.name)) {
    return copyUvToUv1(mesh) && hasTemplateUvRange(mesh);
  }

  return false;
}

function hasTemplateUvRange(mesh: THREE.Mesh) {
  const uv1 = mesh.geometry?.attributes?.uv1;
  if (!uv1) {
    return false;
  }

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  for (let index = 0; index < uv1.count; index += 1) {
    minU = Math.min(minU, uv1.getX(index));
    maxU = Math.max(maxU, uv1.getX(index));
    minV = Math.min(minV, uv1.getY(index));
    maxV = Math.max(maxV, uv1.getY(index));
  }

  const uvArea = (maxU - minU) * (maxV - minV);
  const centerU = (minU + maxU) / 2;
  const centerV = (minV + maxV) / 2;
  const insideTemplate = centerU >= 0 && centerU <= 1 && centerV >= 0 && centerV <= 1;
  return uvArea > 0.001 || insideTemplate;
}

function shouldHideMesh(mesh: THREE.Mesh) {
  const value = `${meshName(mesh)} ${parentName(mesh)} ${materialName(mesh)}`;
  return includesAny(value, HIDDEN_HELPER_HINTS);
}

function shouldUsePlaidFascia(modelFile: string) {
  return modelFile === 'ModelS_Plaid_2025.glb' || modelFile === 'ModelX_2021.glb';
}

function isInactiveFascia(mesh: THREE.Mesh, modelFile: string) {
  const parent = parentName(mesh);
  const plaid = shouldUsePlaidFascia(modelFile);
  return plaid
    ? parent === 'fascia_front' || parent === 'fascia_rear'
    : parent === 'fascia_front_p3' || parent === 'fascia_rear_p3';
}

function shouldKeepAsChrome(mesh: THREE.Mesh) {
  const parent = parentName(mesh);
  return [
    'trunk_emblem_global',
    'trunk_emblem',
    'trunk_tesla_global',
    'trunk_tesla',
    'lights_rear_fascia',
    'lights_rear_fascia_global',
    'lights_rear_fascia_p3',
    'lights_rear_fascia_global_p3',
    'door_top_lf',
    'door_top_rf',
    'door_top_lr',
    'door_top_rr',
  ].includes(parent);
}

function isPaintMaterialSlot(slot: MaterialSlot, mesh: THREE.Mesh) {
  const mat = materialSlotName(slot);
  const meshKey = meshName(mesh);
  const paint = includesAny(mat, PAINT_MATERIAL_HINTS);
  const excludedMaterial = includesAny(mat, EXCLUDED_MATERIAL_HINTS);
  const excludedMesh = includesAny(meshKey, EXCLUDED_MESH_HINTS);
  return paint && !excludedMaterial && !excludedMesh;
}

function shouldBlackenMaterialSlot(slot: MaterialSlot) {
  return !includesAny(materialSlotName(slot), EXCLUDED_MATERIAL_HINTS);
}

function pushUniqueMesh(meshes: THREE.Mesh[], mesh: THREE.Mesh) {
  if (!meshes.includes(mesh)) {
    meshes.push(mesh);
  }
}

function isObjPaintMaterial(slot: MaterialSlot) {
  const name = materialSlotName(slot);
  return OBJ_PAINT_MATERIAL_NAMES.some((material) => material.toLowerCase() === name) || name.includes('carpaint');
}

function fitVehicleGroup(
  group: THREE.Group,
  paintMeshes: THREE.Mesh[],
  rotationY: number,
  offset?: THREE.Vector3,
) {
  const box = new THREE.Box3();
  box.makeEmpty();
  paintMeshes.forEach((mesh) => box.expandByObject(mesh));
  if (box.isEmpty()) {
    box.setFromObject(group);
  }

  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 5.5 / Math.max(size.x, size.y, size.z, 1);
  group.scale.setScalar(scale);
  group.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  group.rotation.y = rotationY;

  const fittedBox = new THREE.Box3();
  fittedBox.makeEmpty();
  paintMeshes.forEach((mesh) => fittedBox.expandByObject(mesh));
  if (fittedBox.isEmpty()) {
    fittedBox.setFromObject(group);
  }
  const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
  group.position.x -= fittedCenter.x;
  group.position.z -= fittedCenter.z;

  if (offset) {
    group.position.add(offset);
  }

  const finalBox = new THREE.Box3();
  finalBox.makeEmpty();
  paintMeshes.forEach((mesh) => finalBox.expandByObject(mesh));
  if (finalBox.isEmpty()) {
    finalBox.setFromObject(group);
  }

  return finalBox;
}

function prepareVehicleModel(source: THREE.Group, modelFile: string): PreparedModel {
  const group = source;
  const paintMeshes: THREE.Mesh[] = [];
  const paintTargets: MaterialTarget[] = [];
  const wrapTargets: MaterialTarget[] = [];
  const trimTargets: MaterialTarget[] = [];

  group.traverse((item) => {
    const mesh = item as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) {
      return;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (isInactiveFascia(mesh, modelFile) || shouldHideMesh(mesh)) {
      mesh.visible = false;
      return;
    }

    if (shouldKeepAsChrome(mesh)) {
      assignAllMeshMaterials(mesh, () => new THREE.MeshStandardMaterial({
        color: 0x15171b,
        metalness: 0.85,
        roughness: 0.25,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      }));
      return;
    }

    getMeshMaterialSlots(mesh).forEach((slot) => {
      const target: MaterialTarget = { mesh: slot.mesh, materialIndex: slot.materialIndex };
      const slotName = materialSlotName(slot);

      if (slotName.includes('glass')) {
        assignTargetMaterial(target, makeGlassMaterial());
        return;
      }

      if (isPaintMaterialSlot(slot, mesh)) {
        if (FORCE_BLACK_TRIM.get(modelFile)?.has(mesh.name)) {
          assignTargetMaterial(target, makeBlackTrimMaterial());
          trimTargets.push(target);
          return;
        }

        assignTargetMaterial(target, makePaintMaterial(BASE_PAINT_COLOR));
        paintTargets.push(target);
        pushUniqueMesh(paintMeshes, mesh);

        if (hasUsableWrapUv(target.mesh, modelFile)) {
          wrapTargets.push(target);
        }
        return;
      }

      if (shouldBlackenMaterialSlot(slot)) {
        assignTargetMaterial(target, makeBlackTrimMaterial());
      }
    });
  });

  const finalBox = fitVehicleGroup(
    group,
    paintMeshes,
    MODEL_OPENING_ROTATION.get(modelFile) ?? Math.PI,
    MODEL_OFFSETS.get(modelFile),
  );

  return { group, paintMeshes, paintTargets, wrapTargets, trimTargets, box: finalBox, mode: 'gltf' };
}

function prepareObjVehicleModel(source: THREE.Group): PreparedModel {
  const group = source;
  const paintMeshes: THREE.Mesh[] = [];
  const paintTargets: MaterialTarget[] = [];
  const wrapTargets: MaterialTarget[] = [];
  const trimTargets: MaterialTarget[] = [];

  group.traverse((item) => {
    const mesh = item as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) {
      return;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.geometry = mesh.geometry.clone();
    mesh.geometry.computeVertexNormals();

    getMeshMaterialSlots(mesh).forEach((slot) => {
      const target: MaterialTarget = { mesh: slot.mesh, materialIndex: slot.materialIndex };
      const slotName = materialSlotName(slot);

      if (isObjPaintMaterial(slot)) {
        assignTargetMaterial(target, makeObjPaintMaterial(BASE_PAINT_COLOR));
        paintTargets.push(target);
        wrapTargets.push(target);
        pushUniqueMesh(paintMeshes, mesh);
        return;
      }

      if (slotName.includes('glass') || slotName.includes('window')) {
        assignTargetMaterial(target, makeGlassMaterial());
        return;
      }

      if (slotName.includes('tire') || slotName.includes('rubber') || slotName.includes('black')) {
        assignTargetMaterial(target, makeBlackTrimMaterial());
        trimTargets.push(target);
      }
    });
  });

  const finalBox = fitVehicleGroup(group, paintMeshes, 0);

  return { group, paintMeshes, paintTargets, wrapTargets, trimTargets, box: finalBox, mode: 'obj' };
}

function fitCameraToModel(camera: THREE.PerspectiveCamera, controls: OrbitControls, box: THREE.Box3, narrow: boolean) {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const distance = narrow ? 1.9 : 1.22;

  camera.position.set(
    center.x + size.x * (narrow ? 2.25 : 2.05) * distance,
    center.y + size.y * (narrow ? 0.9 : 0.66),
    center.z - size.z * (narrow ? 1.2 : 1.05) * distance,
  );
  controls.target.set(center.x, center.y + size.y * 0.1, center.z);
  controls.minDistance = Math.max(size.length() * 0.36, 2.4);
  controls.maxDistance = Math.max(size.length() * 1.55, 7.5);
  controls.update();
}

function makeWrapMaterial(texture: THREE.Texture) {
  const material = new THREE.MeshStandardMaterial({
    metalness: 0.08,
    roughness: 0.5,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTslWrap = { value: texture };
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      `attribute vec2 uv1;
      varying vec2 vTslWrapUv;
      void main() {
        vTslWrapUv = uv1;`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      'void main() {',
      `uniform sampler2D uTslWrap;
      varying vec2 vTslWrapUv;
      void main() {`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec4 tslWrapColor = texture2D(uTslWrap, fract(vTslWrapUv));
      bool tslGap = tslWrapColor.a < 0.05 || (tslWrapColor.r > 0.95 && tslWrapColor.g > 0.95 && tslWrapColor.b > 0.95);
      if (!tslGap) {
        diffuseColor.rgb = tslWrapColor.rgb;
      }`,
    );
  };

  return material;
}

function makeObjWrapMaterial(texture: THREE.Texture) {
  return makeObjPaintMaterial(0xffffff, texture);
}

function makePreviewWrapMaterial(mode: PreviewModelMode, texture: THREE.Texture) {
  return mode === 'obj' ? makeObjWrapMaterial(texture) : makeWrapMaterial(texture);
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((item) => {
    const mesh = item as THREE.Mesh;
    if (!mesh.isMesh) {
      return;
    }

    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => material?.dispose());
  });
}

const TslVehicle3DPreview: React.FC<TslVehicle3DPreviewProps> = ({
  wrapColor,
  wrapImageUrl,
  modelUrl,
  objModelUrl,
  mtlModelUrl,
  vehicleImageUrl,
  modelLabel,
  isDayMode,
}) => {
  const mountRef = React.useRef<HTMLDivElement | null>(null);
  const controlsRef = React.useRef<OrbitControls | null>(null);
  const wrapTargetsRef = React.useRef<MaterialTarget[]>([]);
  const paintTargetsRef = React.useRef<MaterialTarget[]>([]);
  const trimTargetsRef = React.useRef<MaterialTarget[]>([]);
  const textureRef = React.useRef<THREE.Texture | null>(null);
  const previewModeRef = React.useRef<PreviewModelMode>('gltf');
  const [modelVersion, setModelVersion] = React.useState(0);
  const [loadState, setLoadState] = React.useState<'loading' | 'ready' | 'fallback'>(
    modelUrl || (objModelUrl && mtlModelUrl) ? 'loading' : 'fallback',
  );

  React.useEffect(() => {
    const mount = mountRef.current;
    const hasObjPreview = Boolean(objModelUrl && mtlModelUrl);
    if (!mount || (!hasObjPreview && !modelUrl)) {
      setLoadState('fallback');
      return undefined;
    }

    let cancelled = false;
    let frameId = 0;
    let preparedModel: PreparedModel | null = null;
    let dracoLoader: DRACOLoader | null = null;
    setLoadState('loading');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDayMode ? '#e5e7eb' : '#101827');

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.width = '100%';
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.32;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 7;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight(0xffffff, isDayMode ? 0xe5e7eb : 0x111827, 1.35));
    scene.add(new THREE.AmbientLight(0xffffff, 1.55));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.85);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.82);
    fillLight.position.set(-5, 4, -3);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 1);
    rimLight.position.set(0, 2, -8);
    scene.add(rimLight);
    const bottomLight = new THREE.DirectionalLight(0xffffff, 0.36);
    bottomLight.position.set(0, -3, 0);
    scene.add(bottomLight);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      const nextWidth = Math.max(320, width);
      const nextHeight = Math.max(320, height);
      const narrow = nextWidth < 640;
      renderer.setSize(nextWidth, nextHeight, false);
      camera.aspect = nextWidth / nextHeight;
      camera.fov = narrow ? 38 : 32;
      camera.updateProjectionMatrix();
      if (preparedModel) {
        fitCameraToModel(camera, controls, preparedModel.box, narrow);
      }
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const activatePreparedModel = (nextPreparedModel: PreparedModel) => {
      preparedModel = nextPreparedModel;
      scene.add(preparedModel.group);
      wrapTargetsRef.current = preparedModel.wrapTargets;
      paintTargetsRef.current = preparedModel.paintTargets;
      trimTargetsRef.current = preparedModel.trimTargets;
      previewModeRef.current = preparedModel.mode;
      resize();
      setModelVersion((version) => version + 1);
      setLoadState('ready');
    };

    const loadGltfPreview = () => {
      if (!modelUrl) {
        if (!cancelled) {
          setLoadState('fallback');
        }
        return;
      }

      const loader = new GLTFLoader();
      loader.setCrossOrigin('anonymous');
      dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/draco/');
      loader.setDRACOLoader(dracoLoader);

      loader.load(
        modelUrl,
        (gltf) => {
          if (cancelled) {
            disposeObject(gltf.scene);
            return;
          }

          const modelFile = getModelFileName(modelUrl);
          activatePreparedModel(prepareVehicleModel(gltf.scene, modelFile));
        },
        undefined,
        () => {
          if (!cancelled) {
            setLoadState('fallback');
          }
        },
      );
    };

    if (hasObjPreview && objModelUrl && mtlModelUrl) {
      const mtlLoader = new MTLLoader();
      mtlLoader.setCrossOrigin('anonymous');
      mtlLoader.load(
        mtlModelUrl,
        (materials) => {
          if (cancelled) {
            return;
          }

          materials.preload();
          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.load(
            objModelUrl,
            (obj) => {
              if (cancelled) {
                disposeObject(obj);
                return;
              }

              activatePreparedModel(prepareObjVehicleModel(obj));
            },
            undefined,
            loadGltfPreview,
          );
        },
        undefined,
        loadGltfPreview,
      );
    } else {
      loadGltfPreview();
    }

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      dracoLoader?.dispose();
      textureRef.current?.dispose();
      if (preparedModel) {
        disposeObject(preparedModel.group);
      }
      renderer.dispose();
      renderer.domElement.remove();
      controlsRef.current = null;
      wrapTargetsRef.current = [];
      paintTargetsRef.current = [];
      trimTargetsRef.current = [];
      textureRef.current = null;
    };
  }, [isDayMode, modelUrl, mtlModelUrl, objModelUrl]);

  React.useEffect(() => {
    paintTargetsRef.current.forEach((target) => {
      assignTargetMaterial(target, makePreviewPaintMaterial(previewModeRef.current, wrapColor));
    });
  }, [wrapColor, modelVersion]);

  React.useEffect(() => {
    let cancelled = false;
    const targets = wrapTargetsRef.current;

    const clearWrapTexture = () => {
      textureRef.current?.dispose();
      textureRef.current = null;
      targets.forEach((target) => {
        assignTargetMaterial(target, makePreviewPaintMaterial(previewModeRef.current, wrapColor));
      });
      trimTargetsRef.current.forEach((target) => {
        assignTargetMaterial(target, makeBlackTrimMaterial());
      });
    };

    if (!wrapImageUrl || targets.length === 0 || loadState !== 'ready') {
      clearWrapTexture();
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
        texture.flipY = previewModeRef.current !== 'gltf';
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.anisotropy = 8;
        textureRef.current?.dispose();
        textureRef.current = texture;

        targets.forEach((target) => {
          assignTargetMaterial(target, makePreviewWrapMaterial(previewModeRef.current, texture));
        });
      },
      undefined,
      clearWrapTexture,
    );

    return () => {
      cancelled = true;
    };
  }, [wrapColor, wrapImageUrl, modelVersion, loadState]);

  if ((!modelUrl && !objModelUrl) || loadState === 'fallback') {
    return (
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative aspect-square w-[min(92%,680px)] overflow-hidden rounded-lg">
          {vehicleImageUrl && (
            <img
              src={vehicleImageUrl}
              alt={`${modelLabel} 官方车型预览`}
              className="h-full w-full object-contain"
              crossOrigin="anonymous"
            />
          )}
          <div className="absolute bottom-4 left-1/2 w-[min(92%,360px)] -translate-x-1/2 rounded-md border border-white/70 bg-white/90 px-3 py-2 text-center text-xs font-black text-slate-600 shadow-lg backdrop-blur">
            当前车型使用官方静态预览，接入授权三维模型后可旋转查看。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={mountRef} className="h-full w-full" aria-label={`${modelLabel} 三维渲染预览`} />
      {loadState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-700">
          正在加载真实车型模型...
        </div>
      )}
    </div>
  );
};

export default TslVehicle3DPreview;
