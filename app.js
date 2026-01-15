// Material properties database
let scene, camera, renderer, controls, currentMesh;
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
    controls = new OrbitControls(camera, renderer.domElement);
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
    if (window.viewerControls) {
        window.viewerControls.update();
    }
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
    const loader = new STLLoader();
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
    if (window.viewerControls) {
        window.viewerControls.target.copy(center);
        window.viewerControls.update();
    }
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

// ============================================
// AI-Powered DfM Analysis (OpenRouter)
// ============================================

const PERPLEXITY_API_KEY = 'pplx-YOUR-API-KEY-HERE'; // Get from perplexity.ai/settings/api

async function analyzeWithAI(geometryData, material) {
    try {
        showLoadingState("Consulting AI for DfM analysis...");
        
        const prompt = `You are an expert manufacturing engineer analyzing a 3D CAD part for Design for Manufacturing (DfM).

**Part Specifications:**
- Material: ${material}
- Volume: ${geometryData.volume.toFixed(2)} mm³
- Surface Area: ${geometryData.surfaceArea.toFixed(2)} mm²
- Bounding Box: ${geometryData.boundingBox.x.toFixed(1)} × ${geometryData.boundingBox.y.toFixed(1)} × ${geometryData.boundingBox.z.toFixed(1)} mm
- Triangle Count: ${geometryData.triangleCount}
- Complexity Score: ${geometryData.complexityScore.toFixed(2)}

**Your Task:**
Provide a concise DfM analysis with:
1. **Manufacturing Method** - Recommended process (CNC machining, 3D printing, casting, etc.)
2. **Key Challenges** - 2-3 specific manufacturing concerns
3. **Cost Drivers** - What makes this part expensive or cheap to produce
4. **Design Improvements** - 3-5 actionable suggestions to reduce cost or improve manufacturability

Keep responses practical and specific to these measurements. Format as clear bullet points.`;

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-small-128k-online', // Free with Perplexity Pro!
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 800
            })
        });

        if (!response.ok) {
            throw new Error(`Perplexity API error: ${response.status}`);
        }

        const data = await response.json();
        const aiAnalysis = data.choices[0].message.content;
        
        return {
            success: true,
            analysis: aiAnalysis,
            model: 'Perplexity Sonar (Pro)',
            tokensUsed: data.usage?.total_tokens || 0
        };
        
    } catch (error) {
        console.error('AI Analysis Error:', error);
        return {
            success: false,
            error: error.message,
            fallback: generateFallbackSuggestions(geometryData, material)
        };
    }
}

function generateFallbackSuggestions(geometryData, material) {
    const suggestions = [];
    
    if (geometryData.complexityScore > 7) {
        suggestions.push("⚠️ High complexity detected - consider simplifying geometry");
    }
    if (geometryData.volume > 100000) {
        suggestions.push("📏 Large part - may require multi-axis machining");
    }
    if (geometryData.surfaceArea / geometryData.volume > 50) {
        suggestions.push("🔧 High surface-to-volume ratio - consider design consolidation");
    }
    
    return suggestions.length > 0 ? suggestions.join("\n") : "Standard manufacturing process recommended";
}

function showLoadingState(message) {
    const dfmSection = document.getElementById('dfm-suggestions');
    if (dfmSection) {
        dfmSection.innerHTML = `
            <div class="loading-ai">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

function displayAIAnalysis(result) {
    const dfmSection = document.getElementById('dfm-suggestions');
    
    if (result.success) {
        dfmSection.innerHTML = `
            <div class="ai-analysis">
                <div class="ai-header">
                    <span class="ai-badge">🤖 AI Analysis</span>
                    <span class="model-info">${result.model}</span>
                </div>
                <div class="ai-content">
                    ${formatAIResponse(result.analysis)}
                </div>
                <div class="ai-footer">
                    <small>Tokens used: ${result.tokensUsed} | Powered by Perplexity</small>
                </div>
            </div>
        `;
    } else {
        dfmSection.innerHTML = `
            <div class="ai-error">
                <h4>⚠️ AI Analysis Unavailable</h4>
                <p class="error-msg">${result.error}</p>
                <div class="fallback-content">
                    <h4>Basic Suggestions:</h4>
                    <p>${result.fallback}</p>
                </div>
            </div>
        `;
    }
}

function calculateCosts() {
    const materialType = document.getElementById('material').value;
    const material = MATERIALS[materialType];

    // Material cost calculation
    const volumeCm3 = geometryData.volume;
    const massKg = (volumeCm3 * material.density) / 1000;
    const materialCost = massKg * material.pricePerKg;

    // Machining time estimation
    const boundingVolume = geometryData.boundingBox.x * geometryData.boundingBox.y * geometryData.boundingBox.z / 1000;
    const materialRemovalRate = 50;
    const baseMachiningTime = (boundingVolume - volumeCm3) / materialRemovalRate;

    const complexityMultiplier = 1 + (geometryData.complexityScore / 10) * 0.5;
    const materialMultiplier = 1 / material.machinability;
    const machiningTime = baseMachiningTime * complexityMultiplier * materialMultiplier;

    const laborCost = (machiningTime / 60) * 60;
    const setupCost = 150;
    const setupCostPerUnit = setupCost / 100;
    const machineCost = (machiningTime / 60) * 80 / 100;
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

    // ✨ NEW: Call AI analysis instead of rule-based suggestions
    analyzeWithAI(geometryData, material.name).then(aiResult => {
        displayAIAnalysis(aiResult);
    });

    document.getElementById('loading').classList.remove('active');
    document.getElementById('results').classList.add('active');
}

// Call AI analysis instead of rule-based suggestions
analyzeWithAI(geometryData, material.name).then(aiResult => {
    displayAIAnalysis(aiResult);
});


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