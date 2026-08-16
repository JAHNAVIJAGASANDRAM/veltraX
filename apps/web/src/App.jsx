import { useEffect, useState } from "react";
import "./App.css";

const icons = {
  overview: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </svg>
  ),

  projects: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8a3 3 0 0 1 3-3h3l2 2h5a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8Z" />
    </svg>
  ),

  tasks: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="m8 12 2.5 2.5L16.5 9" />
    </svg>
  ),

  activity: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 16.5 8 12l3 3 5-7 4 3.5" />
      <path d="M4 20h16" />
    </svg>
  ),

  search: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </svg>
  ),

  bell: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 9a6 6 0 0 0-12 0c0 5-2 6-2 7h16c0-1-2-2-2-7Z" />
      <path d="M9.5 20h5" />
    </svg>
  ),

  chevron: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 9 5 5 5-5" />
    </svg>
  ),

  plus: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),

  arrow: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  ),

  shield: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 20 6v5c0 5-3.3 8.5-8 10-4.7-1.5-8-5-8-10V6l8-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  ),

  layers: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 4 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="m4 16 8 4 8-4" />
    </svg>
  ),

  comment: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
    </svg>
  ),

  check: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4L19 7" />
    </svg>
  ),
};

const navigation = [
  { label: "Overview", icon: icons.overview },
  { label: "Projects", icon: icons.projects },
  { label: "Tasks", icon: icons.tasks },
  { label: "Activity", icon: icons.activity },
];

const projects = [
  {
    name: "Veltra Workspace",
    description: "Product development",
    tasks: 8,
    status: "Active",
  },
  {
    name: "Security Controls",
    description: "Security engineering",
    tasks: 5,
    status: "Active",
  },
  {
    name: "Agent Integration",
    description: "Agentic security",
    tasks: 5,
    status: "Planning",
  },
];

const activities = [
  {
    icon: icons.layers,
    title: "Project activity recorded",
    detail: "Activity Audit Test",
    time: "2 min ago",
  },
  {
    icon: icons.check,
    title: "Task status changed",
    detail: "Activity Task Audit Test",
    time: "8 min ago",
  },
  {
    icon: icons.comment,
    title: "Comment updated",
    detail: "Task collaboration",
    time: "14 min ago",
  },
  {
    icon: icons.shield,
    title: "Policy enforcement active",
    detail: "Workspace protection",
    time: "Today",
  },
];

function App() {
  const [apiStatus, setApiStatus] = useState("checking");
  const [activePage, setActivePage] = useState("Overview");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("API request failed");
        }

        return response.json();
      })
      .then((data) => {
        setApiStatus(data.status);
      })
      .catch(() => {
        setApiStatus("error");
      });
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">V</div>

          <div className="brand-name">
            Veltra<span>X</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${
                activePage === item.label ? "active" : ""
              }`}
              type="button"
              onClick={() => setActivePage(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="protected-card">
            <div className="protected-top">
              <div className="protected-icon">{icons.shield}</div>

              <div>
                <strong>Protected</strong>
                <span className="status-dot" />
              </div>
            </div>

            <p>Security layer active</p>
            <span>Policy enforcement enabled</span>
          </div>

          <div className="version">VeltraX v0.1.0</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            <span className="breadcrumb-icon">{icons.overview}</span>
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-right">
            <div className="search-box">
              {icons.search}
              <input placeholder="Search..." />
            </div>

            <button
              className="topbar-icon"
              type="button"
              aria-label="Notifications"
            >
              {icons.bell}
              <span className="notification-dot" />
            </button>

            <div className="user-menu">
              <div className="avatar">J</div>

              <div className="user-details">
                <strong>Workspace Admin</strong>
                <span>Administrator</span>
              </div>

              <span className="user-chevron">{icons.chevron}</span>
            </div>
          </div>
        </header>

        <div className="content">
          <section className="hero-card">
            <div className="hero-content">
              <span className="eyebrow">WORKSPACE OVERVIEW</span>

              <h1>Good morning,</h1>

              <p>
                Manage your projects, tasks and secure collaboration
                from one protected workspace.
              </p>

              <div className="hero-actions">
                <button className="primary-button" type="button">
                  {icons.plus}
                  <span>New project</span>
                </button>

                <button className="secondary-button" type="button">
                  {icons.activity}
                  <span>View activity</span>
                </button>
              </div>
            </div>

            <div className="hero-security">
              <div className="protected-pill">
                {icons.shield}
                <span>Protected</span>
              </div>

              <div className="security-line">
                <span>{icons.check}</span>
                Security layer active
              </div>

              <div className="security-line">
                <span>{icons.check}</span>
                Policy enforcement enabled
              </div>

              <div className="security-line">
                <span>{icons.check}</span>
                Workspace protected
              </div>
            </div>

            <div className="hero-waves" />
          </section>

          <section className="stats-grid">
            <StatCard
              icon={icons.layers}
              label="Projects"
              value="04"
              description="Active workspaces"
              change="12%"
            />

            <StatCard
              icon={icons.tasks}
              label="Tasks"
              value="18"
              description="Across all projects"
              change="18%"
            />

            <StatCard
              icon={icons.comment}
              label="Comments"
              value="27"
              description="Recent collaboration"
              change="22%"
            />

            <StatCard
              icon={icons.shield}
              label="Security events"
              value="03"
              description="Reviewed today"
              change="0%"
            />
          </section>

          <section className="dashboard-grid">
            <div className="panel projects-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-label">WORK</span>
                  <h2>Your projects</h2>
                </div>

                <button className="view-all-button" type="button">
                  <span>View all</span>
                  {icons.arrow}
                </button>
              </div>

              <div className="project-list">
                {projects.map((project) => (
                  <div className="project-row" key={project.name}>
                    <div className="project-icon">
                      {project.name === "Security Controls"
                        ? icons.shield
                        : project.name === "Agent Integration"
                          ? icons.layers
                          : icons.overview}
                    </div>

                    <div className="project-info">
                      <strong>{project.name}</strong>
                      <span>
                        {project.description} · {project.tasks} tasks
                      </span>
                    </div>

                    <span
                      className={`project-status ${
                        project.status === "Planning"
                          ? "planning"
                          : ""
                      }`}
                    >
                      <span />
                      {project.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel activity-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-label">AUDIT</span>
                  <h2>Recent activity</h2>
                </div>

                <div className="live-status">
                  <span />
                  Live
                </div>
              </div>

              <div className="activity-list">
                {activities.map((activity) => (
                  <div className="activity-row" key={activity.title}>
                    <div className="activity-marker">
                      {activity.icon}
                    </div>

                    <div className="activity-info">
                      <strong>{activity.title}</strong>
                      <span>{activity.detail}</span>
                    </div>

                    <time>{activity.time}</time>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="security-banner">
            <div className="security-banner-icon">
              {icons.shield}
            </div>

            <div className="security-banner-content">
              <span className="panel-label">SECURITY STATUS</span>

              <h2>VeltraX protection is active</h2>

              <p>
                Workspace actions are authenticated, authorized and
                recorded in the activity audit trail.
              </p>
            </div>

            <div className="api-status">
              <span
                className={`api-indicator ${
                  apiStatus === "ok" ? "online" : ""
                }`}
              />

              <div>
                <strong>API {apiStatus}</strong>
                <span>Backend connection</span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, description, change }) {
  return (
    <article className="stat-card">
      <div className="stat-icon">{icon}</div>

      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>

      <div className="stat-change">↗ {change}</div>
    </article>
  );
}

export default App;