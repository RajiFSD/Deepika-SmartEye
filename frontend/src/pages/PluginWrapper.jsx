import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Upload,
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
  Shield,
  Package,
  FileSpreadsheet,
  Sun,
  Moon,
} from "lucide-react";

import { useState, useEffect, useMemo, useRef } from "react";

import ZoneConfig from "@/icons/ZoneConfig";
import DashboardIcon from "@/icons/DashboardIcon";
import CameraManagement from "@/icons/CameraManagement";
import LiveView from "@/icons/LiveView";
import AlertSettings from "@/icons/AlertSettings";
import PeopleCount from "@/icons/PeopleCount";
import DetectionLogs from "@/icons/DetectionLogs";

import authService from "../services/authService";

function PluginWrapper({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Layout / theme
  const [sidebarOpen, setSidebarOpen] = useState(true); // full vs mini
  const [darkMode, setDarkMode] = useState(true);

  // Expand state for full mode sections
  const [expanded, setExpanded] = useState({
    CameraManagement: true,
    peopleCounting: false,
    fireAlert: false,
    productDetection: false,
    objectCounter: false,
    testStream: false,
  });

  // Flyout in mini mode
  const [hoveredSection, setHoveredSection] = useState(null);
  const hoverTimeoutRef = useRef(null);

  // For hotkey flash
  const [flashSection, setFlashSection] = useState(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userInitial = user.full_name?.charAt(0)?.toUpperCase() || "A";

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    setIsAuthenticated(false);
    authService.logout();
    navigate("/login");
  };

  // ─────────────────────────
  //       MENU CONFIG
  // ─────────────────────────

  const mainSection = useMemo(
    () => [
      {
        id: "dashboard",
        path: "/dashboard",
        icon: DashboardIcon,
        label: "Dashboard",
      },
    ],
    []
  );

  const modules = useMemo(
    () => [
      {
        id: "CameraManagement",
        icon: CameraManagement,
        label: "Camera Align",
        hotkey: "Shift+1",
        firstPath: "/camera-live",
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
        hotkey: "Shift+2",
        firstPath: "/peoplecounter",
        items: [
          { path: "/peoplecounter", icon: PeopleCount, label: "People Count" },
          { path: "/upload", icon: Upload, label: "Upload & Analyze" },
        ],
      },
      {
        id: "fireAlert",
        icon: Flame,
        label: "Fire Alert",
        hotkey: "Shift+3",
        firstPath: "/smoke-detection",
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
        hotkey: "Shift+4",
        firstPath: "/product-overview",
        items: [
          { path: "/product-overview", icon: Package, label: "Overview" },
          {
            path: "/product-catalog",
            icon: FileText,
            label: "Product Catalog",
          },
          {
            path: "/product-detection",
            icon: Camera,
            label: "Detection Logs",
          },
          {
            path: "/product-analytics",
            icon: Activity,
            label: "Analytics",
          },
        ],
      },
      {
        id: "objectCounter",
        icon: Shield,
        label: "Object Counting",
        hotkey: "Shift+5",
        firstPath: "/object-counter",
        items: [
          {
            path: "/object-counter",
            icon: UserSquare2,
            label: "Object Counter",
          },
          {
            path: "/conveyor-counter",
            icon: Building2,
            label: "Conveyor Counter",
          },
        ],
      },
      {
        id: "testStream",
        icon: FileSpreadsheet,
        label: "Test Live Stream",
        hotkey: "Shift+6",
        firstPath: "/test-stream",
        items: [
          {
            path: "/test-stream",
            icon: Camera,
            label: "Live Stream",
          },
        ],
      },
    ],
    []
  );

    // All module ids (for accordion behaviour)
  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules]);

  // Helper: only one section expanded at a time
  const setExclusiveExpanded = (sectionId, open = true) => {
    setExpanded(() => {
      const next = {};
      moduleIds.forEach((id) => {
        next[id] = open && id === sectionId;
      });
      return next;
    });
  };


  const system = useMemo(
    () => [
      {
        id: "reports",
        path: "/reports",
        icon: FileText,
        label: "Reports",
      },
    ],
    []
  );

  // ─────────────────────────
  //       HOTKEYS (Shift+1..6, expand+flash)
  // ─────────────────────────

   useEffect(() => {
    const handleHotkeys = (e) => {
      const t = e.target;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable)
      ) {
        return;
      }

      if (!e.shiftKey) return;

      let num = null;
      if (e.code.startsWith("Digit")) {
        num = e.code.replace("Digit", "");
      } else if (e.code.startsWith("Numpad")) {
        num = e.code.replace("Numpad", "");
      }
      if (!num) return;

      const map = {
        "1": "CameraManagement",
        "2": "peopleCounting",
        "3": "fireAlert",
        "4": "productDetection",
        "5": "objectCounter",
        "6": "testStream",
      };

      const sectionId = map[num];
      if (!sectionId) return;

      const section = modules.find((m) => m.id === sectionId);
      if (!section || !section.firstPath) return;

      e.preventDefault();
      navigate(section.firstPath);

      // ACCORDION: open this module, close others
      setExpanded((prev) => {
        const next = {};
        moduleIds.forEach((id) => {
          next[id] = id === sectionId; // only this one true
        });
        return next;
      });

      // flash effect
      setFlashSection(sectionId);
      setTimeout(() => {
        setFlashSection((current) =>
          current === sectionId ? null : current
        );
      }, 450);
    };

    window.addEventListener("keydown", handleHotkeys);
    return () => window.removeEventListener("keydown", handleHotkeys);
  }, [modules, moduleIds, navigate]);


  // ─────────────────────────
  //           THEME
  // ─────────────────────────

  const neon = "#00C3FF";

  const outerBg = darkMode ? "bg-slate-950" : "bg-slate-100";

  // Dynamic content theme: dark when sidebar open, light when collapsed
  const contentDark = sidebarOpen;
  const contentBg = contentDark ? "bg-slate-950/90" : "bg-slate-50";
  const headerBg = contentDark
    ? "bg-slate-950/80"
    : "bg-white/90";
  const mainText = contentDark ? "text-slate-100" : "text-slate-900";
  const subText = contentDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className={`min-h-screen flex ${outerBg} transition-colors`}>
      {/* Neon Gradient Background Layer */}
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(0,195,255,0.22), transparent 55%), radial-gradient(circle at bottom, rgba(0,195,255,0.12), transparent 60%)",
        }}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen z-40
          transition-[width] duration-300
        `}
        style={{
          width: sidebarOpen ? "18rem" : "4.5rem", // soft spring feel via cubic-bezier
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Holographic Panel */}
        <div
          className={`
            relative h-full
            border-r border-cyan-500/30
            bg-slate-950/88 backdrop-blur-xl
            shadow-[0_0_26px_rgba(0,195,255,0.35)]
            flex flex-col
          `}
        >
          {/* Neon edge strip */}
          <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-cyan-400 via-cyan-500 to-transparent" />

          {/* Logo / Header */}
          <div className="px-4 py-4 border-b border-cyan-500/24 flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/18 border border-cyan-300/80 flex items-center justify-center shadow-[0_0_12px_rgba(0,195,255,0.55)]">
                <Users className="w-6 h-6 text-cyan-200" />
              </div>
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-wide text-cyan-100">
                  SMARTEYE AI
                </span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-cyan-400/80">
                  VISION SECURITY
                </span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-3">
            {/* MAIN divider with neon line */}
            {sidebarOpen && (
              <div className="px-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold tracking-[0.22em] uppercase text-cyan-400/70">
                    Main
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-cyan-400/70 via-cyan-500/40 to-transparent" />
              </div>
            )}
            <div className="space-y-1">
              {mainSection.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`
                      relative w-full flex items-center
                      ${sidebarOpen ? "gap-3 px-3" : "justify-center"}
                      py-2 rounded-xl text-sm
                      transition-all duration-200
                      ${
                        active
                          ? "bg-cyan-500/18 text-cyan-100 border border-cyan-400/60"
                          : "text-slate-300/80 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-400/35"
                      }
                    `}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 text-cyan-200" />
                    {sidebarOpen && (
                      <span className="font-medium">{item.label}</span>
                    )}
                    {active && (
                      <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-cyan-300" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* MODULES divider with neon line */}
            {sidebarOpen && (
              <div className="px-1 mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold tracking-[0.22em] uppercase text-cyan-400/70">
                    Modules
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-cyan-400/70 via-cyan-500/40 to-transparent" />
              </div>
            )}

            {/* compact spacing for modules */}
            <div className="space-y-1">
              {modules.map((section) => {
                const SectionIcon = section.icon;
                const isOpen = expanded[section.id];
                const isSectionActive = section.items.some((i) =>
                  isActive(i.path)
                );
                const hotkey = section.hotkey;
                const flashing = flashSection === section.id;

                const handleSectionClick = () => {
  if (!sidebarOpen) {
    if (section.firstPath) navigate(section.firstPath);
  } else {
    setExpanded((prev) => {
      const wasOpen = !!prev[section.id];
      const next = {};
      moduleIds.forEach((id) => {
        // if it was open → close all; if it was closed → open only this one
        next[id] = !wasOpen && id === section.id;
      });
      return next;
    });
  }
};

                const handleMouseEnter = () => {
                  if (!sidebarOpen) {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                    }
                    hoverTimeoutRef.current = setTimeout(() => {
                      setHoveredSection(section.id);
                    }, 160);
                  }
                };

                const handleMouseLeave = () => {
                  if (!sidebarOpen) {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    setHoveredSection((prev) =>
                      prev === section.id ? null : prev
                    );
                  }
                };

                return (
                  <div
                    key={section.id}
                    className="relative"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    {/* Section button */}
                    <button
                      className={`
                        relative w-full flex items-center
                        ${sidebarOpen ? "justify-between px-3" : "justify-center"}
                        py-2 rounded-xl text-sm
                        border
                        transition-all duration-200
                        ${
                          isSectionActive || flashing
                            ? "bg-cyan-500/18 text-cyan-100 border-cyan-400/70"
                            : "text-slate-300/80 border-transparent hover:bg-cyan-500/10 hover:border-cyan-400/40"
                        }
                        ${
                          flashing
                            ? "ring-2 ring-cyan-300/80 shadow-[0_0_18px_rgba(0,195,255,0.8)]"
                            : ""
                        }
                      `}
                      onClick={handleSectionClick}
                      title={
                        !sidebarOpen && hotkey
                          ? `${section.label} (${hotkey})`
                          : !sidebarOpen
                          ? section.label
                          : undefined
                      }
                    >
                      <div
                        className={`flex items-center ${
                          sidebarOpen ? "gap-3" : ""
                        }`}
                      >
                        <SectionIcon className="w-5 h-5 text-cyan-200" />
                        {sidebarOpen && (
                          <>
                            <span className="font-medium text-[13px]">
                              {section.label}
                            </span>
                            {hotkey && (
                              <span className="ml-2 text-[10px] px-1.5 py-[1px] rounded-md border border-cyan-400/30 text-cyan-200/80 bg-cyan-500/8">
                                {hotkey}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      {sidebarOpen && (
                        <span className="ml-2 text-cyan-200/80 text-xs">
                          {isOpen ? "−" : "+"}
                        </span>
                      )}
                    </button>

                    {/* Children (full mode) */}
                    {sidebarOpen && (
                      <div
                        className={`
                          ml-4 mt-0.5 border-l border-cyan-500/30 pl-2
                          transform transition-all duration-200 origin-top
                          ${
                            isOpen
                              ? "max-h-64 opacity-100 scale-y-100"
                              : "max-h-0 opacity-0 scale-y-75 overflow-hidden"
                          }
                        `}
                      >
                        {section.items.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.path);
                          return (
                            <button
                              key={item.path}
                              onClick={() => navigate(item.path)}
                              className={`
                                w-full flex items-center gap-2 text-[12px] rounded-lg py-1.5 px-2
                                transition-colors
                                ${
                                  active
                                    ? "bg-cyan-500/20 text-cyan-50"
                                    : "text-slate-300/80 hover:bg-cyan-500/12"
                                }
                              `}
                            >
                              <Icon className="w-4 h-4 text-cyan-200/90" />
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Flyout (mini mode) with Matrix-style reveal */}
                    {!sidebarOpen && (
                      <div
                        className={`
                          absolute left-16 top-1/2 -translate-y-1/2
                          min-w-[220px] py-2.5 px-3
                          bg-slate-950/96 backdrop-blur-xl
                          border border-cyan-400/50
                          rounded-2xl
                          shadow-[0_0_26px_rgba(0,195,255,0.7)]
                          origin-top-left
                          transform transition-all duration-180
                          ${
                            hoveredSection === section.id
                              ? "opacity-100 scale-y-100 translate-x-0"
                              : "opacity-0 scale-y-75 -translate-y-1 translate-x-3 pointer-events-none"
                          }
                        `}
                      >
                        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 bg-slate-950/96 border-l border-t border-cyan-400/50 rotate-45" />

                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <SectionIcon className="w-4 h-4 text-cyan-200" />
                            <span className="text-[11px] font-semibold text-cyan-100 uppercase tracking-wide">
                              {section.label}
                            </span>
                          </div>
                          {hotkey && (
                            <span className="text-[10px] px-1.5 py-[1px] rounded-md border border-cyan-400/40 text-cyan-200/80">
                              {hotkey}
                            </span>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          {section.items.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                              <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`
                                  w-full flex items-center gap-2 text-[12px] rounded-md py-1.5 px-2
                                  transition-colors
                                  ${
                                    active
                                      ? "bg-cyan-500/22 text-cyan-50"
                                      : "text-slate-300/90 hover:bg-cyan-500/12"
                                  }
                                `}
                              >
                                <Icon className="w-4 h-4 text-cyan-200/90" />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SYSTEM divider with neon line */}
            {sidebarOpen && (
              <div className="px-1 mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold tracking-[0.22em] uppercase text-cyan-400/70">
                    System
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-cyan-400/70 via-cyan-500/40 to-transparent" />
              </div>
            )}

            <div className="space-y-1 mt-1">
              {system.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`
                      relative w-full flex items-center
                      ${sidebarOpen ? "gap-3 px-3" : "justify-center"}
                      py-2 rounded-xl text-sm
                      transition-all duration-200
                      ${
                        active
                          ? "bg-cyan-500/18 text-cyan-100 border border-cyan-400/60"
                          : "text-slate-300/80 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-400/35"
                      }
                    `}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon className="w-5 h-5 text-cyan-200" />
                    {sidebarOpen && (
                      <span className="font-medium">{item.label}</span>
                    )}
                    {active && (
                      <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-cyan-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* User / Footer */}
          <div className="px-3 py-3 border-t border-cyan-500/22 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-cyan-500/18 border border-cyan-300 flex items-center justify-center">
                  <span className="text-xs font-semibold text-cyan-100">
                    {userInitial}
                  </span>
                </div>
              </div>
              {sidebarOpen && (
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-cyan-50">
                    {user.full_name}
                  </span>
                  <span className="text-[10px] text-cyan-300/80 uppercase tracking-wide">
                    {user.role}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode((d) => !d)}
                className="p-1.5 rounded-lg bg-slate-900/80 border border-cyan-500/40 hover:bg-slate-800/80 transition-colors"
                title="Toggle theme"
              >
                {darkMode ? (
                  <Sun className="w-4 h-4 text-amber-300" />
                ) : (
                  <Moon className="w-4 h-4 text-cyan-300" />
                )}
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg bg-red-500/10 border border-red-400/60 hover:bg-red-500/20 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 text-red-300" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div
        className={`
          flex-1 min-h-screen relative
          transition-all duration-300
        `}
        style={{
          marginLeft: sidebarOpen ? "18rem" : "4.5rem",
          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Top bar */}
        <header
          className={`
            sticky top-0 z-20 px-6 py-4 flex items-center justify-between
            ${headerBg} backdrop-blur-xl border-b border-cyan-500/20
          `}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((open) => !open)}
              className="p-2 rounded-lg bg-slate-900/80 border border-cyan-500/40 hover:bg-slate-800/80 transition-colors text-cyan-200"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-cyan-300/90 tracking-[0.22em] uppercase">
                Realtime Vision Console
              </span>
              <span className={`text-[11px] ${subText}`}>
                Use Shift + 1..6 to jump between modules
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-xs font-medium ${mainText}`}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p className={`text-[11px] ${subText}`}>
              {new Date().toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </header>

        {/* Content */}
        <main className={`p-6 ${contentBg}`}>
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default PluginWrapper;