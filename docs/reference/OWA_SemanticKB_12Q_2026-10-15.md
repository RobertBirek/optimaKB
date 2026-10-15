# OWA — test jakości odpowiedzi SemanticKB, 2026-10-15

## Wynik: 0 PASS / 4 PARTIAL / 8 MISS

Wykonano **12/12 wywołań działających narzędzi SemanticKB**, bez błędów transportu w ocenianych wywołaniach. Wszystkie odpowiedzi deklarowały lokalne artefakty, bez wykonania grafu KAG/OpenSPG. Dane OWA istnieją, ale warstwa odpowiedzi nie udostępnia ich wystarczająco skutecznie.

Nie jest to wynik porównania przed/po odzyskaniu snapshotów. Nie dowodzi pogorszenia wskutek naprawy ani aktualności historycznych twierdzeń o MSSQL/API.

## Metoda i kryteria

- Pytania, oczekiwane fakty i kryteria zapisano w towarzyszącym JSON **przed** wykonaniem 12 wywołań. Nie zmieniano ich po uzyskaniu odpowiedzi.
- Narzędzia: `erp_entity.get`, `erp_process.explain`, `erp_relation.list`, `erp_concept.search`; `as_of=2026-10-15`, `limit=5`, korelacja `owa-12q-20261015-QNN`.
- Przed oceną odczytano siedem materiałów źródłowych OWA: Kontrahent, Towar, Magazyn, PZ, WZ, Workflow dokumentu, Atrybuty test v2. Dokładne ścieżki i oczekiwania są w JSON.
- **PASS:** odpowiedź realizuje pytanie lub właściwie wyjaśnia niejednoznaczność/brak dowodu, z przypisywalnymi źródłami i ograniczeniami.
- **PARTIAL:** zwraca przynajmniej część właściwych faktów, ale pozostawia istotne braki treści, warunków lub źródeł.
- **MISS:** nie odpowiada na zadany temat, zwraca nieprzydatne dowody, nie realizuje wymaganego wskazania braku wiedzy albo kończy się błędem.
- Ocena jest ręczna, oparta na **widocznej treści odpowiedzi**, nie na confidence, liczbie trafień ani informacji znanej oceniającemu ze źródeł.
- Potwierdzono dostępność obu KB w profilu: Business Semantics, projekt 15; OWAOntology, projekt 16.

Pełne widoczne odpowiedzi są w rozmowie; raport zachowuje wybrane dosłowne fragmenty i locatory, **nie** pełne kopie odpowiedzi HTTP ani ich hashe. Wstępne, niepotrzebne do tego testu wywołanie `OptimaMCP.optima_discover` zakończyło się błędem walidacji schematu odpowiedzi; nie wliczano go do 12 ocenianych pytań.

## Wyniki szczegółowe

| ID | Temat | Główna KB | Ocena | Powód |
|---|---|---|---|---|
| Q01 | Kontrahent: identyfikator i niezależne role | Business Semantics | MISS | Brak `Knt_KntId` i flag dostawcy/odbiorcy; ogólne fragmenty płatności i KPI. |
| Q02 | Towar: identyfikator, kod i wiele cen | Business Semantics | PARTIAL | Jest `Twr_Kod`, brak `Twr_TwrId` i `TwrCeny`. |
| Q03 | Magazyn: PK, symbol, dezaktywacja | OWAOntology | MISS | Wybrane okresy obrachunkowe/MM zamiast `Mag_MagId`, `Mag_Symbol`, `Mag_NieAktywny`. |
| Q04 | Proces PZ → FZ | Business Semantics | MISS | Nie wyjaśnia PZ ani skutku magazynowego; diagnostyka mówi `Brakujące terminy: pz.` |
| Q05 | Proces WZ → FS | OWAOntology | PARTIAL | Właściwy opis zmniejszenia stanu i powiązania z FS, ale rozproszony/ucięty opis procesu i ograniczeń. |
| Q06 | Kontrahent ↔ dokument i kontakty | OWAOntology | MISS | Relacje CRM/KP/KW zamiast obu żądanych JOIN-ów i kardynalności. |
| Q07 | Workflow: etapy, historia, obowiązkowość | Business Semantics | MISS | Brak tabel etapów/historii i `DnE_Obowiazkowy`. |
| Q08 | Towar ↔ grupa i ceny, FK a JOIN logiczny | OWAOntology | PARTIAL | Właściwy JOIN Towary–Grupy; relacja cen i pełne rozróżnienie typów nie docierają do odpowiedzi. |
| Q09 | Dokładna encja Atrybuty test v2 | OWAOntology | PARTIAL | Encja i definicja odnalezione; fragment ucięty przed `CDN.DefAtrybuty`; brak wyjaśnienia, że nie ma pełnej mapy pól. |
| Q10 | Niejednoznaczny „stan dokumentu” | Business Semantics | MISS | Brak rozróżnienia osi stanu lub pytania doprecyzowującego. |
| Q11 | Nieznany pełny enum `Knt_Rodzaj` | Business Semantics | MISS | Nie zmyśla enum, ale nie odczytuje i nie komunikuje jawnego `UNKNOWN`. |
| Q12 | Fikcyjny proces, kontrola negatywna | OWAOntology | MISS | Nie potwierdza fikcji, lecz zastępuje oczekiwany brak dowodu przypadkowymi fragmentami innych procesów. |

**6/12** pytań skierowano do OWAOntology z pomocniczą Business Semantics. Pozostałe **6/12** trafiło wyłącznie do Business Semantics, mimo jawnego kontekstu OWA.

## Potwierdzone przyczyny i ograniczenia diagnozy

### 1. Routing nie utrzymuje jawnego kontekstu OWA

Read-only reprodukcja lokalnego klasyfikatora, z tym samym zakresem dwóch namespace:

- Q01: Business Semantics **5**, OWA **2** — ogólne „czym jest” wygrywa z „ontologii OWA”.
- Q07: Business Semantics **12**, OWA **2** — między innymi `znaczenie` dopasowuje się wewnątrz „oznaczenie”, a „ograniczenia” dodatkowo wzmacniają trasę semantyczną.

Kod: `scripts/erp_knowledge_assistant.mjs:671–692`; reguła OWA: `docs/reference/ERP_Knowledge_Assistant_Routing.json:119–140`. To reprodukcja wyboru trasy na aktualnych lokalnych źródłach, nie niezależny dowód całej konfiguracji procesu usługowego.

### 2. Pełna prezentacja źródeł wymaga URL, którego lokalne rekordy OWA nie mają

Nagłówki `exports/owa_ontology/v1/chunk.csv` oraz `ontology_entity.csv` nie zawierają `sourceUrl`. Parser ustawia więc `sourceUrl=null`; `assembleSourceExtracts()` pomija takie trafienia. Pozostaje stary ograniczony preview, który ucina warunki i wiersze tabel.

Read-only syntetyczny test A/B z identyczną treścią i ścieżką źródła:

| URL obecny | Liczba źródeł | Liczba pełnych extractów |
|---|---:|---:|
| nie | 0 | 0 |
| tak, wyłącznie diagnostyczny `example.test` | 1 | 1 |

Kod: `scripts/lib/knowledge_retrieval.mjs:85–114`; `scripts/erp_knowledge_answer.mjs:327–337,431–445`. Nie dodano fikcyjnych URL do danych. Docelowo lokalny dokument musi mieć własne poprawne pochodzenie/locator, bez udawania strony WWW.

### 3. Ranking i obsługa braku dowodu wymagają osobnej poprawki

- Q03/Q06 wybierają obce encje/relacje mimo dostępnych właściwych materiałów.
- W Q09 dokładna encja pojawia się za ogólnymi trafieniami.
- Q10–Q12 pokazują, że ogólne „lokalne fragmenty wymagają weryfikacji” nie zastępuje wyjaśnienia niejednoznaczności ani jawnego „brak dowodów dla tego pytania”.

Obserwacje te są potwierdzone odpowiedziami. Szczegółowa zmiana rankingu i detekcji braku dowodu wymaga własnych regresji; nie przypisano jej bez badania jednej konkretnej funkcji.

## Rekomendowany następny krok

Przygotować ograniczoną poprawkę **warstwy asystenta**:

1. Zachować jawny kontekst OWA w ramach dozwolonych namespace.
2. Użyć dokładnej tożsamości encji i żądanej relacji w rankingu.
3. Obsłużyć pełne, przypisywalne fragmenty lokalnych źródeł bez wymogu zewnętrznego URL.
4. Dodać właściwe odpowiedzi dla niejednoznaczności, niepotwierdzonych enumów i nieistniejących procesów.
5. Powtórzyć **te same 12 pytań** po recenzji i wdrożeniu; zachować obecny wynik jako baseline.

Ten test nie daje podstaw do kolejnego eksportu ani rebuildu OWA. Nie zmieniano kodu produkcyjnego, korpusu, eksportów, grafu ani usług. Powstały wyłącznie dwa pliki raportu; nie wykonano nowego commitu ani push.
