import React, { useEffect, useRef, useState } from "react";

export default function LivePeopleOverlay({
  streamId,
  videoRef,
  isCounting,
}) {
  const canvasRef = useRef(null);
  const [latestData, setLatestData] = useState(null);

  // Open WebSocket when counting starts
  useEffect(() => {
    if (!isCounting || !streamId) return;

    // Build WS URL from API base
    const apiBase =
      import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    const wsBase = apiBase
      .replace(/^http/, "ws")
      .replace(/\/api\/?$/, ""); // http://host:3000/api -> ws://host:3000

    const ws = new WebSocket(`${wsBase}/ws/people-count/${streamId}`);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLatestData(data);
      } catch (e) {
        console.error("People overlay WS parse error:", e);
      }
    };

    ws.onerror = (err) => {
      console.error("People overlay WS error:", err);
    };

    return () => {
      ws.close();
    };
  }, [isCounting, streamId]);

  // Keep canvas size in sync with video element
  useEffect(() => {
    const videoEl = videoRef?.current;
    const canvasEl = canvasRef.current;
    if (!videoEl || !canvasEl) return;

    const syncSize = () => {
      // size to displayed video size
      const rect = videoEl.getBoundingClientRect();
      canvasEl.width = rect.width;
      canvasEl.height = rect.height;
      canvasEl.style.width = `${rect.width}px`;
      canvasEl.style.height = `${rect.height}px`;
      drawOverlay(latestData);
    };

    syncSize();
    window.addEventListener("resize", syncSize);

    return () => window.removeEventListener("resize", syncSize);
  }, [videoRef, latestData]);

  // Draw whenever data changes
  useEffect(() => {
    drawOverlay(latestData);
  }, [latestData]);

  const drawOverlay = (data) => {
    const canvasEl = canvasRef.current;
    const videoEl = videoRef?.current;
    if (!canvasEl || !videoEl) return;

    const ctx = canvasEl.getContext("2d");
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    if (!data || !data.objects || !data.objects.length) return;

    // Use actual video resolution to scale
    const vw = videoEl.videoWidth || canvasEl.width;
    const vh = videoEl.videoHeight || canvasEl.height;
    const scaleX = canvasEl.width / vw;
    const scaleY = canvasEl.height / vh;

    data.objects.forEach((obj) => {
      const [x, y, w, h] = obj.bbox || [0, 0, 0, 0];
      const rx = x * scaleX;
      const ry = y * scaleY;
      const rw = w * scaleX;
      const rh = h * scaleY;

      const gender = obj.gender || "Unknown";
      const id = obj.id ?? "";
      const label = `${gender}${id !== "" ? ` #${id}` : ""}`;

      // Box
      ctx.lineWidth = 2;
      ctx.strokeStyle = "lime";
      ctx.strokeRect(rx, ry, rw, rh);

      // Label background
      ctx.font = "12px sans-serif";
      const textWidth = ctx.measureText(label).width;
      const labelX = rx;
      const labelY = Math.max(ry - 16, 0);

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(labelX - 2, labelY, textWidth + 6, 16);

      // Label text
      ctx.fillStyle = "white";
      ctx.fillText(label, labelX + 1, labelY + 12);

      // Direction arrow (optional)
      if (obj.direction === "IN" || obj.direction === "OUT") {
        ctx.fillStyle = obj.direction === "IN" ? "lime" : "red";
        ctx.beginPath();
        const cx = rx + rw / 2;
        const cy = ry + rh + 10;
        if (obj.direction === "IN") {
          ctx.moveTo(cx - 6, cy + 6);
          ctx.lineTo(cx + 6, cy + 6);
          ctx.lineTo(cx, cy - 4);
        } else {
          ctx.moveTo(cx - 6, cy - 4);
          ctx.lineTo(cx + 6, cy - 4);
          ctx.lineTo(cx, cy + 6);
        }
        ctx.closePath();
        ctx.fill();
      }
    });
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
    />
  );
}