# VeltraX

> A multi-user workspace where AI agents act within the authenticated user's authorization context, including permissions and optionally delegated OAuth access to external services.

## Agentic Security Extension for Veltra

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

VeltraX addresses these risks by enforcing identity, workspace boundaries, permissions, and delegated access **outside the AI model**.

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



## LLM-powered agent chat

VeltraX supports an OpenAI-compatible chat-completions provider through a small adapter. Existing direct tool execution remains available; conversational requests use the same registry, validator, capability policy, OAuth grant resolution, and audit service.

Configure these optional variables in the root `.env` (never commit real credentials):

```dotenv
LLM_API_KEY=your-provider-api-key
LLM_MODEL=gpt-4o-mini
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_TIMEOUT_MS=20000
```

A provider compatible with the OpenAI chat-completions tool-call format can be selected by changing `LLM_API_URL` and `LLM_MODEL`. The default endpoint is OpenAI; provider usage may incur charges. Do not assume API access is free. The chat feature makes external requests only when `/agent/chat` is called. No provider key is required for the existing direct tool route or unit tests.

Start the app as usual with `pnpm install`, configure the existing PostgreSQL and session/OAuth variables, run `pnpm db:migrate`, then `pnpm dev`.

### Conversational endpoint

`POST /api/workspaces/:workspaceId/agent/chat`

Requires the existing authenticated session cookie and workspace membership. Example request:

```http
POST /api/workspaces/<workspace-uuid>/agent/chat
Content-Type: application/json
Cookie: veltrax_session=<session-cookie>
X-Request-Id: demo-chat-001

{"message":"List the projects in my workspace"}
```

A successful response contains `message`, `toolCalls`, and `requestId`. Tool calls are bounded per request. Tool schemas omit user IDs, workspace IDs, roles, and permissions. Destructive task/project deletion tools are intentionally not exposed through chat; the existing direct tool endpoint retains its server-side policy checks.

### Security and operational notes

- Every model-requested tool passes through the existing backend tool execution service and server-derived RBAC. Model output cannot grant permissions or change identity.
- Arguments are parsed as JSON and validated again by the backend. Unknown tools and malformed arguments are rejected without executing them.
- Provider keys are read from environment variables, not prompts or tool results. Provider errors returned to clients are deliberately generic.
- Request IDs are returned in the response and attached to audit metadata for executed tools.
- This is not RAG: the repository currently has no verified document-ingestion and vector-retrieval pipeline. Workspace project/task tools are used instead.
- Chat completion depends on a reachable configured provider and may incur API charges. Provider-specific endpoint compatibility can vary. Tool results are bounded by request-level tool-call limits, but the application still needs operational rate limiting before public deployment.
