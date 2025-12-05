// sidebarConfig.js

import {
  LayoutDashboard,
  Settings,
  Upload,
  AlertCircle,
  FileText,
  LogOut,
  Users,
  Menu,
  X,
  Camera,
  Building2,
  UserSquare2,
  Flame,
  Bell,
  Activity,
  ChevronDown,
  ChevronRight,
  Shield,
  Package,
  FileSpreadsheet,
  User,
} from "lucide-react";

import ZoneConfig from "@/icons/ZoneConfig";
import ActivityHeatmap from "@/icons/ActivityHeatmap";
import DashboardIcon from "@/icons/DashboardIcon";
import CameraManagement from "@/icons/CameraManagement";
import LiveView from "@/icons/LiveView";
import AlertSettings from "@/icons/AlertSettings";
import PeopleCount from "@/icons/PeopleCount";
import DetectionLogs from "@/icons/DetectionLogs";

// MAIN
export const mainItems = [
  {
    id: "dashboard",
    icon: LayoutDashboard, // or DashboardIcon
    label: "Dashboard",
    path: "/dashboard",
  },
];

// MODULES (your expandableSections)
export const expandableSections = [
  {
    id: "CameraManagement",
    icon: CameraManagement,
    label: "Camera Align",
    items: [
      { path: "/camera-live", icon: LiveView, label: "Live View" },
      { path: "/zone-config", icon: ZoneConfig, label: "Zone Config" },
      { path: "/alerts", icon: AlertSettings, label: "Alert Settings" },
      { path: "/violations", icon: DetectionLogs, label: "Detection Logs" },
    ],
  },
  {
    id: "peopleCounting",
    icon: PeopleCount,
    label: "People Counting",
    items: [
      { path: "/peoplecounter", icon: PeopleCount, label: "People Count" },
      { path: "/upload", icon: Upload, label: "Upload & Analyze" },
    ],
  },
  {
    id: "fireAlert",
    icon: Flame,
    label: "Fire Alert",
    items: [
      { path: "/smoke-detection", icon: Flame, label: "Fire Detection" },
      { path: "/smoke-alerts", icon: Bell, label: "Alert History" },
      { path: "/smoke-analytics", icon: Activity, label: "Analytics" },
    ],
  },
  {
    id: "productDetection",
    icon: Package,
    label: "Product Detection",
    items: [
      { path: "/product-overview", icon: Package, label: "Overview" },
      { path: "/product-catalog", icon: FileText, label: "Product Catalog" },
      { path: "/product-detection", icon: Camera, label: "Detection Logs" },
      { path: "/product-analytics", icon: Activity, label: "Analytics" },
    ],
  },
  {
    id: "objectCounter",
    icon: Shield,
    label: "Object Counting",
    items: [
      { path: "/object-counter", icon: UserSquare2, label: "Object Counter" },
      { path: "/conveyor-counter", icon: Building2, label: "Conveyor Counter" },
    ],
  },
  {
    id: "testStream",
    icon: FileSpreadsheet,
    label: "Test Live Stream",
    items: [{ path: "/test-stream", icon: Camera, label: "Live Stream" }],
  },
];

// SYSTEM
export const systemItems = [
  {
    id: "reports",
    icon: FileSpreadsheet,
    label: "Reports",
    path: "/reports",
  },
];