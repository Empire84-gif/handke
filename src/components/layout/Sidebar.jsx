import { LogOut } from "lucide-react";

import logo from "../../assets/logo.png";
import { menuItems } from "../../data/menuItems";
import { getLogoSrc } from "../../utils/settingsUtils";

export default function Sidebar({
  activeMenu,
  setActiveMenu,
  onLogout,
  settings,
}) {
  const logoSrc = getLogoSrc(settings?.logo_path, logo);
  const brandName = settings?.brand_name || "SDE";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img className="sidebar-logo" src={logoSrc} alt={brandName} />
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              type="button"
              className={`menu-link ${activeMenu === item.name ? "is-active" : ""}`}
              onClick={() => setActiveMenu(item.name)}
            >
              <Icon size={17} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-logout-button"
          type="button"
          onClick={onLogout}
        >
          <LogOut size={17} />
          <span>Wyloguj</span>
        </button>
      </div>
    </aside>
  );
}