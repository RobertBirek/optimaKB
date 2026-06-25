# Jak skonfigurować uwierzytelnianie z Krajowym Systemem e-Faktur (KSeF) za pomocą certyfikatu Ministerstwa Finansów. - Baza Wiedzy programu Comarch Betterfly
- draftId: `draft_2026-06-09_d76480d0_jak-skonfigurowac-uwierzytelnianie-z-krajowym-systemem-e-faktur-ksef-za-pomoca-c`
- kbNamespace: `ComarchBetterflyReference`
- status: `promoted`
- promotedAt: `2026-06-09T06:55:47.434Z`
- sourceUrl: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-skonfigurowac-uwierzytelnianie-z-krajowym-systemem-e-faktur-ksef-za-pomoca-certyfikatu-ministerstwa-finansow/
- tags: `discovery`, `official`, `API`, `KSeF`, `faktury`, `integracje`
- reviewNote: Bulk approved 13 drafts from dashboard
## Content
Automated source-discovery draft.

Query: Betterfly API KSeF 2026
Source: https://pomoc.comarchbetterfly.pl/dokumentacja/jak-skonfigurowac-uwierzytelnianie-z-krajowym-systemem-e-faktur-ksef-za-pomoca-certyfikatu-ministerstwa-finansow/
Tier: official
Discovery confidence: 0.95

Jak skonfigurować uwierzytelnianie z Krajowym Systemem e-Faktur (KSeF) za pomocą certyfikatu Ministerstwa Finansów. - Baza Wiedzy programu Comarch Betterfly

Jak możemy Ci pomóc?

Search For Wyszukaj

1. Strona główna
2. eFaktury
3. Jak skonfigurować uwierzytelnianie z Krajowym Systemem e-Faktur (KSeF) za pomocą certyfikatu Ministerstwa Finansów.

1. Generowanie certyfikatu uwierzytelniającego

W aplikacji KSeF udostępnianej przez Ministerstwo Finansów należy wygenerować przede wszystkim certyfikat umożliwiający uwierzytelnienie.

Zgodnie z informacjami Ministerstwa, od 01.02.2026 generowanie certyfikatów jest możliwe po zalogowaniu do Aplikacji Podatnika KSeF.

Po wygenerowaniu certyfikatu otrzymasz dwa pliki: *.cert oraz *.key.

Wskazówka

Pamiętaj: Certyfikat jest zabezpieczony hasłem. Należy je zapamiętać, ponieważ będzie cyklicznie wykorzystywane do odświeżania dostępu do KSeF w programie.

2. Konfiguracja w programie

Aby skonfigurować połączenie w aplikacji Comarch Betterfly:

Wejdź w Ustawienia programu na zakładkę KSeF.

Wybierz sposób uwierzytelniania: Certyfikaty Ministerstwa Finansów.

Wgraj oba uzyskane pliki ( *.cert oraz *.key. )

Podaj hasło do certyfikatu uwierzytelniającego KSeF.

Uwaga

Hasło nie jest przechowywane w programie – jest wykorzystywane jednorazowo do uwierzytelnienia. Na podstawie podanych danych system automatycznie tworzy tokeny (access i refresh), które pozwalają na automatyczną pracę przez tydzień bez konieczności ponownego wpisywania hasła

Review this draft before promotion.