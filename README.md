# veltraX
A multi-user workspace where AI agents inherit the authenticated user's authorization context, including permissions and optionally delegated OAuth access to external services.


### Agentic Security Extension for Veltra

VeltraX is an agentic-security extension of **Veltra**, a multi-user virtual workspace that enables AI agents to perform workspace and external-service actions on behalf of authenticated users.

The core objective is to ensure that an AI agent can **perform actions without becoming an authorization authority**.

> **The agent can request an action, but it cannot decide who it is acting as, which workspace it belongs to, or what permissions it has.**

---

## Overview

AI agents can interact with applications through tools and APIs, but giving an agent unrestricted access can introduce risks such as:

- Cross-user access
- Cross-workspace data exposure
- RBAC bypass
- Privilege escalation
- Unauthorized tool execution
- Prompt injection
- OAuth credential misuse
- Loss of action attribution

VeltraX addresses these problems by enforcing identity, workspace boundaries, permissions, and delegated access **outside the AI model**.

---

## Architecture

```text
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
