veltraX

A multi-user workspace where AI agents act within the authenticated user's authorization context, including permissions and optionally delegated OAuth access to external services.

Agentic Security Extension for Veltra

VeltraX is an agentic-security extension of Veltra, a multi-user virtual workspace that enables AI agents to perform workspace and external-service actions on behalf of authenticated users.

The core objective is to ensure that an AI agent can perform actions without becoming an authorization authority.

The agent can request an action, but it cannot decide who it is acting as, which workspace it belongs to, or what permissions it has.

Overview

AI agents can interact with applications through tools and APIs, but giving an agent unrestricted access can introduce risks such as:

Cross-user access
Cross-workspace data exposure
RBAC bypass
Privilege escalation
Unauthorized tool execution
Prompt injection
OAuth credential misuse
Loss of action attribution

VeltraX addresses these risks by enforcing identity, workspace boundaries, permissions, and delegated access outside the AI model.

Architecture
                    VELTRA
                       |
                       v
              +------------------+
              | Authentication   |
              +--------+---------+
                       |
                User Identity
                       |
                       v
              +------------------+
              | Workspace + RBAC |
              +--------+---------+
                       |
                       v
              +------------------+
              |   VeltraX Agent  |
              +--------+---------+
                       |
                   Tool Request
                       |
                       v
              +------------------+
              | Authorization    |
              |   Enforcement    |
              +--------+---------+
                       |
                 +-----+-----+
                 |           |
               DENY        ALLOW
                 |           |
                 v           v
               Stop     Execute Action
                             |
                    +--------+--------+
                    |                 |
                    v                 v
               Veltra Data       External APIs
                                  GitHub / etc.

The AI agent is responsible for requesting actions. Authorization and execution remain under application control.

Key Security Principles
Server-derived identity — the agent cannot choose or change the authenticated user.
Workspace isolation — actions remain within the user's authorized workspace.
RBAC enforcement — AI actions are subject to application permissions.
Controlled tool execution — the agent can request tools, but the backend determines whether they can execute.
Per-user OAuth — external services can be accessed through the appropriate user's delegated authorization.
Credential isolation — OAuth credentials remain outside the model's context.
Prompt-injection resistance — untrusted content cannot directly change authorization context.
Auditability — AI-triggered actions can be attributed to the authenticated user.
Technology Stack
React
JavaScript
Node.js
Express
PostgreSQL
LLM API / Tool Calling
OAuth 2.0
Docker
Project Status

🚧 Active Development

VeltraX is being developed as a security-focused extension of Veltra, with the implementation centered around:

Authentication
Multi-user workspaces
RBAC
AI agent tool execution
Server-side authorization
Per-user OAuth
Security testing
Auditability
Project Goal

VeltraX aims to demonstrate how AI agents can operate inside a real multi-user application without becoming an authorization authority.

The project focuses on maintaining the application's existing security boundaries while allowing AI agents to perform useful actions on behalf of authenticated users.
