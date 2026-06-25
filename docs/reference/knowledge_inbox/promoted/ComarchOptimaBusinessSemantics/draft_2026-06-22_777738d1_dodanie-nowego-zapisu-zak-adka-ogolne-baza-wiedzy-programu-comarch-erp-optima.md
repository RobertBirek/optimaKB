# Dodanie nowego zapisu – zakładka Ogólne – Baza Wiedzy programu Comarch ERP Optima
- draftId: `draft_2026-06-22_777738d1_dodanie-nowego-zapisu-zak-adka-ogolne-baza-wiedzy-programu-comarch-erp-optima`
- kbNamespace: `ComarchOptimaBusinessSemantics`
- status: `promoted`
- promotedAt: `2026-06-22T07:18:59.286Z`
- sourceUrl: https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/dodanie-nowego-zapisu-zakladka-ogolne/
- tags: `exa`, `auto-draft`, `recency_question`
- reviewNote: Approved from inbox row
## Content
External source discovered via Exa query: Co oznacza komunikat "Podmiot nie posiada domyślnego numeru rachunku" i w jakich okolicznościach jest zwracany przy zapisie dokumentu w Comarch ERP Optima?
Title: Dodanie nowego zapisu – zakładka Ogólne – Baza Wiedzy programu Comarch ERP Optima
URL: https://pomoc.comarch.pl/optima/pl/2026/dokumentacja/dodanie-nowego-zapisu-zakladka-ogolne/
Tier: official
Published: 2025-07-04T15:25:13.000Z
Summary:
Summary:
Komunikat “Podmiot nie posiada domyślnego numeru rachunku” pojawia się w Comarch ERP Optima w kontekście płatności przelewem. Jest to informacja, że dla danego kontrahenta nie zdefiniowano domyślnego numeru rachunku bankowego. Zwrot ten występuje:
- gdy na dokumencie wybrana jest forma płatności Przelew, a dla wybranego kontrahenta nie ma przypisanego domyślnego rachunku bankowego w walucie dokumentu,
- na dokumentach w PLN, jeśli kontrahent ma tylko domyślny rachunek w innej walucie (w takim przypadku pola numeru rachunku nie można wypełnić),
- po aktualizacji dokumentu lub płatnika na korekcie, podczas weryfikacji numeru rachunku w ewidencji dodatkowej kosztów/przychodów, system ponownie weryfikuje czy numer rachunku istnieje w Wykazie podatników VAT i może ponownie wyświetlić komunikat jeśli domyślny numer nie jest dostępny.

Krótko: komunikat oznacza brak zdefiniowanego d...

Operator notes:
Automatyczny draft utworzony z odpowiedzi fallback KB-first. Sprawdź przed promocją.
This draft came from external search and requires review before promotion into a KB.