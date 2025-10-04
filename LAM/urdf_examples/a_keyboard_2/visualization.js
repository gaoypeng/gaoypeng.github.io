import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let keyboard;

function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcce0ff);
    scene.fog = new THREE.Fog(0xcce0ff, 500, 1000);

    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(20, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    scene.add(directionalLight);

    // Materials
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.5 });
    const keyMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.3 });
    const keyTopMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
    const feetMaterial = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.9, roughness: 0.1 });
    const spacebarMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.3 });
    const spacebarTopMaterial = new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.7, roughness: 0.3 });


    // Create Keyboard Object (Root Group)
    keyboard = new THREE.Group();
    keyboard.name = 'keyboard_root';

    // --- Create Base Part ---
    const baseGroup = new THREE.Group();
    baseGroup.name = 'base';

    const baseWidth = 25;
    const baseHeight = 1;
    const baseDepth = 10;
    const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.name = 'base_main';
    baseMesh.position.y = baseHeight / 2; // Sit on the ground
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    baseGroup.add(baseMesh);

    // Add feet to the base
    const footRadius = 0.3;
    const footHeight = 0.5;
    const footGeometry = new THREE.CylinderGeometry(footRadius, footRadius, footHeight, 16);
    const feetPositions = [
        new THREE.Vector3(baseWidth / 2 - 1, 0, baseDepth / 2 - 1),
        new THREE.Vector3(-(baseWidth / 2 - 1), 0, baseDepth / 2 - 1),
        new THREE.Vector3(baseWidth / 2 - 1, 0, -(baseDepth / 2 - 1)),
        new THREE.Vector3(-(baseWidth / 2 - 1), 0, -(baseDepth / 2 - 1)),
    ];

    const feetGroup = new THREE.Group();
    feetGroup.name = 'feet'; // Subgroup within 'base'

    feetPositions.forEach((pos, index) => {
        const footMesh = new THREE.Mesh(footGeometry, feetMaterial);
        footMesh.name = `foot_${index + 1}`;
        footMesh.position.copy(pos);
        footMesh.position.y = footHeight / 2; // Position below the base main mesh
        footMesh.castShadow = true;
        feetGroup.add(footMesh);
    });
    baseGroup.add(feetGroup);

    // Position the base group so its bottom is at y=0
    baseGroup.position.y = footHeight; // Elevate the base by the height of the feet
    keyboard.add(baseGroup);

    // --- Create Keys ---
    const keySize = 1.5;
    const keyGap = 0.3;
    const keyCell = keySize + keyGap;
    const keyBaseHeight = 0.4;
    const keyTopHeight = 0.1; // Total key height = 0.5
    const keyBaseGeometry = new THREE.BoxGeometry(keySize, keyBaseHeight, keySize);
    const keyTopGeometry = new THREE.BoxGeometry(keySize * 0.9, keyTopHeight, keySize * 0.9); // Slightly smaller top

    const rows = [12, 12, 11, 10]; // Number of keys in main block rows
    const startX = -baseWidth / 2 + keyGap + keySize / 2; // Left edge of keyboard + first gap + half key width
    const startZ = -baseDepth / 2 + keyGap + keySize / 2; // Back edge of keyboard + first gap + half key depth

    let keyIndex = 0;
    rows.forEach((numKeys, rowIndex) => {
        let currentStartX = startX;
        // Shift rows 2 and 3 for typical keyboard layout
        if (rowIndex === 2) currentStartX += keyCell * 0.5; // ASDF row
        if (rowIndex === 3) currentStartX += keyCell * 1.0; // ZXCV row

        for (let colIndex = 0; colIndex < numKeys; colIndex++) {
            const keyGroup = new THREE.Group();
            keyGroup.name = `key_r${rowIndex}_c${colIndex}`;

            const keyBaseMesh = new THREE.Mesh(keyBaseGeometry, keyMaterial);
            keyBaseMesh.name = 'key_base';
            keyBaseMesh.position.y = keyBaseHeight / 2; // Position relative to key group origin
            keyBaseMesh.castShadow = true;
            keyGroup.add(keyBaseMesh);

            const keyTopMesh = new THREE.Mesh(keyTopGeometry, keyTopMaterial);
            keyTopMesh.name = 'key_top';
            keyTopMesh.position.y = keyBaseHeight + keyTopHeight / 2; // Position relative to key group origin
            keyTopMesh.castShadow = true;
            keyGroup.add(keyTopMesh);

            // Position the key group
            keyGroup.position.x = currentStartX + colIndex * keyCell;
            keyGroup.position.y = baseGroup.position.y + baseHeight + keyTopHeight / 2; // On top of base + half key height
            keyGroup.position.z = startZ + rowIndex * keyCell;

            keyboard.add(keyGroup);
            keyIndex++;
        }
    });

    // --- Add Spacebar and bottom row keys ---
    const bottomRowZ = startZ + 4 * keyCell;
    let currentX = -baseWidth / 2 + keyGap + keySize / 2; // Start like other rows
    const bottomRowY = baseGroup.position.y + baseHeight + keyTopHeight / 2;

    // Ctrl (Left)
    const ctrlLeftGroup = new THREE.Group();
    ctrlLeftGroup.name = 'key_ctrl_l';
    const ctrlLeftBase = new THREE.Mesh(keyBaseGeometry, keyMaterial); ctrlLeftBase.name = 'key_base'; ctrlLeftGroup.add(ctrlLeftBase);
    const ctrlLeftTop = new THREE.Mesh(keyTopGeometry, keyTopMaterial); ctrlLeftTop.name = 'key_top'; ctrlLeftGroup.add(ctrlLeftTop);
    ctrlLeftBase.position.y = keyBaseHeight / 2; ctrlLeftTop.position.y = keyBaseHeight + keyTopHeight / 2;
    ctrlLeftGroup.position.set(currentX, bottomRowY, bottomRowZ);
    keyboard.add(ctrlLeftGroup);
    currentX += keyCell;

    // Win (Left)
    const winLeftGroup = new THREE.Group();
    winLeftGroup.name = 'key_win_l';
    const winLeftBase = new THREE.Mesh(keyBaseGeometry, keyMaterial); winLeftBase.name = 'key_base'; winLeftGroup.add(winLeftBase);
    const winLeftTop = new THREE.Mesh(keyTopGeometry, keyTopMaterial); winLeftTop.name = 'key_top'; winLeftGroup.add(winLeftTop);
    winLeftBase.position.y = keyBaseHeight / 2; winLeftTop.position.y = keyBaseHeight + keyTopHeight / 2;
    winLeftGroup.position.set(currentX, bottomRowY, bottomRowZ);
    keyboard.add(winLeftGroup);
    currentX += keyCell;

    // Alt (Left)
    const altLeftGroup = new THREE.Group();
    altLeftGroup.name = 'key_alt_l';
    const altLeftBase = new THREE.Mesh(keyBaseGeometry, keyMaterial); altLeftBase.name = 'key_base'; altLeftGroup.add(altLeftBase);
    const altLeftTop = new THREE.Mesh(keyTopGeometry, keyTopMaterial); altLeftTop.name = 'key_top'; altLeftGroup.add(altLeftTop);
    altLeftBase.position.y = keyBaseHeight / 2; altLeftTop.position.y = keyBaseHeight + keyTopHeight / 2;
    altLeftGroup.position.set(currentX, bottomRowY, bottomRowZ);
    keyboard.add(altLeftGroup);
    currentX += keyCell;

    // Spacebar
    const spacebarWidth = keySize * 4 + keyGap * 3; // Make it roughly 4 keys wide
    const spacebarGeometry = new THREE.BoxGeometry(spacebarWidth, keyBaseHeight, keySize);
    const spacebarTopGeometry = new THREE.BoxGeometry(spacebarWidth * 0.98, keyTopHeight, keySize * 0.9);

    const spacebarGroup = new THREE.Group();
    spacebarGroup.name = 'spacebar';
    const spacebarBase = new THREE.Mesh(spacebarGeometry, spacebarMaterial);
    spacebarBase.name = 'spacebar_base';
    spacebarBase.position.y = keyBaseHeight / 2;
    spacebarBase.castShadow = true;
    spacebarGroup.add(spacebarBase);

    const spacebarTop = new THREE.Mesh(spacebarTopGeometry, spacebarTopMaterial);
    spacebarTop.name = 'spacebar_top';
    spacebarTop.position.y = keyBaseHeight + keyTopHeight / 2;
    spacebarTop.castShadow = true;
    spacebarGroup.add(spacebarTop);

    spacebarGroup.position.x = currentX + spacebarWidth / 2 - keySize / 2; // Position center of spacebar
    spacebarGroup.position.y = bottomRowY;
    spacebarGroup.position.z = bottomRowZ;
    keyboard.add(spacebarGroup);
    currentX += spacebarWidth + keyGap; // Move past spacebar

    // Alt (Right)
    const altRightGroup = new THREE.Group();
    altRightGroup.name = 'key_alt_r';
    const altRightBase = new THREE.Mesh(keyBaseGeometry, keyMaterial); altRightBase.name = 'key_base'; altRightGroup.add(altRightBase);
    const altRightTop = new THREE.Mesh(keyTopGeometry, keyTopMaterial); altRightTop.name = 'key_top'; altRightGroup.add(altRightTop);
    altRightBase.position.y = keyBaseHeight / 2; altRightTop.position.y = keyBaseHeight + keyTopHeight / 2;
    altRightGroup.position.set(currentX, bottomRowY, bottomRowZ);
    keyboard.add(altRightGroup);
    currentX += keyCell;

    // Ctrl (Right)
    const ctrlRightGroup = new THREE.Group();
    ctrlRightGroup.name = 'key_ctrl_r';
    const ctrlRightBase = new THREE.Mesh(keyBaseGeometry, keyMaterial); ctrlRightBase.name = 'key_base'; ctrlRightGroup.add(ctrlRightBase);
    const ctrlRightTop = new THREE.Mesh(keyTopGeometry, keyTopMaterial); ctrlRightTop.name = 'key_top'; ctrlRightGroup.add(ctrlRightTop);
    ctrlRightBase.position.y = keyBaseHeight / 2; ctrlRightTop.position.y = keyBaseHeight + keyTopHeight / 2;
    ctrlRightGroup.position.set(currentX, bottomRowY, bottomRowZ);
    keyboard.add(ctrlRightGroup);
    // currentX += keyCell; // End of row

    // Add the keyboard to the scene
    scene.add(keyboard);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

init();
animate();