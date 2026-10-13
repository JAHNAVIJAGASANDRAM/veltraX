# VeltraX Security

## Security Model

VeltraX is an agentic-security extension for Veltra. The core security boundary is that an AI agent may request an action, but it does not become the authorization authority.

Authorization is enforced server-side using:

- Authenticated session identity
- Workspace membership
- Server-derived workspace role
- Server-derived agent capabilities
- Tool-specific authorization policy
- Per-user delegated OAuth grants
- Required OAuth scopes
- Strict tool argument validation
- Audit logging

Client-supplied identity, workspace, role, or capability information is not trusted for authorization.

## Identity and Workspace Isolation

The authenticated session establishes the user identity.

Workspace authorization is derived from the authenticated user's workspace membership. The workspace role is obtained server-side and is not accepted from the agent or request body.

The server constructs the agent authorization context from the authenticated session and workspace membership. The agent cannot select the user, workspace, role, or capabilities used for authorization.

## RBAC and Agent Capabilities

Agent tools declare the capability required to execute them. The server derives available agent capabilities from the authenticated user's server-side workspace role and evaluates the requested tool against those capabilities.

Client-supplied role or capability values cannot elevate privileges. Unauthorized operations fail closed.

## Cross-Workspace Protection

Workspace resources are resolved using the server-derived workspace context. A request authenticated as a member of one workspace cannot operate on resources belonging to another workspace through the agent endpoint.

## Tool Argument Validation

Agent tool arguments are validated server-side. Validation includes strict object validation, rejection of unknown arguments, UUID validation, string type and length validation, task status validation, and GitHub owner/repository validation.

## OAuth Security

OAuth credentials are delegated per authenticated user. Agent tools obtain grants using the server-derived user identity.

OAuth grants are bound to a user and provider, encrypted at rest, checked for revocation, and checked for required scopes.

OAuth state is cryptographically random, stored as a SHA-256 hash, bound to the authenticated session and provider, single-use, and expiring.

OAuth callbacks reject state values belonging to another session.

## Credential Protection

OAuth access tokens are encrypted before database storage. GitHub tools use the delegated token only for outbound GitHub API requests and return selected GitHub resource fields rather than the credential.

GitHub API failures are converted into safe application errors.

## Prompt-Injection Boundary

Prompt content can request an action, but authorization remains determined by server-side identity, workspace membership, role, capability policy, resource isolation, and OAuth grant requirements.

A prompt cannot grant the agent additional privileges by instructing it to assume another identity, workspace, role, or credential.

## Auditability

Agent tool execution records the server-derived actor and workspace context. Audit records include authorization outcome, execution status, and request correlation ID (`requestId`) stored in structured metadata.

## Conversational Agent Hardening

The conversational LLM workflow enforces strict application security boundaries:

- **Isolated Server Authorization**: The LLM functions strictly as a conversational planner. Model output cannot supply or override actor identity, workspace IDs, roles, or capabilities.
- **Controlled Tool Exposure**: Only non-destructive tools (`list_projects`, `create_project`, `update_project`, `list_tasks`, `create_task`, `update_task`, `github_get_user`, `github_list_repositories`, `github_get_repository`) are exposed. Deletion tools are excluded from conversational schemas.
- **Strict Server Validation & Schema Drift Detection**: Model arguments are validated server-side for structure, UUID validity, string length limits, and enum constraints. Automated tests guarantee zero schema drift between conversational tool schemas and backend validators.
- **Bounded Invocations**: Input messages are bounded to 4,000 characters. Conversational turns are capped at 4 rounds and 6 total tool executions per turn. Provider failures do not automatically retry mutating tools.
- **Provider Security & Error Sanitization**: API keys are restricted to server environment variables. Upstream provider errors, auth rejections, and rate limits are mapped to generic, typed responses without exposing credentials or internal response bodies.

## Security Test Coverage

The API test suite currently contains 116 tests: 116 passing, 0 failing, 0 cancelled, 0 skipped, and 0 TODO.

Security-focused tests cover client identity spoofing, role/capability spoofing, unauthenticated access, cross-workspace access, RBAC enforcement, OAuth grant isolation, OAuth scope enforcement, OAuth state session binding, single-use and expiration, token encryption and tamper detection, revoked grants, GitHub delegated-token usage, response sanitization, provider failure mapping, tool execution failure handling, prompt-injection defense, schema drift detection, execution bounds, and request-correlated audit attribution.

## Security Principle

> The agent can request an action, but it cannot decide who it is acting as, which workspace it belongs to, or what permissions it has.

Authorization is enforced outside the AI model at the application security boundary.
