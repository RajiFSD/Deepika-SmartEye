import { createLucideIcon } from "lucide-react";

const ZoneConfig = createLucideIcon("ZoneConfig", [
  // Outer zone rectangle
  ["rect", { x: "3", y: "5", width: "14", height: "12", rx: "2", key: "zone-rect" }],

  // Corner handles
  ["circle", { cx: "3", cy: "5", r: "1", key: "h-tl" }],
  ["circle", { cx: "17", cy: "5", r: "1", key: "h-tr" }],
  ["circle", { cx: "3", cy: "17", r: "1", key: "h-bl" }],
  ["circle", { cx: "17", cy: "17", r: "1", key: "h-br" }],

  // Config sliders hint
  ["path", { d: "M21 8h-4", key: "sl1" }],
  ["path", { d: "M21 12h-3", key: "sl2" }],
  ["path", { d: "M21 16h-5", key: "sl3" }],
]);

export default ZoneConfig;