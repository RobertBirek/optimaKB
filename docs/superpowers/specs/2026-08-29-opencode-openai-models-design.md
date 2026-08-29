# OpenCode OpenAI Model Configuration

## Goal

Configure OpenAI models as the defaults for OpenCode globally and in the
`/docker/openspg` project. Assign OpenAI models to every project agent that
currently names another provider.

## Scope

Change these files:

- `~/.config/opencode/opencode.jsonc`
- `/docker/openspg/opencode.json`
- `/docker/openspg/.opencode/agent/frontend.md`
- `/docker/openspg/.opencode/agent/kb-ops.md`
- `/docker/openspg/.opencode/agent/codex-openspg-delegate.md`
- `/docker/openspg/.opencode/agent/daily-ops.md`

Preserve all unrelated configuration, including plugins, MCP servers,
permissions, skills, references, commands, and provider credentials.

## Model Assignment

Use this balanced profile:

| Target | Model |
|---|---|
| Global `model` | `openai/gpt-5.6-sol` |
| Global `small_model` | `openai/gpt-5.4-mini-fast` |
| Project `model` | `openai/gpt-5.6-sol` |
| Project `small_model` | `openai/gpt-5.4-mini-fast` |
| `frontend` | `openai/gpt-5.6-sol` |
| `kb-ops` | `openai/gpt-5.6-sol` |
| `codex-openspg-delegate` | `openai/gpt-5.6-sol` |
| `daily-ops` | `openai/gpt-5.4-mini-fast` |

Do not set `enabled_providers` or `disabled_providers`. Other providers remain
available for manual fallback, but no configured default or project agent uses
them.

## Authentication

Use the existing OpenAI OAuth credential reported by `opencode auth list`.
Do not add an API key, token, provider secret, or authentication file path to
either configuration file.

## Validation

Before editing, confirm that both model IDs appear in `opencode models openai`.
After editing:

1. Parse the project JSON and global JSONC configuration without printing
   credentials.
2. Validate the effective configuration with a new OpenCode process.
3. Confirm that all four project agent files contain the intended OpenAI model.
4. Scan the changed files for API-key or bearer-token patterns.
5. Inspect the diff to ensure unrelated fields did not change.

OpenCode loads configuration at startup. Quit and restart OpenCode after the
files pass validation; the current session will keep its existing model and
configuration.

## Failure Handling

If validation fails, restore only the model fields changed by this work. Do not
overwrite other concurrent edits in the global or project configuration.
If either selected model disappears from `opencode models openai`, stop before
editing and choose another available OpenAI model with the user.
