# Wdrożenie naprawy cleanera do dashboardu — 2026-10-13

## Zakres

Operator zatwierdził kontrolowane przeładowanie dashboardu po lokalnej
integracji sześciu sprawdzonych plików naprawy. Wykonano wyłącznie restart
`erp-kb-dashboard.service`. Nie zmieniono konfiguracji automatyzacji,
statusów szkiców ani innych usług; nie wykonano buildów, ingestii i commitów.

## Kontrole przed restartem

- Usługa działa jako `mcpbot`, `WorkingDirectory=/docker/openspg`.
- Potwierdzony entrypoint: `/docker/openspg/scripts/erp_kb_dashboard_server.mjs`.
- Stary PID: `2666167`, start 2026-09-30 06:42:04 CEST.
- Dashboard nie miał aktywnych jobów automatyzacji ani operacji panelu.
- `mcpbot` mógł odczytać i sprawdzić składnię entrypointu, discovery,
  deterministycznego cleanera i nowego walidatora (`node --check`, exit 0).
- Statyczne importy: entrypoint importuje `dashboard_discovery.mjs`, a ten
  importuje `source_body_validation.mjs` i wywołuje walidację przed submission.

## Wykonana operacja

```sh
sudo -n systemctl restart erp-kb-dashboard.service
```

Exit 0. Nowy PID `2060561`, start 2026-10-13 10:48:01 CEST
(08:48:01 UTC), `ActiveState=active`, `SubState=running`,
`ExecMainStatus=0`, `NRestarts=0` w końcowym odczycie.

## Weryfikacja po restarcie

- `/panel/`: HTTP 200.
- GET `/panel/api/status`: `service.ok=true`, port 3410, base path `/panel`.
- GET automation: `enabled=true`, `paused=false`, `shadowOnly=true`,
  `publicationApproved=true`, `allowedNamespaces=[ComarchCommunityNews]`,
  `minimumConfidence=0.9`, `autoRollback=true` — jak przed restartem.
- Bramka publikacji zatwierdzona, brak blokerów i aktywnych jobów.
- Ostatni zapisany check LLM: `PASS`, 2026-10-13T08:39:20.192Z;
  nie wykonano dodatkowego wywołania LLM w ramach wdrożenia.
- Brak alertów, zero zamrożonych KB i domen.
- Zachowany throttle `domain:spolecznosc.comarch.pl`, boost `0.02`.
- Most MCP `/health`: `ok=true`; nie restartowano mostu.
- Istniejące raporty jakości i świeżości nadal `WARN`, delta `OK`,
  113 szkiców oczekujących — bez zmiany względem odczytu przed restartem.

Hash Git treści trzech załadowanych modułów odpowiada zaakceptowanej naprawie:

| Moduł | Blob hash |
|---|---|
| `scripts/lib/content_cleaner.mjs` | `4018f291ce44f26dd305c0d0b5e2124f542aa837` |
| `scripts/lib/dashboard_discovery.mjs` | `f9e6a6d96fab7f9790fd6d83fda3fcbc1de6845f` |
| `scripts/lib/source_body_validation.mjs` | `661fbaccef4fb1eddce21efbbde77b7d15a8e3bc` |

## Poziom potwierdzenia

Nowy proces uruchomiono z zatwierdzonych plików i statycznej ścieżki importów;
start i odpowiedzi API potwierdzają załadowanie zależności oraz dostępność
usługi. Nie wykonano testowego submission w produkcji ani publikacji szkicu.
Dowody działania blokady pozostają w izolowanych testach regresji: 70 testów
walidatora, 7 odrzuconych wejść bez szkiców/jobów/fetch i 3 poprawne szkice.
Historyczne wadliwe szkice pozostają do osobnej decyzji i naprawy.
