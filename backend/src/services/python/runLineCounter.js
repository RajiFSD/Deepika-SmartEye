// backend/src/services/python/runLineCounter.js
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// ✅ Use virtual environment Python
const VENV_PYTHON = path.resolve(__dirname, "../../../../ai-module/venv/Scripts/python.exe");
const SCRIPT_PATH = path.resolve(__dirname, "../../../../ai-module/src/models/line_counter_wrapper.py");

module.exports = function runLineCounter(videoPath, outputPath, options = {}) {
  return new Promise((resolve, reject) => {
    // ✅ Check if virtual environment exists
    if (!fs.existsSync(VENV_PYTHON)) {
      console.error("❌ Virtual environment not found at:", VENV_PYTHON);
      return reject(new Error(
        "Virtual environment not found!\n" +
        "Please run the setup script: D:\\Web APP\\Smarteye\\ai-module\\RUN_ME.bat"
      ));
    }

    // ✅ Check if Python script exists
    if (!fs.existsSync(SCRIPT_PATH)) {
      console.error("❌ Python script not found at:", SCRIPT_PATH);
      return reject(new Error("line_counter_wrapper.py not found"));
    }

    const args = [
      SCRIPT_PATH,
      "--source", videoPath,
      "--output", outputPath,
      "--line-type", options.lineType || "horizontal",
      "--line-pos", String(options.linePosition ?? 300),
      "--class-id", String(options.classId ?? -1),
      "--mode", options.mode || "object",
      "--conf", String(options.confidence ?? 0.3)
    ];

    console.log("🚀 Running line counter:");
    console.log("   Python:", VENV_PYTHON);
    console.log("   Script:", SCRIPT_PATH);
    console.log("   Line Type:", options.lineType || "horizontal");
    console.log("   Line Position:", options.linePosition ?? 300);

    const py = spawn(VENV_PYTHON, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", d => {
      stdout += d.toString();
    });

    py.stderr.on("data", d => {
      const msg = d.toString();
      stderr += msg;
      // Only log non-empty lines
      const lines = msg.trim().split('\n').filter(l => l.trim());
      lines.forEach(line => console.log("[Python]", line));
    });

    py.on("close", (code) => {
      if (code !== 0) {
        console.error("❌ Line counter failed with exit code:", code);
        console.error("Stderr output:", stderr);
        return reject(new Error(`Process exited with code ${code}\nError: ${stderr}`));
      }

      try {
        // Parse JSON from last line of stdout
        const lines = stdout.trim().split('\n').filter(l => l.trim());
        const jsonLine = lines[lines.length - 1];
        
        console.log("📊 Raw output (last line):", jsonLine);
        
        const result = JSON.parse(jsonLine);
        console.log("✅ Line counter completed successfully");
        console.log("   Total counted:", result.total_counted);
        console.log("   Processing time:", result.processing_time?.toFixed(2) + "s");
        
        return resolve(result);
      } catch (err) {
        console.error("❌ Failed to parse JSON output");
        console.error("Last line was:", stdout.trim().split('\n').pop());
        console.error("Parse error:", err.message);
        return reject(new Error("Invalid JSON output from Python script"));
      }
    });

    py.on("error", (err) => {
      console.error("❌ Failed to spawn Python process:", err);
      reject(new Error(`Failed to start Python: ${err.message}`));
    });
  });
};