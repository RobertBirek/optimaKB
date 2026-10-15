# Potwierdzenie blokady live MCP po korekcie — 2026-10-13

Koordynator niezależnie wywołał cztery podłączone narzędzia KB po odebraniu
raportu 16 pytań. Wszystkie zakończyły się błędem `certificate has expired`.
Nie uzyskano odpowiedzi merytorycznych live; nie obchodzono walidacji TLS.

| Narzędzie | Temat | Wynik |
|---|---|---|
| `AccountingTaxKB.accounting_guidance_search` | Omówienie INFOR z 09.04.2026: OFF, DI i późniejszy numer KSeF | Błąd certyfikatu |
| `PayrollHrKB.payroll_guidance_search` | Historyczne wskaźniki waloryzacji z 07.06.2023 a rok 2026 | Błąd certyfikatu |
| `OptimaProductKB.optima_release_search` | Ogłoszenie Optima 2026.2.1 z 29.01.2026 i status planowanej poprawki | Błąd certyfikatu |
| `OptimaProductKB.optima_docs_search` | Wątek Betterfly 78292: podziękowanie a potwierdzenie rozwiązania | Błąd certyfikatu |

Każde wywołanie miało `as_of=2026-10-13` i `limit=5`. Pytania wskazywały
konkretne historyczne źródła i wymagały odróżnienia ich twierdzeń od
potwierdzenia bieżącego prawa lub produktu. Nie zmieniono zapytań tak, aby
ukryć błąd transportu.

Te cztery próby są oddzielnym potwierdzeniem problemu połączenia, nie dodatkowymi
wynikami w benchmarku 16 pytań i nie zastępują jego odpowiedzi lokalnych.
Wynik benchmarku pozostaje 0 PASS / 13 PARTIAL / 3 MISS, w opisanym lokalnym
kanale handlera MCP z produkcyjnymi eksportami i izolowanym ROOT.

Nie ustalono tutaj dokładnego endpointu, certyfikatu ani warstwy powodującej
błąd. Nie zmieniano reverse proxy, certyfikatów, auth, usług, korpusu ani
polityk. Dalsza diagnoza TLS powinna identyfikować rzeczywisty problematyczny
certyfikat zamiast wyłączać sprawdzanie certyfikatów.

Zobacz `Post_Correction_16Q_2026-10-13.md` i JSON z kryteriami, źródłami
i odpowiedziami oraz `Promoted_Correction_QA_Evidence_Retention_2026-10-13.md`
z trwałą lokalizacją dowodów.
