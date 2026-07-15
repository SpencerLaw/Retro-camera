import * as THREE from 'three';

const WHEEL_MARKER_PATTERN = /^wheel_.*_spatial$/;
const MODEL_Y_TIRE_WIDTH_M = 0.255;
const MODEL_Y_TIRE_OUTER_RADIUS_M = 0.356;
const MODEL_Y_RIM_RADIUS_M = 0.2413;
const GEMINI_SPOKE_PAIR_COUNT = 10;
const GEMINI_SPOKE_PAIR_OFFSETS = [-0.04, 0.04] as const;
const GEMINI_SPOKE_DEPTH_M = 0.018;
const TIRE_SIDEWALL_HEIGHT_M = MODEL_Y_TIRE_OUTER_RADIUS_M - MODEL_Y_RIM_RADIUS_M;
const TIRE_SIDEWALL_TUBE_RADIUS_M = TIRE_SIDEWALL_HEIGHT_M / 2;
const TIRE_SIDEWALL_CENTER_RADIUS_M = MODEL_Y_RIM_RADIUS_M + TIRE_SIDEWALL_TUBE_RADIUS_M;
const WHEEL_FACE_Z_M = MODEL_Y_TIRE_WIDTH_M / 2 - 0.012;

function makeMarkerTireMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: 0x0d1014,
    metalness: 0.04,
    roughness: 0.82,
    envMapIntensity: 0.62,
  });
  material.name = 'marker_tire_material';
  return material;
}

function makeGeminiWheelMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: 0x343b45,
    metalness: 0.88,
    roughness: 0.24,
    envMapIntensity: 1.55,
  });
  material.name = 'marker_gemini_wheel_material';
  return material;
}

function makeBrakeMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: 0x5c626b,
    metalness: 0.76,
    roughness: 0.42,
    envMapIntensity: 0.9,
  });
  material.name = 'brake_disc';
  return material;
}

function enableWheelShadows(mesh: THREE.Mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createGeminiSpoke(material: THREE.Material, rotationZ: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.012, 0.071);
  shape.bezierCurveTo(-0.015, 0.115, -0.026, 0.174, -0.031, 0.218);
  shape.lineTo(0.008, 0.224);
  shape.bezierCurveTo(0.014, 0.175, 0.018, 0.116, 0.013, 0.073);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: GEMINI_SPOKE_DEPTH_M,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.003,
    bevelThickness: 0.003,
    curveSegments: 8,
  });
  const spoke = enableWheelShadows(new THREE.Mesh(geometry, material));
  spoke.name = 'marker_gemini_spoke';
  spoke.position.z = WHEEL_FACE_Z_M - GEMINI_SPOKE_DEPTH_M;
  spoke.rotation.z = rotationZ;
  return spoke;
}

function createAxialCylinder(radius: number, depth: number, material: THREE.Material) {
  const mesh = enableWheelShadows(new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, depth, 64),
    material,
  ));
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

function buildMarkerWheelAssembly() {
  const assembly = new THREE.Group();
  const tireMaterial = makeMarkerTireMaterial();
  const wheelMaterial = makeGeminiWheelMaterial();
  const brakeMaterial = makeBrakeMaterial();

  const tire = enableWheelShadows(new THREE.Mesh(
    new THREE.CylinderGeometry(
      MODEL_Y_TIRE_OUTER_RADIUS_M - 0.008,
      MODEL_Y_TIRE_OUTER_RADIUS_M - 0.008,
      MODEL_Y_TIRE_WIDTH_M - TIRE_SIDEWALL_HEIGHT_M,
      72,
    ),
    tireMaterial,
  ));
  tire.name = 'marker_tire_tread';
  tire.rotation.x = Math.PI / 2;
  assembly.add(tire);

  [-1, 1].forEach((side) => {
    const sidewall = enableWheelShadows(new THREE.Mesh(
      new THREE.TorusGeometry(
        TIRE_SIDEWALL_CENTER_RADIUS_M,
        TIRE_SIDEWALL_TUBE_RADIUS_M,
        18,
        72,
      ),
      tireMaterial,
    ));
    sidewall.name = 'marker_tire_sidewall';
    sidewall.position.z = side * (MODEL_Y_TIRE_WIDTH_M / 2 - TIRE_SIDEWALL_TUBE_RADIUS_M);
    assembly.add(sidewall);
  });

  [-0.045, 0, 0.045].forEach((positionZ) => {
    const groove = new THREE.Mesh(
      new THREE.TorusGeometry(MODEL_Y_TIRE_OUTER_RADIUS_M - 0.006, 0.0025, 8, 72),
      tireMaterial,
    );
    groove.name = 'marker_tire_groove';
    groove.position.z = positionZ;
    assembly.add(groove);
  });

  const rimBarrel = createAxialCylinder(MODEL_Y_RIM_RADIUS_M, 0.13, wheelMaterial);
  rimBarrel.name = 'marker_rim_barrel';
  assembly.add(rimBarrel);

  const brakeDisc = createAxialCylinder(0.168, 0.014, brakeMaterial);
  brakeDisc.name = 'marker_brake_disc';
  brakeDisc.position.z = WHEEL_FACE_Z_M - 0.038;
  assembly.add(brakeDisc);

  const outerLip = enableWheelShadows(new THREE.Mesh(
    new THREE.TorusGeometry(0.226, 0.013, 12, 72),
    wheelMaterial,
  ));
  outerLip.name = 'marker_rim_lip';
  outerLip.position.z = WHEEL_FACE_Z_M - 0.004;
  assembly.add(outerLip);

  for (let pairIndex = 0; pairIndex < GEMINI_SPOKE_PAIR_COUNT; pairIndex += 1) {
    const pairAngle = pairIndex * ((Math.PI * 2) / GEMINI_SPOKE_PAIR_COUNT);
    GEMINI_SPOKE_PAIR_OFFSETS.forEach((pairOffset) => {
      assembly.add(createGeminiSpoke(wheelMaterial, pairAngle + pairOffset));
    });
  }

  const hub = createAxialCylinder(0.072, 0.028, wheelMaterial);
  hub.name = 'marker_rim_hub';
  hub.position.z = WHEEL_FACE_Z_M - 0.002;
  assembly.add(hub);

  for (let lugIndex = 0; lugIndex < 5; lugIndex += 1) {
    const lugAngle = lugIndex * ((Math.PI * 2) / 5) + Math.PI / 2;
    const lug = createAxialCylinder(0.011, 0.012, brakeMaterial);
    lug.name = 'marker_rim_lug';
    lug.position.set(Math.cos(lugAngle) * 0.047, Math.sin(lugAngle) * 0.047, WHEEL_FACE_Z_M + 0.012);
    assembly.add(lug);
  }

  assembly.name = 'marker_axle_assembly';
  return assembly;
}

export function addMarkerWheels(group: THREE.Group) {
  const emptyMarkers: THREE.Object3D[] = [];
  group.traverse((item) => {
    if (WHEEL_MARKER_PATTERN.test((item.name || '').toLowerCase()) && item.children.length === 0) {
      emptyMarkers.push(item);
    }
  });
  emptyMarkers.forEach((marker) => marker.add(buildMarkerWheelAssembly()));
}
