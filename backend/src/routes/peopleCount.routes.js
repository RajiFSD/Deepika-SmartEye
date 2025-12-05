const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");

const peopleCountController = require("../controllers/peopleCountController");
const peopleCountService = require("../services/peopleCountService");

// ✅ GLOBAL STATE: Store active Python processes and their metadata
const activeSessions = new Map(); // streamId => { pythonProcess, metadata }

module.exports = (wss) => {
    // streamId => [WebSocket clients]
    const wsGroups = new Map();

    // ===================================================================
    // ROUTE: START LIVE PEOPLE COUNTING
    // ===================================================================
    router.post("/live/start", async (req, res) => {
        console.log("🚀 /live/start called");
        console.log("📦 Request Body:", JSON.stringify(req.body, null, 2));

        const { 
            stream_url, 
            streamId, 
            direction, 
            camera_id, 
            tenant_id, 
            branch_id 
        } = req.body;

        // ✅ Validate required fields
        if (!stream_url || !streamId || !camera_id || !tenant_id || !branch_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields: stream_url, streamId, camera_id, tenant_id, branch_id" 
            });
        }

        // ✅ Check if already running for this streamId
        if (activeSessions.has(streamId)) {
            console.log("⚠️ Session already active for:", streamId);
            return res.json({ 
                success: false, 
                message: "People counting already active for this camera" 
            });
        }

        console.log("🚀 Starting people_count_continuous.py for streamId:", streamId);

        // ✅ Python paths
        const VENV_PYTHON = path.resolve(
            __dirname,
            "../../../ai-module/venv/Scripts/python.exe"
        );

        const scriptPath = path.resolve(
            __dirname,
            "../../../ai-module/src/models/people_count_continuous.py"
        );

        const apiUrl = `http://localhost:3000/api/people-count/live/update/${streamId}`;

        console.log(`   🐍 Python: ${VENV_PYTHON}`);
        console.log(`   📄 Script: ${scriptPath}`);
        console.log(`   🎥 Stream URL: ${stream_url}`);
        console.log(`   🌐 API URL: ${apiUrl}`);
        console.log(`   ➡️ Direction: ${direction || "LEFT_RIGHT"}`);

        // ✅ Spawn Python process
        const pythonProcess = spawn(
            VENV_PYTHON,
            [
                scriptPath,
                stream_url,
                apiUrl,
                direction || "LEFT_RIGHT"
            ],
            {
                windowsHide: true,
                stdio: ["ignore", "pipe", "pipe"],
                env: { ...process.env, PYTHONIOENCODING: "utf-8" }
            }
        );

        // ✅ Store session metadata
        activeSessions.set(streamId, {
            pythonProcess,
            metadata: {
                camera_id: parseInt(camera_id),
                tenant_id: parseInt(tenant_id),
                branch_id: parseInt(branch_id),
                direction: direction || "LEFT_RIGHT",
                stream_url,
                startTime: new Date()
            }
        });

        let buffer = "";

        // ✅ Handle Python stdout (JSON output)
        pythonProcess.stdout.on("data", (data) => {
            buffer += data.toString();

            // Split by newlines to get complete JSON objects
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("===") || trimmed.startsWith("Stream")) {
                    continue; // Skip non-JSON lines
                }

                try {
                    const json = JSON.parse(trimmed);
                    console.log("📊 Python JSON output:", json);

                    // Broadcast to WebSocket clients immediately
                    const group = wsGroups.get(streamId);
                    if (group && group.length > 0) {
                        const wsMessage = JSON.stringify({
                            type: "people_count",
                            streamId,
                            inside: json.inside ?? 0,
                            entered: json.entered ?? 0,
                            exited: json.exited ?? 0,
                            direction: json.direction,
                            timestamp: json.timestamp,
                            objects: json.objects || []
                        });

                        group.forEach((ws) => {
                            try {
                                if (ws.readyState === 1) { // OPEN
                                    ws.send(wsMessage);
                                }
                            } catch (err) {
                                console.error("❌ WS send error:", err.message);
                            }
                        });
                    }
                } catch (e) {
                    console.log("📝 Non-JSON Python output:", trimmed);
                }
            }
        });

        // ✅ Handle Python stderr
        pythonProcess.stderr.on("data", (d) => {
            const msg = d.toString();
            if (msg.includes("ERROR")) {
                console.error("❌ [PYTHON ERROR]", msg);
            } else {
                console.log("🐍 [PYTHON INFO]", msg);
            }
        });

        // ✅ Handle Python process close
        pythonProcess.on("close", (code) => {
            console.log(`🛑 Python process closed with code ${code} for streamId: ${streamId}`);
            activeSessions.delete(streamId);
        });

        // ✅ Handle Python process error
        pythonProcess.on("error", (err) => {
            console.error("❌ Python process error:", err);
            activeSessions.delete(streamId);
        });

        return res.json({ 
            success: true, 
            message: "People counting started successfully",
            streamId 
        });
    });

    // ===================================================================
    // ROUTE: STOP LIVE PEOPLE COUNTING
    // ===================================================================
    router.post("/live/stop", (req, res) => {
        console.log("🛑 /live/stop called");

        let stoppedCount = 0;

        // Stop all active sessions
        for (const [streamId, session] of activeSessions.entries()) {
            if (session.pythonProcess) {
                try {
                    session.pythonProcess.kill("SIGTERM");
                    console.log(`✅ Killed Python process for ${streamId}`);
                    stoppedCount++;
                } catch (err) {
                    console.error(`❌ Error killing process for ${streamId}:`, err);
                }
            }
            activeSessions.delete(streamId);
        }

        return res.json({ 
            success: true, 
            message: `Stopped ${stoppedCount} counting session(s)` 
        });
    });

    // ===================================================================
    // ROUTE: RECEIVE UPDATES FROM PYTHON
    // ===================================================================
    router.post("/live/update/:streamId", async (req, res) => {
        const { streamId } = req.params;
        const data = req.body;

        console.log("📡 /live/update received for streamId:", streamId);
        console.log("📦 Update data:", JSON.stringify(data, null, 2));

        // ✅ Retrieve session metadata
        const session = activeSessions.get(streamId);
        if (!session) {
            console.warn("⚠️ No active session found for streamId:", streamId);
            return res.status(404).json({ 
                success: false, 
                message: "No active session for this streamId" 
            });
        }

        const { camera_id, tenant_id, branch_id, direction } = session.metadata;

        // ✅ Save to database
        try {
            const logData = {
                camera_id,
                tenant_id,
                branch_id,
                zone_id: null, // Optional: add if you have zone tracking
                person_id: null, // Optional: track specific person IDs if needed
                direction: data.direction || direction,
                detection_time: data.timestamp 
                    ? new Date(data.timestamp * 1000) 
                    : new Date(),
                frame_number: null,
                confidence_score: null,
                image_path: null,
                thumbnail_path: null,
                metadata: {
                    inside: data.inside ?? 0,
                    entered: data.entered ?? 0,
                    exited: data.exited ?? 0,
                    objects: data.objects || []
                }
            };

            await peopleCountService.createPeopleCountLog(logData);
            console.log("✅ Saved to database:", logData);
        } catch (err) {
            console.error("❌ DB save error:", err);
            // Don't return error - continue to broadcast
        }

        // ✅ Broadcast to WebSocket clients
        const group = wsGroups.get(streamId);
        if (group && group.length > 0) {
            const wsMessage = JSON.stringify({
                type: "people_count",
                streamId,
                inside: data.inside ?? 0,
                entered: data.entered ?? 0,
                exited: data.exited ?? 0,
                direction: data.direction,
                timestamp: data.timestamp,
                objects: data.objects || []
            });

            let sentCount = 0;
            group.forEach((ws) => {
                try {
                    if (ws.readyState === 1) { // WebSocket.OPEN
                        ws.send(wsMessage);
                        sentCount++;
                    }
                } catch (err) {
                    console.error("❌ WS send error:", err.message);
                }
            });

            console.log(`📤 Broadcast to ${sentCount} WebSocket client(s)`);
        } else {
            console.log("⚠️ No WebSocket clients connected for", streamId);
        }

        return res.json({ success: true });
    });

    // ===================================================================
    // WEBSOCKET CONNECTION HANDLER
    // ===================================================================
    wss.on("connection", (ws, req) => {
        const match = req.url.match(/\/ws\/people-count\/(.+)$/);

        if (!match) {
            console.warn("❌ Invalid WebSocket URL:", req.url);
            ws.close();
            return;
        }

        const streamId = match[1];
        console.log("🔌 WebSocket connected for streamId:", streamId);

        // Add to group
        if (!wsGroups.has(streamId)) {
            wsGroups.set(streamId, []);
        }
        wsGroups.get(streamId).push(ws);

        console.log(`📊 Total WS clients for ${streamId}:`, wsGroups.get(streamId).length);

        // Send initial connection confirmation
        ws.send(JSON.stringify({
            type: "connection",
            message: "Connected to people counting stream",
            streamId
        }));

        // Handle client disconnect
        ws.on("close", () => {
            console.log("🔌 WebSocket disconnected for streamId:", streamId);
            const group = wsGroups.get(streamId);
            if (group) {
                wsGroups.set(
                    streamId,
                    group.filter((c) => c !== ws)
                );
                console.log(`📊 Remaining WS clients for ${streamId}:`, wsGroups.get(streamId).length);
            }
        });

        ws.on("error", (err) => {
            console.error("❌ WebSocket error:", err);
        });
    });

    // ===================================================================
    // EXISTING DATABASE + ANALYTICS ROUTES
    // ===================================================================
    router.post("/", peopleCountController.create);
    router.get("/", peopleCountController.getAll);
    router.get("/analytics/hourly", peopleCountController.getHourlyAnalytics);
    router.get("/analytics/daily", peopleCountController.getDailyAnalytics);
    router.get("/camera/:cameraId", peopleCountController.getByCamera);
    router.get("/tenant/:tenantId", peopleCountController.getByTenant);
    router.get("/branch/:branchId", peopleCountController.getByBranch);
    router.get("/:id", peopleCountController.getById);

    // ===================================================================
    // UTILITY: GET ACTIVE SESSIONS
    // ===================================================================
    router.get("/live/status", (req, res) => {
        const sessions = [];
        for (const [streamId, session] of activeSessions.entries()) {
            sessions.push({
                streamId,
                camera_id: session.metadata.camera_id,
                direction: session.metadata.direction,
                startTime: session.metadata.startTime,
                uptime: Date.now() - session.metadata.startTime.getTime()
            });
        }
        res.json({ success: true, sessions });
    });

    return router;
};