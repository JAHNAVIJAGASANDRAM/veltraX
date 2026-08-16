function Topbar() {
  return (
    <header className="topbar">
      <div>
        <div className="workspace-label">Workspace</div>
        <h1>My Workspace</h1>
      </div>

      <div className="topbar-user">
        <div className="avatar">U</div>

        <div>
          <div className="user-name">User</div>
          <div className="user-role">Workspace member</div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;