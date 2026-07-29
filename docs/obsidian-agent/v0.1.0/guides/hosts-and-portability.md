# Hosts and portability

The canonical registry defines each workflow once and records whether it is portable. Native packages are provided for Claude, Codex, Gemini, and OpenCode; AgentSkills is the portable fallback.

Host adapters package or delegate to canonical skill files. They must not fork workflow behavior or introduce host-specific vault semantics.
