import { createLucideIcon } from "lucide-react";

const DashboardIcon = createLucideIcon("DashboardIcon", [
  // Big left panel
  ["rect", { x: "3", y: "4", width: "9", height: "8", rx: "1", key: "left-top" }],

  // Bottom left panel
  ["rect", { x: "3", y: "13", width: "9", height: "5", rx: "1", key: "left-bottom" }],

  // Right top panel
  ["rect", { x: "13", y: "4", width: "8", height: "6", rx: "1", key: "right-top" }],

  // Right bottom small cards
  ["rect", { x: "13", y: "12", width: "3.5", height: "6", rx: "1", key: "card1" }],
  ["rect", { x: "17.5", y: "12", width: "3.5", height: "6", rx: "1", key: "card2" }],
]);

export default DashboardIcon;