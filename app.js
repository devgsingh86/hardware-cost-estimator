// Material properties database
const MATERIALS = {
    aluminum_6061: {
        name: 'Aluminum 6061-T6',
        density: 2.70, // g/cm³
        pricePerKg: 4.50,
        machinability: 0.8, // easier to machine = lower multiplier
        color: 0x9ea7ad
    },
    aluminum_7075: {
        name: 'Aluminum 7075-T6',
        density: 2.81,
        pricePerKg: 8.50,
        machinability: 0.7,
        color: 0x8a9ba8
    },
    steel_mild: {
        name: 'Mild Steel 1018',
        density: 7.87,
        pricePerKg: 1.20,
        machinability: 0.6,
        color: 0x6c757d
    },
    steel_stainless: {
        name: 'Stainless Steel 304',
        density: 8.00,
        pricePerKg: 3.80,
        machinability: 0.5,
        color: 0xa8b2bd
    },
    titanium: {
        name: 'Titanium Ti-6Al-4V',
        density: 4.43,
        pricePerKg: 35.00,
        machinability: 0.3,
        color: 0xb8c5d6
    },
    abs_plastic: {
        name: 'ABS Plastic',
        density: 1.05,
        pricePerKg: 3.50,
        machinability: 0.95,
        color: 0xf5f5f5
    },
    nylon: {
        name: 'Nylon PA12',
        density: 1.01,
        pricePerKg: 8.00,
        machinability: 0.9,
        color: 0xfaf0e6
    }
};

// Three.js scene setup
let scene, camera, renderer, controls, currentMesh;
let geometryData = {};

function initViewer() {
    const container = document.getElementById('viewer');
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a202c);

    // Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(200, 200, 200);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(200, 200, 200);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-200, -200, -200);
    scene.add(directionalLight2);

    // Grid
    const gridHelper = new THREE.GridHelper(400, 40, 0x4a5568, 0x2d3748);
    scene.add(gridHelper);

    // Animation loop
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// File upload handling
const uploadSection = document.getElementById('uploadSection');
const fileInput = document.getElementById('fileInput');

uploadSection.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadSection.classList.add('dragover');
});

uploadSection.addEventListener('dragleave', () => {
    uploadSection.classList.remove('dragover');
});

uploadSection.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.stl')) {
        alert('Please upload an STL file');
        return;
    }

    document.getElementById('loading').classList.add('active');
    document.getElementById('results').classList.remove('active');

    const reader = new FileReader();
    reader.onload = function(e) {
        loadSTL(e.target.result);
    };
    reader.readAsArrayBuffer(file);
}

function loadSTL(arrayBuffer) {
    // Remove existing mesh
    if (currentMesh) {
        scene.remove(currentMesh);
    }

    // Load STL
    const loader = new THREE.STLLoader();
    const geometry = loader.parse(arrayBuffer);

    // Get material color
    const materialType = document.getElementById('material').value;
    const materialColor = MATERIALS[materialType].color;

    // Create mesh
    const material = new THREE.MeshStandardMaterial({
        color: materialColor,
        metalness: 0.6,
        roughness: 0.4,
        flatShading: false
    });

    currentMesh = new THREE.Mesh(geometry, material);
    currentMesh.castShadow = true;
    currentMesh.receiveShadow = true;

    // Center the mesh
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox.getCenter(center);
    currentMesh.position.sub(center);

    scene.add(currentMesh);

    // Fit camera to object
    fitCameraToObject(currentMesh);

    // Analyze geometry
    analyzeGeometry(geometry);
}

function fitCameraToObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 2.5;

    camera.position.set(cameraZ, cameraZ, cameraZ);
    camera.lookAt(0, 0, 0);
    controls.target.set(0, 0, 0);
    controls.update();
}

function analyzeGeometry(geometry) {
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();

    const bbox = geometry.boundingBox;
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Calculate volume using mesh-based method
    const vertices = geometry.attributes.position.array;
    let volume = 0;

    for (let i = 0; i < vertices.length; i += 9) {
        const v1 = new THREE.Vector3(vertices[i], vertices[i+1], vertices[i+2]);
        const v2 = new THREE.Vector3(vertices[i+3], vertices[i+4], vertices[i+5]);
        const v3 = new THREE.Vector3(vertices[i+6], vertices[i+7], vertices[i+8]);

        // Signed volume of tetrahedron
        volume += v1.dot(v2.cross(v3)) / 6.0;
    }

    volume = Math.abs(volume) / 1000; // Convert to cm³

    // Calculate surface area
    let surfaceArea = 0;
    for (let i = 0; i < vertices.length; i += 9) {
        const v1 = new THREE.Vector3(vertices[i], vertices[i+1], vertices[i+2]);
        const v2 = new THREE.Vector3(vertices[i+3], vertices[i+4], vertices[i+5]);
        const v3 = new THREE.Vector3(vertices[i+6], vertices[i+7], vertices[i+8]);

        const edge1 = v2.clone().sub(v1);
        const edge2 = v3.clone().sub(v1);
        const cross = edge1.cross(edge2);
        surfaceArea += cross.length() / 2.0;
    }

    surfaceArea = surfaceArea / 100; // Convert to cm²

    const triangleCount = vertices.length / 9;

    // Calculate complexity based on various factors
    const surfaceToVolumeRatio = surfaceArea / Math.pow(volume, 2/3);
    const normalizedTriangleCount = Math.min(triangleCount / 10000, 1);
    const aspectRatio = Math.max(size.x, size.y, size.z) / Math.min(size.x, size.y, size.z);

    const complexityScore = Math.min(
        (surfaceToVolumeRatio / 6 * 0.4 + 
         normalizedTriangleCount * 0.3 + 
         (aspectRatio / 10) * 0.3) * 10,
        10
    ).toFixed(1);

    geometryData = {
        volume: volume,
        surfaceArea: surfaceArea,
        boundingBox: size,
        triangleCount: triangleCount,
        complexityScore: parseFloat(complexityScore)
    };

    calculateCosts();
}

function calculateCosts() {
    const materialType = document.getElementById('material').value;
    const material = MATERIALS[materialType];

    // Material cost calculation
    const volumeCm3 = geometryData.volume;
    const massKg = (volumeCm3 * material.density) / 1000;
    const materialCost = massKg * material.pricePerKg;

    // Machining time estimation (simplified model)
    const boundingVolume = geometryData.boundingBox.x * geometryData.boundingBox.y * geometryData.boundingBox.z / 1000; // cm³
    const materialRemovalRate = 50; // cm³/min (typical for CNC)
    const baseMachiningTime = (boundingVolume - volumeCm3) / materialRemovalRate;

    // Adjust for complexity and material
    const complexityMultiplier = 1 + (geometryData.complexityScore / 10) * 0.5;
    const materialMultiplier = 1 / material.machinability;
    const machiningTime = baseMachiningTime * complexityMultiplier * materialMultiplier;

    // Labor cost ($60/hour for CNC machining)
    const laborCost = (machiningTime / 60) * 60;

    // Setup cost (fixed per batch)
    const setupCost = 150;
    const setupCostPerUnit = setupCost / 100; // Assuming batch of 100

    // Machine cost ($80/hour)
    const machineCost = (machiningTime / 60) * 80 / 100;

    // Total cost
    const totalCost = materialCost + laborCost / 100 + setupCostPerUnit + machineCost;

    // Update UI
    document.getElementById('totalCost').textContent = `$${totalCost.toFixed(2)}`;
    document.getElementById('materialCost').textContent = `$${materialCost.toFixed(2)}`;
    document.getElementById('machiningTime').textContent = machiningTime.toFixed(1);
    document.getElementById('complexityScore').textContent = geometryData.complexityScore;

    document.getElementById('volume').textContent = `${volumeCm3.toFixed(2)} cm³`;
    document.getElementById('surfaceArea').textContent = `${geometryData.surfaceArea.toFixed(2)} cm²`;
    document.getElementById('boundingBox').textContent = 
        `${geometryData.boundingBox.x.toFixed(1)}×${geometryData.boundingBox.y.toFixed(1)}×${geometryData.boundingBox.z.toFixed(1)} mm`;
    document.getElementById('triangleCount').textContent = geometryData.triangleCount.toLocaleString();
    document.getElementById('selectedMaterial').textContent = material.name;
    document.getElementById('weight').textContent = `${(massKg * 1000).toFixed(2)} g`;

    // Generate DfM suggestions
    generateDfMSuggestions(geometryData, material, totalCost);

    document.getElementById('loading').classList.remove('active');
    document.getElementById('results').classList.add('active');
}

function generateDfMSuggestions(geometry, material, currentCost) {
    const suggestions = [];

    // Rule-based DfM suggestions
    if (geometry.complexityScore > 7) {
        suggestions.push({
            title: 'Reduce Geometric Complexity',
            description: `Your part has a complexity score of ${geometry.complexityScore}/10, indicating intricate features that increase machining time. Consider simplifying curves, reducing the number of surfaces, or using standard geometries where possible.`,
            impact: 'high',
            savings: `Potential savings: $${(currentCost * 0.15).toFixed(2)} - $${(currentCost * 0.25).toFixed(2)} per unit`
        });
    }

    const aspectRatio = Math.max(geometry.boundingBox.x, geometry.boundingBox.y, geometry.boundingBox.z) / 
                       Math.min(geometry.boundingBox.x, geometry.boundingBox.y, geometry.boundingBox.z);

    if (aspectRatio > 5) {
        suggestions.push({
            title: 'High Aspect Ratio Detected',
            description: `The part has an aspect ratio of ${aspectRatio.toFixed(1)}:1, which may cause deflection during machining and require specialized tooling or multiple setups. Consider redesigning to reduce the length-to-width ratio.`,
            impact: 'medium',
            savings: `Potential savings: $${(currentCost * 0.10).toFixed(2)} - $${(currentCost * 0.15).toFixed(2)} per unit`
        });
    }

    if (material.machinability < 0.6) {
        suggestions.push({
            title: 'Consider Alternative Materials',
            description: `${material.name} has lower machinability, increasing tool wear and cycle time. If mechanical properties allow, switching to Aluminum 6061 or Mild Steel could reduce costs by 20-40% while maintaining similar strength-to-weight ratios.`,
            impact: 'high',
            savings: `Potential savings: $${(currentCost * 0.20).toFixed(2)} - $${(currentCost * 0.40).toFixed(2)} per unit`
        });
    }

    const surfaceToVolumeRatio = geometry.surfaceArea / Math.pow(geometry.volume, 2/3);
    if (surfaceToVolumeRatio > 8) {
        suggestions.push({
            title: 'High Surface-to-Volume Ratio',
            description: `Excessive surface area relative to volume suggests thin walls or numerous pockets, leading to longer finish machining times. Consolidate features or increase wall thickness where structurally acceptable.`,
            impact: 'medium',
            savings: `Potential savings: $${(currentCost * 0.08).toFixed(2)} - $${(currentCost * 0.12).toFixed(2)} per unit`
        });
    }

    if (geometry.triangleCount > 50000) {
        suggestions.push({
            title: 'Optimize CAD Model Resolution',
            description: `High triangle count (${geometry.triangleCount.toLocaleString()}) may indicate over-tessellation. Export STL files with appropriate tolerance settings to reduce file size without compromising critical dimensions.`,
            impact: 'low',
            savings: `Better processing efficiency and reduced CAM programming time`
        });
    }

    // Standard DfM best practices
    suggestions.push({
        title: 'Specify Standard Tolerances',
        description: `Unless critical for function, use standard tolerances (±0.125mm for general features). Tight tolerances (±0.025mm or finer) can double machining costs due to required precision equipment and inspection.`,
        impact: 'high',
        savings: `Potential savings: $${(currentCost * 0.15).toFixed(2)} - $${(currentCost * 0.30).toFixed(2)} per unit`
    });

    suggestions.push({
        title: 'Design for Standard Tooling',
        description: `Use standard drill sizes, thread pitches, and fillet radii to avoid custom tooling. Standard end mills (3mm, 6mm, 12mm) and drills significantly reduce setup time and tooling costs.`,
        impact: 'medium',
        savings: `Potential savings: $${(currentCost * 0.05).toFixed(2)} - $${(currentCost * 0.10).toFixed(2)} per unit`
    });

    // Display suggestions
    const container = document.getElementById('suggestionsContainer');
    container.innerHTML = '';

    suggestions.forEach((suggestion, index) => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.innerHTML = `
            <div class="suggestion-header">
                <div class="suggestion-title">${index + 1}. ${suggestion.title}</div>
                <span class="impact-badge impact-${suggestion.impact}">
                    ${suggestion.impact.toUpperCase()} IMPACT
                </span>
            </div>
            <div class="suggestion-desc">${suggestion.description}</div>
            <div class="suggestion-savings">💰 ${suggestion.savings}</div>
        `;
        container.appendChild(div);
    });
}

// Material change handler
document.getElementById('material').addEventListener('change', () => {
    if (currentMesh) {
        const materialType = document.getElementById('material').value;
        currentMesh.material.color.setHex(MATERIALS[materialType].color);

        if (geometryData.volume) {
            calculateCosts();
        }
    }
});

// Initialize viewer on load
window.addEventListener('load', () => {
    initViewer();
});

// Handle window resize
window.addEventListener('resize', () => {
    const container = document.getElementById('viewer');
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});