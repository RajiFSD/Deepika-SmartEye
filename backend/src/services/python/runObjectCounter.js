// backend/src/services/python/runObjectCounter.js
const { spawn } = require("child_process");
const path = require("path");

module.exports = function runObjectCounter(videoPath, outputPath, imageDir, job) {
  return new Promise((resolve, reject) => {
    const script = path.resolve(
      __dirname,
      "../../../../ai-module/src/models/object_counter.py"
    );

    const args = [ script, videoPath, outputPath ];
    if (job.model_type) args.push("--model", job.model_type);
    if (job.metadata?.capture_images !== false) args.push("--images", imageDir);

    const py = spawn("python", args);

    let stdout = "", stderr = "";
    py.stdout.on("data", d => stdout += d.toString());
    py.stderr.on("data", d => stderr += d.toString());

    py.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr));
      try {
        return resolve(JSON.parse(stdout.trim()));
      } catch (err) {
        return reject(new Error("Invalid JSON output: " + stdout));
      }
    });
  });
};
