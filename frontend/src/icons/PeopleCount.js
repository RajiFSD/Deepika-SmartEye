import { createLucideIcon } from "lucide-react";

const PeopleCount = createLucideIcon("PeopleCount", [
  // Main person
  ["circle", { cx: "12", cy: "7", r: "3", key: "head-main" }],
  ["path", { d: "M9 14c0-2 6-2 6 0v2H9v-2z", key: "body-main" }],

  // Left person
  ["circle", { cx: "6", cy: "9", r: "2", key: "head-left" }],
  ["path", { d: "M4 14c0-1.5 4-1.5 4 0v1", key: "body-left" }],

  // Right person
  ["circle", { cx: "18", cy: "9", r: "2", key: "head-right" }],
  ["path", { d: "M16 14c0-1.5 4-1.5 4 0v1", key: "body-right" }],
]);

export default PeopleCount;