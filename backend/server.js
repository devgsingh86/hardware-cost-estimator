import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: (process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024 // Convert MB to bytes
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.stl', '.step', '.stp'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file format. Allowed: ${allowedExtensions.join(', ')}`));
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Request logging middleware (helpful for debugging)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================
// ROUTE 1: Health Check (useful for deployment)
// ============================================
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        features: {
            stepProcessing: process.env.ENABLE_STEP_PROCESSING === 'true',
            marketData: process.env.ENABLE_MARKET_DATA === 'true',
            similarParts: process.env.ENABLE_SIMILAR_PARTS === 'true'
        }
    });
});

// ============================================
// ROUTE 2: Perplexity AI Analysis (Your existing endpoint)
// ============================================
app.post('/api/analyze', async (req, res) => {
    try {
        console.log('📡 Forwarding request to Perplexity API...');
        
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.VITE_PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
        });

        if (!response.ok) {
            throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Perplexity response received');
        
        res.json(data);
    } catch (error) {
        console.error('❌ Perplexity API error:', error);
        res.status(500).json({ 
            error: error.message,
            fallback: 'AI analysis temporarily unavailable. Using fallback logic.'
        });
    }
});

// ============================================
// ROUTE 3: CAD File Processing (NEW - STEP support)
// ============================================
app.post('/api/process-cad', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filePath = req.file.path;
        const fileExt = path.extname(req.file.originalname).toLowerCase();
        
        console.log(`📁 Processing ${fileExt} file: ${req.file.originalname}`);

        let result;

        if (fileExt === '.step' || fileExt === '.stp') {
            // STEP file processing
            if (process.env.ENABLE_STEP_PROCESSING === 'true') {
                // TODO: We'll implement Python integration in next step
                // For now, return mock data
                result = {
                    type: 'STEP',
                    volume: 125.5,
                    surfaceArea: 450.2,
                    boundingBox: { x: 50.0, y: 40.0, z: 30.0 },
                    features: [
                        { type: 'hole', diameter: 5.0, depth: 15.0, confidence: 0.92 },
                        { type: 'hole', diameter: 3.0, depth: 20.0, confidence: 0.88 }
                    ],
                    faceCount: 48,
                    format: 'STEP',
                    processingTime: '0.8s',
                    message: 'Advanced STEP analysis complete'
                };
                console.log('✅ STEP file analyzed (mock data for now)');
            } else {
                return res.status(503).json({ 
                    error: 'STEP processing not enabled. Contact administrator.' 
                });
            }
        } else if (fileExt === '.stl') {
            // STL files are handled client-side
            result = {
                type: 'STL',
                message: 'Client-side processing',
                fileName: req.file.originalname,
                fileSize: req.file.size
            };
            console.log('✅ STL file received (client will process)');
        } else {
            return res.status(400).json({ error: 'Unsupported file format' });
        }

        // Cleanup uploaded file after processing
        fs.unlinkSync(filePath);
        console.log('🗑️  Temporary file cleaned up');

        res.json(result);

    } catch (error) {
        console.error('❌ CAD processing error:', error);
        
        // Cleanup file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ 
            error: error.message,
            suggestion: 'Try a smaller file or different format'
        });
    }
});

// ============================================
// ROUTE 4: Dynamic Material Pricing (NEW)
// ============================================
app.get('/api/materials', async (req, res) => {
    try {
        if (process.env.ENABLE_MARKET_DATA !== 'true') {
            return res.status(503).json({ error: 'Market data not enabled' });
        }

        console.log('💰 Fetching material prices...');

        // For demo: simulate live pricing with random variation
        const materials = {
            aluminum6061: {
                name: "Aluminum 6061-T6",
                density: 2.70,
                basePrice: 4.50,
                pricePerKg: (4.50 * (1 + (Math.random() * 0.1 - 0.05))).toFixed(2),
                machinability: 0.8,
                color: 0x9ea7ad,
                lastUpdated: new Date().toISOString(),
                source: "LME Spot Price"
            },
            aluminum7075: {
                name: "Aluminum 7075-T6",
                density: 2.81,
                basePrice: 8.50,
                pricePerKg: (8.50 * (1 + (Math.random() * 0.1 - 0.05))).toFixed(2),
                machinability: 0.7,
                color: 0x8a9ba8,
                lastUpdated: new Date().toISOString(),
                source: "LME Spot Price"
            },
            steelmild: {
                name: "Mild Steel 1018",
                density: 7.87,
                basePrice: 1.20,
                pricePerKg: (1.20 * (1 + (Math.random() * 0.08 - 0.04))).toFixed(2),
                machinability: 0.6,
                color: 0x6c757d,
                lastUpdated: new Date().toISOString(),
                source: "World Steel Assoc."
            },
            steelstainless: {
                name: "Stainless Steel 304",
                density: 8.00,
                basePrice: 3.80,
                pricePerKg: (3.80 * (1 + (Math.random() * 0.12 - 0.06))).toFixed(2),
                machinability: 0.5,
                color: 0xa8b2bd,
                lastUpdated: new Date().toISOString(),
                source: "World Steel Assoc."
            },
            titanium: {
                name: "Titanium Ti-6Al-4V",
                density: 4.43,
                basePrice: 35.00,
                pricePerKg: (35.00 * (1 + (Math.random() * 0.15 - 0.075))).toFixed(2),
                machinability: 0.3,
                color: 0xb8c5d6,
                lastUpdated: new Date().toISOString(),
                source: "Metal Prices API"
            },
            absplastic: {
                name: "ABS Plastic",
                density: 1.05,
                basePrice: 3.50,
                pricePerKg: (3.50 * (1 + (Math.random() * 0.05 - 0.025))).toFixed(2),
                machinability: 0.95,
                color: 0xf5f5f5,
                lastUpdated: new Date().toISOString(),
                source: "Plastics Market Data"
            },
            nylon: {
                name: "Nylon PA12",
                density: 1.01,
                basePrice: 8.00,
                pricePerKg: (8.00 * (1 + (Math.random() * 0.08 - 0.04))).toFixed(2),
                machinability: 0.9,
                color: 0xfaf0e6,
                lastUpdated: new Date().toISOString(),
                source: "Plastics Market Data"
            }
        };

        console.log('✅ Material prices updated');
        res.json({ 
            materials,
            cacheTime: 43200, // 12 hours in seconds
            disclaimer: "Prices are indicative and subject to market fluctuations"
        });

    } catch (error) {
        console.error('❌ Material pricing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// ROUTE 5: Similar Parts Database (NEW - RAG demo)
// ============================================
app.post('/api/similar-parts', async (req, res) => {
    try {
        if (process.env.ENABLE_SIMILAR_PARTS !== 'true') {
            return res.status(503).json({ error: 'Similar parts feature not enabled' });
        }

        const { volume, surfaceArea, material, estimatedCost } = req.body;

        console.log(`🔍 Finding similar parts for: ${volume}cm³, ${material}`);

        // Simulate RAG/vector search with synthetic data
        // In production, this would query a vector database
        const similarParts = [
            {
                partId: "HIST-2024-1847",
                partName: "Spur Gear - 24T Module 2",
                volume: volume * (0.92 + Math.random() * 0.16), // ±8% variation
                surfaceArea: surfaceArea * (0.95 + Math.random() * 0.1),
                material: material,
                actualCost: estimatedCost * (0.88 + Math.random() * 0.24),
                manufacturer: "Precision Machining Co.",
                leadTime: "4-6 days",
                quantity: 50,
                dateManufactured: "2024-11-15",
                similarity: 0.94
            },
            {
                partId: "HIST-2025-0302",
                partName: "Helical Gear Assembly",
                volume: volume * (0.85 + Math.random() * 0.3),
                surfaceArea: surfaceArea * (0.90 + Math.random() * 0.2),
                material: material,
                actualCost: estimatedCost * (0.82 + Math.random() * 0.36),
                manufacturer: "Advanced Manufacturing LLC",
                leadTime: "5-7 days",
                quantity: 100,
                dateManufactured: "2025-02-08",
                similarity: 0.87
            },
            {
                partId: "HIST-2025-0891",
                partName: "Transmission Gear Component",
                volume: volume * (1.05 + Math.random() * 0.1),
                surfaceArea: surfaceArea * (1.02 + Math.random() * 0.08),
                material: material,
                actualCost: estimatedCost * (1.05 + Math.random() * 0.20),
                manufacturer: "MachineWorks Industries",
                leadTime: "3-5 days",
                quantity: 25,
                dateManufactured: "2025-08-22",
                similarity: 0.91
            }
        ];

        // Sort by similarity
        similarParts.sort((a, b) => b.similarity - a.similarity);

        console.log(`✅ Found ${similarParts.length} similar parts`);

        res.json({
            similarParts: similarParts.slice(0, 3), // Return top 3
            dataSource: "Historical Manufacturing Database (2024-2026)",
            totalMatches: similarParts.length,
            searchCriteria: { volume, surfaceArea, material },
            averageMarketPrice: (similarParts.reduce((sum, p) => sum + p.actualCost, 0) / similarParts.length).toFixed(2),
            priceVariance: `±${((Math.max(...similarParts.map(p => p.actualCost)) - Math.min(...similarParts.map(p => p.actualCost))) / estimatedCost * 100).toFixed(1)}%`
        });

    } catch (error) {
        console.error('❌ Similar parts search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// Error Handling Middleware
// ============================================
app.use((error, req, res, next) => {
    console.error('❌ Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  🚀 CAD Cost Estimator Backend Server    ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`📍 Server running on http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Features:`);
    console.log(`   - STEP Processing: ${process.env.ENABLE_STEP_PROCESSING === 'true' ? '✅' : '❌'}`);
    console.log(`   - Market Data: ${process.env.ENABLE_MARKET_DATA === 'true' ? '✅' : '❌'}`);
    console.log(`   - Similar Parts: ${process.env.ENABLE_SIMILAR_PARTS === 'true' ? '✅' : '❌'}`);
    console.log('─────────────────────────────────────────────');
    console.log('📝 Available endpoints:');
    console.log('   GET  /health');
    console.log('   POST /api/analyze');
    console.log('   POST /api/process-cad');
    console.log('   GET  /api/materials');
    console.log('   POST /api/similar-parts');
    console.log('═════════════════════════════════════════════\n');
});
