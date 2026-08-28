# OpenAI Model Rotation Design

## Goal

Use a new OpenAI API key for every active OpenSPG model role. Retain the
existing `text-embedding-3-small` vectorizer and add
`gpt-5.4-mini` as the generative model.

## Scope

- Keep every existing knowledge-base project and vector unchanged.
- Update only the API key of the existing `text-embedding-3-small` model.
- Register `gpt-5.4-mini` with OpenAI-compatible settings:
  - type: `maas` / OpenAI-compatible, according to the installed UI field
    contract
  - base URL: `https://api.openai.com/v1`
- Assign the new LLM to all active extraction, solver/chat, and application
  `config.llm` roles.
- Remove legacy non-OpenAI model configurations only after every configured
  active role points to OpenAI and all validation checks pass.

## Secret Handling

- The operator enters the new OpenAI key directly in the OpenSPG UI.
- The key is not written to source control, `.env`, command-line arguments,
  logs, or generated reports.
- Revoke legacy provider keys at their providers after the OpenSPG cutover is
  verified.

## Implementation Flow

1. Record the current model registry and all active model assignments without
   reading or printing API keys.
2. In the model-management UI, update the existing `text-embedding-3-small`
   record with the new OpenAI key. Preserve its model ID and dimensions.
3. Add a new model record for `gpt-5.4-mini` using the OpenAI base
   URL. The operator supplies the same new key in the UI.
4. Run the UI connection test for both models.
5. Update each active generative-model assignment and each active application
   `config.llm` to the new LLM.
6. Verify an ephemeral chat-completions call and a non-persisting embedding
   request. Do not submit builder jobs or rebuild KBs.
7. Re-list active assignments. Remove every old non-OpenAI model only when no
   active role references it.
8. Deploy affected applications if the installed OpenSPG UI/API requires a
   deploy after `config.llm` changes.
9. Revoke obsolete provider keys outside OpenSPG.

## Constraints

- Embedding vectors from different models cannot be mixed. No embedding model,
  model ID, dimensions, or knowledge-base project is changed.
- OpenSPG uses the Chat Completions-compatible API path, which is supported by
  `gpt-5.4-mini`.
- The exact model-management endpoint and UI payload fields must be obtained
  from the live OpenSPG version before making changes.

## Validation and Rollback

- Success requires successful model connection tests, a successful ephemeral
  chat request, a successful ephemeral embedding request, and no active
  references to legacy models.
- If the new LLM fails OpenSPG compatibility checks, restore the prior active
  LLM assignments before deleting any legacy model records.
- Do not attempt a fallback after old models are deleted. Instead, create a
  replacement OpenAI-compatible record and test it before assigning it.
