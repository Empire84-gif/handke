import { Plus, Search } from "lucide-react";

function Topbar({ activeMenu }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Moduł aplikacji</p>
        <h1>{activeMenu}</h1>
      </div>

      <div className="topbar-actions">
        <div className="topbar-search">
          <Search size={16} />
          <input type="text" placeholder="Szukaj..." />
        </div>

        <button className="outline-button" type="button">
          <Plus size={16} />
          Dodaj
        </button>
      </div>
    </header>
  );
}

export default Topbar;