import * as THREE from 'three';
import { STLLoader }  from 'three/addons/loaders/STLLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Component definitions ──────────────────────────────────────────────────────
// useThis.stl is loaded TWICE (indices 3 & 4) — same geometry, separate click targets.
// Each gets a different zoom focus region (top-half vs bottom-half of its bbox).
const COMPONENTS = [
    {
        file: '../5.0Updates/enclosureAndRisers.stl',
        format: 'stl',
        name: 'Enclosure',
        label: 'Enclosure',
        description: 'Laser-cut and machined aluminum enclosure. Houses all subsystems and provides the structural rigidity needed to maintain optical alignment between the projector and rotating resin vat.',
        color: 0xc8b98a,
        metalness: 0.05,
        roughness: 0.80,
        side: THREE.DoubleSide,
    },
    {
        file: '../5.0Updates/optomaTEXTURE_lite.glb',
        format: 'glb',
        scale: 700,
        name: 'DLP Projector',
        label: 'Projector',
        description: 'Optoma ML750 pico DLP projector. Projects synchronized 2D image frames through the resin at precise angular intervals — each frame is a full-depth axial slice, not a layer.',
        color: 0x1a1a1a,
        metalness: 0.45,
        roughness: 0.50,
        rotation: { x: Math.PI / 2, y: 0, z: 0 },
    },
    {
        file: 'models/pbr_lens.glb',
        format: 'glb',
        scale: 350,
        name: 'Projection Lens',
        label: 'Lens',
        description: 'Custom optical disc seated over the projector lens. Conditions the projected light before it enters the resin volume, controlling beam divergence and exposure uniformity.',
        preserveMaterial: true,
        rotation: { x: 0, y: 0, z: Math.PI / 2 },
    },
    {
        file: 'models/useThis.stl',
        format: 'stl',
        name: 'Rotation Stage',
        label: 'Rotation Stage',
        description: 'Motor-driven rotation platform spins the cylindrical resin vat at a controlled, synchronized rate. Precise angular timing is critical — each projected frame must correspond exactly to the current rotation angle.',
        // Anodized aluminum — mid-gray, moderate metalness, low roughness
        color: 0x8a9aa8,
        metalness: 0.75,
        roughness: 0.30,
        clearcoat: 0.4,
        clearcoatRoughness: 0.2,
        zoomRegion: 'upper',
    },
    {
        file: 'models/useThis.stl',
        format: 'stl',
        name: 'Index Bath',
        label: 'Index Bath',
        description: 'Open-top rectangular resin reservoir mounted at the front of the rotation assembly. The resin bottle overhangs into this bath, maintaining a consistent photopolymer level during the print cycle.',
        // Clear acrylic / PETG — light blue tint, semi-transparent with clearcoat
        color: 0xadd8e6,
        metalness: 0.0,
        roughness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        transparent: true,
        opacity: 0.72,
        zoomRegion: 'lower',
    },
];

// ── Scene ──────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
const container = document.getElementById('spif-3d-container');

function stageSize() {
    return { w: container.clientWidth || window.innerWidth, h: container.clientHeight || window.innerHeight };
}

const { w: initW, h: initH } = stageSize();
const camera = new THREE.PerspectiveCamera(42, initW / initH, 0.1, 8000);
camera.up.set(0, 0, 1);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
renderer.setSize(initW, initH);
container.appendChild(renderer.domElement);

// ── Lighting ───────────────────────────────────────────────────────────────────
scene.add(new THREE.HemisphereLight(0xddeeff, 0x332244, 1.6));

const key = new THREE.DirectionalLight(0xffffff, 4.5);
key.position.set(200, 300, 200);
scene.add(key);

const fill = new THREE.DirectionalLight(0xccddf0, 2.0);
fill.position.set(-200, 100, -100);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffeedd, 1.2);
rim.position.set(60, -120, -200);
scene.add(rim);

// ── OrbitControls ──────────────────────────────────────────────────────────────
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.enableZoom = false;
controls.minDistance = 80;
controls.maxDistance = 3000;
controls.autoRotate = false;

// ── Shift+scroll to zoom ───────────────────────────────────────────────────────
renderer.domElement.addEventListener('wheel', (e) => {
    if (!e.shiftKey) return;
    if ((window._spifScrollProgress ?? 0) < 0.98) return;
    e.preventDefault();
    e.stopPropagation();
    const factor = 1 + e.deltaY * 0.001;
    const dir = camera.position.clone().sub(controls.target);
    const newDist = Math.max(controls.minDistance, Math.min(controls.maxDistance, dir.length() * factor));
    dir.setLength(newDist);
    camera.position.copy(controls.target.clone().add(dir));
    controls.update();
}, { passive: false });

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
    const { w, h } = stageSize();
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
});

// ── State ─────────────────────────────────────────────────────────────────────
const meshes = [];       // parallel to COMPONENTS
const labelAnchors = []; // world-space Vector3 per component, set in onAllLoaded
let modelCenter = new THREE.Vector3();
let defaultCamPos = new THREE.Vector3();
let defaultTarget  = new THREE.Vector3();
let loadedCount = 0;
let ready = false;

let focusedIndex = -1;
let zoomAnim = null;

// ── Material helper ───────────────────────────────────────────────────────────
function makeMat(comp) {
    return new THREE.MeshPhysicalMaterial({
        color:              comp.color              ?? 0xaaaaaa,
        metalness:          comp.metalness          ?? 0.1,
        roughness:          comp.roughness          ?? 0.6,
        clearcoat:          comp.clearcoat          ?? 0.15,
        clearcoatRoughness: comp.clearcoatRoughness ?? 0.3,
        transparent:        comp.transparent        ?? false,
        opacity:            comp.opacity            ?? 1.0,
        side:               comp.side               ?? THREE.DoubleSide,
    });
}

// ── Loaders ───────────────────────────────────────────────────────────────────
const stlLoader  = new STLLoader();
const gltfLoader = new GLTFLoader();

function onMeshReady(object, index) {
    meshes[index] = object;
    scene.add(object);
    loadedCount++;
    if (loadedCount === COMPONENTS.length) onAllLoaded();
}

// useThis.stl geometry is cached after first load so the second instance
// (index bath) reuses the same BufferGeometry without a second fetch.
let useThisGeoCache = null;
let useThisGeoPending = [];

function loadUseThis(onReady) {
    if (useThisGeoCache) { onReady(useThisGeoCache.clone()); return; }
    useThisGeoPending.push(onReady);
    if (useThisGeoPending.length > 1) return; // already loading
    stlLoader.load(
        'models/useThis.stl',
        (geo) => {
            geo.computeVertexNormals();
            useThisGeoCache = geo;
            useThisGeoPending.forEach(cb => cb(geo.clone()));
            useThisGeoPending = [];
        },
        undefined,
        (err) => { console.error('STL error useThis.stl', err); }
    );
}

COMPONENTS.forEach((comp, i) => {
    if (comp.format === 'glb') {
        gltfLoader.load(
            comp.file,
            (gltf) => {
                const inner = gltf.scene;
                if (comp.scale) { inner.scale.setScalar(comp.scale); inner.updateMatrixWorld(true); }
                if (!comp.preserveMaterial) {
                    inner.traverse(child => {
                        if (!child.isMesh) return;
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        mats.forEach(m => {
                            ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap']
                                .forEach(k => { if (m[k]) { m[k].dispose(); m[k] = null; } });
                        });
                        child.material = makeMat(comp);
                    });
                }
                if (comp.rotation) inner.rotation.set(comp.rotation.x, comp.rotation.y, comp.rotation.z);
                // Center the GLB at its own geometry origin
                const box = new THREE.Box3().setFromObject(inner);
                const c = box.getCenter(new THREE.Vector3());
                inner.position.sub(c);
                const wrapper = new THREE.Group();
                wrapper.add(inner);
                wrapper.userData.componentIndex = i;
                onMeshReady(wrapper, i);
            },
            undefined,
            (err) => { console.error('GLB error', comp.file, err); loadedCount++; if (loadedCount === COMPONENTS.length) onAllLoaded(); }
        );
    } else if (comp.file === 'models/useThis.stl') {
        loadUseThis((geo) => {
            geo.computeBoundingBox();
            const c = new THREE.Vector3();
            geo.boundingBox.getCenter(c);
            geo.translate(-c.x, -c.y, -c.z);
            const mesh = new THREE.Mesh(geo, makeMat(comp));
            mesh.userData.componentIndex = i;
            onMeshReady(mesh, i);
        });
    } else {
        stlLoader.load(
            comp.file,
            (geo) => {
                geo.computeVertexNormals();
                geo.computeBoundingBox();
                const c = new THREE.Vector3();
                geo.boundingBox.getCenter(c);
                geo.translate(-c.x, -c.y, -c.z);
                const mesh = new THREE.Mesh(geo, makeMat(comp));
                mesh.userData.componentIndex = i;
                onMeshReady(mesh, i);
            },
            undefined,
            (err) => { console.error('STL error', comp.file, err); loadedCount++; if (loadedCount === COMPONENTS.length) onAllLoaded(); }
        );
    }
});

// ── Once all loaded ────────────────────────────────────────────────────────────
function onAllLoaded() {
    // Each part is centered at its own geometry origin after loading.
    // Enclosure (index 0) stays at origin. After centering:
    //   X: ±195.6 mm, Y: ±285.75 mm, Z: ±311.85 mm
    //   Floor = Z -311.85, Left wall = X -195.6, Right wall = X +195.6

    // Positions derived from upward-facing horizontal surface analysis of enclosureRisersRotation.stl
    // All world coords relative to enclosure center (Three.js origin).
    // Enclosure floor: world Z = -311.8
    // Riser top surface: world Z = -67.8, centered at world X=38, Y=-118

    // Riser top surface at world Z=-67.8, center X=38, Y=-118 (from geometry sampling)
    // useThis (205mm tall, half=102.5): bottom on riser top → center Z = -67.8 + 102.5 = +34.7
    if (meshes[3]) meshes[3].position.set( 30,  -155, -130);
    if (meshes[4]) meshes[4].position.set( 30,  -155, -130);

    // Projector rotation y:PI flips it so lens port faces +X.
    // After flip+rotX(PI/2): half-extents X=±117, Y=±93(height), Z=±42(depth)
    // Back against left wall: X = -195 + 117 = -78
    // Bottom on floor: Z = -311.8 + 93 = -218.8 ≈ -219
    // Y aligned with stage: -118
    // Lens port (+X face) at: -78 + 117 = +39, aimed at stage X=38 ✓
    if (meshes[1]) meshes[1].position.set(-30, 170, -265);

    // Lens at red square, right of projector
    if (meshes[2]) meshes[2].position.set(30, 60, -260);
    // Update comments with corrected geometry understanding:
    // useThis half-Z = 102.5, riser top world Z = -219.9, so center Z = -117.4 ≈ -117
    // Projector: X±117.3, Y±42.3, Z±93.5 → floor Z=-311.9+93.5=-218.4 ≈ -219 ✓

    const totalBox2 = new THREE.Box3();
    meshes.forEach((obj, i) => { if (obj && i !== 4) totalBox2.expandByObject(obj); });
    modelCenter = totalBox2.getCenter(new THREE.Vector3());

    const boxSize = totalBox2.getSize(new THREE.Vector3());
    const aspect  = camera.aspect;
    const vFovRad = (camera.fov * Math.PI) / 180;
    const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
    const fitByW  = (boxSize.x / 2) / Math.tan(hFovRad / 2);
    const fitByH  = (boxSize.z / 2) / Math.tan(vFovRad / 2);
    const fitDist = Math.max(fitByW, fitByH) * 1.6;

    const camDir = new THREE.Vector3(-0.4, -0.3, 0.5).normalize();
    defaultCamPos = modelCenter.clone().addScaledVector(camDir, fitDist);
    defaultTarget = modelCenter.clone();

    camera.position.copy(defaultCamPos);
    controls.target.copy(defaultTarget);
    controls.update();

    // Compute label anchor = true world-space bbox center of each component
    COMPONENTS.forEach((_comp, i) => {
        const obj = meshes[i];
        if (!obj) { labelAnchors[i] = new THREE.Vector3(); return; }
        const box = new THREE.Box3().setFromObject(obj);
        labelAnchors[i] = box.getCenter(new THREE.Vector3());
    });

    buildLabels();
    buildInfoPanel();
    setupClicks();

    ready = true;
    window._spifReady = true;
}

// ── Zoom focus point per component ────────────────────────────────────────────
// For components 3 & 4 (useThis.stl loaded twice), we zoom to different
// sub-regions of their shared bounding box.
function getFocusCenter(index) {
    const obj = meshes[index];
    if (!obj) return new THREE.Vector3();
    const box = new THREE.Box3().setFromObject(obj);
    const comp = COMPONENTS[index];

    if (comp.zoomRegion === 'upper') {
        // Rotation stage: upper portion of the bbox
        const c = new THREE.Vector3();
        box.getCenter(c);
        c.z = box.min.z + (box.max.z - box.min.z) * 0.65;
        return c;
    }
    if (comp.zoomRegion === 'lower') {
        // Index bath: lower-front portion
        const c = new THREE.Vector3();
        box.getCenter(c);
        c.z = box.min.z + (box.max.z - box.min.z) * 0.25;
        c.y = box.min.y + (box.max.y - box.min.y) * 0.25;
        return c;
    }
    return box.getCenter(new THREE.Vector3());
}

// ── Floating labels (no leader lines) ─────────────────────────────────────────
const labelEls = [];


function buildLabels() {
    const labelContainer = document.getElementById('component-labels');
    if (!labelContainer) return;

    const LABEL_COLORS = [
        '#c4aee8',  // 0 Enclosure      — soft lavender
        '#9eb8e8',  // 1 Projector      — periwinkle
        '#7ec8e0',  // 2 Lens           — sky blue
        '#a8c4f0',  // 3 Rotation Stage — cornflower
        '#d4a8e8',  // 4 Index Bath     — violet-pink
    ];

    COMPONENTS.forEach((comp, i) => {
        const el = document.createElement('div');
        el.className = 'component-label';
        el.dataset.index = i;
        el.innerHTML = `<span class="cl-name">${comp.label}</span>`;
        el.style.opacity = '0';
        el.style.setProperty('--label-color', LABEL_COLORS[i]);
        el.addEventListener('click', () => focusComponent(i));
        labelContainer.appendChild(el);
        labelEls[i] = el;
    });
}

// ── Info panel ────────────────────────────────────────────────────────────────
let infoPanel = null;

function buildInfoPanel() {
    const panel = document.createElement('div');
    panel.id = 'spif-info-panel';
    panel.innerHTML = `
        <button id="info-close" aria-label="Close">✕</button>
        <div class="ip-nav">
            <button id="info-prev" aria-label="Previous">←</button>
            <div class="ip-nav-index"></div>
            <button id="info-next" aria-label="Next">→</button>
        </div>
        <div class="ip-label"></div>
        <h3 class="ip-name"></h3>
        <p class="ip-desc"></p>
    `;
    container.appendChild(panel);
    panel.querySelector('#info-close').addEventListener('click', unfocusComponent);
    panel.querySelector('#info-prev').addEventListener('click', () => {
        const next = (focusedIndex - 1 + COMPONENTS.length) % COMPONENTS.length;
        focusComponent(next);
    });
    panel.querySelector('#info-next').addEventListener('click', () => {
        const next = (focusedIndex + 1) % COMPONENTS.length;
        focusComponent(next);
    });
    infoPanel = panel;
}

function showInfoPanel(index) {
    if (!infoPanel) return;
    const comp = COMPONENTS[index];
    infoPanel.querySelector('.ip-label').textContent    = comp.label;
    infoPanel.querySelector('.ip-name').textContent     = comp.name;
    infoPanel.querySelector('.ip-desc').textContent     = comp.description;
    infoPanel.querySelector('.ip-nav-index').textContent = `${index + 1} / ${COMPONENTS.length}`;
    infoPanel.classList.add('visible');
}

function hideInfoPanel() {
    if (infoPanel) infoPanel.classList.remove('visible');
}

// ── Click detection ───────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function setupClicks() {
    renderer.domElement.addEventListener('click', (e) => {
        if (!ready || (window._spifScrollProgress ?? 0) < 0.98) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const hits = raycaster.intersectObjects(meshes.filter(Boolean), true);
        if (hits.length === 0) return; // clicking empty space does nothing

        let obj = hits[0].object;
        while (obj.parent && obj.parent !== scene) obj = obj.parent;
        const idx = meshes.indexOf(obj);

        if (idx === 3 || idx === 4) {
            const hitZ = hits[0].point.z;
            const box = new THREE.Box3().setFromObject(meshes[3]);
            const midZ = box.min.z + (box.max.z - box.min.z) * 0.45;
            focusComponent(hitZ > midZ ? 3 : 4);
            return;
        }

        if (idx !== -1) focusComponent(idx);
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        if (!ready || focusedIndex !== -1 || (window._spifScrollProgress ?? 0) < 0.98) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(meshes.filter(Boolean), true);
        renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    });
}

// ── Focus / unfocus ───────────────────────────────────────────────────────────
function focusComponent(index) {
    if (!ready || !meshes[index]) return;
    focusedIndex = index;

    const focusCenter = getFocusCenter(index);
    const obj = meshes[index];
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) * 0.5; // tighter for sub-regions
    const fovRad = (camera.fov * Math.PI) / 180;
    const dist = (maxDim / 2) / Math.tan(fovRad / 2) * 2.0;

    // Always approach from the default camera direction so component is fully in view
    const dir = defaultCamPos.clone().sub(defaultTarget).normalize();
    const toPos = focusCenter.clone().addScaledVector(dir, dist);

    zoomAnim = { fromPos: camera.position.clone(), toPos, fromTarget: controls.target.clone(), toTarget: focusCenter, t: 0, duration: 0.7 };
    controls.enabled = false;
    showInfoPanel(index);

    // Dim everything except the focused mesh (and its twin if it's 3 or 4)
    meshes.forEach((m, i) => {
        if (!m) return;
        const isFocused = (i === index) || (index === 3 && i === 4) || (index === 4 && i === 3);
        const targetOpacity = isFocused ? 1.0 : 0.12;
        m.traverse(c => {
            if (!c.isMesh || !c.material) return;
            c.material.opacity = targetOpacity;
            c.material.transparent = true;
        });
    });

    labelEls.forEach((el, i) => {
        if (el) el.style.opacity = i === index ? '1' : '0';
    });
}

function unfocusComponent() {
    if (!ready) return;
    focusedIndex = -1;

    zoomAnim = { fromPos: camera.position.clone(), toPos: defaultCamPos.clone(), fromTarget: controls.target.clone(), toTarget: defaultTarget.clone(), t: 0, duration: 0.7 };
    hideInfoPanel();
    controls.enabled = true;

    meshes.forEach(m => {
        if (!m) return;
        m.traverse(c => {
            if (!c.isMesh || !c.material) return;
            c.material.opacity = 1.0;
            c.material.transparent = false;
        });
    });
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Video element ─────────────────────────────────────────────────────────────
const videoEl = document.getElementById('spif-video');

// ── Label update — called every frame so labels track camera orbit ─────────────

function updateLabels(show3D) {
    const visible = show3D > 0.5;
    labelEls.forEach((el, i) => {
        if (!el) return;
        const show = visible && (focusedIndex === -1 || focusedIndex === i);
        el.style.opacity = show ? '1' : '0';
        el.style.pointerEvents = show ? 'auto' : 'none';
    });
}

// ── Animate ───────────────────────────────────────────────────────────────────
let _lastSp = -1;

function animate() {
    requestAnimationFrame(animate);

    const sp = window._spifScrollProgress ?? 0;
    const spChanged = Math.abs(sp - _lastSp) > 0.001;

    const show3D = Math.max(0, Math.min(1, (sp - 0.45) / 0.55));

    if (!spChanged && !zoomAnim) {
        controls.update();
        renderer.render(scene, camera);
        if (ready) updateLabels(show3D);
        return;
    }
    _lastSp = sp;

    const showVid = Math.max(0, Math.min(1, 1 - sp / 0.55));
    if (videoEl) videoEl.style.opacity = showVid.toFixed(3);

    const fullyIn = sp >= 0.98;
    if (container) {
        container.style.opacity = show3D.toFixed(3);
        container.style.pointerEvents = fullyIn ? 'auto' : 'none';
    }
    if (!zoomAnim) controls.enabled = fullyIn;

    const machineStage = document.querySelector('.machine-stage');
    if (machineStage) machineStage.classList.toggle('cad-mode', fullyIn);

    if (ready) updateLabels(show3D);

    if (zoomAnim) {
        zoomAnim.t = Math.min(1, zoomAnim.t + 0.016 / zoomAnim.duration);
        const e = easeInOutCubic(zoomAnim.t);
        camera.position.lerpVectors(zoomAnim.fromPos, zoomAnim.toPos, e);
        controls.target.lerpVectors(zoomAnim.fromTarget, zoomAnim.toTarget, e);
        controls.update();
        if (zoomAnim.t >= 1) {
            if (focusedIndex !== -1) controls.enabled = true;
            zoomAnim = null;
        }
    } else {
        controls.update();
    }

    renderer.render(scene, camera);
}

animate();
