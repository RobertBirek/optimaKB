# Porównanie czterech promowanych treści z oryginalnymi źródłami

**Data: 13 października 2026 r. — wyłącznie raport i propozycje korekt.**

Wszystkie cztery oryginalne URL zwróciły publiczną treść (HTTP 200). `de720ffd` zawiera całkowicie obcy katalog schematu. `bf920a10` zawiera prefiks modelu, ale dalsze hasła rzeczywiście pochodzą z okładki PDF i początku spisu treści. `d1c8371c` i `08cfe029` zawierają usuwalne prefiksy modelu oraz zgodne, **ucięte** początki właściwych publikacji. Żaden z tych trzech uciętych rekordów nie stanie się pełnym dokumentem po samym usunięciu prefiksu.

Nie oceniono aktualnej mocy prawnej opisanych przepisów. Daty publikacji, wydania i modyfikacji służą identyfikacji historycznego materiału. Fakty oznaczono **POTWIERDZONE**, zalecenia **WNIOSEK**, brak ustalenia historii/mechanizmu **NIEUSTALONE**.

## Zakres i dowody

- Wejście: `docs/reference/Source_Contamination_Audit_2026-10-13.json`; dokładnie klucze `de720ffd`, `bf920a10`, `d1c8371c`, `08cfe029`.
- Przeczytano pełne Markdown raw i promoted oraz porównano całe pola `content` JSON, nie podglądy. W każdym przypadku raw = promoted; długości z otoczką discovery: odpowiednio **7043, 1341, 1737, 1637 znaków**. Pełne identyfikatory, ścieżki i SHA-256 zawiera raport JSON.
- Najpierw targeted EXA dla dokładnych oryginalnych URL, następnie niezależny anonimowy HTTP GET. Czasy poniżej dotyczą kontrolowanego GET w UTC, nie domniemanej świeżości cache EXA.
- Oryginalny PDF pobrano w całości: **1 680 120 bajtów, 130 stron, 130 niepustych ekstrakcji tekstu**. Ekstrakcja `pypdf 6.20.1` z `fonttools 4.66.1`, biblioteki wyłącznie w `/tmp/opencode/priority-pdf-libs`. Pierwsza ekstrakcja zgłaszała brak fonttools; po jego dodaniu powtórzona ekstrakcja zakończyła się bez tego ostrzeżenia i z identycznym hashem tekstu.
- Publiczne HTML zawierały pełne artykuły. Przeglądarka nie była potrzebna; nie używano logowania, cookie jar, omijania CAPTCHA ani paywalla. Nie było niedostępnego oryginału wymagającego zastępczej atrybucji.
- Materiały dowodowe i skrypty: `/tmp/opencode/priority-source-comparison.py`, `priority-extract-evidence.py`, `priority-source-fetch-evidence.json`, `priority-line-comparison.json`, `priority-<key>-original.html` lub `.pdf`, pliki `*-visible.txt`, `*-article-container.txt`, `priority-bf920a10-full-extraction.txt` i `priority-bf920a10-pdf-summary.json`. Są tymczasowe; rozstrzygające cytaty i hashe utrwalono tutaj i w JSON.

| Klucz | Początek → koniec GET (UTC, 2026-10-13) | Status | Wynik | Proponowany kształt |
|---|---|---|---|---|
| `de720ffd` | 09:39:47.451515 → 09:39:48.359583 | 200, oryginalny URL | Obcy schemat zamiast artykułu | Pełna wymiana treści |
| `bf920a10` | 09:39:47.447563 → 09:39:48.424236 | 200, oryginalny URL | Prefiks modelu + zgodna okładka + urwany TOC | Pełna wymiana fragmentu na ekstrakcję merytoryczną PDF |
| `d1c8371c` | 09:39:47.450435 → 09:39:48.227933 | 200, oryginalny URL | Prefiks + zgodny początek, urwany w słowie | Usunięcie prefiksu + weryfikacja i uzupełnienie |
| `08cfe029` | 09:39:47.449103 → 09:39:49.044104 | 200, oryginalny URL | Prefiks + zgodny początek, urwana tabela | Usunięcie prefiksu + weryfikacja i uzupełnienie |

## 1. `de720ffd` — całkowicie obcy tekst

**ID:** `draft_2026-07-01_de720ffd_zmiany-w-jpk-vat-dopasowanie-do-ksef-nowe-wzory-jpk-v7m-3-jpk-v7k-3-nowe-oznacze`  
**Namespace:** `TaxbellAccountingVATReference`  
**Oryginał:** https://ksiegowosc.infor.pl/podatki/vat/jpk-vat/7482682,zmiany-w-jpk-vat-dopasowanie-do-ksef-nowe-wzory-jpk-v7m3-jpk-v7k3-nowe-oznaczenia-nrksef-off-bfk-di.html

**POTWIERDZONE — promowana treść:** linie 17–177 Markdown (raw 19–179) to blok z funkcjami `[CDN]`, tabelami `KatStawkiVAT`, `VatTab7`, `VatNag`, kolumnami `KaV_KaVID`, `Va7_VaNID`, HTML katalogu i FK `FK_KaVKategoria`. Nie zachowuje merytorycznych akapitów artykułu. Wspólne słowa VAT/JPK nie czynią katalogu źródłowym komentarzem podatkowym.

**POTWIERDZONE — źródło:** autor `oprac. Paweł Huczko`; widoczna data **9 kwietnia 2026, 11:44**; JSON-LD `datePublished` i `dateModified` = `2026-04-09T11:44:16+02:00`. Aktualny tytuł zawiera także „i broszura MF”, inaczej niż zapisany tytuł discovery. Dostępny lead i siedem sekcji aż do „Podstawa prawna”; odnośników do broszur/XSD nie pobierano.

Źródłowy `#detailContentWrapper`, sekcja broszury (dowód `priority-de720ffd-article-container.txt`, linie 83–96):

> Nowe wzory JPK_V7M(3) i JPK_V7K(3) - wersje 3 JPK z deklaracją - należy stosować za okresy rozliczeniowe od lutego 2026 roku.

> OFF - oznaczenie to dotyczy faktury, o której mowa w art. 106nf ust. 1 ustawy o VAT, tj. faktury wystawionej w trybie awarii KSeF.

**WNIOSEK — korekta:** pełna wymiana obcego bloku na ekstrakcję artykułu z tego samego URL: tytuł, autor, data, siedem sekcji, podstawa prawna i oryginalne linki. Usunąć reklamę/nawigację oraz instrukcje discovery z treści źródłowej. Zachować kontekst różnic OFF/DI i opisów korekt oraz FP; nie „uzgadniać” ich z aktualnym prawem w ramach tej korekty.

**Propozycja krótkiego opisu historycznego, nie pełny zamiennik:** Publikacja Pawła Huczki z 9 kwietnia 2026 r. opisuje dostosowanie JPK_VAT do KSeF i systemu kaucyjnego, wzory JPK_V7M(3)/JPK_V7K(3), oznaczenia NrKSeF, OFF, BFK i DI oraz FP. Jest to opis publikacji historycznej, nie potwierdzenie aktualnego prawa.

**NIEUSTALONE:** dokładny dokument pochodzenia obcego katalogu i mechanizm historycznej podmiany; także treść wcześniejszych wersji strony. Sama zgodność dat JSON-LD nie dowodzi braku redakcyjnych zmian.

## 2. `bf920a10` — zgodna okładka i początek TOC, bez treści rozdziałów

**ID:** `draft_2026-07-01_bf920a10_https-g-infor-pl-p-files-39075000-zmiany-w-podatkach-2026-39075452-pdf`  
**Namespace:** `TaxbellLegalReference`  
**Oryginał:** https://g.infor.pl/p/_files/39075000/zmiany-w-podatkach-2026-39075452.pdf

**POTWIERDZONE — prefiks (promoted linia 17, raw 19):**

> Poniższa oczyszczona treść została przygotowana na podstawie wewnętrznej wiedzy modelu, ponieważ podane referencje nie zawierają odpowiednich informacji.

To zdanie nie pochodzi z PDF. Jednak **wszystkie 11 dalszych punktów tematycznych pokrywa się z okładką na stronie 1**, po normalizacji whitespace. Nie ma podstaw, aby na podstawie samego prefiksu uznać je za wymyślone. Kolejne wpisy „Wstęp … 5”, „Rozdział 1. Podatek dochodowy od osób prawnych … 7” odpowiadają stronie 3. Ostatni „Podatek minimalny…” jest urwany przed numerem strony. Brakuje roku w skróconym tytule, autorów, stopki wydawniczej, reszty spisu treści i tekstów merytorycznych.

**POTWIERDZONE — faktyczna dostępność PDF:**

| Strony PDF | Zawartość |
|---|---|
| 1–2 | Okładka i stopka wydawnicza |
| 3–4 | Spis treści |
| 5–6 | Wstęp |
| 7–56 | Rozdział CIT |
| 57–85 | Rozdział PIT |
| 86–104 | VAT i akcyza |
| 105–117 | Procedura podatkowa |
| 118–125 | Ceny transferowe |
| 126–128 | Podatek od nieruchomości |
| 129–130 | Autorzy poradnika |

Nie jest to publicznie dostępny PDF ograniczony do TOC. Wyekstrahowano tekst wszystkich stron; obejrzano tekstowo m.in. stopkę, TOC, wstęp, CIT, JPK CIT, KSeF i końcowy rozdział. Nie wykonano wizualnej kontroli każdego znaku wszystkich stron.

**POTWIERDZONE — datowanie/proweniencja:** „Zmiany w podatkach 2026”; praca zbiorowa ekspertów MDDP; redaktor merytoryczny Artur Borkowski; INFOR PL SA; **Wydanie I/2025, grudzień 2025 r.**, ISBN **978-83-8268-877-1** (strona 2). PDF CreationDate = `D:20251230091930+01'00'`, ModDate = `D:20260227180345+01'00'`; HTTP Last-Modified = `Fri, 27 Feb 2026 17:15:52 GMT`. To różne znaczniki, nie nowa stwierdzona data wydania.

Ze wstępu na stronie 6 (ekstrakcja linie 153–155, po połączeniu dzielenia wyrazów):

> Ponieważ część zmian nie została jeszcze uchwalona, ich ostateczny kształt i moment ewentualnego wejścia w życie wymaga wciąż starannego monitorowania.

Przypis 1 na stronie 7:

> Projekt zmian na etapie prac rządowych (https://legislacja.gov.pl/projekt/12402157, stan na 3.12.2025 r.).

**WNIOSEK — korekta:** pełna wymiana fragmentu na ekstrakcję historycznego materiału, z numerami stron: wstęp 5–6 i rozdziały 7–128, przypisy, autorzy poszczególnych części, wyraźne rozróżnienie projektów i uchwalonych zmian według publikacji. Okładka/TOC mają rolę metadanych, nie zastępują tekstu rozdziałów. Prefiks można usunąć, ale to nie naprawia kompletności.

**Propozycja opisu bibliograficznego, nie pełny zamiennik:** „Zmiany w podatkach 2026”, praca zbiorowa ekspertów MDDP, red. Artur Borkowski, INFOR PL SA, wydanie I/2025 (grudzień 2025), ISBN 978-83-8268-877-1. Rozdziały dotyczą CIT, PIT, VAT i akcyzy, procedury podatkowej, cen transferowych oraz podatku od nieruchomości. Wstęp zaznacza, że część omawianych zmian nie była jeszcze uchwalona. Opis dotyczy wydania historycznego, nie prawa obowiązującego w październiku 2026 r.

**NIEUSTALONE:** zakres modyfikacji PDF z lutego 2026 r.; brak odzyskanej historii kolejnych wersji. Prefiks nie dowodzi też faktycznego użycia „wewnętrznej wiedzy” jako mechanizmu powstania pozostałego fragmentu.

## 3. `d1c8371c` — usuwalny prefiks, wierny początek, urwane „pracoda”

**ID:** `draft_2026-06-30_d1c8371c_informacja-dotyczaca-prac-nad-wdrozeniem-dyrektywy-dotyczacej-rownosci-wynagrodz`  
**Namespace:** `TaxbellPayrollHRReference`  
**Oryginał:** https://www.gov.pl/web/rodzina/informacja-dotyczaca-prac-nad-wdrozeniem-dyrektywy-dotyczacej-rownosci-wynagrodzen

**POTWIERDZONE — prefiks (promoted 17, raw 19):**

> Oczyszczona treść (na podstawie własnej analizy, ponieważ podane referencje nie zawierają tej treści):

Dalsze sześć niepustych linii pasuje do publicznego HTML po normalizacji whitespace: tytuł, data **24.06.2025**, trzy pełne akapity i początek czwartego. Nie stwierdzono obcej treści ani dopisanych faktów w zachowanym fragmencie. Rekord kończy się w słowie „pracoda”, podczas gdy źródło kontynuuje „pracodawcom do przekazywania organowi monitorującemu informacji…”.

**POTWIERDZONE — dostępność:** pełny komunikat MRPiPS: tytuł/data/lead + `.editor-content`; źródło zawiera resztę akapitu GUS, akapit o CIOP-PIB i wartościowaniu stanowisk, rekomendację materiałów oraz dwa linki. Dowód HTML linie 605–638 i `priority-d1c8371c-visible.txt` linie 110–121. Linków do ILO/EUR-Lex nie pobierano.

**WNIOSEK — korekta:** usunięcie dokładnego prefiksu z zachowaniem zweryfikowanego początku; ponowne pobranie czwartego akapitu od początku i uzupełnienie reszty komunikatu z oryginału. Zachować historyczną datę komunikatu i perspektywę „obecnie”/czas przyszły z 2025 r.

### Propozycja kompletnej treści historycznej — nie zastosowana do rekordu

Poniższa transkrypcja dotyczy **komunikatu MRPiPS z 24 czerwca 2025 r.**, odczytanego 13 października 2026 r.; normalizuje whitespace i format linków. Nie aktualizuje ani nie potwierdza obecnego stanu wdrożenia dyrektywy.

#### Informacja dotycząca prac nad wdrożeniem dyrektywy dotyczącej równości wynagrodzeń

24.06.2025 — Ministerstwo Rodziny, Pracy i Polityki Społecznej

10 maja 2023 r. na szczeblu unijnym została przyjęta tzw. dyrektywa w sprawie przejrzystości wynagrodzeń (pełny tytuł dyrektywy: dyrektywa Parlamentu Europejskiego i Rady (UE) 2023/970 z dnia 10 maja 2023 r. w sprawie wzmocnienia stosowania zasady równości wynagrodzeń dla mężczyzn i kobiet za taką samą pracę lub pracę o takiej samej wartości za pośrednictwem mechanizmów przejrzystości wynagrodzeń oraz mechanizmów egzekwowania).

Dyrektywa weszła w życie 6 czerwca 2023 r., a termin na jej implementację do porządku krajowego mija 7 czerwca 2026 r.

W związku z tym obecnie w MRPiPS trwają zaawansowane prace zmierzające do wdrożenia Dyrektywy. W tym celu 5 grudnia 2024 r. powołano specjalny Zespół. Od tego czasu odbyło się już kilka jego posiedzeń, a do prac zostali zaproszeni m.in. przedstawiciele Ministerstwa Sprawiedliwości, Departamentu do spraw Równego Traktowania w Kancelarii Prezesa Rady Ministrów, Głównego Urzędu Statystycznego czy Państwowej Inspekcji Pracy. Na wybrane posiedzenia zapraszani byli również przedstawiciele świata nauki, eksperci i partnerzy społeczni.

W ramach prowadzonych prac odbyły się także rozmowy pomiędzy Ministerstwem Pracy a Głównym Urzędem Statystycznym dotyczące stworzenia narzędzia służącego pracodawcom do przekazywania organowi monitorującemu informacji, o których mowa w art. 9 ust. 1 Dyrektywy, za pośrednictwem systemu GUS. Pracodawcy wprowadzaliby do narzędzia wskaźniki, o których mowa w art. 9 ust. 1., które trafiałyby do organu monitorującego odpowiedzialnego za zbieranie i publikowanie tych danych zgodnie z art. 29 ust. 3 lit. c) Dyrektywy.

W celu zapewnienia pracodawcom wsparcia i wskazówek w ramach procesu oceny i porównywania wartości pracy Ministerstwo wraz z Centralnym Instytutem Ochrony Pracy - Państwowym Instytutem Badawczym pracuje także nad stworzeniem narzędzia służącego wartościowaniu stanowisk pracy zgodnie z wymogami Dyrektywy. W ramach tych prac zostanie stworzony podręcznik wyjaśniający, jak powinien przebiegać proces wartościowania stanowisk pracy. Narzędzie zostanie udostępnione bezpłatnie i będą mogli korzystać z niego wszyscy pracodawcy.

Zachęcamy także do zapoznania się z istniejącymi już materiałami dotyczącymi wartościowania stanowisk pracy, które chociaż powstały przed przyjęciem Dyrektywy, zachowują w dużej mierze swoją aktualność:

- Przewodnik Międzynarodowej Organizacji Pracy do pobrania w formie pliku PDF: [Promoting Equity: gender-neutral job evaluation for equal pay. A step-by-step guide | International Labour Organization](https://www.ilo.org/publications/promoting-equity-gender-neutral-job-evaluation-equal-pay-step-step-guide).
- Aneks 1 do sprawozdania Komisji dotyczącego stosowania dyrektywy 2006/54/WE: https://eur-lex.europa.eu/LexUriServ/LexUriServ.do?uri=SWD:2013:0512:FIN:EN:PDF

Koniec propozycji. Oryginalna strona wskazuje licencję tekstów **CC BY-SA 4.0**. Dodana linia instytucji jest atrybucją, nie dodatkowym zdaniem komunikatu.

**NIEUSTALONE — historia:** brak widocznej daty modyfikacji/historii wersji w odczytanym komunikacie; `pageMetadata.register.columns` jest puste. Nie odzyskano historycznego snapshotu z dnia promocji. Zgodność tekstu nie dowodzi użycia źródła przez historyczny cleaner.

## 4. `08cfe029` — wierny początek artykułu, tabela ucięta w szóstym wierszu

**ID:** `draft_2026-07-02_08cfe029_przeglad-zmian-w-prawie-pracy-w-2025-i-2026-r-infor-pl`  
**Namespace:** `TaxbellPayrollHRReference`  
**Oryginał:** https://kadry.infor.pl/wiadomosci/6841531,przeglad-zmian-w-prawie-pracy-w-2025-i-2026-r.html

**POTWIERDZONE — prefiks (promoted 17, raw 19):**

> Oczyszczona treść nie pochodzi z podanych odniesień – wykorzystano wyłącznie surową treść podaną w pytaniu.

Po jego usunięciu **32/32 niepuste linie** mają odpowiedniki w oryginalnym HTML, po zdjęciu znaczników nagłówków/list Markdown i normalizacji whitespace. To tytuł/data, podpis ilustracji, lead, TOC, początek sekcji o dniach wolnych oraz spłaszczona tabela. Wspólna źródłowa literówka „**będziemy mamy**” występuje w HTML, więc nie świadczy o wymyśleniu treści przez model. EXA pominęła to zdanie; rozstrzyga pełny HTML (`priority-08cfe029-original.html`, linia 3183).

**POTWIERDZONE — źródło:** autor **Tomasz Kowalski**; **9 lutego 2025, 13:12**; JSON-LD `datePublished` i `dateModified` = `2025-02-09T13:12:16+01:00`. W HTML dostępne są wszystkie cztery sekcje, pełna tabela 14 świąt oraz osobna tabela miesięcznego czasu pracy. EXA pominęła także tę drugą tabelę. Nie należy budować pełnej korekty tylko z tekstu EXA.

Zachowany rekord zawiera pięć kompletnych wierszy świąt, a w szóstym tylko `6.` i `3 maja`, bez nazwy święta. Oryginał (`article-container.txt`, linie 45–71) kontynuuje:

| L.p. | Data w 2025 r. | Święto — propozycja odtworzenia z oryginału |
|---|---|---|
| 6 | 3 maja | Święto Narodowe Trzeciego Maja |
| 7 | 8 czerwca | pierwszy dzień Zielonych Świątek |
| 8 | 19 czerwca | dzień Bożego Ciała |
| 9 | 15 sierpnia | Wniebowzięcie Najświętszej Maryi Panny |
| 10 | 1 listopada | Wszystkich Świętych |
| 11 | 11 listopada | Narodowe Święto Niepodległości |
| 12 | 24 grudnia | Wigilia Bożego Narodzenia |
| 13 | 25 grudnia | pierwszy dzień Bożego Narodzenia |
| 14 | 26 grudnia | drugi dzień Bożego Narodzenia |

To wyłącznie **historyczne wiersze artykułu z 9 lutego 2025 r.** Brakuje ponadto tabeli czasu pracy, sekcji „Dodatkowa niedziela handlowa”, „Nowelizacja Kodeksu pracy” (uzupełniający urlop macierzyński) i „Będą dalsze zmiany prawa pracy”. Ostatnia sekcja opisuje ówczesne projekty: staż pracy, krótszy tydzień, jawność płac i minimalne wynagrodzenie — nie jest ustaleniem ich późniejszych losów.

**WNIOSEK — korekta:** usunąć dokładny prefiks, przywrócić autora, zachować zweryfikowany początek i odtworzyć obie tabele oraz pozostałe trzy sekcje z oryginalnego HTML. W tabeli świąt zastąpić cały blok, zamiast dopisywać tekst do spłaszczonych komórek. Zachować perspektywę czasową publikacji, nie „poprawiać” po cichu literówek lub liczbowych twierdzeń źródła jako prawa. Usunięcie prefiksu z pozostawieniem ucięcia może być tylko oczyszczeniem fragmentu, nie pełną naprawą dokumentu.

**NIEUSTALONE — historia:** brak odzyskanych wcześniejszych wersji; równe daty JSON-LD nie dowodzą braku zmian. Daty najnowszych rekomendacji/reklam na stronie nie są datami tego artykułu.

## Integralność, ograniczenia i walidacja

- Oryginały pobrano **13 października 2026**, nie w dniach historycznej promocji. Zgodność zachowanych fragmentów z dzisiejszym odczytem nie certyfikuje identyczności wszystkich historycznych wersji.
- Hash pełnego PDF: `bc2099fca62c2d813ec79eb6b1df3f4c653e9d4acc604c35b3dcb9885ac58d30`. Pozostałe hashe oryginalnych odpowiedzi i pełnych pól content są w JSON. Struktura i ucięcia ocenione ręcznie; substring checks są pomocniczym dowodem wierności fragmentów.
- `npm run check`: **PASS**, kontrola składni wykonana przed zapisaniem raportów. `python3 scripts/validate-module-map.py`: **PASS, 4 moduły**. Pobranie oryginałów: **4/4 HTTP 200**, bez redirectów. Ekstrakcja: **130/130 stron z tekstem**. Pełne raw/promoted content: **4/4 identyczne**.
- `/tmp/opencode/verify-priority-source-report.py`: **PASS** — dokładne ID/URL/namespace, czasy/status/rozmiary/hashe odpowiedzi, oryginalne metadane, niezmienione hashe ośmiu raw/promoted JSON oraz zgodność akapitów pełnej propozycji GOV z HTML. `git diff --check`: **PASS**.
- Nie wykonano testów wywołujących runtime, buildów, ingestion, LLM, restartów ani commitów. Nie zmieniono żadnego draftu/promoted body, statusu, polityki ani korpusu. Istniejące cudze zmiany w repozytorium zachowano.

### Handoff

```yaml
task_id: promoted-source-comparison-priority-2026-10-13
agent: OpenCode
host: linux workspace host
repository: /docker/openspg
base_branch: main
base_commit: 79e376d241322b2debbffb900a68bcf67ae78004
result_commit: uncommitted
changed_files:
  - docs/reference/Promoted_Source_Comparison_Priority_2026-10-13.md
  - docs/reference/Promoted_Source_Comparison_Priority_2026-10-13.json
skills_used: [codex-delegation, verification-before-completion]
commands_run:
  - git status --short
  - git branch --show-current
  - git rev-parse HEAD
  - npm run check
  - python3 scripts/validate-module-map.py
  - python3 /tmp/opencode/priority-source-comparison.py
  - python3 -m pip install --target /tmp/opencode/priority-pdf-libs pypdf
  - python3 -m pip install --target /tmp/opencode/priority-pdf-libs fonttools
  - python3 /tmp/opencode/priority-extract-evidence.py
  - python3 /tmp/opencode/verify-priority-source-report.py
  - git diff --check
validation:
  passed: [syntax_check, module_map, four_original_http_fetches, full_pdf_page_extraction, raw_promoted_equality, retained_fragment_comparison, report_integrity, unchanged_corpus_json_hashes, git_diff_check]
  failed: []
  not_run: [runtime_tests, builds, current_legal_validity_review]
confirmed_findings:
  - de720ffd contains wholly foreign schema content.
  - bf920a10 cover bullets and TOC beginning match original PDF; substantive chapters are absent from promoted body.
  - d1c8371c retained source prefix matches but ends mid-word.
  - 08cfe029 retained source prefix matches but ends inside a holiday table.
inferences:
  - Full replacement is appropriate for the foreign schema and the PDF stub.
  - Preface removal plus source-based completion is appropriate for both historical HR articles.
hypotheses: []
risks:
  - Historical served versions at promotion time were not recovered.
  - Temporary evidence is ephemeral.
approval_required: []
recommended_next_action: Use the dated correction proposals as input to a separate correction task; no corpus operation executed here.
```
