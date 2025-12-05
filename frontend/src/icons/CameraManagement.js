import { createLucideIcon } from "lucide-react";

const CameraManagement = createLucideIcon("CameraManagement", [
  ["rect", { x: "2", y: "7", width: "14", height: "10", rx: "2", key: "body" }],
  ["circle", { cx: "9", cy: "12", r: "3", key: "lens" }],
  ["path", { d: "M6 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", key: "top" }],
  ["circle", { cx: "19", cy: "10", r: "1", key: "dot1" }],
  ["circle", { cx: "19", cy: "14", r: "1", key: "dot2" }],
  ["circle", { cx: "19", cy: "18", r: "1", key: "dot3" }],
]);

export default CameraManagement;