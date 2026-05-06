const express = require("express");
const multer = require("multer");
const path = require("path");
const { cloudinary } = require("../config/cloudinary");
const { verifyBillingToken } = require("../middleware/billingAuth");
const NodeCache = require('node-cache');

const router = express.Router();

// Initialize cache with 1 hour TTL
const fileCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper: Get cached files or fetch from Cloudinary
async function getCachedFiles(companyId, type) {
  const cacheKey = `${companyId}_${type}`;
  let files = fileCache.get(cacheKey);
  
  if (!files) {
    try {
      let result;
      
      if (type === 'signatures') {
        // Fetch images
        result = await cloudinary.api.resources({
          type: 'upload',
          prefix: `billing/${companyId}/${type}`,
          resource_type: 'image',
          max_results: 100
        });
        
        files = result.resources.map(resource => ({
          name: resource.public_id.split('/').pop(),
          publicId: resource.public_id,
          url: resource.secure_url,
          size: resource.bytes,
          format: resource.format,
          createdAt: resource.created_at,
          thumbnail: resource.secure_url
        }));
      } else {
        // Fetch raw files (templates)
        result = await cloudinary.api.resources({
          type: 'upload',
          prefix: `billing/${companyId}/${type}`,
          resource_type: 'raw',
          max_results: 100
        });
        
        files = result.resources.map(resource => {
          // Get the full filename from public_id
          let fullPublicId = resource.public_id;
          let filename = fullPublicId.split('/').pop();
          
          // If filename doesn't have extension, try to get from format or original filename
          if (filename && !filename.includes('.')) {
            const ext = resource.format || '';
            if (ext) {
              filename = `${filename}.${ext}`;
            }
          }
          
          return {
            name: filename,
            publicId: resource.public_id,
            url: resource.secure_url,
            size: resource.bytes,
            format: resource.format || path.extname(filename).substring(1),
            createdAt: resource.created_at,
            originalName: resource.original_filename || filename
          };
        });
      }
      
      // Cache the result
      fileCache.set(cacheKey, files);
    } catch (error) {
      console.error(`Error fetching ${type} from Cloudinary:`, error);
      files = [];
    }
  }
  
  return files;
}

// POST: Upload signature
router.post("/signature", verifyBillingToken, upload.single('signature'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    
    // Check file size
    if (req.file.size > 3 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Signature image must be under 3 MB" });
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: "Only image files are allowed (PNG, JPG, JPEG, BMP, GIF)" });
    }
    
    // Clean filename
    const originalName = req.file.originalname;
    const baseName = path.basename(originalName, path.extname(originalName));
    const cleanName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    const ext = path.extname(originalName);
    const publicId = `${cleanName}${ext}`;
    
    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `billing/${req.companyId}/signatures`,
          resource_type: "image",
          public_id: publicId,
          overwrite: true,
          transformation: [{ width: 500, height: 500, crop: "limit" }]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(req.file.buffer);
    });
    
    // Invalidate cache
    const cacheKey = `${req.companyId}_signatures`;
    fileCache.del(cacheKey);
    
    res.json({
      success: true,
      message: "Signature uploaded successfully",
      file: {
        filename: publicId,
        url: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST: Upload template (preserve file extension)
router.post("/template", verifyBillingToken, upload.single('template'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Template file must be under 10 MB" });
    }
    
    const allowedExts = ['.docx', '.xlsx', '.xls', '.doc', '.pdf'];
    const originalName = req.file.originalname;
    const ext = path.extname(originalName).toLowerCase();
    
    if (!allowedExts.includes(ext)) {
      return res.status(400).json({ success: false, message: "Only .docx, .xlsx, .xls, .doc, .pdf files are allowed" });
    }
    
    // Clean filename: remove spaces and special characters, keep extension
    const baseName = path.basename(originalName, ext);
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    const publicId = `${cleanBaseName}${ext}`;
    
    console.log("Uploading template:", originalName);
    console.log("Public ID:", publicId);
    
    // Upload to Cloudinary as raw file
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `billing/${req.companyId}/templates`,
          resource_type: "raw",
          public_id: publicId,
          overwrite: true,
          invalidate: true
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });
    
    console.log("Template uploaded successfully:", result.public_id);
    
    // Invalidate cache
    const cacheKey = `${req.companyId}_templates`;
    fileCache.del(cacheKey);
    
    res.json({
      success: true,
      message: "Template uploaded successfully",
      file: {
        filename: publicId,
        originalName: originalName,
        url: result.secure_url,
        publicId: result.public_id
      }
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET: List all files for company (with caching)
router.get("/list", verifyBillingToken, async (req, res) => {
  try {
    const companyId = req.companyId;
    console.log("Fetching files for company:", companyId);
    
    // Get signatures (images)
    const signatures = await getCachedFiles(companyId, 'signatures');
    
    // Get templates (raw files)
    const templates = await getCachedFiles(companyId, 'templates');
    
    console.log(`Found ${signatures.length} signatures and ${templates.length} templates`);
    
    res.json({
      success: true,
      signatures,
      templates,
      cached: fileCache.get(`${companyId}_signatures`) ? true : false
    });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE: Delete a file from Cloudinary
router.delete("/:type/:filename", verifyBillingToken, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const companyId = req.companyId;
    
    // Decode filename (in case it has special characters)
    const decodedFilename = decodeURIComponent(filename);
    const publicId = `billing/${companyId}/${type}/${decodedFilename}`;
    const resourceType = type === 'signatures' ? 'image' : 'raw';
    
    console.log(`Deleting file: ${publicId} (${resourceType})`);
    
    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    if (result.result !== 'ok') {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    
    // Invalidate cache
    const cacheKey = `${companyId}_${type}`;
    fileCache.del(cacheKey);
    
    res.json({
      success: true,
      message: "File deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST: Refresh cache (force reload from Cloudinary)
router.post("/refresh-cache", verifyBillingToken, async (req, res) => {
  try {
    const companyId = req.companyId;
    const cacheKeySignatures = `${companyId}_signatures`;
    const cacheKeyTemplates = `${companyId}_templates`;
    
    fileCache.del(cacheKeySignatures);
    fileCache.del(cacheKeyTemplates);
    
    // Reload fresh data
    await getCachedFiles(companyId, 'signatures');
    await getCachedFiles(companyId, 'templates');
    
    res.json({
      success: true,
      message: "Cache refreshed successfully"
    });
  } catch (error) {
    console.error("Error refreshing cache:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET: Get file URL for quick access (cached)
router.get("/url/:type/:filename", verifyBillingToken, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const companyId = req.companyId;
    
    const decodedFilename = decodeURIComponent(filename);
    const files = await getCachedFiles(companyId, type);
    const file = files.find(f => f.name === decodedFilename);
    
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    
    res.json({
      success: true,
      url: file.url,
      publicId: file.publicId
    });
  } catch (error) {
    console.error("Error getting file URL:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET: Serve file directly
router.get("/serve/:type/:filename", verifyBillingToken, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const companyId = req.companyId;
    
    const decodedFilename = decodeURIComponent(filename);
    const files = await getCachedFiles(companyId, type);
    const file = files.find(f => f.name === decodedFilename);
    
    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }
    
    // Redirect to Cloudinary URL
    res.redirect(file.url);
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;