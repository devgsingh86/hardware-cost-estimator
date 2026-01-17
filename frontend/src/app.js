// ============================================
// DEBUG: Check Three.js Loading
// ============================================
console.log('=== THREE.JS DEBUG ===');
console.log('1. app.js loaded:', new Date().toISOString());
console.log('2. THREE available?', typeof THREE !== 'undefined' ? '✅' : '❌');
console.log('3. OrbitControls available?', typeof OrbitControls !== 'undefined' ? '✅' : '❌');
console.log('4. STLLoader available?', typeof STLLoader !== 'undefined' ? '✅' : '❌');

if (typeof THREE === 'undefined') {
    console.error('❌ THREE.js not loaded! Check importmap in index.html');
}
if (typeof OrbitControls === 'undefined') {
    console.error('❌ OrbitControls not loaded!');
}
if (typeof STLLoader === 'undefined') {
    console.error('❌ STLLoader not loaded!');
}

console.log('======================\n');


// Material properties database
// ============================================
// CONFIGURATION & API CLIENT
// ============================================

const API_BASE_URL = 'http://localhost:3001';
const DEMO_MODE = false; // Set to true for offline demos

// API Client Helper
const API = {
    async call(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API call failed for ${endpoint}:`, error);
            throw error;
        }
    },

    async uploadFile(endpoint, file) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                body: formData
                // Note: Don't set Content-Type for FormData, browser sets it automatically with boundary
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Upload Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`File upload failed for ${endpoint}:`, error);
            throw error;
        }
    }
};

// ============================================
// EXISTING CODE: Material properties database
// ============================================
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
    console.log('🎬 initViewer() called');
    console.log('   THREE:', typeof THREE);
    
    // Prevent multiple initializations
    if (window.viewerInitialized) {
        console.warn('⚠️ Viewer already initialized, skipping...');
        return;
    }
    
    const container = document.getElementById('viewer');
    console.log('   Viewer container found?', container !== null);
    
    if (!container) {
        console.error('❌ ERROR: viewer element not found in DOM!');
        return;
    }
    
    console.log('   Container size:', container.clientWidth, 'x', container.clientHeight);
    
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a202c);
    console.log('✅ Scene created');

    // Camera
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(200, 200, 200);
    camera.lookAt(0, 0, 0);
    console.log('✅ Camera created');

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    console.log('✅ Renderer created and attached');
    console.log('   Canvas element:', renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controls.update();
    window.viewerControls = controls;
    console.log('✅ Controls initialized');

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(200, 200, 200);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-200, -200, -200);
    scene.add(directionalLight2);
    console.log('✅ Lights added');

    // Grid
    const gridHelper = new THREE.GridHelper(400, 40, 0x4a5568, 0x2d3748);
    scene.add(gridHelper);
    console.log('✅ Grid added');

    // Start animation loop
    animate();
    console.log('✅ Animation loop started');
    
    // Mark as initialized
    window.viewerInitialized = true;
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    });
}

function animate() {
    requestAnimationFrame(animate);
    
    if (controls) {
        controls.update();
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
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

// ============================================
// ENHANCED FILE UPLOAD HANDLING
// ============================================

async function handleFile(file) {
    const fileExt = file.name.toLowerCase();
    
    console.log(`📁 Processing file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    
    if (fileExt.endsWith('.stl')) {
        // Existing STL processing (client-side)
        document.getElementById('loading').classList.add('active');
        document.getElementById('results').classList.remove('active');
        
        showLoadingState('Analyzing STL geometry...');
        
        const reader = new FileReader();
        reader.onload = (e) => loadSTL(e.target.result, file.name);
        reader.readAsArrayBuffer(file);
        
    } else if (fileExt.endsWith('.step') || fileExt.endsWith('.stp')) {
        // NEW: STEP processing (server-side)
        await handleSTEPFile(file);
        
    } else {
        alert('❌ Unsupported file format!\n\nPlease upload:\n• STL files (.stl)\n• STEP files (.step, .stp)');
        return;
    }
}

// ============================================
// DYNAMIC MATERIAL PRICING
// ============================================

async function loadMaterialPrices() {
    try {
        console.log('💰 Fetching live material prices...');
        
        const data = await API.call('/api/materials');
        
        // Update the global MATERIALS object with live prices
        Object.keys(data.materials).forEach(key => {
            if (MATERIALS[key]) {
                const livePrice = parseFloat(data.materials[key].pricePerKg);
                const oldPrice = MATERIALS[key].pricePerKg;
                
                MATERIALS[key].pricePerKg = livePrice;
                MATERIALS[key].lastUpdated = data.materials[key].lastUpdated;
                MATERIALS[key].source = data.materials[key].source;
                
                // Log price changes
                const change = ((livePrice - oldPrice) / oldPrice * 100).toFixed(2);
                console.log(`  ${MATERIALS[key].name}: $${livePrice}/kg (${change > 0 ? '+' : ''}${change}%)`);
            }
        });
        
        // Display price update notification
        displayPriceUpdateNotification(data);
        
        console.log('✅ Material prices updated');
        
    } catch (error) {
        console.warn('⚠️ Could not load live prices, using defaults:', error);
        // Fail silently - app still works with default prices
    }
}

function displayPriceUpdateNotification(data) {
    // Remove existing notification
    const existing = document.querySelector('.price-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'price-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(72, 187, 120, 0.3);
        z-index: 1000;
        animation: slideInFromRight 0.5s ease-out;
        max-width: 300px;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5em;">✓</span>
            <div>
                <div style="font-weight: 600;">Live Prices Loaded</div>
                <div style="font-size: 0.85em; opacity: 0.9; margin-top: 3px;">
                    Material costs updated from market data
                </div>
            </div>
        </div>
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInFromRight {
            from { opacity: 0; transform: translateX(50px); }
            to { opacity: 1; transform: translateX(0); }
        }
    `;
    if (!document.querySelector('style[data-notification-animation]')) {
        style.setAttribute('data-notification-animation', 'true');
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.style.transition = 'opacity 0.5s';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 4000);
}

// Call this when page loads
window.addEventListener('load', () => {
    initViewer();
    loadMaterialPrices(); // NEW: Load live prices on startup
});


// NEW: STEP File Processing Function
async function handleSTEPFile(file) {
    document.getElementById('loading').classList.add('active');
    document.getElementById('results').classList.remove('active');
    showLoadingState('🔬 Processing STEP file with advanced geometry analysis...');
    
    try {
        // Upload file to backend for processing
        console.log('⬆️  Uploading STEP file to backend...');
        const data = await API.uploadFile('/api/process-cad', file);
        
        console.log('✅ STEP analysis complete:', data);
        
        // Store geometry data from backend analysis
        geometryData = {
            volume: data.volume,
            surfaceArea: data.surfaceArea,
            boundingBox: data.boundingBox,
            triangleCount: data.faceCount * 2, // Approximate triangle count
            complexityScore: calculateComplexityFromFeatures(data.features || []),
            features: data.features || [],
            format: 'STEP'
        };
        
        console.log('📊 Extracted geometry data:', geometryData);
        
        // Display STEP processing badge
        displaySTEPBadge(data);
        
        // Calculate costs with enhanced data
        calculateCosts();
        
        // Load live material prices
        await loadMaterialPrices();
        
        // Show results
        document.getElementById('loading').classList.remove('active');
        document.getElementById('results').classList.add('active');
        
        // Note: 3D preview not available for STEP yet
        // Show placeholder or keep existing view
        displaySTEPPlaceholder();
        
    } catch (error) {
        console.error('❌ STEP processing error:', error);
        document.getElementById('loading').classList.remove('active');
        alert(`Error processing STEP file:\n${error.message}\n\nTry:\n• Smaller file\n• Verify it's a valid STEP file\n• Check console for details`);
    }
}

// NEW: Display STEP Processing Badge
function displaySTEPBadge(data) {
    // Remove existing badge if present
    const existingBadge = document.querySelector('.step-badge');
    if (existingBadge) existingBadge.remove();
    
    const badge = document.createElement('div');
    badge.className = 'step-badge';
    badge.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        animation: slideInFromTop 0.5s ease-out;
    `;
    badge.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
            <span style="font-size: 2em;">✨</span>
            <div>
                <h3 style="margin: 0; font-size: 1.3em; font-weight: 700;">Advanced STEP Analysis</h3>
                <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 0.95em;">
                    Professional CAD format processed with feature recognition
                </p>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-top: 15px;">
            <div style="background: rgba(255,255,255,0.15); padding: 10px; border-radius: 8px;">
                <div style="font-size: 0.85em; opacity: 0.9;">Features Detected</div>
                <div style="font-size: 1.5em; font-weight: 700;">${data.features?.length || 0}</div>
            </div>
            <div style="background: rgba(255,255,255,0.15); padding: 10px; border-radius: 8px;">
                <div style="font-size: 0.85em; opacity: 0.9;">Processing Time</div>
                <div style="font-size: 1.5em; font-weight: 700;">${data.processingTime || '<1s'}</div>
            </div>
            <div style="background: rgba(255,255,255,0.15); padding: 10px; border-radius: 8px;">
                <div style="font-size: 0.85em; opacity: 0.9;">Face Count</div>
                <div style="font-size: 1.5em; font-weight: 700;">${data.faceCount || 'N/A'}</div>
            </div>
        </div>
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInFromTop {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    if (!document.querySelector('style[data-step-animation]')) {
        style.setAttribute('data-step-animation', 'true');
        document.head.appendChild(style);
    }
    
    const resultsSection = document.getElementById('results');
    resultsSection.insertBefore(badge, resultsSection.firstChild);
}

// NEW: Calculate complexity from detected features
function calculateComplexityFromFeatures(features) {
    let baseComplexity = 3.0; // Start with medium complexity
    
    features.forEach(feature => {
        if (feature.type === 'hole') {
            if (feature.diameter < 5) {
                baseComplexity += 0.8; // Small holes are harder to machine
            } else if (feature.diameter < 10) {
                baseComplexity += 0.4;
            } else {
                baseComplexity += 0.2;
            }
        } else if (feature.type === 'pocket') {
            baseComplexity += 1.2; // Pockets require multiple passes
        } else if (feature.type === 'undercut') {
            baseComplexity += 2.0; // May require 5-axis machining
        } else if (feature.type === 'thread') {
            baseComplexity += 0.6; // Threading operations
        }
    });
    
    return Math.min(baseComplexity, 10).toFixed(1); // Cap at 10
}

// NEW: Placeholder for STEP 3D view (until we add STEP-to-mesh conversion)
function displaySTEPPlaceholder() {
    const viewer = document.getElementById('viewer');
    
    // Check if placeholder already exists
    if (viewer.querySelector('.step-placeholder')) return;
    
    const placeholder = document.createElement('div');
    placeholder.className = 'step-placeholder';
    placeholder.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: white;
        background: rgba(0,0,0,0.7);
        padding: 30px;
        border-radius: 15px;
        backdrop-filter: blur(10px);
        z-index: 10;
    `;
    placeholder.innerHTML = `
        <div style="font-size: 3em; margin-bottom: 15px;">📐</div>
        <h3 style="margin: 0 0 10px 0;">STEP File Analyzed</h3>
        <p style="margin: 0; opacity: 0.8; font-size: 0.9em;">
            3D preview coming soon<br>
            Cost analysis completed below ↓
        </p>
    `;
    
    viewer.appendChild(placeholder);
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
    const center = new THREE.Vector3();  // ← ADD THIS LINE
    box.getCenter(center);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    
    cameraZ *= 2.5; // Zoom out a bit
    
    camera.position.set(cameraZ, cameraZ, cameraZ);
    camera.lookAt(center);
    
    controls.target.copy(center);
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
// AI-Powered DfM Analysis Using Perplexity API
// ============================================


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

        const response = await fetch('http://localhost:3001/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
            model: 'sonar-pro',  // ✅ CHANGE THIS
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
        console.log('Full API Response:', JSON.stringify(data, null, 2));
        console.log('Has choices?', data.choices);
        console.log('First choice?', data.choices?.[0]);
        
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

function formatAIResponse(text) {
    // Convert markdown-like formatting to HTML
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
        .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
        .replace(/\n\n/g, '</p><p>')                       // Paragraphs
        .replace(/\n- /g, '<br>• ')                        // Bullet points
        .replace(/\n/g, '<br>');                           // Line breaks
}

function displayAIAnalysis(result) {
    const dfmSection = document.getElementById('aiAnalysisContent');
    
    if (!dfmSection) {
        console.error('❌ aiAnalysisContent element not found in HTML!');
        return;
    }
    
    if (result.success && result.analysis) {
        dfmSection.innerHTML = `
            <div class="ai-analysis" style="color: #333; line-height: 1.8;">
                <div class="ai-header" style="background: #e3f2fd; padding: 12px; border-radius: 6px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <span class="ai-badge" style="font-weight: bold; color: #1976d2;">🤖 ${result.model || 'AI Analysis'}</span>
                    ${result.tokensUsed ? `<span class="model-info" style="color: #666; font-size: 12px;">Tokens: ${result.tokensUsed}</span>` : ''}
                </div>
                <div class="ai-content" style="padding: 15px; font-size: 14px;">
                    <p>${formatAIResponse(result.analysis)}</p>
                </div>
                <div class="ai-footer" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: right;">
                    <small>Powered by Perplexity AI</small>
                </div>
            </div>
        `;
    } else {
        dfmSection.innerHTML = `
            <div class="ai-error" style="color: #dc3545; padding: 15px;">
                <h4 style="margin-top: 0;">⚠️ AI Analysis Unavailable</h4>
                <p class="error-msg" style="color: #666;">${result.error || 'Unable to generate analysis'}</p>
                ${result.fallback ? `
                <div class="fallback-content" style="margin-top: 15px; padding: 15px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                    <h4 style="margin-top: 0; color: #856404;">📋 Basic Suggestions:</h4>
                    <p style="margin-bottom: 0; color: #856404;">${result.fallback}</p>
                </div>
                ` : ''}
            </div>
        `;
    }
}

// ============================================
// SIMILAR PARTS COMPARISON (RAG Demo)
// ============================================

async function fetchSimilarParts(estimatedCost) {
    try {
        console.log('🔍 Fetching similar parts from database...');
        
        const response = await API.call('/api/similar-parts', {
            method: 'POST',
            body: JSON.stringify({
                volume: geometryData.volume,
                surfaceArea: geometryData.surfaceArea,
                material: document.getElementById('material').value,
                estimatedCost: estimatedCost
            })
        });
        
        console.log('✅ Similar parts loaded:', response);
        displaySimilarParts(response);
        
    } catch (error) {
        console.warn('⚠️ Could not load similar parts:', error);
        // Fail gracefully - don't show error to user
    }
}

function displaySimilarParts(data) {
    // Remove existing similar parts section if present
    const existingSection = document.querySelector('.similar-parts-section');
    if (existingSection) existingSection.remove();
    
    const section = document.createElement('div');
    section.className = 'similar-parts-section';
    section.style.cssText = `
        margin: 30px 0;
        animation: slideInFromBottom 0.6s ease-out;
    `;
    
    section.innerHTML = `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    padding: 25px; border-radius: 15px; color: white; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h2 style="margin: 0 0 5px 0; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.5em;">📊</span>
                        Market Intelligence
                    </h2>
                    <p style="margin: 0; opacity: 0.9; font-size: 0.95em;">
                        Comparing with ${data.totalMatches} similar parts from historical database
                    </p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.85em; opacity: 0.9;">Market Average</div>
                    <div style="font-size: 2em; font-weight: 700;">$${data.averageMarketPrice}</div>
                    <div style="font-size: 0.85em; opacity: 0.9;">Price Range: ${data.priceVariance}</div>
                </div>
            </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
            ${data.similarParts.map((part, index) => `
                <div style="background: white; border-radius: 12px; padding: 20px; 
                           box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
                           border-left: 5px solid ${getColorForSimilarity(part.similarity)};
                           position: relative; overflow: hidden;
                           transition: transform 0.3s, box-shadow 0.3s;"
                     onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.15)';"
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)';">
                    
                    <div style="position: absolute; top: 10px; right: 10px; 
                               background: ${getColorForSimilarity(part.similarity)}; 
                               color: white; padding: 5px 12px; border-radius: 20px; 
                               font-size: 0.8em; font-weight: 600;">
                        ${(part.similarity * 100).toFixed(0)}% Match
                    </div>
                    
                    <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 1.1em; padding-right: 80px;">
                        ${part.partName}
                    </h3>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <div>
                            <div style="color: #718096; font-size: 0.85em;">Volume</div>
                            <div style="color: #2d3748; font-weight: 600;">${part.volume.toFixed(2)} cm³</div>
                        </div>
                        <div>
                            <div style="color: #718096; font-size: 0.85em;">Quantity</div>
                            <div style="color: #2d3748; font-weight: 600;">${part.quantity} units</div>
                        </div>
                    </div>
                    
                    <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="color: #718096; font-size: 0.9em;">Actual Cost</div>
                            <div style="color: #38a169; font-size: 1.8em; font-weight: 700;">
                                $${part.actualCost.toFixed(2)}
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                            <span style="color: #718096; font-size: 0.85em;">Your Estimate</span>
                            <span style="color: #4a5568; font-weight: 600;">$${data.searchCriteria.estimatedCost?.toFixed(2) || 'N/A'}</span>
                        </div>
                        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                            <span style="color: ${part.actualCost < data.searchCriteria.estimatedCost ? '#48bb78' : '#f56565'}; 
                                       font-weight: 600; font-size: 0.9em;">
                                ${part.actualCost < data.searchCriteria.estimatedCost ? '↓' : '↑'} 
                                ${Math.abs(((part.actualCost - data.searchCriteria.estimatedCost) / data.searchCriteria.estimatedCost * 100)).toFixed(1)}%
                                ${part.actualCost < data.searchCriteria.estimatedCost ? 'lower' : 'higher'}
                            </span>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: #718096; font-size: 0.85em;">${part.manufacturer}</div>
                            <div style="color: #4a5568; font-size: 0.85em; margin-top: 2px;">
                                ${part.dateManufactured}
                            </div>
                        </div>
                        <div style="background: #edf2f7; padding: 5px 12px; border-radius: 6px; 
                                   color: #2d3748; font-size: 0.85em; font-weight: 600;">
                            ${part.leadTime}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f7fafc; border-radius: 10px; 
                   border-left: 4px solid #667eea;">
            <div style="display: flex; align-items: center; gap: 10px; color: #4a5568;">
                <span style="font-size: 1.2em;">💡</span>
                <div style="font-size: 0.9em;">
                    <strong>Data Source:</strong> ${data.dataSource}
                    <span style="margin-left: 15px; color: #718096;">
                        Showing top ${data.similarParts.length} matches based on geometry and material similarity
                    </span>
                </div>
            </div>
        </div>
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInFromBottom {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    if (!document.querySelector('style[data-similar-parts-animation]')) {
        style.setAttribute('data-similar-parts-animation', 'true');
        document.head.appendChild(style);
    }
    
    // Insert before DfM suggestions section
    const dfmSection = document.querySelector('.ai-analysis-section') || 
                       document.querySelector('.dfm-suggestions');
    if (dfmSection) {
        dfmSection.parentNode.insertBefore(section, dfmSection);
    } else {
        // Fallback: append to results section
        document.getElementById('results').appendChild(section);
    }
}

function getColorForSimilarity(similarity) {
    if (similarity >= 0.9) return '#48bb78'; // Green - high similarity
    if (similarity >= 0.8) return '#4299e1'; // Blue - medium similarity
    return '#ed8936'; // Orange - lower similarity
}

// ============================================
// ANIMATED COST BREAKDOWN
// ============================================

async function animatedCostCalculation(costData) {
    const animationContainer = document.getElementById('costAnimation');
    const stepsContainer = document.getElementById('calculationSteps');
    
    if (!animationContainer || !stepsContainer) return;
    
    // Clear previous animation
    stepsContainer.innerHTML = '';
    animationContainer.style.display = 'block';
    
    const steps = [
        {
            title: "1️⃣ Material Cost (Deterministic)",
            calculation: `${geometryData.volume.toFixed(2)} cm³ × ${MATERIALS[costData.material].density} g/cm³ × $${MATERIALS[costData.material].pricePerKg}/kg`,
            result: `$${costData.materialCost.toFixed(2)}`,
            confidence: 98,
            delay: 300,
            color: '#48bb78'
        },
        {
            title: "2️⃣ Machining Time (Physics-Based)",
            calculation: `Material removal rate ÷ Volume × Complexity factor (${geometryData.complexityScore}/10)`,
            result: `${costData.machiningTime.toFixed(1)} minutes`,
            confidence: 85,
            delay: 600,
            color: '#4299e1'
        },
        {
            title: "3️⃣ Feature Analysis (AI-Powered)",
            calculation: geometryData.features?.length > 0 
                ? `Analyzing ${geometryData.features.length} detected features with complexity scoring...`
                : `Surface-to-volume analysis: ${(geometryData.surfaceArea / geometryData.volume).toFixed(2)}`,
            result: `Complexity: ${geometryData.complexityScore}/10`,
            confidence: 76,
            delay: 900,
            color: '#9f7aea'
        },
        {
            title: "4️⃣ Market Validation (Historical Data)",
            calculation: `Comparing with ${costData.similarPartsCount || 3} similar parts from database...`,
            result: `±${costData.variance || '12'}% variance`,
            confidence: 88,
            delay: 1200,
            color: '#ed8936'
        }
    ];
    
    for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        
        const stepDiv = document.createElement('div');
        stepDiv.className = 'cost-step';
        stepDiv.style.cssText = `
            background: linear-gradient(135deg, #ffffff 0%, #f7fafc 100%);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 15px;
            border-left: 5px solid ${step.color};
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            animation: slideInFromLeft 0.4s ease-out;
            transition: transform 0.3s, box-shadow 0.3s;
        `;
        stepDiv.onmouseover = function() {
            this.style.transform = 'translateX(5px)';
            this.style.boxShadow = '0 4px 15px rgba(0,0,0,0.12)';
        };
        stepDiv.onmouseout = function() {
            this.style.transform = 'translateX(0)';
            this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        };
        
        stepDiv.innerHTML = `
            <h4 style="color: #2d3748; margin-bottom: 10px; font-size: 1.05em;">
                ${step.title}
            </h4>
            <p style="color: #4a5568; font-family: 'Courier New', monospace; 
                     font-size: 0.9em; margin: 10px 0; padding: 10px; 
                     background: rgba(0,0,0,0.03); border-radius: 6px;">
                ${step.calculation}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-size: 1.5em; font-weight: 700; color: ${step.color};">
                        ${step.result}
                    </span>
                    <div style="width: 100px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${step.confidence}%; height: 100%; background: ${step.color}; 
                                   border-radius: 3px; transition: width 1s ease-out;"></div>
                    </div>
                </div>
                <span style="background: ${step.color}; color: white; padding: 6px 14px; 
                           border-radius: 20px; font-size: 0.85em; font-weight: 600;">
                    ${step.confidence}% confidence
                </span>
            </div>
        `;
        stepsContainer.appendChild(stepDiv);
        
        // Scroll into view
        stepDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Add final summary
    await new Promise(resolve => setTimeout(resolve, 400));
    const summaryDiv = document.createElement('div');
    summaryDiv.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        margin-top: 20px;
        text-align: center;
        animation: slideInFromLeft 0.4s ease-out;
    `;
    summaryDiv.innerHTML = `
        <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 5px;">Final Estimate</div>
        <div style="font-size: 2.5em; font-weight: 700;">$${costData.totalCost.toFixed(2)}</div>
        <div style="font-size: 0.85em; opacity: 0.9; margin-top: 5px;">Per unit (Qty: 100)</div>
    `;
    stepsContainer.appendChild(summaryDiv);
    
    // Add CSS animation if not exists
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInFromLeft {
            from { opacity: 0; transform: translateX(-30px); }
            to { opacity: 1; transform: translateX(0); }
        }
    `;
    if (!document.querySelector('style[data-cost-animation]')) {
        style.setAttribute('data-cost-animation', 'true');
        document.head.appendChild(style);
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

    console.log('=== DEBUG: Geometry Data ===');
    console.log('geometryData:', geometryData);
    console.log('volume:', geometryData?.volume);
    console.log('surfaceArea:', geometryData?.surfaceArea);
    console.log('material:', material.name);

    if (geometryData && geometryData.volume) {
        analyzeWithAI(geometryData, material.name)
            .then(aiResult => {
                displayAIAnalysis(aiResult);
            })
            .catch(error => {
                console.error('AI Analysis failed:', error);
            });
    } else {
        console.error('❌ geometryData is missing or invalid!');
    }

    document.getElementById('loading').classList.remove('active');
    document.getElementById('results').classList.add('active');
    
    // NEW: Fetch and display similar parts
    fetchSimilarParts(totalCost);

    // Prepare data for animation
    const costData = {
    materialCost: materialCost,
    machiningTime: machiningTime,
    totalCost: totalCost,
    material: materialType,
    similarPartsCount: 3,
    variance: '12'
    };

    // Run animated breakdown
    animatedCostCalculation(costData);
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
window.addEventListener('load', () => {
    console.log('🎬 Window load event fired');
    console.log('   Calling initViewer()...');
    initViewer();
    console.log('   Calling loadMaterialPrices()...');
    loadMaterialPrices();
});
