// Photo Storage Module - Save photos as separate files
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, 'uploads', 'photos');

// Ensure uploads directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    console.log('✅ Uploads directory ready:', UPLOADS_DIR);
  } catch (err) {
    console.error('Error creating uploads dir:', err);
  }
}

// Save photo to file system
async function savePhoto(email, base64Photo) {
  try {
    if (!base64Photo || !base64Photo.startsWith('data:image')) {
      throw new Error('Invalid photo data');
    }

    // Extract base64 data
    const matches = base64Photo.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 format');
    }

    const extension = matches[1]; // jpg, png, etc
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    // Generate unique filename: email_timestamp.ext
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(email).digest('hex').substring(0, 8);
    const filename = `${hash}_${timestamp}.${extension}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    // Save file
    await fs.writeFile(filepath, buffer);
    console.log('✅ Photo saved:', filename);

    // Return relative URL path
    return `/uploads/photos/${filename}`;
  } catch (err) {
    console.error('Error saving photo:', err);
    throw err;
  }
}

// Get photo URL for user
function getPhotoUrl(filename) {
  if (!filename) return '';
  // Return full URL or relative path
  return filename.startsWith('/uploads') ? filename : `/uploads/photos/${filename}`;
}

// Delete old photo
async function deletePhoto(photoPath) {
  try {
    if (!photoPath) return;
    
    const filename = path.basename(photoPath);
    const filepath = path.join(UPLOADS_DIR, filename);
    
    await fs.unlink(filepath);
    console.log('✅ Old photo deleted:', filename);
  } catch (err) {
    // Ignore if file doesn't exist
    if (err.code !== 'ENOENT') {
      console.error('Error deleting photo:', err);
    }
  }
}

module.exports = {
  ensureUploadDir,
  savePhoto,
  getPhotoUrl,
  deletePhoto
};
