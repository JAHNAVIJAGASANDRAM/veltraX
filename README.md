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

VeltraX supports an OpenAI-compatible chat-completions provider through a modular adapter. Existing direct tool execution remains fully available; conversational requests use the exact same server-side registry, validator, capability policy, OAuth grant resolution, and audit logging service.

### Provider Configuration and Safe Key Management

Configure these optional variables in your root `.env` (never commit real credentials):

```dotenv
LLM_API_KEY=your-provider-api-key
LLM_MODEL=gpt-4o-mini
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_TIMEOUT_MS=20000
```

- **Environment-Only Secrets**: Provider API keys are read strictly from environment variables at runtime. They are never placed in prompts, tool definitions, model-visible data, client responses, database records, or server logs.
- **Strict Endpoint and Model Validation**: The configured `LLM_API_URL` is validated to ensure HTTP/HTTPS protocol; timeouts are bounded between 1,000ms and 120,000ms.
- **Sanitized Provider Errors**: Provider failures, rate limits (HTTP 429), auth rejections (HTTP 401/403), timeouts, and HTTP 5xx responses are mapped to safe, typed client responses without leaking upstream headers or response bodies.
- **Deterministic Offline Testing**: Tests use deterministic provider mocks without making outbound network requests or incurring API charges. The application remains fully operable without an LLM key when chat is not invoked.

---

### Supported Agent Tools

#### Conversational LLM Tools (`AGENT_LLM_TOOLS`)
The conversational workflow intentionally exposes only non-destructive tools:

| Tool Name | Description | Required Arguments | Capabilities / OAuth Scope |
| :--- | :--- | :--- | :--- |
| `list_projects` | List projects in the current workspace | None | `PROJECT_VIEW` |
| `create_project` | Create a new project in the workspace | `name` (string, 1-255 chars) | `PROJECT_CREATE` |
| `update_project` | Update project metadata | `project_id` (UUID), `name` (string) | `PROJECT_UPDATE` |
| `list_tasks` | List tasks in a workspace project | `project_id` (UUID) | `TASK_VIEW` |
| `create_task` | Create a task in a project | `project_id` (UUID), `title` (string, 1-255 chars) | `TASK_CREATE` |
| `update_task` | Update task details and status | `task_id` (UUID), `title` (string), `status` (enum) | `TASK_UPDATE` |
| `github_get_user` | View connected GitHub profile | None | `GITHUB_USER_VIEW` (`read:user`) |
| `github_list_repositories` | List accessible GitHub repositories | None | `GITHUB_REPOSITORY_VIEW` |
| `github_get_repository` | Get repository metadata | `owner` (string), `repo` (string) | `GITHUB_REPOSITORY_VIEW` |

#### Direct-Only Administrative Tools
- `delete_project`: Permitted exclusively through the direct agent tool route (`/agent/tool`) for workspace owners. Intentionally excluded from conversational LLM schemas to prevent destructive prompt-injection attacks.
- `delete_task`: Permitted exclusively through the direct agent tool route (`/agent/tool`) for workspace owners.

---

### Conversational Endpoint

`POST /api/workspaces/:workspaceId/agent/chat`

Requires an authenticated session cookie and active workspace membership.

#### Example Request

```http
POST /api/workspaces/8f3b207a-4286-4e50-a3bc-2d1f7362a901/agent/chat
Content-Type: application/json
Cookie: veltrax_session=s%3A...
X-Request-Id: chat-req-401

{
  "message": "List my workspace projects and create a task for the roadmap."
}
```

#### Example Response

```json
{
  "message": "I have retrieved your projects and created the requested task.",
  "toolCalls": [
    {
      "tool": "list_projects",
      "ok": true,
      "result": {
        "projects": [
          {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "name": "Platform Core",
            "description": "Core workspace services"
          }
        ]
      }
    },
    {
      "tool": "create_task",
      "ok": true,
      "result": {
        "task": {
          "id": "110e8400-e29b-41d4-a716-446655440001",
          "project_id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "Platform Roadmap",
          "status": "TODO"
        }
      }
    }
  ],
  "requestId": "chat-req-401"
}
```

---

### Running Migrations and Tests

```bash
# Install dependencies using frozen lockfile
pnpm install

# Run database migrations
pnpm db:migrate

# Run migrations against isolated test database
pnpm db:migrate --envPath .env.test

# Run the full API security test suite (116 tests)
pnpm --filter @veltrax/api test
```

---

### Security and Architectural Boundary

1. **Non-Negotiable Server Boundary**: The model is an untrusted planner. Identity, workspace membership, user role, and capabilities are derived server-side from the authenticated session and database. Model output cannot select a different actor, workspace, role, or capability.
2. **Strict Tool Validation & Drift Protection**: Model arguments are parsed as JSON, validated server-side, and rejected if malformed or containing unexpected arguments. Automated tests verify zero drift between LLM schemas and backend validators.
3. **Audit Attribution**: All tool invocations (allowed, denied, invalid arguments, unknown tools) are recorded in `agent_tool_calls` with the authenticated actor, workspace, outcome, and request correlation ID (`requestId`).
4. **Execution Bounds**: Request messages are bounded to 4,000 characters. Conversational workflows enforce hard limits of 4 planning rounds and 6 total tool calls per turn to eliminate infinite invocation loops.
5. **No Mutating Retries**: Provider failures do not automatically retry mutating operations, preventing duplicate project or task creations.

---

### RAG Evaluation and Architecture Decision

**Decision: RAG is explicitly deferred.**

VeltraX is a project and task workspace with external GitHub OAuth tooling. It currently possesses no internal document repository, PDF/markdown document ingestion pipeline, file storage service, or unstructured text knowledge base.

Rather than inventing artificial mock document sources or introducing external vector databases without genuine document data, retrieval is performed using real structured workspace queries (`list_projects`, `list_tasks`, `github_get_repository`).

---

### Feature Status: Verified vs. Planned Work

#### Verified & Implemented
- [x] OpenAI-compatible LLM provider adapter with strict error mapping (401/403/429/5xx/timeout).
- [x] Provider payload and finish_reason validation, response size limits, and tool-call structure validation.
- [x] Authenticated conversational endpoint (`POST /api/workspaces/:workspaceId/agent/chat`).
- [x] Server-derived RBAC, capability validation, and workspace isolation outside the model.
- [x] Strict argument validation with UUID and task status enforcement for all tools.
- [x] Automated schema drift test between LLM tool definitions and validation registry.
- [x] Excluded destructive deletion tools from chat interface.
- [x] Request correlation ID tracking end-to-end through audit metadata.
- [x] Complete 116-test automated security suite across unit, provider, orchestration, and DB integration tests.

#### Planned Work
- [ ] Production-grade distributed rate limiting middleware (e.g., Redis token bucket).
- [ ] Interactive human-in-the-loop explicit confirmation mechanism for sensitive conversational actions.
- [ ] Document repository and chunked embedding pipeline if unstructured documentation storage is added to the product.

