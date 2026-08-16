function Dashboard() {
  return (
    <section className="dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Workspace dashboard</h2>
          <p className="muted">
            Manage projects, tasks, collaboration, and security activity.
          </p>
        </div>

        <div className="security-badge">
          <span className="status-dot" />
          API connected
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Projects</span>
          <strong>0</strong>
          <small>Active workspace projects</small>
        </article>

        <article className="stat-card">
          <span>Tasks</span>
          <strong>0</strong>
          <small>Tasks across your projects</small>
        </article>

        <article className="stat-card">
          <span>Comments</span>
          <strong>0</strong>
          <small>Recent collaboration</small>
        </article>

        <article className="stat-card">
          <span>Security events</span>
          <strong>0</strong>
          <small>Recent audit activity</small>
        </article>
      </div>

      <div className="dashboard-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Projects</h3>
              <p>Your workspace projects will appear here.</p>
            </div>

            <button type="button" className="primary-button">
              New project
            </button>
          </div>

          <div className="empty-state">
            <div className="empty-icon">+</div>
            <strong>No projects yet</strong>
            <p>Create your first project to get started.</p>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Recent activity</h3>
              <p>Security and collaboration events.</p>
            </div>
          </div>

          <div className="empty-state compact">
            <div className="empty-icon">◷</div>
            <strong>No recent activity</strong>
            <p>Activity events will appear here.</p>
          </div>
        </article>
      </div>
    </section>
  );
}

export default Dashboard;