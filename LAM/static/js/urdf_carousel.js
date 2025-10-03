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
                            <div class="viewer-canvas" id="viewer-${idx}"></div>
                            <div class="viewer-info">
                                <h4>${data.name}</h4>
                                <p>${data.description || ''}</p>
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
    }

    async load() {
        this.initThreeJS();
        await this.loadURDF();
        this.setupLighting();
        this.createJointControls();
        this.animate();
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
        this.scene.background = new THREE.Color(0xf0f0f0);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
        this.camera.position.set(2, 2, 2);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Controls
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.target.set(0, 0, 0);
            this.controls.update();
        }

        // Don't add grid or axes helpers for cleaner look

        // Resize handler
        window.addEventListener('resize', () => this.resize());
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Additional lights
        const light2 = new THREE.DirectionalLight(0xffffff, 0.3);
        light2.position.set(-5, 10, -7.5);
        this.scene.add(light2);
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
                        onComplete,
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

                    // Apply light blue materials to meshes (matching reference implementation)
                    robot.traverse((child) => {
                        if (child.isMesh) {
                            // Replace material with a light blue phong material
                            child.material = new THREE.MeshPhongMaterial({
                                color: 0x87CEEB,  // Light blue color
                                shininess: 30,
                                specular: 0x444444
                            });
                            // Ensure proper geometry attributes
                            if (!child.geometry.attributes.normal) {
                                child.geometry.computeVertexNormals();
                            }
                            // Make sure mesh is visible
                            child.visible = true;
                            child.castShadow = true;
                            child.receiveShadow = true;
                            console.log(`Mesh found: ${child.name}, vertices: ${child.geometry.attributes.position?.count}`);
                        }
                    });

                    this.scene.add(robot);

                    // Store joint references
                    this.extractJoints(robot);
                    console.log(`Extracted ${Object.keys(this.joints).length} joints`);

                    // Auto-fit camera
                    this.fitCameraToObject(robot);

                    // Force a render
                    if (this.renderer && this.scene && this.camera) {
                        this.renderer.render(this.scene, this.camera);
                    }

                    resolve();
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

    createJointControls() {
        const controlsContainer = document.querySelector(`#${this.controlsId} .joint-controls-container`);
        if (!controlsContainer) return;

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
