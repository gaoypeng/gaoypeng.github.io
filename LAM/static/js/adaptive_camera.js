/**
 * 自适应相机定位系统
 * 根据物体的bounding box自动调整相机位置
 */

function setupAdaptiveCamera(camera, object, controls) {
    if (!object) return null;

    // 确保矩阵更新
    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // 检查无效的bounding box，但给一个很小的容差
    if (!isFinite(size.x) || !isFinite(size.y) || !isFinite(size.z) ||
        (size.x < 0.001 && size.y < 0.001 && size.z < 0.001)) {
        console.log('Small or invalid bounding box detected, using default view');
        // 使用默认相机位置
        const defaultDistance = 5;
        camera.position.set(
            defaultDistance * 0.7,
            defaultDistance * 0.5,
            defaultDistance * 0.8
        );
        camera.lookAt(0, 0, 0);
        if (controls) {
            controls.target.set(0, 0, 0);
            controls.update();
        }
        // 返回一个默认结果而不是null
        return {
            center: new THREE.Vector3(0, 0, 0),
            distance: defaultDistance,
            size: new THREE.Vector3(1, 1, 1),
            shapeType: 'default'
        };
    }

    // 自适应相机距离计算
    const maxDim = Math.max(size.x, size.y, size.z);

    // 基于FOV计算最佳距离
    const fov = camera.fov * (Math.PI / 180);
    const aspectRatio = camera.aspect;

    // 计算需要的距离以适应整个物体
    let distanceForHeight = size.y / (2 * Math.tan(fov / 2));
    let distanceForWidth = size.x / (2 * Math.tan(fov / 2) * aspectRatio);
    let distanceForDepth = size.z / (2 * Math.tan(fov / 2));

    // 选择最大距离并添加缓冲
    let optimalDistance = Math.max(distanceForHeight, distanceForWidth, distanceForDepth) * 1.5;

    // 根据物体大小调整最小距离
    if (maxDim < 0.5) {
        optimalDistance = Math.max(optimalDistance, maxDim * 3);
    } else if (maxDim < 2) {
        optimalDistance = Math.max(optimalDistance, maxDim * 2.5);
    } else {
        optimalDistance = Math.max(optimalDistance, maxDim * 2);
    }

    // 智能相机位置选择
    let cameraX, cameraY, cameraZ;

    // 根据物体的形状特征选择最佳视角
    const isFlat = size.y < size.x * 0.3 && size.y < size.z * 0.3;
    const isTall = size.y > size.x * 2 && size.y > size.z * 2;
    const isWide = size.x > size.z * 2;
    const isDeep = size.z > size.x * 2;

    if (isFlat) {
        // 扁平物体，从上方观察
        const angle = Math.PI / 6; // 30度
        cameraX = center.x + optimalDistance * Math.sin(angle) * 0.7;
        cameraY = center.y + optimalDistance * 0.9;
        cameraZ = center.z + optimalDistance * Math.cos(angle) * 0.7;
    } else if (isTall) {
        // 高物体，从侧面稍高处观察
        const angle = Math.PI / 4; // 45度
        cameraX = center.x + optimalDistance * Math.cos(angle);
        cameraY = center.y + size.y * 0.2; // 稍微偏上
        cameraZ = center.z + optimalDistance * Math.sin(angle);
    } else if (isWide) {
        // 宽物体，从前方稍侧面观察
        cameraX = center.x + size.x * 0.1;
        cameraY = center.y + optimalDistance * 0.5;
        cameraZ = center.z + optimalDistance * 0.9;
    } else if (isDeep) {
        // 深物体，从侧面观察
        cameraX = center.x + optimalDistance * 0.9;
        cameraY = center.y + optimalDistance * 0.5;
        cameraZ = center.z + size.z * 0.1;
    } else {
        // 标准等轴测视角，但根据物体比例微调
        const xRatio = 0.7 + (size.x / maxDim) * 0.2;
        const yRatio = 0.6 + (size.y / maxDim) * 0.4;
        const zRatio = 0.8 + (size.z / maxDim) * 0.2;

        cameraX = center.x + optimalDistance * xRatio;
        cameraY = center.y + optimalDistance * yRatio;
        cameraZ = center.z + optimalDistance * zRatio;
    }

    // 设置相机位置
    camera.position.set(cameraX, cameraY, cameraZ);

    // 更新相机的近远裁剪平面
    camera.near = optimalDistance * 0.01;
    camera.far = optimalDistance * 100;
    camera.updateProjectionMatrix();

    if (controls) {
        controls.target.copy(center);
        // 根据物体大小自适应调整控制范围
        controls.minDistance = optimalDistance * 0.3;
        controls.maxDistance = optimalDistance * 4;
        controls.update();
    }

    console.log(`Adaptive Camera Setup - Bounds: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
    console.log(`Distance: ${optimalDistance.toFixed(2)}, Shape: ${isFlat ? 'flat' : isTall ? 'tall' : isWide ? 'wide' : isDeep ? 'deep' : 'standard'}`);

    return {
        center: center,
        distance: optimalDistance,
        size: size,
        shapeType: isFlat ? 'flat' : isTall ? 'tall' : isWide ? 'wide' : isDeep ? 'deep' : 'standard'
    };
}

// 简化版本，用于没有controls的场景
function getAdaptiveCameraPosition(object, camera) {
    if (!object) return null;

    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const aspectRatio = camera.aspect;

    // 计算最佳距离
    let distanceForHeight = size.y / (2 * Math.tan(fov / 2));
    let distanceForWidth = size.x / (2 * Math.tan(fov / 2) * aspectRatio);
    let optimalDistance = Math.max(distanceForHeight, distanceForWidth) * 1.5;

    // 调整最小距离
    if (maxDim < 0.5) {
        optimalDistance = Math.max(optimalDistance, maxDim * 3);
    } else if (maxDim < 2) {
        optimalDistance = Math.max(optimalDistance, maxDim * 2.5);
    } else {
        optimalDistance = Math.max(optimalDistance, maxDim * 2);
    }

    return {
        center: center,
        distance: optimalDistance,
        position: new THREE.Vector3(
            center.x + optimalDistance * 0.7,
            center.y + optimalDistance * 0.6,
            center.z + optimalDistance * 0.8
        )
    };
}

// 导出函数供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        setupAdaptiveCamera,
        getAdaptiveCameraPosition
    };
}