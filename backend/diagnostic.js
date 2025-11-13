// diagnostic.js - Place this in backend folder and run: node diagnostic.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🔍 Smart Eye System Diagnostic\n');
console.log('='.repeat(60));

// Check 1: Node.js version
console.log('\n📦 Node.js Version:');
console.log(`   ${process.version}`);

// Check 2: Project structure
console.log('\n📁 Project Structure:');
const requiredPaths = [
  'uploads',
  'uploads/videos',
  'uploads/images',
  'ai_processing',
  'ai_processing/people_counter.py',
  'ai_processing/camera_api.py',
  'services/uploadService.js',
  'services/uploadAnalysisService.js'
];

requiredPaths.forEach(p => {
  const fullPath = path.join(__dirname, p);
  const exists = fs.existsSync(fullPath);
  console.log(`   ${exists ? '✅' : '❌'} ${p}`);
  
  if (!exists && p.includes('.py')) {
    console.log(`      ⚠️  Python script missing!`);
  }
});

// Check 3: Python availability
console.log('\n🐍 Python Check:');
try {
  const pythonTest = spawn('python', ['--version']);
  let pythonVersion = '';
  
  pythonTest.stdout.on('data', (data) => {
    pythonVersion += data.toString();
  });
  
  pythonTest.stderr.on('data', (data) => {
    pythonVersion += data.toString();
  });
  
  pythonTest.on('close', (code) => {
    if (code === 0) {
      console.log(`   ✅ Python installed: ${pythonVersion.trim()}`);
      
      // Check Python packages
      console.log('\n📦 Python Packages:');
      const packages = ['opencv-python', 'numpy', 'flask', 'flask-cors'];
      
      packages.forEach(pkg => {
        const pipCheck = spawn('pip', ['show', pkg]);
        let found = false;
        
        pipCheck.stdout.on('data', (data) => {
          if (data.toString().includes('Name:')) {
            found = true;
          }
        });
        
        pipCheck.on('close', () => {
          console.log(`   ${found ? '✅' : '❌'} ${pkg}`);
          if (!found) {
            console.log(`      💡 Install: pip install ${pkg}`);
          }
        });
      });
    } else {
      console.log('   ❌ Python not found in PATH');
      console.log('      💡 Install Python 3.x and add to PATH');
    }
  });
  
  pythonTest.on('error', (err) => {
    console.log('   ❌ Python not found');
    console.log('      💡 Install Python 3.x: https://python.org');
  });
} catch (err) {
  console.log('   ❌ Cannot check Python:', err.message);
}

// Check 4: FFmpeg (for video duration)
console.log('\n🎬 FFmpeg Check:');
try {
  const ffmpegTest = spawn('ffmpeg', ['-version']);
  let ffmpegFound = false;
  
  ffmpegTest.stdout.on('data', () => {
    ffmpegFound = true;
  });
  
  ffmpegTest.on('close', () => {
    if (ffmpegFound) {
      console.log('   ✅ FFmpeg installed');
    } else {
      console.log('   ❌ FFmpeg not found');
      console.log('      💡 Install FFmpeg for accurate video duration');
    }
  });
  
  ffmpegTest.on('error', () => {
    console.log('   ⚠️  FFmpeg not found (optional)');
    console.log('      💡 Video duration will be estimated');
  });
} catch (err) {
  console.log('   ⚠️  FFmpeg check skipped');
}

// Check 5: Storage info
console.log('\n💾 Storage Info:');
const uploadsPath = path.join(__dirname, 'uploads');

try {
  const videoDir = path.join(uploadsPath, 'videos');
  const imageDir = path.join(uploadsPath, 'images');
  
  if (fs.existsSync(videoDir)) {
    const videos = fs.readdirSync(videoDir);
    console.log(`   📹 Videos: ${videos.length} files`);
    
    if (videos.length > 0) {
      let totalSize = 0;
      videos.forEach(file => {
        const stats = fs.statSync(path.join(videoDir, file));
        totalSize += stats.size;
      });
      console.log(`      Total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    }
  }
  
  if (fs.existsSync(imageDir)) {
    const images = fs.readdirSync(imageDir);
    console.log(`   🖼️  Images: ${images.length} files`);
  }
} catch (err) {
  console.log('   ⚠️  Cannot read uploads directory');
}

// Check 6: Environment variables
console.log('\n🔧 Environment Variables:');
const envVars = ['PORT', 'VITE_API_URL', 'USE_REAL_AI'];
envVars.forEach(v => {
  const value = process.env[v];
  console.log(`   ${value ? '✅' : '⚠️ '} ${v}: ${value || 'not set'}`);
});

// Check 7: Test Python script
console.log('\n🧪 Testing Python Script:');
const pythonScript = path.join(__dirname, 'ai_processing', 'people_counter.py');

if (fs.existsSync(pythonScript)) {
  console.log('   ✅ people_counter.py found');
  console.log('   🔄 Testing script execution...');
  
  // Create a test video path (doesn't need to exist for this test)
  const testVideoPath = path.join(__dirname, 'uploads', 'videos', 'test.mp4');
  const testJobId = 'diagnostic_test';
  
  const pythonTest = spawn('python', [pythonScript, testVideoPath, testJobId]);
  let output = '';
  let errorOutput = '';
  
  pythonTest.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  pythonTest.stderr.on('data', (data) => {
    errorOutput += data.toString();
  });
  
  pythonTest.on('close', (code) => {
    if (code === 0 || errorOutput.includes('Cannot open video')) {
      console.log('   ✅ Python script is executable');
      if (errorOutput.includes('Cannot open video')) {
        console.log('      ✅ Script runs but needs a real video file');
      }
    } else {
      console.log('   ❌ Python script execution failed');
      console.log('      Error:', errorOutput);
    }
  });
  
  pythonTest.on('error', (err) => {
    console.log('   ❌ Cannot execute Python script');
    console.log('      Error:', err.message);
  });
} else {
  console.log('   ❌ people_counter.py not found');
  console.log('      📍 Expected location:', pythonScript);
}

// Summary
setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Diagnostic Complete!\n');
  console.log('Next Steps:');
  console.log('1. Fix any ❌ issues above');
  console.log('2. Start backend: npm start');
  console.log('3. Start camera API: python ai_processing/camera_api.py');
  console.log('4. Test upload in the web interface');
  console.log('\n' + '='.repeat(60) + '\n');
}, 3000); // Wait for async checks