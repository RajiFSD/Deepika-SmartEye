import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listCameras,
  testCamera,
  startStream,
  stopStream,
  getSnapshot,
  healthCheck,
  buildStreamUrl,
} from "../services/camera_connection_service";

export default function CameraLiveViewPage() {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [loadingCameras, setLoadingCameras] = useState(false);
  const [form, setForm] = useState({
    ip: "192.168.43.100",
    port: "554",
    username: "vtvtraders2024@gmail.com",
    password: "admin234",
    channel: "1",
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [streamId, setStreamId] = useState(null);
  const [streamSrc, setStreamSrc] = useState(null);
  const [takingSnapshot, setTakingSnapshot] = useState(false);
  const imgRef = useRef(null);

  const canStop = !!streamId;

  const prettyHealth = useMemo(() => {
    if (!health) return "—";
    return `${health.status} · ${health.active_streams} active`;
  }, [health]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const selectCamera = (cam) => {
    setForm((f) => ({
      ...f,
      ip: cam.ip || f.ip,
      port: cam.port || f.port,
      username: cam.username ?? f.username,
      channel: cam.channel || f.channel,
    }));
  };

  const refreshHealth = async () => {
    try {
      setLoadingHealth(true);
      const res = await healthCheck();
      setHealth(res);
    } catch (e) {
      console.error("Health check error", e);
      setHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  };

  const loadCameras = async () => {
    try {
      setLoadingCameras(true);
      const res = await listCameras();
      setCameras(res?.cameras || []);
    } catch (e) {
      console.error("List cameras error", e);
      setCameras([]);
    } finally {
      setLoadingCameras(false);
    }
  };

  const onTest = async () => {
    setTestResult(null);
    setTesting(true);
    try {
      const res = await testCamera(form);
      setTestResult(res);
    } catch (e) {
      console.error("Test camera failed", e);
      setTestResult({ success: false, message: e?.message || "Test failed" });
    } finally {
      setTesting(false);
    }
  };

  const onStart = async () => {
    setStarting(true);
    try {
      console.log("Starting stream with", { ...form, password: form.password ? "***" : "" });
      const res = await startStream(form);
      setStreamId(res.streamId);
      setStreamSrc(res.streamUrlAbsolute || buildStreamUrl(res.streamId));
      await refreshHealth();
    } catch (e) {
      console.error("Start stream failed", e);
      alert(e?.message || "Failed to start stream");
    } finally {
      setStarting(false);
    }
  };

  const onStop = async () => {
    if (!streamId) return;
    setStopping(true);
    try {
      await stopStream(streamId);
      setStreamId(null);
      setStreamSrc(null);
      await refreshHealth();
    } catch (e) {
      console.error("Stop stream failed", e);
    } finally {
      setStopping(false);
    }
  };

  const onSnapshot = async () => {
    if (!streamId) return;
    setTakingSnapshot(true);
    try {
      const { blob, urlAbsolute } = await getSnapshot(streamId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `snapshot_${streamId}_${ts}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      console.info("Snapshot saved from:", urlAbsolute);
    } catch (e) {
      console.error("Snapshot failed", e);
      alert("Snapshot failed. Is the stream running?");
    } finally {
      setTakingSnapshot(false);
    }
  };

  useEffect(() => {
    return () => {
      if (streamId) {
        stopStream(streamId).catch(() => {});
      }
    };
  }, [streamId]);

  useEffect(() => {
    refreshHealth();
    loadCameras();
  }, []);

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Camera Live View</h1>
          <div className="text-sm text-gray-600">
            <span className="inline-flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${health?.status === "running" ? "bg-green-500" : "bg-gray-300"}`} />
              {loadingHealth ? "Checking health…" : `Health: ${prettyHealth}`}
            </span>
            <button onClick={refreshHealth} className="ml-3 rounded-md border px-2 py-1 text-xs hover:bg-gray-50">Refresh</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Controls */}
        <section className="lg:col-span-1 space-y-6">
          {/* Saved cameras */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Saved Cameras</h2>
              <button onClick={loadCameras} className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50">{loadingCameras ? "Loading…" : "Reload"}</button>
            </div>
            {cameras?.length ? (
              <ul className="divide-y">
                {cameras.map((cam) => (
                  <li key={cam.id} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{cam.name || cam.id}</div>
                      <div className="text-xs text-gray-500">{cam.ip}:{cam.port} · ch {cam.channel} · {cam.location || "—"}</div>
                    </div>
                    <button
                      onClick={() => selectCamera(cam)}
                      className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50"
                    >Use</button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No cameras returned by backend.</p>
            )}
          </div>

          {/* Connection form */}
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">Connection</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 text-sm">
                <span className="block text-gray-600">IP address</span>
                <input name="ip" value={form.ip} onChange={onChange} className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="192.168.1.64" />
              </label>
              <label className="text-sm">
                <span className="block text-gray-600">Port</span>
                <input name="port" value={form.port} onChange={onChange} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="block text-gray-600">Channel</span>
                <input name="channel" value={form.channel} onChange={onChange} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="block text-gray-600">Username</span>
                <input name="username" value={form.username} onChange={onChange} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="block text-gray-600">Password</span>
                <input type="password" name="password" value={form.password} onChange={onChange} className="mt-1 w-full rounded-lg border px-3 py-2" />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={onTest} disabled={testing} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">{testing ? "Testing…" : "Test connection"}</button>
              <button onClick={onStart} disabled={starting} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60">{starting ? "Starting…" : "Start stream"}</button>
              <button onClick={onStop} disabled={!canStop || stopping} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60">{stopping ? "Stopping…" : "Stop stream"}</button>
            </div>

            {testResult && (
              <div className={`mt-3 rounded-lg border p-3 text-sm ${testResult.success ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900"}`}>
                <div className="font-medium">{testResult.success ? "Connection OK" : "Connection failed"}</div>
                <div className="opacity-80">{testResult.message || (testResult.success ? "Camera connection successful" : "Unable to connect.")}</div>
              </div>
            )}
          </div>
        </section>

        {/* Right column: Live view */}
        <section className="lg:col-span-2">
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Live Stream</h2>
                {streamId ? (
                  <p className="text-xs text-gray-500">Stream ID: <code>{streamId}</code></p>
                ) : (
                  <p className="text-xs text-gray-500">No active stream</p>
                )}
              </div>
              <div className="flex items-center gap-2 px-2">
                <button onClick={onSnapshot} disabled={!streamId || takingSnapshot} className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60" title="Download a JPEG snapshot">{takingSnapshot ? "Saving…" : "Snapshot"}</button>
              </div>
            </div>

            <div className="relative aspect-video w-full bg-black">
              {streamSrc ? (
                <img ref={imgRef} src={streamSrc} alt="Live camera stream" className="h-full w-full object-contain" draggable={false} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="mb-2 text-sm">Start a stream to see video</div>
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 border-t p-4 text-sm text-gray-600 md:grid-cols-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">IP</div>
                <div className="font-medium">{form.ip}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Port</div>
                <div className="font-medium">{form.port}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Channel</div>
                <div className="font-medium">{form.channel}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500">Health</div>
                <div className="font-medium">{prettyHealth}</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
