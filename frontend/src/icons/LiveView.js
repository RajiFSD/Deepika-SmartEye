import { createLucideIcon } from "lucide-react";

const LiveView = createLucideIcon("LiveView", [
  ["rect", { x: "2", y: "6", width: "14", height: "10", rx: "2", key: "body" }],
  ["circle", { cx: "9", cy: "11", r: "3", key: "lens" }],
  ["path", { d: "M18 9l4 2-4 2V9z", key: "live-arrow" }], // play symbol
]);

export default LiveView;