import { createLucideIcon } from "lucide-react";

const DetectionLogs = createLucideIcon("DetectionLogs", [
  ["rect", { x: "2", y: "5", width: "10", height: "8", rx: "2", key: "cam-body" }],
  ["circle", { cx: "7", cy: "9", r: "2", key: "cam-lens" }],
  ["path", { d: "M14 7h6", key: "l1" }],
  ["path", { d: "M14 11h6", key: "l2" }],
  ["path", { d: "M14 15h4", key: "l3" }],
]);

export default DetectionLogs;