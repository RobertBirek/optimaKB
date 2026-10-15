# Porównanie dziesięciu pozostałych promowanych źródeł — 2026-10-13

**Wynik: 10/10 oryginalnych stron odzyskano z tekstem merytorycznym; 0 stron niedostępnych, 0 wyników ograniczonych do przekierowania lub nawigacji.** Każdy wskazany rekord potwierdzono jako `promoted` w rzeczywistym JSON i odczytano jego Markdown.

Task ID: `promoted-source-comparison-remaining-2026-10-13`. Wygenerowano UTC: 2026-10-13T09:51:26.293Z. Baza Git: `main`, `79e376d241322b2debbffb900a68bcf67ae78004`.

## Metoda i granice

POTWIERDZONE = bezpośredni odczyt zapisanej treści/strony. WNIOSEK = proponowana korekta redakcyjna. NIEUSTALONE = brak odpowiednich danych. Porównanie dotyczy wierności źródłu, nie potwierdzenia aktualnego prawa lub produktu. Daty stron zapisano tak, jak wyświetlone; czasy pobrania są UTC.

Publiczny fetch Exa ośmiu stron urzędowych poprzedził bezpośredni odczyt Chromium wszystkich dziesięciu URL. Każda nawigacja miała czysty, efemeryczny kontekst. Po `networkidle` odczytano DOM; w Gov.pl oczekiwanie wygasło, lecz pełny artykuł był dostępny. Rozwinięto sekcje MF i kontrolki `Odpowiedzi`/`Pokaż więcej` Comarch; opcjonalne cookies odrzucono zwykłym przyciskiem. Bez logowania ani obchodzenia ograniczeń.

Exa dla katalogu JPK zwróciła starszą ekstrakcję (aktualizacja 1.07.2026, specyfikacja 5.5.1 v2); bezpośredni browser pokazał aktualizację 16.09.2026 i wersję 5.6.0. Dlatego podstawą porównania jest datowany odczyt bezpośredni. Narzędzie Exa nie podało czasu/statusu każdej próby; zapisano tę granicę w JSON, bez wymyślania timestampów.

Załączniki i strony docelowe pobrań nie były odczytywane. Nie odzyskano historycznych migawek z dnia promocji. Wszystkie propozycje poniżej pozostają propozycjami. Zapisano tylko niniejszy raport i towarzyszący JSON; skrypty i dowody robocze znajdują się w `/tmp/opencode/remaining-*`.

## Dziesięć porównań

### 6b5ac5ed

- **ID:** `draft_2026-06-05_6b5ac5ed_serwis-o-podatkach-pliki-do-pobrania-jpk-vat-podatki-gov-pl`
- **Namespace/status:** `TaxbellAccountingVATReference` / `promoted`.
- **Źródło:** https://www.podatki.gov.pl/podatki-firmowe/jednolity-plik-kontrolny/jpk_vat/pliki-do-pobrania-jpk-vat/
- **Wynik:** POTWIERDZONE — `original_recovered`, HTTP 200; końcowy URL: https://www.podatki.gov.pl/podatki-firmowe/jednolity-plik-kontrolny/jpk_vat/pliki-do-pobrania-jpk-vat.
- **Pobranie UTC:** 2026-10-13T09:33:27.159Z – 2026-10-13T09:42:45.481Z.
- **Data źródła:** publikacja 2025-12-15; aktualizacja 2026-09-16.
- **Pokrycie:** Pięć rozwiniętych sekcji katalogu pobrań; opisy usług i etykiety plików/linki. Bez odczytu załączników XSD/PDF/ZIP.
- **Zapis:** `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellAccountingVATReference/draft_2026-06-05_6b5ac5ed_serwis-o-podatkach-pliki-do-pobrania-jpk-vat-podatki-gov-pl.json` oraz `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellAccountingVATReference/draft_2026-06-05_6b5ac5ed_serwis-o-podatkach-pliki-do-pobrania-jpk-vat-podatki-gov-pl.md`.

**POTWIERDZONE — porównanie z zapisanym body:** JSON i Markdown zawierają spekulację „likely JPK VAT” oraz ofertę „I can pull”, zamiast zawartości katalogu. JSON pomija część opakowania scan draft/Summary z Markdown, lecz wadliwa treść jest ta sama. Źródło udostępnia konkretne sekcje, dokumentację i pliki; nie jest tylko ogólną nawigacją podatkową.

**Odzyskana treść:**
- Specyfikacja interfejsów usług JPK, initupload XSD i certyfikaty produkcyjne/testowe.
- Na żywej stronie etykieta specyfikacji: wersja 5.6.0.
- Adresy środowisk e-dokumenty.mf.gov.pl, esb2.mf.gov.pl:5064 (status), test-e-dokumenty.mf.gov.pl.
- Sekcja testowa zawiera opis mocków i parametru enableValidateQualifiedSignature.
- Broszury JPK_VAT(3), JPK_VAT(3)EN oraz przykłady JPK_VAT(3).

**WNIOSEK — proponowana treść/kształt korekty:** Datowany katalog techniczny: tytuł, data publikacji/aktualizacji, sekcje pobrań, dokładne etykiety i URL załączników, opis produkcji/testów. Nie utożsamiać JPK_VAT(3) z JPK_V7M(3)/V7K(3). Zastąpić cały spekulacyjny Summary tekstem źródłowym lub wiernym streszczeniem tych sekcji.

**Blokada lub granica:** Brak blokady odczytu. Wersja z 16.09.2026 jest późniejsza niż promocja z czerwca; nie odzyskano historycznej migawki z dnia promocji. Exa zwróciła starszą datę 1.07.2026 i wersję 5.5.1 v2; podstawą propozycji jest bezpośredni browser, nie ta starsza ekstrakcja.

**Próby:**
- 2026-10-13T09:33:27.159Z → 2026-10-13T09:33:31.828Z: clean ephemeral Chromium; no authentication; HTTP 200, networkidle reached, URL końcowy https://www.podatki.gov.pl/podatki-firmowe/jednolity-plik-kontrolny/jpk_vat/pliki-do-pobrania-jpk-vat. Bez dodatkowych akcji.
- 2026-10-13T09:41:41.791Z → 2026-10-13T09:41:46.846Z: clean Chromium; expand official page reading sections; HTTP 200, networkidle reached, URL końcowy https://www.podatki.gov.pl/podatki-firmowe/jednolity-plik-kontrolny/jpk_vat/pliki-do-pobrania-jpk-vat. Akcje: Odrzuć optional cookies; Read/expand Specyfikacja interfejsów usług Jednolitego Pliku Kontrolnego; Read/expand Środowisko produkcyjne; Read/expand Środowisko testowe; Read/expand Broszury informacyjne i podręczniki; Read/expand Przykładowy plik JPK_VAT(3).
- 2026-10-13T09:42:40.092Z → 2026-10-13T09:42:45.481Z: clean Chromium; expand official page reading sections; HTTP 200, networkidle reached, URL końcowy https://www.podatki.gov.pl/podatki-firmowe/jednolity-plik-kontrolny/jpk_vat/pliki-do-pobrania-jpk-vat. Akcje: Odrzuć optional cookies; Read/expand Specyfikacja interfejsów usług Jednolitego Pliku Kontrolnego; Read/expand Środowisko produkcyjne; Read/expand Środowisko testowe; Read/expand Broszury informacyjne i podręczniki; Read/expand Przykładowy plik JPK_VAT(3).

### dcfc95c2

- **ID:** `draft_2026-07-24_dcfc95c2_nowe-wzory-struktur-jpk-vat-dostepne-na-epuap`
- **Namespace/status:** `TaxbellAccountingVATReference` / `promoted`.
- **Źródło:** https://www.podatki.gov.pl/aktualnosci/nowe-wzory-struktur-jpk_vat-dostepne-na-epuap
- **Wynik:** POTWIERDZONE — `original_recovered`, HTTP 200; końcowy URL: https://www.podatki.gov.pl/aktualnosci/nowe-wzory-struktur-jpk_vat-dostepne-na-epuap.
- **Pobranie UTC:** 2026-10-13T09:33:27.177Z – 2026-10-13T09:33:31.612Z.
- **Data źródła:** publikacja 2025-12-19; aktualizacja 2025-12-29.
- **Pokrycie:** Cały komunikat: lead, opis struktur, numery CRWDE, oznaczenia KSeF i lista dwóch PDF. Bez pobierania załączników.
- **Zapis:** `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellAccountingVATReference/draft_2026-07-24_dcfc95c2_nowe-wzory-struktur-jpk-vat-dostepne-na-epuap.json` oraz `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellAccountingVATReference/draft_2026-07-24_dcfc95c2_nowe-wzory-struktur-jpk-vat-dostepne-na-epuap.md`.

**POTWIERDZONE — porównanie z zapisanym body:** Zapis trafnie wskazuje ogólny temat, ale dodaje ofertowo-nawigacyjne „If you need” i twierdzi, że highlights nie pokazują konkretnych odnośników. Brakuje dat, wersji, numerów wzorów i treści oznaczeń; końcówka Markdown/JSON urywa się na „se...”.

**Odzyskana treść:**
- Komunikat o publikacji 19.12.2025 wzorów JPK_V7M(3) i JPK_V7K(3), stosowanych według komunikatu od 1.02.2026.
- Wzory CRWDE odpowiednio 2025/12/19/14090 i 2025/12/19/14089.
- Węzeł KSeF: NrKSeF, OFF, BFK, DI; zmiana umożliwiająca rozliczenie systemu kaucyjnego.
- Dwa materiały Zestawienie Zmian JPK V7M(3)/V7K(3), PDF 0.23 MB.

**WNIOSEK — proponowana treść/kształt korekty:** Wierny, datowany komunikat o wydaniu struktur z nazwami, numerami CRWDE, deklarowaną datą stosowania i dokładnymi definicjami czterech oznaczeń; zachować listę materiałów. Usunąć metakomunikaty o highlights, ofertę wyszukiwania i urwany fragment.

**Blokada lub granica:** Brak blokady strony; treści załączników nie sprawdzono. Data stosowania jest przytoczeniem komunikatu z grudnia 2025, nie certyfikacją aktualnych obowiązków.

**Próby:**
- 2026-10-13T09:33:27.177Z → 2026-10-13T09:33:31.612Z: clean ephemeral Chromium; no authentication; HTTP 200, networkidle reached, URL końcowy https://www.podatki.gov.pl/aktualnosci/nowe-wzory-struktur-jpk_vat-dostepne-na-epuap. Bez dodatkowych akcji.

### 93f75109

- **ID:** `draft_2026-07-27_93f75109_serwis-o-podatkach-informacje-podstawowe-cit-klasyczny`
- **Namespace/status:** `TaxbellLegalReference` / `promoted`.
- **Źródło:** https://www.podatki.gov.pl/podatki-firmowe/cit/cit-klasyczny/informacje-podstawowe-cit-klasyczny
- **Wynik:** POTWIERDZONE — `original_recovered`, HTTP 200; końcowy URL: https://www.podatki.gov.pl/podatki-firmowe/cit/cit-klasyczny/informacje-podstawowe-cit-klasyczny.
- **Pobranie UTC:** 2026-10-13T09:33:27.194Z – 2026-10-13T09:42:53.430Z.
- **Data źródła:** publikacja 2025-12-15; aktualizacja 2026-06-24.
- **Pokrycie:** Rozwinięte główne sekcje CIT i odczyt publicznych accordion-body, w tym tekst podsekcji dostępny w DOM. Nie weryfikowano ustaw ani odsyłaczy do innych artykułów.
- **Zapis:** `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellLegalReference/draft_2026-07-27_93f75109_serwis-o-podatkach-informacje-podstawowe-cit-klasyczny.json` oraz `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellLegalReference/draft_2026-07-27_93f75109_serwis-o-podatkach-informacje-podstawowe-cit-klasyczny.md`.

**POTWIERDZONE — porównanie z zapisanym body:** Zapis jest spekulacją o menu ogólnym PIT/CIT/PCC/WHT/MDR zamiast treści artykułu CIT. Frazy „likely covered”, „as of 2026” i „I can extract” nie reprezentują odzyskanej informacji.

**Odzyskana treść:**
- Sekcje: podatnicy CIT i CIT-15J, zakres obowiązku podatkowego, źródła dochodu, moment przychodu, koszty, zwolnienia, podstawa opodatkowania, stawki, zeznania i podstawy prawne.
- Źródło opisuje stawki ogólne 19% i warunkową 9%, ograniczenia i wyjątki oraz osobne rozbudowane przepisy dla banków/SKOK od 2026 r.
- Wskazuje CIT-8/CIT-8AB do końca trzeciego miesiąca następnego roku oraz odrębny CIT-CFC.

**WNIOSEK — proponowana treść/kształt korekty:** Datowany artykuł o CIT klasycznym z zachowaniem układu wszystkich sekcji i podsekcji, wyjątków, warunków stawek oraz podanych podstaw prawnych. Nie zastępować go streszczeniem menu portalu ani bezwarunkowym „CIT 9%”.

**Blokada lub granica:** Brak blokady odczytu; zgodności ze stanem prawa na dzień pobrania nie badano. Część podsekcji odczytana z tekstu publicznego DOM, nie z osobno odwiedzanych źródeł prawnych.

**Próby:**
- 2026-10-13T09:33:27.194Z → 2026-10-13T09:33:31.241Z: clean ephemeral Chromium; no authentication; HTTP 200, networkidle reached, URL końcowy https://www.podatki.gov.pl/podatki-firmowe/cit/cit-klasyczny/informacje-podstawowe-cit-klasyczny. Bez dodatkowych akcji.
- 2026-10-13T09:41:47.168Z → 2026-10-13T09:41:54.027Z: clean Chromium; expand official page reading sections; HTTP 200, networkidle reached, URL końcowy https://www.podatki.gov.pl/podatki-firmowe/cit/cit-klasyczny/informacje-podstawowe-cit-klasyczny. Akcje: Odrzuć optional cookies; Read/expand Dla kogo jest ten podatek; Read/expand Jaki jest zakres opodatkowania; Read/expand Co jest opodatkowane; Read/expand Kiedy powstaje przychód; Read/expand Co jest kosztem uzyskania przychodów; Read/expand Zwolnienia przedmiotowe dla wybranych podatników CIT; Read/expand Podstawa opodatkowania; Read/expand Stawka podatku; Read/expand Jakie złożyć zeznanie; Read/expand Podstawa prawna.
- 2026-10-13T09:42:45.711Z → 2026-10-13T09:42:53.430Z: clean Chromium; expand official page reading sections; HTTP 200, networkidle reached, URL końcowy https://www.podatki.gov.pl/podatki-firmowe/cit/cit-klasyczny/informacje-podstawowe-cit-klasyczny. Akcje: Odrzuć optional cookies; Read/expand Dla kogo jest ten podatek; Read/expand Jaki jest zakres opodatkowania; Read/expand Co jest opodatkowane; Read/expand Kiedy powstaje przychód; Read/expand Co jest kosztem uzyskania przychodów; Read/expand Zwolnienia przedmiotowe dla wybranych podatników CIT; Read/expand Podstawa opodatkowania; Read/expand Stawka podatku; Read/expand Jakie złożyć zeznanie; Read/expand Podstawa prawna.

### 0bdb5e10

- **ID:** `draft_2026-06-09_0bdb5e10_ograniczenia-w-dostepie-do-us-ug-elektronicznych-zus-5-czerwca-2026-r-zus`
- **Namespace/status:** `TaxbellPayrollHRReference` / `promoted`.
- **Źródło:** https://www.zus.pl/-/ograniczenia-w-dost%C4%99pie-do-us%C5%82ug-elektronicznych-zus-5-czerwca-2026-r.
- **Wynik:** POTWIERDZONE — `original_recovered`, HTTP 200; końcowy URL: https://www.zus.pl/-/ograniczenia-w-dost%C4%99pie-do-us%C5%82ug-elektronicznych-zus-5-czerwca-2026-r..
- **Pobranie UTC:** 2026-10-13T09:33:27.196Z – 2026-10-13T09:33:33.812Z.
- **Data źródła:** publikacja 2026-06-03; aktualizacja NIEUSTALONE / brak oddzielnej daty w odczycie.
- **Pokrycie:** Cały journal-content-article: data, okno serwisowe, trzy rodzaje ograniczeń i dostępne aplikacje mobilne.
- **Zapis:** `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellPayrollHRReference/draft_2026-06-09_0bdb5e10_ograniczenia-w-dostepie-do-us-ug-elektronicznych-zus-5-czerwca-2026-r-zus.json` oraz `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellPayrollHRReference/draft_2026-06-09_0bdb5e10_ograniczenia-w-dostepie-do-us-ug-elektronicznych-zus-5-czerwca-2026-r-zus.md`.

**POTWIERDZONE — porównanie z zapisanym body:** Markdown zawiera tytuł i menu emerytalno-rentowe; JSON jest krótszym wariantem tego materiału nawigacyjnego. W obu brak merytorycznej informacji o pracach serwisowych.

**Odzyskana treść:**
- Zapowiedziane ograniczenia 5.06.2026 od 23:00 do 6.06.2026 do 03:00; źródło nie określa strefy czasowej.
- Płatnik: pobieranie danych; ePłatnik na eZUS: weryfikacja podczas tworzenia dokumentów; eZUS i aplikacje e-ZLA: anulowanie.
- Wystawianie e-ZLA przez mZUS dla Lekarza po zainstalowaniu i połączeniu z kontem; dostępne mZUS i mZUS dla Płatnika.

**WNIOSEK — proponowana treść/kształt korekty:** Krótki historyczny komunikat operacyjny z datą publikacji, oknem serwisowym, zakresem trzech ograniczeń i dostępnymi alternatywami. Zastąpić menu emerytalne; nie prezentować jako trwającej awarii.

**Blokada lub granica:** Brak blokady odczytu. Komunikat jest zapowiedzią z 3.06.2026; nie ustalano faktycznego przebiegu prac.

**Próby:**
- 2026-10-13T09:33:27.196Z → 2026-10-13T09:33:33.812Z: clean ephemeral Chromium; no authentication; HTTP 200, networkidle reached, URL końcowy https://www.zus.pl/-/ograniczenia-w-dost%C4%99pie-do-us%C5%82ug-elektronicznych-zus-5-czerwca-2026-r.. Bez dodatkowych akcji.

### fb53cb2b

- **ID:** `draft_2026-06-09_fb53cb2b_b-ad-przy-konfiguracji-comarch-betterfly-z-ksef`
- **Namespace/status:** `ComarchCommunityNews` / `promoted`.
- **Źródło:** https://spolecznosc.comarch.pl/question/blad-przy-konfiguracji-comarch-betterfly-z-ksef-78292
- **Wynik:** POTWIERDZONE — `original_recovered`, HTTP 200; końcowy URL: https://spolecznosc.comarch.pl/question/blad-przy-konfiguracji-comarch-betterfly-z-ksef-78292.
- **Pobranie UTC:** 2026-10-13T09:33:27.225Z – 2026-10-13T09:44:34.255Z.
- **Data źródła:** publikacja 2026-03-21 13:12; aktualizacja 2026-03-23 10:02.
- **Pokrycie:** Publiczne pytanie biuro, odpowiedź Tomasza Bryknera z 22.03.2026 i jedna rozwinięta odpowiedź biuro z 23.03.2026. Daty strony bez jawnej strefy.
- **Zapis:** `/docker/openspg/docs/reference/knowledge_inbox/promoted/ComarchCommunityNews/draft_2026-06-09_fb53cb2b_b-ad-przy-konfiguracji-comarch-betterfly-z-ksef.json` oraz `/docker/openspg/docs/reference/knowledge_inbox/promoted/ComarchCommunityNews/draft_2026-06-09_fb53cb2b_b-ad-przy-konfiguracji-comarch-betterfly-z-ksef.md`.

**POTWIERDZONE — porównanie z zapisanym body:** Markdown ma tylko dwa tytuły, logo i loader; JSON usuwa fragmenty opakowania, ale nie zawiera pytania ani odpowiedzi. Żywa strona po JS pokazuje konkretny błąd i diagnostyczną sugestię.

**Odzyskana treść:**
- Pytający zgłasza błąd autoryzacji KSeF po skopiowaniu tokena; komunikat każe sprawdzić ważność certyfikatu/tokenu i uprawnienia.
- Tomasz Brykner sugeruje sprawdzić zgodność środowiska produkcyjnego/demo i wcześniejsze uprawnienia osoby generującej token.
- Pytający odpowiada „Dziękuję za informację.”; nie potwierdza jednoznacznie przyczyny ani usunięcia błędu.

**WNIOSEK — proponowana treść/kształt korekty:** Datowany wątek question/answer/reply z autorami, cytatem błędu, sugestią diagnostyczną i podziękowaniem. Zachować status sugestii społeczności; nie dopisywać potwierdzonej naprawy ani ogólnej reguły dla wszystkich aktualnych instalacji.

**Blokada lub granica:** Brak blokady publicznego tekstu. Nie ma potwierdzenia skuteczności wskazanej sugestii.

**Próby:**
- 2026-10-13T09:33:27.225Z → 2026-10-13T09:33:35.162Z: clean ephemeral Chromium; no authentication; HTTP 200, networkidle reached, URL końcowy https://spolecznosc.comarch.pl/question/blad-przy-konfiguracji-comarch-betterfly-z-ksef-78292. Bez dodatkowych akcji.
- 2026-10-13T09:35:11.196Z → 2026-10-13T09:35:15.863Z: clean ephemeral Chromium; inspect then expand public reading controls; HTTP 200, networkidle reached, URL końcowy https://spolecznosc.comarch.pl/question/blad-przy-konfiguracji-comarch-betterfly-z-ksef-78292. Akcje: Opened cookie Ustawienia.
- 2026-10-13T09:35:48.267Z → 2026-10-13T09:36:22.918Z: clean ephemeral Chromium; inspect then expand public reading controls; HTTP 200, networkidle reached, URL końcowy https://spolecznosc.comarch.pl/question/blad-przy-konfiguracji-comarch-betterfly-z-ksef-78292. Akcje: Opened cookie Ustawienia; Clicked cookie preference control.
- 2026-10-13T09:37:34.752Z → 2026-10-13T09:38:09.714Z: clean ephemeral Chromium; inspect then expand public reading controls; HTTP 200, networkidle reached, URL końcowy https://spolecznosc.comarch.pl/question/blad-przy-konfiguracji-comarch-betterfly-z-ksef-78292. Akcje: Opened cookie Ustawienia; Clicked cookie preference control.
- 2026-10-13T09:39:02.535Z → 2026-10-13T09:39:38.798Z: clean ephemeral Chromium; inspect then expand public reading controls; HTTP 200, networkidle reached, URL końcowy https://spolecznosc.comarch.pl/question/blad-przy-konfiguracji-comarch-betterfly-z-ksef-78292. Akcje: Opened cookie Ustawienia; Clicked cookie preference control; Expand 0  Odpowiedzi: 1; Expand 0  Odpowiedzi: 1; Expand 0  Odpowiedzi: 1.
- 2026-10-13T09:43:58.602Z → 2026-10-13T09:44:34.255Z: clean ephemeral Chromium; inspect then expand public reading controls; HTTP 200, networkidle reached, URL końcowy https://spolecznosc.comarch.pl/question/blad-przy-konfiguracji-comarch-betterfly-z-ksef-78292. Akcje: Opened cookie Ustawienia; Clicked cookie preference control; Expand 0  Odpowiedzi: 1; Expand 0  Odpowiedzi: 1; Expand 0  Odpowiedzi: 1; Expand 0  Odpowiedzi: 1.

### f0ede681

- **ID:** `draft_2026-08-02_f0ede681_nowa-wersja-comarch-erp-optima-2026-2-1-jest-juz-dostepna`
- **Namespace/status:** `ComarchCommunityNews` / `promoted`.
- **Źródło:** https://spolecznosc.comarch.pl/news/nowa-wersja-comarch-erp-optima-2026-2-1-jest-juz-dostepna-77465
- **Wynik:** POTWIERDZONE — `original_recovered`, HTTP 200; końcowy URL: https://spolecznosc.comarch.pl/news/nowa-wersja-comarch-erp-optima-2026-2-1-jest-juz-dostepna-77465.
- **Pobranie UTC:** 2026-10-13T09:33:27.236Z – 2026-10-13T09:45:15.330Z.
- **Data źródła:** publikacja 2026-01-29 13:51; aktualizacja 2026-02-10 13:38.
- **Pokrycie:** Cały publiczny tekst ogłoszenia Katarzyny Bibrzyckiej; pięć komentarzy głównych i rozwinięte gałęzie odpowiedzi/Pokaż więcej. Bez odczytu obrazów załączników i bez wizyt na stronach Klientów/Partnerów.
- **Zapis:** `/docker/openspg/docs/reference/knowledge_inbox/promoted/ComarchCommunityNews/draft_2026-08-02_f0ede681_nowa-wersja-comarch-erp-optima-2026-2-1-jest-juz-dostepna.json` oraz `/docker/openspg/docs/reference/knowledge_inbox/promoted/ComarchCommunityNews/draft_2026-08-02_f0ede681_nowa-wersja-comarch-erp-optima-2026-2-1-jest-juz-dostepna.md`.

**POTWIERDZONE — porównanie z zapisanym body:** Zapis jest wyłącznie tytułem ogłoszenia z metadanymi odkrycia. Pomija wszystkie funkcje wydania i datę. Data draftu 2.08.2026 nie jest datą wydania.

**Odzyskana treść:**
- Ogłoszenie udostępnienia wersji 2026.2.1, opublikowane 29.01.2026.
- PIT-28, IFT-2/IFT-2R i CIT-8 za 2025; nowe kody JPK dla trybów awaryjnych; offline, offline24, awaria KSeF i awaria całkowita.
- Rozszerzone dane warunków transakcji, nowe środki transportu i DodatkowyOpis w KSeF; nowy wzór Z-3b.
- Linki do nowości i Indywidualnych Stron Klientów/Partnerów.
- Komentarze opisują historyczne problemy i sugestie, m.in. przyszłą poprawkę oraz uwierzytelnianie od 1.02.2026; nie są dowodem wdrożenia poprawek obecnie.

**WNIOSEK — proponowana treść/kształt korekty:** Versioned release announcement: autor, opublikowano/zaktualizowano, wersja 2026.2.1, siedem punktów zmian i linki. Komentarze przechowywać jako osobny datowany dialog z atrybucją; planowane poprawki oznaczyć jako zapowiedzi. „Najnowsza wersja” pozostaje cytatem historycznym.

**Blokada lub granica:** Brak blokady ogłoszenia i komentarzy. Obrazy/treść pobrań programu nie sprawdzone; nie ustalono aktualnej wersji produktu ani wdrożenia zapowiedzianych poprawek.

**Próby:**
- 2026-10-13T09:33:27.236Z → 2026-10-13T09:33:35.034Z: clean ephemeral Chromium; no authentication; HTTP 200, networkidle reached, URL końcowy https://spolecznosc.comarch.pl/news/nowa-wersja-comarch-erp-optima-2026-2-1-jest-juz-dostepna-77465. Bez dodatkowych akcji.
- 2026-10-13T09:35:16.176Z → 2026-10-13T09:35:20.465Z: clean ephemeral Chromium; inspect then expand public reading controls; HTTP 200, networkidle reached, URL końcowy https://spolecznosc.comarch.pl/news/nowa-wersja-comarch-erp-optima-2026-2-1-jest-juz-dostepna-77465. Akcje: Opened cookie Ustawienia.
- 2026-10-13T09:36:23.215Z → 2026-10-13T09:36:57.881Z: clean ephemeral Chromium; inspect then expand public reading controls; HTTP 200, networkidle reached, URL końcowy https://spolecznosc.comarch.pl/news/nowa-wersja-comarch-erp-optima-2026-2-1-jest-juz-dostepna-77465. Akcje: Opened cookie Ustawienia; Clicked cookie preference control.
- 2026-10-13T09:38:10.020Z → 2026-10-13T09:38:44.504Z: clean ephemeral Chromium; inspect then expand public reading controls; HTTP 200, networkidle reached, URL końcowy https://spolecznosc.comarch.pl/news/nowa-wersja-comarch-erp-optima-2026-2-1-jest-juz-dostepna-77465. Akcje: Opened cookie Ustawienia; Clicked cookie preference control.
- 2026-10-13T09:39:39.101Z → 2026-10-13T09:40:16.879Z: clean ephemeral Chromium; inspect then expand public reading controls; HTTP 200, networkidle reached, URL końcowy https://spolecznosc.comarch.pl/news/nowa-wersja-comarch-erp-optima-2026-2-1-jest-juz-dostepna-77465. Akcje: Opened cookie Ustawienia; Clicked cookie preference control; Expand 0  Odpowiedzi: 6; Expand 0  Odpowiedzi: 6; Expand 1  Odpowiedzi: 1; Expand 1  Odpowiedzi: 1; Expand 1  Odpowiedzi: 1; Expand 1  Odpowiedzi: 1; Expand 2  Odpowiedzi: 2; Expand 2  Odpowiedzi: 2; Expand 3  Odpowiedzi: 1; Expand 3  Odpowiedzi: 1; Expand 4  Odpowiedzi: 1; Expand 4  Odpowiedzi: 1; Expand 4  Odpowiedzi: 1.
- 2026-10-13T09:44:34.509Z → 2026-10-13T09:45:15.330Z: clean ephemeral Chromium; inspect then expand public reading controls; HTTP 200, networkidle reached, URL końcowy https://spolecznosc.comarch.pl/news/nowa-wersja-comarch-erp-optima-2026-2-1-jest-juz-dostepna-77465. Akcje: Opened cookie Ustawienia; Clicked cookie preference control; Expand 0 Pokaż więcej; Expand 0  Odpowiedzi: 6; Expand 0  Odpowiedzi: 6; Expand 0  Odpowiedzi: 6; Expand 1  Odpowiedzi: 1; Expand 1  Odpowiedzi: 1; Expand 1  Odpowiedzi: 1; Expand 2  Odpowiedzi: 2; Expand 3 Pokaż więcej; Expand 3  Odpowiedzi: 1; Expand 4  Odpowiedzi: 1.

### 7c66353e

- **ID:** `draft_2026-06-30_7c66353e_zmiany-w-stazu-pracy-wnioski-o-zaswiadczenia-z-zus-od-stycznia-2026-r-zus`
- **Namespace/status:** `TaxbellPayrollHRReference` / `promoted`.
- **Źródło:** https://www.zus.pl/-/zmiany-w-sta%C5%BCu-pracy-wnioski-o-za%C5%9Bwiadczenia-z-zus-od-stycznia-2026-r.
- **Wynik:** POTWIERDZONE — `original_recovered`, HTTP 200; końcowy URL: https://www.zus.pl/-/zmiany-w-sta%C5%BCu-pracy-wnioski-o-za%C5%9Bwiadczenia-z-zus-od-stycznia-2026-r..
- **Pobranie UTC:** 2026-10-13T09:33:27.227Z – 2026-10-13T09:33:34.473Z.
- **Data źródła:** publikacja 2025-10-21; aktualizacja NIEUSTALONE / brak oddzielnej daty w odczycie.
- **Pokrycie:** Cały datowany journal-content-article, cztery akapity o stażu i zaświadczeniach.
- **Zapis:** `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellPayrollHRReference/draft_2026-06-30_7c66353e_zmiany-w-stazu-pracy-wnioski-o-zaswiadczenia-z-zus-od-stycznia-2026-r-zus.json` oraz `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellPayrollHRReference/draft_2026-06-30_7c66353e_zmiany-w-stazu-pracy-wnioski-o-zaswiadczenia-z-zus-od-stycznia-2026-r-zus.md`.

**POTWIERDZONE — porównanie z zapisanym body:** Zapis zawiera wyłącznie tytuł, bez daty, zakresu nowych okresów, formularzy i rozróżnienia świadectwa pracy od zaświadczeń ZUS.

**Odzyskana treść:**
- ZUS w komunikacie z 21.10.2025 zapowiada zmiany od 1.01.2026 i wnioski PUE/eZUS udostępnione po wejściu ustawy.
- Wymienia działalność, współpracę, zawieszenie działalności na opiekę, zlecenia/usługi/agencyjne i członkostwo w spółdzielniach.
- Dotychczasowe zatrudnienie na umowie o pracę nadal potwierdza świadectwo pracy; komunikat odradza niepotrzebne wnioski obejmujące cały przebieg ubezpieczenia.

**WNIOSEK — proponowana treść/kształt korekty:** Historyczny komunikat przygotowawczy: data 21.10.2025, planowana data zmian, zakres okresów i sposób dokumentowania według tego tekstu. Nie przekształcać zapowiedzi w opis wszystkich obecnych procedur ani dopisywać dzisiejszych formularzy.

**Blokada lub granica:** Brak blokady odczytu. Nie sprawdzano późniejszych komunikatów, szczegółowych harmonogramów ani faktycznej dostępności formularzy.

**Próby:**
- 2026-10-13T09:33:27.227Z → 2026-10-13T09:33:34.473Z: clean ephemeral Chromium; no authentication; HTTP 200, networkidle reached, URL końcowy https://www.zus.pl/-/zmiany-w-sta%C5%BCu-pracy-wnioski-o-za%C5%9Bwiadczenia-z-zus-od-stycznia-2026-r.. Bez dodatkowych akcji.

### a939510d

- **ID:** `draft_2026-06-30_a939510d_projekt-ustawy-o-wzmocnieniu-stosowania-prawa-do-jednakowego-wynagrodzenia-mezcz`
- **Namespace/status:** `TaxbellPayrollHRReference` / `promoted`.
- **Źródło:** https://www.gov.pl/web/premier/projekt-ustawy-o-wzmocnieniu-stosowania-prawa-do-jednakowego-wynagrodzenia-mezczyzn-i-kobiet-za-jednakowa-prace-lub-za-prace-o-jednakowej-wartosci2
- **Wynik:** POTWIERDZONE — `original_recovered`, HTTP 200; końcowy URL: https://www.gov.pl/web/premier/projekt-ustawy-o-wzmocnieniu-stosowania-prawa-do-jednakowego-wynagrodzenia-mezczyzn-i-kobiet-za-jednakowa-prace-lub-za-prace-o-jednakowej-wartosci2.
- **Pobranie UTC:** 2026-10-13T09:33:27.230Z – 2026-10-13T09:43:11.625Z.
- **Data źródła:** publikacja 2025-11-25 16:49; aktualizacja NIEUSTALONE / brak oddzielnej daty w odczycie.
- **Pokrycie:** Pełny tekst karty UC127: cele, istota planowanych rozwiązań, właściwe organy i historia publikacji. Networkidle nie osiągnięto w limicie, ale karta i metryka są czytelne.
- **Zapis:** `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellPayrollHRReference/draft_2026-06-30_a939510d_projekt-ustawy-o-wzmocnieniu-stosowania-prawa-do-jednakowego-wynagrodzenia-mezcz.json` oraz `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellPayrollHRReference/draft_2026-06-30_a939510d_projekt-ustawy-o-wzmocnieniu-stosowania-prawa-do-jednakowego-wynagrodzenia-mezcz.md`.

**POTWIERDZONE — porównanie z zapisanym body:** Zapis zawiera wyłącznie tytuł. Nie ma UC127, charakteru projektu UE, celów, propozycji obowiązków ani metryki publikacji.

**Odzyskana treść:**
- UC127, projekt ustawy implementujący UE, organ MRPiPS, osoba odpowiedzialna Agnieszka Dziemianowicz-Bąk.
- Cel: implementacja dyrektywy (UE) 2023/970; przywołany termin implementacji 7.06.2026 nie dowodzi uchwalenia polskiej ustawy.
- Planowane wartościowanie stanowisk i neutralne kryteria płacowe, prawo do informacji, sprawozdania luki płacowej dla co najmniej 100 pracowników i wspólna ocena wynagrodzeń.
- Karta opisuje projektowane sankcje 2000–60000 zł i zadania organów; pole Status realizacji w odczycie nie ma wartości.

**WNIOSEK — proponowana treść/kształt korekty:** Karta projektu legislacyjnego UC127: numer, typ, pierwsza publikacja, odpowiedzialni, cele i planowane rozwiązania. Zachować osobno opis dyrektywy, istniejącego prawa i propozycji projektu. Nie oznaczać jako uchwalone/obowiązujące; nie dopisywać statusu, którego pole jest puste.

**Blokada lub granica:** Oczekiwanie networkidle wygasło, bez przeszkody dla tekstu. Data ostatniej zmiany karty i status realizacji pozostają NIEUSTALONE; nie badano legislacyjnych źródeł dalszego przebiegu.

**Próby:**
- 2026-10-13T09:33:27.230Z → 2026-10-13T09:33:57.390Z: clean ephemeral Chromium; no authentication; HTTP 200, networkidle timeout, URL końcowy https://www.gov.pl/web/premier/projekt-ustawy-o-wzmocnieniu-stosowania-prawa-do-jednakowego-wynagrodzenia-mezczyzn-i-kobiet-za-jednakowa-prace-lub-za-prace-o-jednakowej-wartosci2. Bez dodatkowych akcji.
- 2026-10-13T09:41:54.227Z → 2026-10-13T09:42:11.744Z: clean Chromium; expand official page reading sections; HTTP 200, networkidle timeout, URL końcowy https://www.gov.pl/web/premier/projekt-ustawy-o-wzmocnieniu-stosowania-prawa-do-jednakowego-wynagrodzenia-mezczyzn-i-kobiet-za-jednakowa-prace-lub-za-prace-o-jednakowej-wartosci2. Akcje: Odrzuć optional cookies; Read/expand Pokaż historię zmian.
- 2026-10-13T09:42:53.658Z → 2026-10-13T09:43:11.625Z: clean Chromium; expand official page reading sections; HTTP 200, networkidle timeout, URL końcowy https://www.gov.pl/web/premier/projekt-ustawy-o-wzmocnieniu-stosowania-prawa-do-jednakowego-wynagrodzenia-mezczyzn-i-kobiet-za-jednakowa-prace-lub-za-prace-o-jednakowej-wartosci2. Akcje: Odrzuć optional cookies; Read/expand Pokaż historię zmian.

### 9c43b46e

- **ID:** `draft_2026-07-02_9c43b46e_roczna-waloryzacja-na-kontach-osob-ubezpieczonych-w-zus-zus`
- **Namespace/status:** `TaxbellPayrollHRReference` / `promoted`.
- **Źródło:** https://www.zus.pl/-/roczna-waloryzacja-na-kontach-os%C3%B3b-ubezpieczonych-w-zus
- **Wynik:** POTWIERDZONE — `original_recovered`, HTTP 200; końcowy URL: https://www.zus.pl/-/roczna-waloryzacja-na-kontach-os%C3%B3b-ubezpieczonych-w-zus.
- **Pobranie UTC:** 2026-10-13T09:33:27.232Z – 2026-10-13T09:33:33.634Z.
- **Data źródła:** publikacja 2023-06-07; aktualizacja NIEUSTALONE / brak oddzielnej daty w odczycie.
- **Pokrycie:** Cały journal-content-article o rocznej waloryzacji, z datą i wskaźnikami.
- **Zapis:** `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellPayrollHRReference/draft_2026-07-02_9c43b46e_roczna-waloryzacja-na-kontach-osob-ubezpieczonych-w-zus-zus.json` oraz `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellPayrollHRReference/draft_2026-07-02_9c43b46e_roczna-waloryzacja-na-kontach-osob-ubezpieczonych-w-zus-zus.md`.

**POTWIERDZONE — porównanie z zapisanym body:** Zapis zawiera tylko tytuł; Query: ZUS nowości czerwiec 2026 i data draftu 2.07.2026 mogą błędnie nadawać współczesny kontekst tekstowi z 2023 r.

**Odzyskana treść:**
- Artykuł 7.06.2023 informuje o zwiększeniu kapitału o ponad 450 mld zł, wobec około 281 mld zł rok wcześniej.
- Podaje wskaźniki 114,40% dla konta i 109,20% dla subkonta, odnosząc je do składek zapisanych 31.01.2022.
- Informacja o stanie konta według 31.12.2022, dostępność PUE ZUS i papierowe informacje na życzenie od 2020 r.

**WNIOSEK — proponowana treść/kształt korekty:** Archiwalna wiadomość o waloryzacji 2023 z datą, okresem odniesienia i wskaźnikami zgodnymi z tekstem. Usunąć opakowanie zapytania sugerujące nowości 2026. Nie używać tych wskaźników jako wartości 2026.

**Blokada lub granica:** Brak blokady odczytu. Nie ustalano wskaźników ani zasad obecnego roku.

**Próby:**
- 2026-10-13T09:33:27.232Z → 2026-10-13T09:33:33.634Z: clean ephemeral Chromium; no authentication; HTTP 200, networkidle reached, URL końcowy https://www.zus.pl/-/roczna-waloryzacja-na-kontach-os%C3%B3b-ubezpieczonych-w-zus. Bez dodatkowych akcji.

### 4ce9f131

- **ID:** `draft_2026-07-30_4ce9f131_od-lipca-prostsze-zasady-sk-adania-wnioskow-o-zasi-ki`
- **Namespace/status:** `TaxbellPayrollHRReference` / `promoted`.
- **Źródło:** https://www.zus.pl/-/od-lipca-prostsze-zasady-sk%C5%82adania-wniosk%C3%B3w-o-zasi%C5%82ki
- **Wynik:** POTWIERDZONE — `original_recovered`, HTTP 200; końcowy URL: https://www.zus.pl/-/od-lipca-prostsze-zasady-sk%C5%82adania-wniosk%C3%B3w-o-zasi%C5%82ki.
- **Pobranie UTC:** 2026-10-13T09:33:27.255Z – 2026-10-13T09:33:34.648Z.
- **Data źródła:** publikacja 2026-07-01; aktualizacja NIEUSTALONE / brak oddzielnej daty w odczycie.
- **Pokrycie:** Cały journal-content-article: płatnik zasiłku, formy wniosków, przekazanie do ZUS, załączniki, termin i wskazana podstawa prawna.
- **Zapis:** `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellPayrollHRReference/draft_2026-07-30_4ce9f131_od-lipca-prostsze-zasady-sk-adania-wnioskow-o-zasi-ki.json` oraz `/docker/openspg/docs/reference/knowledge_inbox/promoted/TaxbellPayrollHRReference/draft_2026-07-30_4ce9f131_od-lipca-prostsze-zasady-sk-adania-wnioskow-o-zasi-ki.md`.

**POTWIERDZONE — porównanie z zapisanym body:** Zapis ma wyłącznie tytuł, pomijając zasadnicze rozróżnienie wniosków do pracodawcy i do ZUS oraz warunki podpisu i terminy.

**Odzyskana treść:**
- Według artykułu od 1.07.2026 formy dokumentów zależą od płatnika: powyżej 20 ubezpieczonych – płatnik składek, do 20 – ZUS, z opisanym wyjątkiem okresu po ustaniu ubezpieczenia.
- Do płatnika wniosek papierowy lub elektroniczny, np. email/system/skan; do ZUS papier albo dokument elektroniczny PUE/eZUS/e-doręczenia z wymienionym podpisem.
- Płatnik niepłacący zasiłku opiekuńczego przekazuje wniosek do ZUS papierowo lub elektronicznie, bez duplikowania papieru.
- Załączniki: oryginały, potwierdzone kopie lub kopie elektroniczne; przekazanie potrzebnych dokumentów przez płatnika do ZUS w ciągu 7 dni od otrzymania.
- Wskazane ustawy: 25.06.1999 (Dz.U. 2025 poz. 501 z późn. zm.) i nowelizacja 13.02.2026 (Dz.U. 2026 poz. 441).

**WNIOSEK — proponowana treść/kształt korekty:** Datowany artykuł proceduralny z odrębnymi sekcjami: kto wypłaca, wniosek do płatnika, wniosek do ZUS i podpisy, przekazanie przez płatnika, załączniki, 7-dniowy termin, przytoczone podstawy prawne. Nie uogólniać, że zwykły email/skan wystarcza we wszystkich kanałach do ZUS.

**Blokada lub granica:** Brak blokady odczytu. Przytoczone podstawy prawne nie były osobno weryfikowane; porównanie dotyczy zgodności treści z artykułem.

**Próby:**
- 2026-10-13T09:33:27.255Z → 2026-10-13T09:33:34.648Z: clean ephemeral Chromium; no authentication; HTTP 200, networkidle reached, URL końcowy https://www.zus.pl/-/od-lipca-prostsze-zasady-sk%C5%82adania-wniosk%C3%B3w-o-zasi%C5%82ki. Bez dodatkowych akcji.

## Dowody i walidacja

JSON zawiera dokładne ID, źródłowe URL, wszystkie zinstrumentowane próby, pełne zapisane body JSON/Markdown, pobrany tekst, sekcje akordeonów, tematyczne linki, SHA-256 oraz propozycje i ograniczenia per rekord. Pełny roboczy ślad DOM: `/tmp/opencode/remaining-source-evidence.json`.

`npm run check`: PASS. Walidator raportu: PASS 10/10 (dokładne klucze, ID/status, body/hash, treść źródła, daty, pokrycie, próby, propozycje i wykluczenia). Mapa modułów: OK, 4 moduły. Nie uruchamiano testów integracyjnych ani buildów.

## Handoff

```json
{
  "task_id": "promoted-source-comparison-remaining-2026-10-13",
  "agent": "OpenCode",
  "host": "docker-ai",
  "repository": "/docker/openspg",
  "base_branch": "main",
  "base_commit": "79e376d241322b2debbffb900a68bcf67ae78004",
  "result_commit": "uncommitted",
  "changed_files": [
    "/docker/openspg/docs/reference/Promoted_Source_Comparison_Remaining_2026-10-13.md",
    "/docker/openspg/docs/reference/Promoted_Source_Comparison_Remaining_2026-10-13.json"
  ],
  "skills_used": [
    "codex-delegation",
    "webapp-testing",
    "verification-before-completion"
  ],
  "commands_run": [
    "git status --short && git branch --show-current && git rev-parse HEAD",
    "npm run check",
    "node /tmp/opencode/remaining-source-fetch.mjs",
    "node /tmp/opencode/remaining-expand.mjs (five runs)",
    "node /tmp/opencode/remaining-official-expand.mjs (two runs)",
    "node /tmp/opencode/remaining-inspect.mjs",
    "node /tmp/opencode/remaining-summary.mjs",
    "node /tmp/opencode/remaining-report.mjs",
    "node /tmp/opencode/remaining-verify.mjs",
    "python3 scripts/validate-module-map.py"
  ],
  "validation": {
    "passed": [
      "npm run check",
      "Report verifier: 10/10 exact keys, IDs/status, body/hash, source markers, dates, coverage, attempts and exclusions",
      "Module map: OK, 4 modules"
    ],
    "failed": [],
    "not_run": [
      "Builds/runtime integration/legal certification excluded by scope"
    ]
  },
  "confirmed_findings": [
    "10 original source bodies recovered",
    "All 10 promoted bodies lack substantive source fidelity",
    "9c43b46e is dated 2023, not 2026"
  ],
  "inferences": [
    "Proposed shapes are source-based editorial repairs only"
  ],
  "hypotheses": [],
  "risks": [
    "Dates of discovery/promotion differ from publication; historical announcements must retain dates"
  ],
  "approval_required": [],
  "recommended_next_action": "Use the ten proposed shapes for separately authorized source corrections; preserve source dates and uncertainty."
}
```
