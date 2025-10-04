/**
 * URDF Carousel Viewer for LAM Project Page
 * Displays articulated objects with interactive controls
 */

class URDFCarouselViewer {
    constructor(containerId, urdfDataList) {
        this.containerId = containerId;
        this.urdfDataList = urdfDataList;
        this.currentIndex = 0;
        this.viewers = [];
        this.init();
    }

    async init() {
        console.log('Initializing URDF Carousel with', this.urdfDataList.length, 'items');
        this.createCarouselStructure();
        await this.loadAllViewers();
        this.setupNavigation();
        console.log('URDF Carousel initialization complete');
    }

    createCarouselStructure() {
        const container = document.getElementById(this.containerId);
        container.innerHTML = `
            <div class="urdf-carousel-container">
                <button class="carousel-nav carousel-prev" id="carousel-prev">
                    <i class="fas fa-chevron-left"></i>
                </button>

                <div class="urdf-viewer-grid" id="urdf-viewer-grid">
                    ${this.urdfDataList.map((data, idx) => `
                        <div class="urdf-viewer-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
                            <div class="viewer-canvas" id="viewer-${idx}">
                                <div class="viewer-info">
                                    <h4>${data.name}</h4>
                                    <p>${data.description || ''}</p>
                                </div>
                            </div>
                            <div class="viewer-controls" id="controls-${idx}">
                                <div class="joint-controls-container"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <button class="carousel-nav carousel-next" id="carousel-next">
                    <i class="fas fa-chevron-right"></i>
                </button>

                <div class="carousel-indicators">
                    ${this.urdfDataList.map((_, idx) => `
                        <span class="indicator ${idx === 0 ? 'active' : ''}" data-index="${idx}"></span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    async loadAllViewers() {
        for (let i = 0; i < this.urdfDataList.length; i++) {
            try {
                console.log(`Loading viewer ${i} for ${this.urdfDataList[i].name}`);
                const viewer = new URDFViewer(`viewer-${i}`, `controls-${i}`, this.urdfDataList[i]);
                this.viewers.push(viewer);
                await viewer.load();
                console.log(`Successfully loaded viewer ${i}`);
            } catch (error) {
                console.error(`Failed to load viewer ${i} for ${this.urdfDataList[i].name}:`, error);
                // Continue loading other viewers even if one fails
            }
        }
    }

    setupNavigation() {
        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');
        const indicators = document.querySelectorAll('.carousel-indicators .indicator');

        prevBtn.addEventListener('click', () => this.navigate(-1));
        nextBtn.addEventListener('click', () => this.navigate(1));

        indicators.forEach((indicator, idx) => {
            indicator.addEventListener('click', () => this.goToSlide(idx));
        });

        // Auto-rotate (optional)
        // setInterval(() => this.navigate(1), 5000);
    }

    navigate(direction) {
        const newIndex = (this.currentIndex + direction + this.urdfDataList.length) % this.urdfDataList.length;
        this.goToSlide(newIndex);
    }

    goToSlide(index) {
        // Update active states
        document.querySelectorAll('.urdf-viewer-item').forEach((item, idx) => {
            item.classList.toggle('active', idx === index);
        });
        document.querySelectorAll('.carousel-indicators .indicator').forEach((ind, idx) => {
            ind.classList.toggle('active', idx === index);
        });

        this.currentIndex = index;

        // Trigger animation/resize on active viewer
        if (this.viewers[index]) {
            this.viewers[index].resize();
        }
    }
}

class URDFViewer {
    constructor(canvasId, controlsId, urdfData) {
        this.canvasId = canvasId;
        this.controlsId = controlsId;
        this.urdfData = urdfData;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.robot = null;
        this.joints = {};
        this.animationId = null;
        this.showWireframe = false;
        this.linkColors = new Map();
        this.lightRig = null;
        this.shadowPlane = null;
        this.wireframeButton = null;
    }

    async load() {
        console.log(`[${this.canvasId}] Starting load sequence...`);
        
        try {
            console.log(`[${this.canvasId}] Step 1: Initializing Three.js...`);
            this.initThreeJS();
            console.log(`[${this.canvasId}] Step 1 complete. Scene:`, !!this.scene, 'Camera:', !!this.camera, 'Renderer:', !!this.renderer);
            
            console.log(`[${this.canvasId}] Step 2: Setting up lighting...`);
            this.setupLighting();
            console.log(`[${this.canvasId}] Step 2 complete.`);
            
            console.log(`[${this.canvasId}] Step 3: Loading URDF...`);
            await this.loadURDF();
            console.log(`[${this.canvasId}] Step 3 complete.`);
            
            console.log(`[${this.canvasId}] Step 4: Creating joint controls...`);
            this.createJointControls();
            console.log(`[${this.canvasId}] Step 4 complete.`);
            
            console.log(`[${this.canvasId}] Step 5: Starting animation...`);
            this.animate();
            console.log(`[${this.canvasId}] Load sequence complete!`);
        } catch (error) {
            console.error(`[${this.canvasId}] Error during load:`, error);
            console.error(`[${this.canvasId}] Error stack:`, error.stack);
        }
    }

    initThreeJS() {
        const container = document.getElementById(this.canvasId);
        // Ensure container has size
        if (!container) {
            console.error(`Container ${this.canvasId} not found`);
            return;
        }

        // Set explicit size if needed
        if (container.clientWidth === 0 || container.clientHeight === 0) {
            container.style.width = '100%';
            container.style.height = '400px';
        }

        const width = container.clientWidth || 600;
        const height = container.clientHeight || 400;

        console.log(`Initializing Three.js for ${this.canvasId} with size ${width}x${height}`);

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);  // Very light background for maximum contrast

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
        this.camera.position.set(2, 2, 2);
        this.camera.lookAt(0, 0, 0);

        // Renderer with shadow support
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        this.renderer.setClearColor(0xffffff, 0);

        // Enable shadow mapping
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Set color encoding
        if (this.renderer.outputColorSpace !== undefined) {
            this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        } else if (this.renderer.outputEncoding !== undefined) {
            this.renderer.outputEncoding = THREE.sRGBEncoding;
        }

        // Maximum tone mapping for brightest visibility
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.8;  // Maximum exposure for very bright appearance
        container.appendChild(this.renderer.domElement);

        // Controls
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }

        // Resize handler
        window.addEventListener('resize', () => this.resize());
    }

    setupLighting() {
        console.log(`[${this.canvasId}] Setting up enhanced lighting system...`);
        
        // Very bright ambient light for maximum visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);
        console.log(`[${this.canvasId}] Added ambient light: intensity 1.2`);

        // Extra strong main key light for bright illumination
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
        keyLight.position.set(5, 7, 6);
        console.log(`[${this.canvasId}] Added key light: intensity 2.0`);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048;
        keyLight.shadow.mapSize.height = 2048;
        keyLight.shadow.camera.left = -12;
        keyLight.shadow.camera.right = 12;
        keyLight.shadow.camera.top = 12;
        keyLight.shadow.camera.bottom = -12;
        keyLight.shadow.camera.near = 0.2;
        keyLight.shadow.camera.far = 45;
        keyLight.shadow.bias = -0.0001;
        this.scene.add(keyLight);
        this.scene.add(keyLight.target);

        // Extra bright fill light to reduce harsh shadows
        const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
        fillLight.position.set(-6, 5, 3.5);
        this.scene.add(fillLight);

        // Very bright top light for excellent overall visibility
        const topLight = new THREE.DirectionalLight(0xffffff, 0.8);
        topLight.position.set(0, 10, 0);
        this.scene.add(topLight);

        // Enhanced rim light for better edge definition
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
        rimLight.position.set(0, 9, -8);
        this.scene.add(rimLight);

        // Extra bright bounce light for excellent color visibility
        const bounceLight = new THREE.PointLight(0xffffff, 0.8, 40, 2);
        bounceLight.position.set(0, 2.5, 0);
        this.scene.add(bounceLight);

        // Additional side light for better overall brightness
        const sideLight = new THREE.DirectionalLight(0xffffff, 0.7);
        sideLight.position.set(8, 4, 8);
        this.scene.add(sideLight);

        const groundGeometry = new THREE.PlaneGeometry(60, 60);
        const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.02;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.shadowPlane = ground;
        
        console.log(`[${this.canvasId}] Lighting setup complete. Total lights: 5, Ground plane added.`);
    }

    async loadURDF() {
        return new Promise((resolve, reject) => {
            // Add timeout for loading
            const loadTimeout = setTimeout(() => {
                console.error(`Timeout loading URDF: ${this.urdfData.urdfPath}`);
                reject(new Error('URDF loading timeout after 30 seconds'));
            }, 30000);

            // Check for URDFLoader in multiple possible locations
            const URDFLoaderClass = THREE.URDFLoader || window.URDFLoader;

            if (typeof URDFLoaderClass === 'undefined') {
                console.error('URDFLoader not available. THREE:', THREE);
                console.error('window.URDFLoader:', window.URDFLoader);
                clearTimeout(loadTimeout);
                reject(new Error('URDFLoader not available'));
                return;
            }

            const loader = new URDFLoaderClass();

            // Get the URDF directory path
            const urdfPath = this.urdfData.urdfPath;
            const urdfDir = urdfPath.substring(0, urdfPath.lastIndexOf('/') + 1);

            // Set the load mesh callback for OBJ files
            loader.loadMeshCb = (path, manager, onComplete) => {
                try {
                    // Simple path resolution - URDFLoader already adds the directory
                    let finalPath = path;

                    // Remove any leading ./
                    if (finalPath.startsWith('./')) {
                        finalPath = finalPath.substring(2);
                    }

                    // Check if the path already contains the URDF folder structure
                    // If it contains "urdf_examples/[folder_name]/" it means URDFLoader already added it
                    if (finalPath.includes('urdf_examples/')) {
                        // Path already has the directory, just add ./
                        finalPath = './' + finalPath;
                    } else {
                        // Path doesn't have directory, add the full urdfDir
                        finalPath = urdfDir + finalPath;
                    }

                    console.log('Loading mesh:', path, ' -> ', finalPath);

                    const objLoader = new THREE.OBJLoader(manager);
                    objLoader.load(
                        finalPath,
                        (result) => {
                            console.log('OBJ loaded:', finalPath, 'Type:', result.type, 'Children:', result.children.length);
                            if (result.children && result.children.length > 0) {
                                result.children.forEach((child, idx) => {
                                    console.log(`  Child ${idx}: type=${child.type}, isMesh=${child.isMesh}, geometry=${!!child.geometry}`);
                                });
                            }
                            onComplete(result);
                        },
                        undefined,
                        (error) => {
                            console.error('Error loading mesh:', path, 'from', finalPath, error);
                        }
                    );
                } catch (err) {
                    console.error('Failed to load mesh:', path, err);
                }
            };

            console.log(`Starting URDF load from: ${urdfPath}`);

            loader.load(
                urdfPath,
                (robot) => {
                    clearTimeout(loadTimeout);
                    console.log(`URDF loaded successfully: ${urdfPath}`, robot);
                    this.robot = robot;

                    // Wait for meshes to load asynchronously
                    const setupMeshes = () => {
                        // Ensure proper geometry attributes first
                        let meshCount = 0;
                        robot.traverse((child) => {
                            if (child.isMesh) {
                                meshCount++;
                                console.log(`Found mesh: ${child.name}, type: ${child.type}, hasGeometry: ${!!child.geometry}`);
                                // Ensure proper geometry attributes
                                if (child.geometry) {
                                    if (!child.geometry.attributes.normal) {
                                        child.geometry.computeVertexNormals();
                                    }
                                    child.geometry.computeBoundingBox();
                                    child.geometry.computeBoundingSphere();
                                }
                                // Make sure mesh is visible and shadows enabled
                                child.visible = true;
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });
                        console.log(`Total meshes found: ${meshCount}, all configured for shadows`);
                        return meshCount;
                    };

                    // Try multiple times to find meshes (OBJs load asynchronously)
                    let attempts = 0;
                    const maxAttempts = 10;
                    const checkMeshes = () => {
                        const count = setupMeshes();
                        attempts++;
                        
                        if (count === 0 && attempts < maxAttempts) {
                            console.log(`No meshes found yet, retrying... (${attempts}/${maxAttempts})`);
                            setTimeout(checkMeshes, 200);
                        } else if (count > 0) {
                            console.log(`Successfully found ${count} meshes after ${attempts} attempts`);
                            this.finalizeMeshSetup();
                        } else {
                            console.warn(`No meshes found after ${maxAttempts} attempts`);
                            this.finalizeMeshSetup();
                        }
                    };
                    
                    checkMeshes();
                },
                (progressEvent) => {
                    // URDFLoader sometimes forwards null or events without progress metrics.
                    if (progressEvent && typeof progressEvent === 'object') {
                        const { loaded, total } = progressEvent;
                        if (typeof loaded === 'number' && typeof total === 'number' && total > 0) {
                            const percent = ((loaded / total) * 100).toFixed(2);
                            console.log(`Loading ${urdfPath}: ${percent}%`);
                        } else {
                            console.log(`Progress event for ${urdfPath}:`, progressEvent);
                        }
                    } else {
                        console.log(`Loading ${urdfPath}...`);
                    }
                },
                (error) => {
                    clearTimeout(loadTimeout);
                    console.error(`Error loading URDF from ${urdfPath}:`, error);
                    console.error('Error details:', error.stack || error);
                    reject(error);
                }
            );
        });
    }

    finalizeMeshSetup() {
        const robot = this.robot;
        if (!robot) return;

        // Apply blue-toned pastel colors per link (after geometry setup)
        this.colorizeLinks(robot);
        console.log('Colorize links completed');

        // Enable shadows on the root robot object
        robot.castShadow = true;
        robot.receiveShadow = true;

        this.scene.add(robot);
        console.log('Robot added to scene');

        // Ensure default shaded materials are visible before user interaction
        this.applyInitialMaterialState();
        console.log('Initial material state applied');

        // Double-check shadow settings after adding to scene
        let shadowMeshCount = 0;
        let visibleMeshCount = 0;
        robot.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.visible = true;  // Ensure visibility
                shadowMeshCount++;
                if (child.visible && child.material) {
                    visibleMeshCount++;
                }
            }
        });
        console.log(`Shadow enabled on ${shadowMeshCount} meshes, ${visibleMeshCount} visible meshes after scene add`);

        // Force an immediate render to show the model
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
            console.log('Forced initial render after model load');
        }

        // Store joint references
        this.extractJoints(robot);
        console.log(`Extracted ${Object.keys(this.joints).length} joints`);

        // Auto-fit camera with retry mechanism (based on reference implementation)
        let retryCount = 0;
        const maxRetries = 8;
        const retryInterval = 300; // ms

        const tryCenterView = () => {
            const testBox = new THREE.Box3().setFromObject(robot);
            const testSize = testBox.getSize(new THREE.Vector3());
            const maxDim = Math.max(testSize.x, testSize.y, testSize.z);

            if (maxDim > 0.001) {
                this.fitCameraToObject(robot);
                console.log(`Centered camera successfully after ${retryCount} retries`);

                // Force a render after successful positioning
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            } else if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Bounding box not ready (maxDim: ${maxDim}), retrying center... (${retryCount}/${maxRetries})`);
                setTimeout(tryCenterView, retryInterval);
            } else {
                console.warn('Max retries reached, centering anyway');
                this.fitCameraToObject(robot);

                // Force a render even if positioning failed
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            }
        };

        // Start the retry mechanism after a short delay
        setTimeout(tryCenterView, 200);
    }

    extractJoints(robot) {
        const traverse = (obj) => {
            if (obj.isURDFJoint && obj.jointType !== 'fixed') {
                this.joints[obj.name] = obj;
            }
            if (obj.children) {
                obj.children.forEach(child => traverse(child));
            }
        };
        traverse(robot);
    }

    // Apply distinct colors per URDF link for better part distinction
    colorizeLinks(root) {
        const phi = (Math.sqrt(5) - 1) / 2; // golden ratio conjugate ~0.618
        let idx = 0;

        // First collect all links in stable order
        const links = [];
        root.traverse((node) => {
            if (node.isURDFLink) links.push(node);
        });

        // Sort links by name for deterministic coloring
        links.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        // Generate distinct colors using golden ratio - bright and vibrant colors
        const colorForIndex = (i) => {
            const h = (i * phi) % 1; // Distribute across full hue range
            const s = 0.70; // Higher saturation for more vibrant, visible colors
            const l = 0.70; // Much brighter for clear visibility
            const c = new THREE.Color();
            c.setHSL(h, s, l);
            console.log(`Color ${i}: HSL(${h.toFixed(2)}, ${s}, ${l}) = RGB(${c.r.toFixed(2)}, ${c.g.toFixed(2)}, ${c.b.toFixed(2)})`);
            return c;
        };

        // Assign colors to links
        links.forEach((link) => {
            const c = colorForIndex(idx++);
            this.linkColors.set(link, c);
        });

        // Apply colors to meshes under each link
        root.traverse((node) => {
            if (!node.isMesh) return;

            const owner = this.findOwningLink(node);
            if (!owner) return;

            const color = this.linkColors.get(owner);
            if (!color) return;

            // Apply material with assigned color - using MeshPhongMaterial with bright reflections
            try {
                const emissiveColor = color.clone().multiplyScalar(0.1);
                const createMaterial = () => {
                    const mat = new THREE.MeshPhongMaterial({
                        color: color.clone(),
                        shininess: 60,           // Higher shininess for clear highlights
                        specular: 0x666666,      // Brighter specular for visible reflections
                        emissive: emissiveColor, // Slight emissive glow
                        flatShading: false,
                        transparent: false,
                        opacity: 1.0,
                        visible: true,
                        side: THREE.DoubleSide
                    });
                    console.log(`Created material - color: RGB(${color.r.toFixed(2)}, ${color.g.toFixed(2)}, ${color.b.toFixed(2)}), emissive: RGB(${emissiveColor.r.toFixed(2)}, ${emissiveColor.g.toFixed(2)}, ${emissiveColor.b.toFixed(2)})`);
                    return mat;
                };

                if (Array.isArray(node.material)) {
                    node.material = node.material.map(() => createMaterial());
                } else {
                    node.material = createMaterial();
                }
                node.material.needsUpdate = true;

                // Ensure mesh visibility and shadow properties
                node.visible = true;
                node.castShadow = true;
                node.receiveShadow = true;

                console.log(`Applied material to mesh: ${node.name}, owner: ${owner.name}`);
            } catch (e) {
                console.warn('Failed to apply material:', e);
            }
        });
    }

    toggleWireframe() {
        if (!this.robot) return;

        this.showWireframe = !this.showWireframe;
        this.updateMaterialsForWireframeState();
    }

    updateMaterialsForWireframeState(options = {}) {
        if (!this.robot) return;

        const { syncButton = true } = options;

        this.robot.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.wireframe = this.showWireframe;

                if (this.showWireframe) {
                    // Darker color for wireframe mode
                    child.material.wireframeLinewidth = 1.5;
                    if (child.material.color) {
                        child.material.color.set(0x3366CC);
                    }
                } else {
                    // Restore original link colors
                    const owner = this.findOwningLink(child);
                    if (owner && this.linkColors.has(owner) && child.material.color) {
                        const color = this.linkColors.get(owner);
                        child.material.color.copy(color);
                    }
                    child.material.wireframeLinewidth = 1.0;
                }

                child.material.needsUpdate = true;
            }
        });

        // Force a render so the updated materials appear immediately
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }

        if (syncButton) {
            this.updateWireframeButtonStyle();
        }
    }

    findOwningLink(node) {
        let current = node;
        while (current) {
            if (current.isURDFLink) {
                return current;
            }
            current = current.parent;
        }
        return null;
    }

    applyInitialMaterialState() {
        if (!this.robot) return;

        this.showWireframe = true;
        this.updateMaterialsForWireframeState({ syncButton: false });

        this.showWireframe = false;
        this.updateMaterialsForWireframeState({ syncButton: false });
    }

    updateWireframeButtonStyle() {
        if (!this.wireframeButton) return;
        this.wireframeButton.style.background = this.showWireframe ? '#2196F3' : '#4CAF50';
    }

    createJointControls() {
        const controlsContainer = document.querySelector(`#${this.controlsId} .joint-controls-container`);
        if (!controlsContainer) return;

        // Add wireframe toggle button
        const wireframeDiv = document.createElement('div');
        wireframeDiv.className = 'viewer-control-button';
        wireframeDiv.innerHTML = `
            <button class="wireframe-toggle" style="
                width: 100%;
                padding: 8px;
                margin-bottom: 15px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            ">📐 Toggle Wireframe</button>
        `;
        const wireframeBtn = wireframeDiv.querySelector('.wireframe-toggle');
        this.wireframeButton = wireframeBtn;
        this.updateWireframeButtonStyle();
        wireframeBtn.addEventListener('click', () => {
            this.toggleWireframe();
        });
        controlsContainer.appendChild(wireframeDiv);

        // Add joint controls
        Object.keys(this.joints).forEach((jointName, idx) => {
            const joint = this.joints[jointName];
            const min = joint.limit?.lower || -Math.PI;
            const max = joint.limit?.upper || Math.PI;

            const controlDiv = document.createElement('div');
            controlDiv.className = 'joint-control';
            controlDiv.innerHTML = `
                <label class="joint-label">${jointName}</label>
                <input type="range"
                       class="joint-slider"
                       min="${min}"
                       max="${max}"
                       step="0.01"
                       value="0"
                       data-joint="${jointName}">
                <span class="joint-value">0.00</span>
            `;

            const slider = controlDiv.querySelector('.joint-slider');
            const valueDisplay = controlDiv.querySelector('.joint-value');

            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                valueDisplay.textContent = value.toFixed(2);
                this.setJointAngle(jointName, value);
            });

            controlsContainer.appendChild(controlDiv);
        });
    }

    setJointAngle(jointName, angle) {
        const joint = this.joints[jointName];
        if (!joint) return;

        if (joint.jointType === 'revolute' || joint.jointType === 'continuous') {
            joint.setJointValue(angle);
        } else if (joint.jointType === 'prismatic') {
            joint.setJointValue(angle);
        }
    }

    fitCameraToObject(object) {
        if (!object) {
            console.warn('No object to fit camera to');
            return;
        }

        // Ensure matrix is updated
        object.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        console.log(`Fitting camera to object with size: ${size.x}, ${size.y}, ${size.z}`);
        console.log(`Object center: ${center.x}, ${center.y}, ${center.z}`);

        // Check for valid bounding box with small tolerance
        if (!isFinite(size.x) || !isFinite(size.y) || !isFinite(size.z) ||
            (size.x < 0.001 && size.y < 0.001 && size.z < 0.001)) {
            console.warn('Invalid bounding box, using default camera position');
            const defaultDistance = 5;
            this.camera.position.set(
                defaultDistance * 0.7,
                defaultDistance * 0.5,
                defaultDistance * 0.8
            );
            this.camera.lookAt(0, 0, 0);
            if (this.controls) {
                this.controls.target.set(0, 0, 0);
                this.controls.update();
            }
            return;
        }

        // Adaptive camera positioning (based on reference implementation)
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        const aspectRatio = this.camera.aspect;

        // Calculate distances for each dimension
        let distanceForHeight = size.y / (2 * Math.tan(fov / 2));
        let distanceForWidth = size.x / (2 * Math.tan(fov / 2) * aspectRatio);
        let distanceForDepth = size.z / (2 * Math.tan(fov / 2));

        // Choose optimal distance with buffer
        let optimalDistance = Math.max(distanceForHeight, distanceForWidth, distanceForDepth) * 1.5;

        // Adjust minimum distance based on object size
        if (maxDim < 0.5) {
            optimalDistance = Math.max(optimalDistance, maxDim * 3);
        } else if (maxDim < 2) {
            optimalDistance = Math.max(optimalDistance, maxDim * 2.5);
        } else {
            optimalDistance = Math.max(optimalDistance, maxDim * 2);
        }

        // Smart camera position based on object shape
        const isFlat = size.y < size.x * 0.3 && size.y < size.z * 0.3;
        const isTall = size.y > size.x * 2 && size.y > size.z * 2;
        const isWide = size.x > size.z * 2;
        const isDeep = size.z > size.x * 2;

        let cameraX, cameraY, cameraZ;

        if (isFlat) {
            // Flat objects - view from above
            const angle = Math.PI / 6;
            cameraX = center.x + optimalDistance * Math.sin(angle) * 0.7;
            cameraY = center.y + optimalDistance * 0.9;
            cameraZ = center.z + optimalDistance * Math.cos(angle) * 0.7;
        } else if (isTall) {
            // Tall objects - view from side
            const angle = Math.PI / 4;
            cameraX = center.x + optimalDistance * Math.cos(angle);
            cameraY = center.y + size.y * 0.2;
            cameraZ = center.z + optimalDistance * Math.sin(angle);
        } else {
            // Standard isometric view with slight adjustments
            const xRatio = 0.7 + (size.x / maxDim) * 0.2;
            const yRatio = 0.6 + (size.y / maxDim) * 0.4;
            const zRatio = 0.8 + (size.z / maxDim) * 0.2;

            cameraX = center.x + optimalDistance * xRatio;
            cameraY = center.y + optimalDistance * yRatio;
            cameraZ = center.z + optimalDistance * zRatio;
        }

        this.camera.position.set(cameraX, cameraY, cameraZ);
        this.camera.lookAt(center);

        // Update near/far planes
        this.camera.near = optimalDistance * 0.01;
        this.camera.far = optimalDistance * 100;
        this.camera.updateProjectionMatrix();

        if (this.controls) {
            this.controls.target.copy(center);
            this.controls.minDistance = optimalDistance * 0.3;
            this.controls.maxDistance = optimalDistance * 4;
            this.controls.update();
        }

        console.log(`Camera positioned - Distance: ${optimalDistance.toFixed(2)}, Shape: ${isFlat ? 'flat' : isTall ? 'tall' : isWide ? 'wide' : isDeep ? 'deep' : 'standard'}`);
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        // Ensure renderer exists
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        } else {
            console.warn(`Missing renderer components for ${this.canvasId}:`,
                        'renderer:', !!this.renderer,
                        'scene:', !!this.scene,
                        'camera:', !!this.camera);
        }
    }

    resize() {
        const container = document.getElementById(this.canvasId);
        const width = container.clientWidth;
        const height = container.clientHeight;

        if (width > 0 && height > 0) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }
    }

    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}
