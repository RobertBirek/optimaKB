# Formy płatności
- draftId: `draft_2026-08-21_5f225097_formy-p-atnosci`
- kbNamespace: `ComarchOptimaBusinessSemantics`
- status: `promoted`
- promotedAt: `2026-09-01T08:07:05.934Z`
- sourceUrl: https://pomoc.comarch.pl/optima/pl/2026_5/dokumentacja/formy-platnosci/
- tags: `exa`, `auto-draft`, `recency_question`
- reviewNote: Approved and exported from dashboard
## Content
External source discovered via Exa query: Comarch ERP Optima 2026.5.1+ x64, GUI i reguły biznesowe form płatności. Bez porad podatkowych. Znajdź potwierdzone zachowanie przy dodaniu, zmianie typu, rachunku, terminu, oznaczeniu domyślnej, dezaktywacji i usunięciu formy używanej na dokumentach. Czy formy systemowe/domyslne można usuwać? Jakie komunikaty lub blokady występują? Użyj ComarchOptimaReference i BusinessSemantics, cytuj dowody; niewiadome nazwij i zaproponuj minimalny test GUI + MSSQL Profiler.
Title: Formy płatności
URL: https://pomoc.comarch.pl/optima/pl/2026_5/dokumentacja/formy-platnosci/
Tier: official
Published: 2024-06-03T18:39:25.000Z
Summary:
Summary:
This page describes the basic forms of payments in Comarch ERP Optima and how they are managed in the system. Key points relevant to your questions (behavior in 2026.5.x, GUI and business rules) are:
- Basic forms defined: bon, czek, gotówka, inna, karta, kredyt, mobilna, przelew. All are linked to a single default KASA register created with a new database; recommendation is to create separate registers for transfers and corporate cards.
- Where to define: Start/Konfiguracja/Firma/KasaBank/Formy płatności.
- Changes to a payment form:
- If a payment form has been used in any document, you cannot rename or change its type. You may adjust the default term (długoterminowy) and the default register, and indicate whether the form is active.
- Deleting a form:
- A form can be deleted only if no documents currently use it.
- Additional fields and behaviors:
- Termin (default payment...

Operator notes:
Automatyczny draft utworzony z odpowiedzi fallback KB-first. Sprawdź przed promocją.
This draft came from external search and requires review before promotion into a KB.