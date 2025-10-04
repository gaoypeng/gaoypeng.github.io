import * as THREE from 'three';

export function createScene() {
    const cabinet = new THREE.Group();
    cabinet.name = 'cabinet';

    // --- Dimensions ---
    const cabinetOverallWidth = 6.0;
    const cabinetOverallHeightWithLegs = 10.0;
    const cabinetOverallDepth = 4.0;

    const legHeight = 1.5;
    const legRadius = 0.3;

    const frameActualHeight = cabinetOverallHeightWithLegs - legHeight;
    const panelThickness = 0.2; // Thickness of cabinet_frame panels

    // Frame inner dimensions (cavity for drawers)
    const frameInnerWidth = cabinetOverallWidth - 2 * panelThickness;
    const frameInnerHeight = frameActualHeight - 2 * panelThickness; // Top and bottom panels of frame
    const frameInnerDepth = cabinetOverallDepth - panelThickness; // Back panel of frame, front is open

    const numDrawers = 5;
    const drawerGap = 0.15; // Vertical gap between drawers
    const drawerActualHeight = (frameInnerHeight - (numDrawers - 1) * drawerGap) / numDrawers;

    const drawerSidePanelThickness = 0.1; // Thickness of drawer's own panels (bottom, sides, back)
    const drawerFrontPanelThickness = 0.15; // Thickness of the decorative front panel of a drawer

    // Drawer dimensions (external, including its own panels for content box)
    // The drawerWidth and drawerActualHeight define the front panel size.
    // The drawer box (frame) will be slightly smaller or fit these dimensions.
    const drawerContentBoxWidth = frameInnerWidth - 0.2; // Small side clearance for sliding
    const drawerContentBoxDepth = frameInnerDepth - 0.1; // Small back clearance for drawer box

    const handleRadius = 0.1;
    const handleLength = drawerContentBoxWidth * 0.4; // Length of the cylindrical handle part
    const handleProtrusion = 0.3; // How much the handle sticks out

    // --- Cabinet Frame ---
    const cabinet_frame_group = new THREE.Group();
    cabinet_frame_group.name = 'cabinet_frame';
    cabinet.add(cabinet_frame_group);

    // Position cabinet_frame group so its bottom surface (of the main box) is 'legHeight' above y=0
    cabinet_frame_group.position.set(0, legHeight + frameActualHeight / 2, 0);

    // Top panel of frame
    const topPanelGeo = new THREE.BoxGeometry(cabinetOverallWidth, panelThickness, cabinetOverallDepth);
    const topPanelMesh = new THREE.Mesh(topPanelGeo);
    topPanelMesh.name = 'cabinet_frame_top_panel_mesh';
    topPanelMesh.position.y = frameActualHeight / 2 - panelThickness / 2;
    cabinet_frame_group.add(topPanelMesh);

    // Bottom panel of frame
    const bottomPanelGeo = new THREE.BoxGeometry(cabinetOverallWidth, panelThickness, cabinetOverallDepth);
    const bottomPanelMesh = new THREE.Mesh(bottomPanelGeo);
    bottomPanelMesh.name = 'cabinet_frame_bottom_panel_mesh';
    bottomPanelMesh.position.y = -frameActualHeight / 2 + panelThickness / 2;
    cabinet_frame_group.add(bottomPanelMesh);

    // Back panel of frame
    const backPanelGeo = new THREE.BoxGeometry(cabinetOverallWidth - 2 * panelThickness, frameActualHeight - 2 * panelThickness, panelThickness);
    const backPanelMesh = new THREE.Mesh(backPanelGeo);
    backPanelMesh.name = 'cabinet_frame_back_panel_mesh';
    backPanelMesh.position.z = -cabinetOverallDepth / 2 + panelThickness / 2;
    cabinet_frame_group.add(backPanelMesh);

    // Left side panel of frame
    const sidePanelHeight = frameActualHeight - 2 * panelThickness;
    const sidePanelDepth = cabinetOverallDepth - panelThickness;
    const leftSidePanelGeo = new THREE.BoxGeometry(panelThickness, sidePanelHeight, sidePanelDepth);
    const leftSidePanelMesh = new THREE.Mesh(leftSidePanelGeo);
    leftSidePanelMesh.name = 'cabinet_frame_left_side_panel_mesh';
    leftSidePanelMesh.position.x = -cabinetOverallWidth / 2 + panelThickness / 2;
    leftSidePanelMesh.position.z = panelThickness / 2;
    cabinet_frame_group.add(leftSidePanelMesh);

    // Right side panel of frame
    const rightSidePanelGeo = new THREE.BoxGeometry(panelThickness, sidePanelHeight, sidePanelDepth);
    const rightSidePanelMesh = new THREE.Mesh(rightSidePanelGeo);
    rightSidePanelMesh.name = 'cabinet_frame_right_side_panel_mesh';
    rightSidePanelMesh.position.x = cabinetOverallWidth / 2 - panelThickness / 2;
    rightSidePanelMesh.position.z = panelThickness / 2;
    cabinet_frame_group.add(rightSidePanelMesh);

    // --- Cabinet Legs ---
    // Based on JSON interpretation: Leg1=BL, Leg2=FL, Leg3=BR, Leg4=FR
    const legData = [
        { name: 'cabinet_leg_1', x: -cabinetOverallWidth / 2 + legRadius, z: -cabinetOverallDepth / 2 + legRadius }, // Back-Left
        { name: 'cabinet_leg_2', x: -cabinetOverallWidth / 2 + legRadius, z:  cabinetOverallDepth / 2 - legRadius }, // Front-Left
        { name: 'cabinet_leg_3', x:  cabinetOverallWidth / 2 - legRadius, z: -cabinetOverallDepth / 2 + legRadius }, // Back-Right
        { name: 'cabinet_leg_4', x:  cabinetOverallWidth / 2 - legRadius, z:  cabinetOverallDepth / 2 - legRadius }  // Front-Right
    ];

    const legGeo = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 16);

    for (const data of legData) {
        const leg_group = new THREE.Group();
        leg_group.name = data.name;
        cabinet.add(leg_group);

        const legMesh = new THREE.Mesh(legGeo);
        legMesh.name = `${data.name}_mesh`;
        leg_group.position.set(data.x, legHeight / 2, data.z);
        leg_group.add(legMesh);
    }

    // --- Drawers ---
    const frameBottomPanelTopSurfaceY = legHeight + panelThickness; // World Y of the top surface of the cabinet_frame's bottom panel
    const cabinetFrontFaceWorldZ = cabinetOverallDepth / 2; // World Z of the cabinet's front face (where drawer fronts align)

    for (let i = 0; i < numDrawers; i++) {
        const drawerNumber = i + 1;

        const drawerCenterY = frameBottomPanelTopSurfaceY + i * (drawerActualHeight + drawerGap) + drawerActualHeight / 2;
        const drawerCenterX = 0;

        // --- Drawer Front Panel (Link: drawer_X_front_panel) ---
        const drawer_front_panel_group = new THREE.Group();
        drawer_front_panel_group.name = `drawer_${drawerNumber}_front_panel`;
        cabinet.add(drawer_front_panel_group);

        const frontPanelCenterZ = cabinetFrontFaceWorldZ - drawerFrontPanelThickness / 2;
        drawer_front_panel_group.position.set(drawerCenterX, drawerCenterY, frontPanelCenterZ);

        // The front panel uses drawerActualHeight and drawerContentBoxWidth for its dimensions
        const frontPanelGeo = new THREE.BoxGeometry(drawerContentBoxWidth, drawerActualHeight, drawerFrontPanelThickness);
        const frontPanelMesh = new THREE.Mesh(frontPanelGeo);
        frontPanelMesh.name = `drawer_${drawerNumber}_front_panel_mesh`;
        drawer_front_panel_group.add(frontPanelMesh);

        // --- Drawer Frame (Box part - Link: drawer_X_frame) ---
        const drawer_frame_group = new THREE.Group();
        drawer_frame_group.name = `drawer_${drawerNumber}_frame`;
        cabinet.add(drawer_frame_group);

        // Position drawer_frame_group so its front edge is behind the drawer_front_panel
        const drawerFrameCenterZ = cabinetFrontFaceWorldZ - drawerFrontPanelThickness - (drawerContentBoxDepth / 2);
        drawer_frame_group.position.set(drawerCenterX, drawerCenterY, drawerFrameCenterZ);

        // Meshes for drawer_frame (relative to drawer_frame_group's center)
        // Drawer frame dimensions: drawerContentBoxWidth, drawerActualHeight, drawerContentBoxDepth
        // Bottom panel of drawer
        const drawerBottomGeo = new THREE.BoxGeometry(drawerContentBoxWidth, drawerSidePanelThickness, drawerContentBoxDepth);
        const drawerBottomMesh = new THREE.Mesh(drawerBottomGeo);
        drawerBottomMesh.name = `drawer_${drawerNumber}_frame_bottom_mesh`;
        drawerBottomMesh.position.y = -drawerActualHeight / 2 + drawerSidePanelThickness / 2;
        drawer_frame_group.add(drawerBottomMesh);

        // Back panel of drawer
        const drawerBackGeo = new THREE.BoxGeometry(drawerContentBoxWidth - 2 * drawerSidePanelThickness, drawerActualHeight - drawerSidePanelThickness, drawerSidePanelThickness);
        const drawerBackMesh = new THREE.Mesh(drawerBackGeo);
        drawerBackMesh.name = `drawer_${drawerNumber}_frame_back_mesh`;
        drawerBackMesh.position.y = drawerSidePanelThickness / 2;
        drawerBackMesh.position.z = -drawerContentBoxDepth / 2 + drawerSidePanelThickness / 2;
        drawer_frame_group.add(drawerBackMesh);

        // Left side panel of drawer
        const drawerSideGeo = new THREE.BoxGeometry(drawerSidePanelThickness, drawerActualHeight - drawerSidePanelThickness, drawerContentBoxDepth);
        const drawerLeftMesh = new THREE.Mesh(drawerSideGeo);
        drawerLeftMesh.name = `drawer_${drawerNumber}_frame_left_mesh`;
        drawerLeftMesh.position.y = drawerSidePanelThickness / 2;
        drawerLeftMesh.position.x = -drawerContentBoxWidth / 2 + drawerSidePanelThickness / 2;
        drawer_frame_group.add(drawerLeftMesh);

        // Right side panel of drawer
        const drawerRightMesh = new THREE.Mesh(drawerSideGeo);
        drawerRightMesh.name = `drawer_${drawerNumber}_frame_right_mesh`;
        drawerRightMesh.position.y = drawerSidePanelThickness / 2;
        drawerRightMesh.position.x = drawerContentBoxWidth / 2 - drawerSidePanelThickness / 2;
        drawer_frame_group.add(drawerRightMesh);

        // --- Drawer Handle (Link: drawer_X_handle) ---
        const drawer_handle_group = new THREE.Group();
        drawer_handle_group.name = `drawer_${drawerNumber}_handle`;
        cabinet.add(drawer_handle_group);

        const handleCenterZ = cabinetFrontFaceWorldZ + handleProtrusion / 2;
        drawer_handle_group.position.set(drawerCenterX, drawerCenterY, handleCenterZ);

        const handleGeo = new THREE.CylinderGeometry(handleRadius, handleRadius, handleLength, 12);
        const handleMesh = new THREE.Mesh(handleGeo);
        handleMesh.name = `drawer_${drawerNumber}_handle_mesh`;
        handleMesh.rotation.z = Math.PI / 2; // Orient horizontally
        drawer_handle_group.add(handleMesh);
    }

    return cabinet;
}