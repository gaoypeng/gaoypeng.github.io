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

    init() {
        this.createCarouselStructure();
        this.loadAllViewers();
        this.setupNavigation();
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
            const viewer = new URDFViewer(`viewer-${i}`, `controls-${i}`, this.urdfDataList[i]);
            this.viewers.push(viewer);
            await viewer.load();
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
        const width = container.clientWidth || 400;
        const height = container.clientHeight || 400;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
        this.camera.position.set(2, 2, 2);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        // Controls
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
        }

        // Grid helper
        const gridHelper = new THREE.GridHelper(10, 10);
        this.scene.add(gridHelper);

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
            // Check for URDFLoader in multiple possible locations
            const URDFLoaderClass = THREE.URDFLoader || window.URDFLoader;

            if (typeof URDFLoaderClass === 'undefined') {
                console.error('URDFLoader not available. THREE:', THREE);
                console.error('window.URDFLoader:', window.URDFLoader);
                reject(new Error('URDFLoader not available'));
                return;
            }

            const loader = new URDFLoaderClass();
            const urdfPath = this.urdfData.urdfPath;

            loader.load(
                urdfPath,
                (robot) => {
                    this.robot = robot;
                    this.scene.add(robot);

                    // Store joint references
                    this.extractJoints(robot);

                    // Auto-fit camera
                    this.fitCameraToObject(robot);

                    resolve();
                },
                (xhr) => {
                    console.log(`Loading ${urdfPath}: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
                },
                (error) => {
                    console.error('Error loading URDF:', error);
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
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

        cameraZ *= 1.5; // Add some margin

        this.camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
        this.camera.lookAt(center);

        if (this.controls) {
            this.controls.target.copy(center);
            this.controls.update();
        }
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        if (this.controls) {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
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
