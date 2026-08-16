function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">V</div>

        <div>
          <div className="brand-name">VeltraX</div>
          <div className="brand-subtitle">Secure workspace</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <button className="nav-item active" type="button">
          <span>⌂</span>
          Dashboard
        </button>

        <button className="nav-item" type="button">
          <span>▣</span>
          Projects
        </button>

        <button className="nav-item" type="button">
          <span>✓</span>
          Tasks
        </button>

        <button className="nav-item" type="button">
          <span>◷</span>
          Activity
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="security-status">
          <span className="status-dot" />
          Security layer active
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;