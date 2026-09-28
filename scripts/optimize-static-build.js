#!/usr/bin/env node

/**
 * Script para optimizar la carpeta 'out' después del build estático
 * Comprime archivos CSS, JS y HTML para reducir tamaño
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'out');

function compressFile(filePath) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath);
    const gzipPath = `${filePath}.gz`;

    zlib.gzip(fileContent, (err, compressed) => {
      if (err) {
        console.error(`Error compressing ${filePath}:`, err);
        reject(err);
      } else {
        fs.writeFileSync(gzipPath, compressed);
        const originalSize = fileContent.length;
        const compressedSize = compressed.length;
        const percentage = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        console.log(
          `✓ Compressed ${path.relative(OUT_DIR, filePath)} (${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB, ${percentage}% reduction)`
        );
        resolve();
      }
    });
  });
}

async function optimizeStaticBuild() {
  console.log('🚀 Optimizing static build in:', OUT_DIR);
  console.log('');

  if (!fs.existsSync(OUT_DIR)) {
    console.error('❌ Error: out directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  const filesToCompress = [];

  // Find all compressible files
  function findFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        findFiles(filePath);
      } else if (
        /\.(js|css|html|json|svg)$/.test(file) &&
        file.indexOf('.gz') === -1 &&
        file.indexOf('.woff') === -1
      ) {
        filesToCompress.push(filePath);
      }
    });
  }

  findFiles(OUT_DIR);

  console.log(`Found ${filesToCompress.length} files to compress\n`);

  // Compress all files
  for (const file of filesToCompress) {
    await compressFile(file);
  }

  // Calculate total size
  const totalSize = filesToCompress.reduce(
    (sum, file) => sum + fs.statSync(file).size,
    0
  );
  const totalCompressed = filesToCompress.reduce(
    (sum, file) => {
      const gzipPath = `${file}.gz`;
      if (fs.existsSync(gzipPath)) {
        return sum + fs.statSync(gzipPath).size;
      }
      return sum;
    },
    0
  );

  console.log('');
  console.log('✅ Optimization complete!');
  console.log(`📊 Total original size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`📊 Total compressed size: ${(totalCompressed / 1024 / 1024).toFixed(2)}MB`);
  console.log(
    `📊 Total reduction: ${((1 - totalCompressed / totalSize) * 100).toFixed(1)}%`
  );
  console.log('');
  console.log('💡 Tip: Configure your web server to serve .gz files for gzip content-encoding');
}

optimizeStaticBuild().catch((err) => {
  console.error('❌ Error during optimization:', err);
  process.exit(1);
});
