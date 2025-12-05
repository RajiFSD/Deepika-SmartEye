import { useState, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { mainItems, expandableSections, systemItems } from "@/sidebarConfig";
import "./sidebar.css";

export default function Sidebar() {
  const location = useLocation();
  const [openSection, setOpenSection] = useState("CameraManagement"); // default open

  const handleToggle = (id) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  // determine which section is active from URL
  const isSectionActive = (section) =>
    section.items?.some((item) => location.pathname.startsWith(item.path));

  const sectionsWithActive = useMemo(
    () =>
      expandableSections.map((section) => ({
        ...section,
        active: isSectionActive(section),
      })),
    [location.pathname]
  );

  return (
    <aside className="sidebar">
      {/* Logo / header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-circle">S</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">SmartEye AI</span>
          <span className="sidebar-logo-subtitle">Security Platform</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* MAIN */}
        <SidebarSectionLabel label="MAIN" />
        {mainItems.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}

        {/* MODULES */}
        <SidebarSectionLabel label="MODULES" />
        {sectionsWithActive.map((section) => (
          <ExpandableSection
            key={section.id}
            section={section}
            isOpen={openSection === section.id}
            onToggle={() => handleToggle(section.id)}
          />
        ))}

        {/* SYSTEM */}
        <SidebarSectionLabel label="SYSTEM" />
        {systemItems.map((item) => (
          <NavItem key={item.id} item={item} />
        ))}
      </nav>

      {/* Footer / user */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">A</div>
          <div className="sidebar-user-meta">
            <div className="sidebar-user-name">Arun</div>
            <div className="sidebar-user-role">admin</div>
          </div>
        </div>
        <button className="sidebar-logout">
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

function SidebarSectionLabel({ label }) {
  return <div className="sidebar-section-label">{label}</div>;
}

function NavItem({ item }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        "sidebar-item" + (isActive ? " sidebar-item-active" : "")
      }
    >
      <Icon className="sidebar-item-icon" />
      <span className="sidebar-item-label">{item.label}</span>
    </NavLink>
  );
}

function ExpandableSection({ section, isOpen, onToggle }) {
  const Icon = section.icon;
  const anyChildActive = section.active;

  return (
    <div className="sidebar-expandable">
      <button
        type="button"
        className={
          "sidebar-item sidebar-expandable-header" +
          (anyChildActive ? " sidebar-item-active" : "")
        }
        onClick={onToggle}
      >
        <Icon className="sidebar-item-icon" />
        <span className="sidebar-item-label">{section.label}</span>
        {isOpen ? (
          <ChevronDown className="sidebar-expand-chevron" />
        ) : (
          <ChevronRight className="sidebar-expand-chevron" />
        )}
      </button>

      <div className={`sidebar-expandable-body ${isOpen ? "open" : ""}`}>
        {section.items?.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </div>
    </div>
  );
}