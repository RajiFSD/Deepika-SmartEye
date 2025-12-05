import { createLucideIcon } from "lucide-react";

const AlertSettings = createLucideIcon("AlertSettings", [
  // Alert triangle
  ["path", { d: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", key: "tri" }],
  ["line", { x1: "12", y1: "9", x2: "12", y2: "13", key: "alert-line" }],
  ["circle", { cx: "12", cy: "17", r: "1", key: "alert-dot" }],

  // Small gear
  ["circle", { cx: "19", cy: "7", r: "2", key: "gear-center" }],
  ["path", { d: "M19 3v1", key: "g1" }],
  ["path", { d: "M19 9v1", key: "g2" }],
  ["path", { d: "M16.8 5.5l.9.5", key: "g3" }],
  ["path", { d: "M20.3 8l.9.5", key: "g4" }],
  ["path", { d: "M16.8 8.5l.9-.5", key: "g5" }],
  ["path", { d: "M20.3 6l.9-.5", key: "g6" }],
]);

export default AlertSettings;