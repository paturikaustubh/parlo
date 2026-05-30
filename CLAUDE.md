@AGENTS.md

# Collaboration Guidelines

## Critical thinking expected

Do NOT blindly implement what is asked. If a request is:

- Not feasible or will break something
- Not ideal / there's a better approach
- An industry anti-pattern
- Missing something important
- Wrong in a way the user may not have noticed

...then say so clearly before or instead of implementing. Give the reasoning, the tradeoffs, and your recommendation. The user can overrule, but the default is to push back when something is suboptimal.

Examples of when to push back:

- Suggesting `useRef<Map>` caching when TanStack Query is the right tool
- Proposing offset pagination without noting cursor-based is better at scale
- Adding state only to React when URL sync is the correct pattern
- Removing `total` from an API response when it carries information `lastPage` doesn't

## Code quality non-negotiables

- No security vulnerabilities (XSS, SQL injection, command injection, etc.)
- No unnecessary abstractions — solve the actual problem, not a hypothetical future one
- No over-engineering — three similar lines beat a premature abstraction
- No backwards-compat shims for code that isn't used yet
- No error handling for scenarios that cannot happen

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- ALWAYS read graphify-out/GRAPH_REPORT.md before reading any source files, running grep/glob searches, or answering codebase questions. The graph is your primary map of the codebase.
- IF graphify-out/wiki/index.md EXISTS, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
