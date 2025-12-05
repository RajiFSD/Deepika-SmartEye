import { createLucideIcon } from "lucide-react";

const ActivityHeatmap = createLucideIcon("ActivityHeatmap", [
  // Outer frame
  ["rect", { x: "3", y: "4", width: "18", height: "16", rx: "2", key: "frame" }],

  // Grid cells (3x2 style)
  ["rect", { x: "5", y: "6", width: "4", height: "4", key: "c1" }],
  ["rect", { x: "11", y: "6", width: "4", height: "4", key: "c2" }],
  ["rect", { x: "17", y: "6", width: "4", height: "4", key: "c3" }],

  ["rect", { x: "5", y: "12", width: "4", height: "4", key: "c4" }],
  ["rect", { x: "11", y: "12", width: "4", height: "4", key: "c5" }],
  ["rect", { x: "17", y: "12", width: "4", height: "4", key: "c6" }],

  // Little "intensity bar" to the left
  ["path", { d: "M3 10h-1", key: "bar1" }],
  ["path", { d: "M3 14h-2", key: "bar2" }],
]);

export default ActivityHeatmap;