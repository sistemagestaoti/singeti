const sharp = require('sharp');
const fs = require('fs');

async function extractLogo() {
  const imgPath = 'C:/Users/Dlamb/.gemini/antigravity/brain/7d754a88-17fd-4e83-8540-63abbe6206e4/.user_uploaded/media_1791544311065_522f2797.jpg';
  const metadata = await sharp(imgPath).metadata();
  console.log('Image dimensions:', metadata.width, metadata.height);

  // The logo is in the top center. The image is a square (likely 1024x1024 or 1000x1000).
  // Let's crop a rectangle from the top half.
  
  const width = metadata.width;
  const height = metadata.height;

  await sharp(imgPath)
    .extract({ left: Math.floor(width * 0.1), top: Math.floor(height * 0.05), width: Math.floor(width * 0.8), height: Math.floor(height * 0.4) })
    .toFile('C:/SISTEMA INT. GESTAO TI/public/branding/extracted-logo.jpg');
    
  console.log('Extracted to extracted-logo.jpg');
  
  // Also extract just the S icon from the top left of the bottom right panel
  // Actually let's just extract the logo.
}

extractLogo().catch(console.error);
