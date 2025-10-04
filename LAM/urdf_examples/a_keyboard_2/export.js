import * as THREE from 'three';

export function createScene() {
    // Materials (basic materials sufficient for structure, colors won't export to OBJ)
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const keyMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const keyTopMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const feetMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const spacebarMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const spacebarTopMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });

    // Create Keyboard Object (Root Group)
    const keyboard = new THREE.Group();
    keyboard.name = 'keyboard_root'; // Name for the root group itself (optional for export)

    // --- Create Base Part ---
    const baseGroup = new THREE.Group();
    baseGroup.name = 'base'; // This group will be exported as 'base.obj'

    const baseWidth = 25;
    const baseHeight = 1;
    const baseDepth = 10;
    const baseGeometry = new THREE.BoxGeometry(baseWidth, baseHeight, baseDepth);
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.name = 'base_main'; // Name for the mesh within the group
    baseMesh.position.y = baseHeight / 2; // Position relative to the base group origin
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

    // Add feet meshes directly to the baseGroup (or a subgroup if desired, but baseGroup is the export unit)
    feetPositions.forEach((pos, index) => {
        const footMesh = new THREE.Mesh(footGeometry, feetMaterial);
        footMesh.name = `foot_${index + 1}`; // Name for the mesh within the group
        footMesh.position.copy(pos);
        footMesh.position.y = -footHeight / 2; // Position below the base main mesh's bottom face (which is at y=0 in baseGroup space)
        baseGroup.add(footMesh);
    });

    // Position the base group so its bottom (feet bottom) is at y=0
    baseGroup.position.y = footHeight / 2; // Elevate the base group by half the foot height

    keyboard.add(baseGroup); // Add the base group to the root

    // --- Create Keys ---
    const keySize = 1.5;
    const keyGap = 0.3;
    const keyCell = keySize + keyGap;
    const keyBaseHeight = 0.4;
    const keyTopHeight = 0.1; // Total key height = 0.5
    const totalKeyHeight = keyBaseHeight + keyTopHeight;
    const keyBaseGeometry = new THREE.BoxGeometry(keySize, keyBaseHeight, keySize);
    const keyTopGeometry = new THREE.BoxGeometry(keySize * 0.9, keyTopHeight, keySize * 0.9); // Slightly smaller top

    const rows = [12, 12, 11, 10]; // Number of keys in main block rows
    const startX = -baseWidth / 2 + keyGap + keySize / 2; // Left edge of keyboard + first gap + half key width
    const startZ = -baseDepth / 2 + keyGap + keySize / 2; // Back edge of keyboard + first gap + half key depth

    rows.forEach((numKeys, rowIndex) => {
        let currentStartX = startX;
        // Shift rows 2 and 3 for typical keyboard layout
        if (rowIndex === 2) currentStartX += keyCell * 0.5; // ASDF row
        if (rowIndex === 3) currentStartX += keyCell * 1.0; // ZXCV row

        for (let colIndex = 0; colIndex < numKeys; colIndex++) {
            const keyGroup = new THREE.Group();
            keyGroup.name = `key_r${rowIndex}_c${colIndex}`; // This group will be exported as 'key_rX_cY.obj'

            const keyBaseMesh = new THREE.Mesh(keyBaseGeometry, keyMaterial);
            keyBaseMesh.name = 'key_base'; // Name for the mesh within the group
            keyBaseMesh.position.y = keyBaseHeight / 2; // Position relative to key group origin (0,0,0)
            keyGroup.add(keyBaseMesh);

            const keyTopMesh = new THREE.Mesh(keyTopGeometry, keyTopMaterial);
            keyTopMesh.name = 'key_top'; // Name for the mesh within the group
            keyTopMesh.position.y = keyBaseHeight + keyTopHeight / 2; // Position relative to key group origin (0,0,0)
            keyGroup.add(keyTopMesh);

            // Position the key group relative to the keyboard root
            keyGroup.position.x = currentStartX + colIndex * keyCell;
            keyGroup.position.y = baseGroup.position.y + baseHeight / 2 + totalKeyHeight / 2; // On top of base mesh + half key height
            keyGroup.position.z = startZ + rowIndex * keyCell;

            keyboard.add(keyGroup); // Add key group to the root
        }
    });

    // --- Add Spacebar and bottom row keys ---
    const bottomRowZ = startZ + 4 * keyCell;
    let currentX = -baseWidth / 2 + keyGap + keySize / 2; // Start like other rows
    const bottomRowY = baseGroup.position.y + baseHeight / 2 + totalKeyHeight / 2; // Same Y as other keys

    // Ctrl (Left)
    const ctrlLeftGroup = new THREE.Group();
    ctrlLeftGroup.name = 'key_ctrl_l';
    const ctrlLeftBase = new THREE.Mesh(keyBaseGeometry, keyMaterial); ctrlLeftBase.name = 'key_base'; ctrlLeftBase.position.y = keyBaseHeight / 2; ctrlLeftGroup.add(ctrlLeftBase);
    const ctrlLeftTop = new THREE.Mesh(keyTopGeometry, keyTopMaterial); ctrlLeftTop.name = 'key_top'; ctrlLeftTop.position.y = keyBaseHeight + keyTopHeight / 2; ctrlLeftGroup.add(ctrlLeftTop);
    ctrlLeftGroup.position.set(currentX, bottomRowY, bottomRowZ);
    keyboard.add(ctrlLeftGroup);
    currentX += keyCell;

    // Win (Left)
    const winLeftGroup = new THREE.Group();
    winLeftGroup.name = 'key_win_l';
    const winLeftBase = new THREE.Mesh(keyBaseGeometry, keyMaterial); winLeftBase.name = 'key_base'; winLeftBase.position.y = keyBaseHeight / 2; winLeftGroup.add(winLeftBase);
    const winLeftTop = new THREE.Mesh(keyTopGeometry, keyTopMaterial); winLeftTop.name = 'key_top'; winLeftTop.position.y = keyBaseHeight + keyTopHeight / 2; winLeftGroup.add(winLeftTop);
    winLeftGroup.position.set(currentX, bottomRowY, bottomRowZ);
    keyboard.add(winLeftGroup);
    currentX += keyCell;

    // Alt (Left)
    const altLeftGroup = new THREE.Group();
    altLeftGroup.name = 'key_alt_l';
    const altLeftBase = new THREE.Mesh(keyBaseGeometry, keyMaterial); altLeftBase.name = 'key_base'; altLeftBase.position.y = keyBaseHeight / 2; altLeftGroup.add(altLeftBase);
    const altLeftTop = new THREE.Mesh(keyTopGeometry, keyTopMaterial); altLeftTop.name = 'key_top'; altLeftTop.position.y = keyBaseHeight + keyTopHeight / 2; altLeftGroup.add(altLeftTop);
    altLeftGroup.position.set(currentX, bottomRowY, bottomRowZ);
    keyboard.add(altLeftGroup);
    currentX += keyCell;

    // Spacebar
    const spacebarWidth = keySize * 4 + keyGap * 3; // Make it roughly 4 keys wide
    const spacebarGeometry = new THREE.BoxGeometry(spacebarWidth, keyBaseHeight, keySize);
    const spacebarTopGeometry = new THREE.BoxGeometry(spacebarWidth * 0.98, keyTopHeight, keySize * 0.9);

    const spacebarGroup = new THREE.Group();
    spacebarGroup.name = 'spacebar'; // This group will be exported as 'spacebar.obj'
    const spacebarBase = new THREE.Mesh(spacebarGeometry, spacebarMaterial);
    spacebarBase.name = 'spacebar_base'; // Name for the mesh within the group
    spacebarBase.position.y = keyBaseHeight / 2;
    spacebarGroup.add(spacebarBase);

    const spacebarTop = new THREE.Mesh(spacebarTopGeometry, spacebarTopMaterial);
    spacebarTop.name = 'spacebar_top'; // Name for the mesh within the group
    spacebarTop.position.y = keyBaseHeight + keyTopHeight / 2;
    spacebarGroup.add(spacebarTop);

    // Position the spacebar group
    spacebarGroup.position.x = currentX + spacebarWidth / 2 - keySize / 2; // Position center of spacebar
    spacebarGroup.position.y = bottomRowY;
    spacebarGroup.position.z = bottomRowZ;
    keyboard.add(spacebarGroup); // Add spacebar group to the root
    currentX += spacebarWidth + keyGap; // Move past spacebar

    // Alt (Right)
    const altRightGroup = new THREE.Group();
    altRightGroup.name = 'key_alt_r';
    const altRightBase = new THREE.Mesh(keyBaseGeometry, keyMaterial); altRightBase.name = 'key_base'; altRightBase.position.y = keyBaseHeight / 2; altRightGroup.add(altRightBase);
    const altRightTop = new THREE.Mesh(keyTopGeometry, keyTopMaterial); altRightTop.name = 'key_top'; altRightTop.position.y = keyBaseHeight + keyTopHeight / 2; altRightGroup.add(altRightTop);
    altRightGroup.position.set(currentX, bottomRowY, bottomRowZ);
    keyboard.add(altRightGroup);
    currentX += keyCell;

    // Ctrl (Right)
    const ctrlRightGroup = new THREE.Group();
    ctrlRightGroup.name = 'key_ctrl_r';
    const ctrlRightBase = new THREE.Mesh(keyBaseGeometry, keyMaterial); ctrlRightBase.name = 'key_base'; ctrlRightBase.position.y = keyBaseHeight / 2; ctrlRightGroup.add(ctrlRightBase);
    const ctrlRightTop = new THREE.Mesh(keyTopGeometry, keyTopMaterial); ctrlRightTop.name = 'key_top'; ctrlRightTop.position.y = keyBaseHeight + keyTopHeight / 2; ctrlRightGroup.add(ctrlRightTop);
    ctrlRightGroup.position.set(currentX, bottomRowY, bottomRowZ);
    keyboard.add(ctrlRightGroup);
    // currentX += keyCell; // End of row

    // The keyboard group now contains the 'base' group and all key groups as its direct children.
    return keyboard;
}