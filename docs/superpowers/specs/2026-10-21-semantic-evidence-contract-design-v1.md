# SemanticKB: jawne odkrywanie obiektów i pobieranie dowodów

Data2026-10-21. **Projekt PoC v0.1 do niezależnego przeglądu i akceptacji użytkownika. Narzędzia nie są zaimplementowane ani zarejestrowane.**

## 1. Cel i granica decyzji

Model prowadzący rozmowę rozkłada pytanie na jawne żądania. MCP dostarcza kandydatów oraz źródłowe dowody dla wybranych identyfikatorów, zachowując zakres i braki każdej pozycji. W serwerze KB nie powstaje nowy LLM, provider ani pełny generator odpowiedzi.

Użytkownik zaakceptował przygotowanie kontraktu i sprawdzenie wykonalności. Ta faza obejmuje dokumentację i odczyt źródeł. Implementacja prywatnego PoC wymaga akceptacji tego dokumentu oraz planu wykonania; integracja z usługami, commit/push, publikacja nowych narzędzi i wdrożenie wymagają odrębnego polecenia.

Podstawa: jednorazowe20Q dało1PASS/12PARTIAL/7MISS przy20 poprawnych wywołaniach. Fakty istniały w źródłach; problemy obejmowały dobór właściciela, pomijanie żądanych pól i konkretnych niewiadomych. Te20 to już znana regresja, nie świeży holdout. Historyczne42PASS nie jest oceną nowego kontraktu. A8 pozostajeFAIL/BLOCKED przy1.25 wobec pierwotnego ptat31; nowy projekt nie zmienia tego wyniku.

Funkcjonalny punkt odniesienia: frozenEsJ4gr `/tmp/opencode/semantic42-frozen-EsJ4gr`, manifestSHA `9f4275a2400e7853f7b8bcdcfe3f4463c3ad30384f1bdb49a0bbfbfc3626eede`. Main transport: HEAD `dfb1c8ec40f0639f291e216481277ee3cc7a791d`. Brudny worktree z nieudanym cache pozostaje zachowany; nie jest automatycznie bazą nowej implementacji.

## 2. Wybór architektury

| Wariant | Zalety / koszt | Decyzja |
|---|---|---|
| **Dwa jawne narzędzia: discovery i evidence** | Oddziela kandydatów od dowodów; model klienta wybiera zakres; per-żądanie widać kompletność i brak. Nowy mały kontrakt i indeks źródeł. | **Rekomendowany.** |
| Strukturalny tryb w istniejącym `erp_entity.get` | Mniej nazw, ale miesza query i selektory oraz zachowanie legacy z nowym kontraktem; utrudnia ocenę i kontrolę fallbacku. | Poza v0.1. |
| Model interpretujący wewnątrz KB | Obsługuje język w serwerze, wymaga dodatkowych kosztów, konfiguracji i oceny modelu. | Poza tym projektem. |

Nowe nazwy robocze: **`erp_subject.discover`** i **`erp_evidence.get`**. Dotychczasowe cztery narzędzia semantyczne zachowują swój historyczny kontrakt. PoC nie zastępuje ich produkcyjnie.

## 3. Zakres v0.1 i dane

Jedna przestrzeń nazw: **OWAOntology**. Trzy rodziny: rozróżnienie konta bankowego i księgowego; komplet definicji kilku pól audytowych kontrahenta; znany typ BRa_IBAN oraz konkretna niewiadoma jego znaczenia.

Indeks korzysta wyłącznie z trzech dostępnych plików runtime EsJ4gr:

| Artefakt | Rekordy | SHA256 |
|---|---:|---|
| `exports/owa_ontology/v1/ontology_entity.csv` |67|`35af823973b1d0377365efbcc68f184a83cac787f12dfecf983fb31190239d16`|
| `exports/owa_ontology/v1/ontology_field.csv` |109|`c0c17e8f0115f86b140e40a9e2cc02b1601bcca93f2d932e21736031d8aa6e17`|
| `exports/owa_ontology/v1/chunk.csv` |190|`6c8bc167db9c0009e5cb21c259ac191b81e8e721897487110a6946276fb7aca8`|

To366rekordów/406996bajtów. Domena starego harnessu ma43pliki; jego `.allFiles` ma79 i obejmuje również banki i referencje recenzentów. **Indeks nie czyta reviewerMD, banków, gold, ocen ani poprzednich odpowiedzi.** Referencje Markdown służą wyłącznie zewnętrznemu sprawdzeniu.

v0.1 zwraca `entity_overview`, `field_definition`, `sql_type`, `meaning`. **`field_definition` oznacza deklarację pola przy logicznej encji oraz opis źródłowy; nie potwierdza fizycznego mapowania kolumny do tabeli SQL.** Pełne `sql_mapping`, nullability/default jako osobne aspekty, relacje, procesy, triggery, zapis i odpytywanie ERP są poza v0.1. Nie obiecujemy zaliczenia wszystkich20Q.

## 4. Wykonalność i ważne ograniczenie źródeł

Dowody plikowe: `.superpowers/sdd/explicit-semantic-runtime-feasibility-20261021.{md,json}` oraz `...-budget-option.{md,json}`. To ręczna inspekcja danych i kodu, nie wykonanie przyszłych narzędzi.

- Konto bankowe: `OWA_ENTITY_ENCJA_KONTO_BANKOWE`, literalna etykieta Konto bankowe. Konto księgowe: `OWA_ENTITY_ENCJA_KONTO_KSIEGOWE`, etykieta Konto księgowe/aliasKonta. **Wszystkie rozważane `mainTable` są puste**; tabelę wolno podać wyłącznie z jawnego źródła, nie z tego pola/prefiksu. Całe ciała bankowego chunk1 i księgowego chunk1 mają2926znaków; zawierają definicje/role tabel i lokalne kwalifikacje.
- Definicje `Knt_OpeZalID`, `Knt_OpeModID`, `Knt_TS_Mod` są kompletnymi rekordami metadataF:L47/L48/L50 z literalnym `entityRefId` kontrahenta. Kanoniczny JSON wszystkich pól trzech rekordów ma1288znaków. Z całym K1status1253:2541; z osobną kompletną sekcją metadanych K5date153:2694. To2grupy/3+2jednostki według jawnej nowej definicji §7.
- Pełne mapowanieSQL tych pól ma rzeczywistą przeszkodę: K3 kończy się połową wiersza, K4 zaczyna kontynuacją i nie ma nagłówka. **Nie naprawiamy tego sklejeniem, dopisaniem nagłówka ani faktem z reviewerMD.** Właściciel metadata i jego tabela główna nie wystarczają do dowodu, że każda kolumna encji leży w tej tabeli. v0.1 dlatego podaje definicje, a nie pełne mapowaniaSQL.
- Feksport ma `mcpField="CDN"` przy tych rekordach. To surowy atrybut eksportu, **nie dowód parametru/odpowiedzi MCP**. v0.1 nie generuje mapowaniaAPI ani korekty źródła.
- Bank nie ma rekordówF. BRa_IBAN musi być kandydatem z jawnej deklaracji w Cchunk2, nie wymyślonym `OWA_FIELD_*`. Chunk2 zawiera `smallint`/NOT EXPOSED BY MCP; chunk3 pyta „to flaga czy ID?”. Całe ciała1743+1414=3157znaków. Typ i nieustalone znaczenie to odrębne wyniki. Dodatkowy kontekst/status/datę trzeba doliczyć według §7; sama suma3157nie dowodzi pełnego domknięcia wszystkich kwalifikacji.

## 5. Odkrywanie: wejście i wynik

Wszystkie obiekty wejściowe mają `additionalProperties:false`; bez konwersji typów. Parametry:

```ts
type EntityRef = { namespace: 'OWAOntology'; id: string }; // 1..256 UTF16, literalny canonical record ID
type DiscoverInput = {
  query: string;                         // 1..500 UTF16; krótka wskazówka, nie plan ani dowód
  kind: 'entity' | 'field';
  entity_ref?: EntityRef;                 // tylko kind=field; brak oznacza kandydatów między encjami
  expected_snapshot_id?: string;         // 64 znaki lowercase hex; jeśli podany, musi być aktualny
  limit?: number;                        // integer1..5, domyślnie5
  correlation_id?: string;               // 1..128, tylko korelacja
};
```

Wynik `schema_version:"0.1", mode:"discovery", snapshot_id, candidates, has_more, notices`. Maksymalnie5kandydatów. Kandydat: `candidate_kind`, `entity_ref`, `field_name` tylko dla pola, pełna `label`, `description_hint` jeśli kompletna i≤240znaków, `origin_kinds`, `origin_refs`, `origins_truncated`, `selectable`. `origin_refs` zawiera do4deterministycznie wybranych metadanych referencji na kandydata, bez ciała źródła; reszta sygnalizuje origins_truncated. Zbyt długi opis pomijamy w całości z jawną informacją; nie robimy fragmentu udającego pełne znaczenie. Nazwa pola1..128, dokładna pisownia źródła.

`origin_kinds`: `metadata_declaration`, `source_declaration`, `source_mention`. Ostatni nie deklaruje istnienia kolumny. Brak pola w metadataF nie oznacza braku źródłowej wzmianki. Wzorzec `BRa_CDC*`, markerUNKNOWN, wartość RHS, cytowany payload ani FK-alias nie tworzą nowych konkretnych pól/ownerref.

Discovery przeszukuje indeks nazw/aliasów/opisów. Pierwszeństwo: literalneID/ontologyId/fieldName, pełna etykieta/alias, normalizowane pełne etykiety, pokrycie tokenów opisu; remisy stabilnie po canonicalID i fieldName. Normalizacja dotyczy tylko wyszukiwania wskazówek. **Evidence nigdy nie normalizuje/refleksyjnie nie naprawia ID i nazw.** Nie powstają nowe aliasy ani automatycznie wybrany właściciel. `has_more:true` zabrania traktowania listy jako kompletnej; klient doprecyzowuje query/encję. Duplikat ID w snapshot jest `selectable:false`/ambiguous, nie wyborem pierwszego rekordu.

Kandydaci/opisy są słownikiem do wyboru zakresu, **nie materiałem potwierdzającym końcową odpowiedź**. Klient uzyskuje dowody przez drugi tool.

## 6. Evidence: jawne obowiązki i stany

```ts
type Aspect = 'entity_overview' | 'field_definition' | 'sql_type' | 'meaning';
type EvidenceInput = {
  snapshot_id: string;                    // wymagany64hex, z discovery
  requirements: {
    id: string;                          // 1..64, unikalny w batch
    entity_ref: EntityRef;
    field_name: string | null;            // null tylko entity_overview; inne1..128, literalne
    aspect: Aspect;
  }[];                                   // 1..8, porządek klienta zachowany
  correlation_id?: string;                // 1..128
};
```

Nie ma `query`, SQL, filtrów, ścieżek plików, dowolnych tekstów dowodu, zmiany limitów ani argumentu wyboru providera. Nieobsługiwany aspekt to InvalidParams, a nie podobna odpowiedź z legacy.

Wynik: `schema_version:"0.1",mode:"evidence",snapshot_id,results,sources,units,notices`. Dokładnie jeden `results` w wejściowej kolejności dla każdegoID. Każdy wynik zawiera target/aspect, `coverage`, `knowledge`, `facts`, `limitations`, `missing`.

| Oś | Wartości i znaczenie |
|---|---|
| `coverage` | `complete`: wszystkie elementy aspektu mają wymagane widoczne dowody; `partial`: użyteczna część; `none`: brak; `limited`: źródłowy komplet nie zmieścił się w limitach. |
| `knowledge` | `source_asserted`, `source_tentative`, `source_unknown`, `source_conflict`, `not_assessed`. To stan twierdzeń źródła, nie świeżego ERP/schema. |

Kompletna odpowiedź o niewiadomej może mieć `coverage:complete, knowledge:source_unknown`. Sam brak indeksowego trafienia ma `knowledge:not_assessed`, nigdy źródłowyUNKNOWN. `source_conflict` wymaga pokazania sprzecznych źródłowych wariantów/markera wraz z ich wersjami i warunkami; nie powstaje przez ogólne „zweryfikowane” obok węższej niewiadomej. Jeśli potrzebne kwalifikacje nie są pokazane, wynik nie jest complete.

Minimalne obowiązki aspektu:

| Aspekt | Elementy wymagane / wynik |
|---|---|
| entity_overview | pełna źródłowa definicja i jawnie nazwane role tabel; brak wspieranego dowodu dla jednego z tych dwóch elementów daje partial/missing, nie tabelę z prefiksu. Role są literalne, nie automatyczniePRIMARY. |
| field_definition | nazwa techniczna i opis/definicja przy danej logicznej encji, z rodzajem deklaracji i kwalifikacjami; bez fizycznego przypisania do SQLtabeli. |
| sql_type | dosłowny typ z metadata.sqlType lub jawnej typowanej deklaracji źródłowej; bez dopisywania nullable/default/enum/FK. |
| meaning | opis znaczenia z jawnej komórki opisu/owned deklaracji, albo konkretna niewiadoma/pytanie źródła z tym polem jako podmiotem. Nie rozszyfrowujemy nieznanej flagi/ID. |

Każdy `fact` ma zamkniętą własność (`definition`, `source_table_role`, `field_name`, `field_label`, `sql_type`, `meaning`), literalną wartość lub strukturalną parę schema/table/role bez dodatkowej inferencji, `unit_ids` i źródłowe kwalifikacje. Niewiadoma nie ma wymyślonej wartości: `limitations` zawiera jej literalną treść i `unit_ids`. Wszystkie powołane jednostki muszą faktycznie znajdować się w odpowiedzi; metadata/hint i indeksowe pominięcia nie zaliczają pokrycia.

Dokładny kształt wyniku (wszystkie listy mogą być puste tylko zgodnie ze stanem coverage/knowledge; bez dodatkowych pól):

```ts
type Qualification = {
  scope: 'field' | 'entity' | 'source_document_context'; text: string; unit_ids: string[];
};
type SourceFact = {
  property: 'definition' | 'source_table_role' | 'field_name' | 'field_label' | 'sql_type' | 'meaning';
  value: string | { schema: string; table: string; role_text: string };
  unit_ids: string[]; qualifications: Qualification[];
}; // obiekt value wyłącznie source_table_role; pozostałe mają string
type Result = {
  id: string; entity_ref: EntityRef; field_name: string | null; aspect: Aspect;
  coverage: 'complete' | 'partial' | 'none' | 'limited';
  knowledge: 'source_asserted' | 'source_tentative' | 'source_unknown' | 'source_conflict' | 'not_assessed';
  facts: SourceFact[];
  limitations: { kind: 'tentative' | 'unknown' | 'conflict'; text: string; unit_ids: string[] }[];
  missing: { property: string; reason: string }[]; // reason tylko z listy poniżej
};
```

`unit_ids` każdej pozytywnej pozycji/kwalifikacji ma co najmniej1element i wskazuje wyemitowane jednostki tej samej encji/pola/aspektu. Conflicting variants są odrębnymi facts/limitations z własnym pochodzeniem, nie jednym nadpisanym value. Każda wartość i kwalifikacja ma potwierdzający ją zakres we wskazanej jednostce; samo wystąpienie ID w całym źródle nie wystarcza. `not_assessed` z coverage none ma puste facts/limitations i jawny missing. `coverage:complete` nie ma missing; pozostałe stany wymagają missing. Złożony wynik ograniczony budżetem nie może być source_asserted „w całości” bez wszystkich jego elementów; wskazane facts zachowują własne kwalifikacje.

`missing` podaje konkretny niepokryty element oraz `reason`: `owner_not_found`, `ambiguous_owner_ref`, `field_not_indexed_for_owner`, `no_indexed_evidence`, `unsupported_source_form`, `source_limit`, `unit_limit`, `char_limit`. Żaden z tych kodów nie stwierdza nieistnienia w ERP. Pole o tym samym brzmieniu pod innym owner nie jest substytutem. Różne źródłowe wersje/warunki pozostają oddzielnymi faktami; serwer nie wybiera „najnowszej prawdy”.

## 7. Jednostka, źródło i kwalifikacje — jawna decyzja nowego kontraktu

**W v0.1 źródło budżetowe to `versioned_export_owner`, a nie pojedynczy fizyczny rekord i nie automatycznie dokument historyczny.** Klucz: namespace + artifactPath + pełnyartifactSHA + literalny uniqueownerID + obecność/wartość raw `sourcePath`, `localSnapshotPath`, `sourceOrigin`, `sourceVersion`, `documentVersion`, `version`, `publishedAt`, `lastModified`, `retrievedAt`, `promotedAt`, `sourcePublicationDate`, `sourceUpdatedAt`, `sourceRetrievedAt` z **kolumn rekordowych metadanych**. Niezgodne jawne wartości tych kolumn rozdzielają grupy. Nieobecne wersje pozostają nieznane. Nazwa/etykieta/podobny tekst nie grupuje źródeł. Daty deklarowane wewnątrz ciała dokumentu pozostają oddzielnymi twierdzeniami z własną jednostką kontekstu; nie są dopisywane do klucza lub do innych rekordów jako ich wersja.

To proponowana definicja nowego API, wymagająca akceptacji; nie zmienia starego formatu źródeł ani historycznych ocen. Wspólna grupa dowodzi jedynie tego samego właściciela i wersji artefaktu eksportu, **nie jednej wersji historycznej SQLtabeli**. Każdy rekord ma niezależny recordId/CSVlocator/rowhash/qualifications. Rekordów/wersji nie sklejamy w jedną jednostkę ani w potwierdzone fizyczne mapowanie.

Budżet jednej odpowiedzi evidence: **2grupy /3jednostki na grupę /4000 UTF16znaków całego emitowanego tekstu jednostek**; najwyżej6jednostek, liczba fizycznych rekordów również raportowana. Wszystkie jednostki kontekstu i kwalifikacji zużywają te same sloty/znaki. Fakty w JSON mogą jedynie powtarzać/strukturyzować treść pokazanych jednostek, bez drugiego nieograniczonego kanału faktów.

Dozwolone jednostki:

1. `metadata_record`: kanoniczny JSON wszystkich surowych pól jednego kompletnego rekorduF/E: klucze posortowane ASCII-leksykograficznie, separatory przecinek/dwukropek bez spacji, literalny Unicode ze zwykłym JSONescape cudzysłowów/znakówsterujących, bez końcowegoLF, trimowania, normalizacji lub pomijania pustych komórek. Wszystkie wartości CSV pozostają stringami. Transformacja jest jawna i odtwarzalna, nie selektywnym podglądem pól; odpowiada wyliczeniu1288w raporcie opcji budżetu.
2. `whole_body`: pełne wybrane content/description jednego rekordu, bajtowo zachowana treść po dekodowaniuCSV; bez skracania, naprawy tabel lub przełączania na lossy summary.
3. `context_section`: pełna, oryginalnie zamknięta sekcja statusu/metadanych z własnym nagłówkiem i całym zakresem aż do kolejnego równorzędnego nagłówka/EOF. V1 nie używa tego do wybierania wierszy mapowania. Brak tokena przecinającego granicę; niekompletny/niejednoznaczny zakres jest odrzucany. Niczego nie dołączamy jako wymyślony nagłówek.

Każda jednostka ma `unit_id`, `source_group_id`, `owner_ref`, `record_ref` (artifact, fullhash,recordId,physicalCSVrange,bodyField,localUTF16range), `kind`, `text` oraz powiązania wymaganych kwalifikacji. `unit_id` wiąże snapshot/rekord/zakres/typ/rendererVersion/textSHA. Oryginalny source root wyznacza role i domknięcie; relexing fragmentu/payloadu nie tworzy deklaracji.

`record_ref` ma jawne klucze `artifact`, `content_hash`, `record_id`, `csv_line`, `csv_end_line`, `body_field`, `start`, `end`, `record_hash`. Dla pełnego metadata_record body_field/start/end są null; dla ciała/sekcji to content albo description i lokalne graniceUTF16. `record_hash` wiąże serializację parsowanego `{line,endLine,fields}` (kolejnośćfieldsoryginalnegonagłówka); nie jest hashem surowego CSV ani kanonicznej jednostkiJSON. Grupa sources zawiera `source_group_id`, `namespace`, `artifact`, `content_hash`, `owner_ref`, jawny tuple provenance kolumn z obecnością/wartością, `version_scope:"export_snapshot_only"` oraz listę fizycznych record_refs. Żadna relatywna ścieżka źródła nie jest możliwością odczytu pliku z argumentu klienta.

Kwalifikacje lokalne pola zostają w pełnym rekordzie/ciele. Jawny owner-wide status z przypisanego źródła jest osobnym kontekstem (np.K1częściowo-zweryfikowane); nie usuwa potwierdzonych twierdzeń pola, ale nie pozwala przedstawić ich jako bieżącej weryfikacji. Dokumentowe daty/status z kompletnej sekcji metadanych można pokazać z zakresem `source_document_context`; nie przypisuje się ich automatycznie innemu rekordowi metadata ani nie robi z nich daty ważnościSQL. Kontekst tylko z jednoznacznych literalnych sourceDocumentRefId/entityRefId i zgodnego namespace, z zachowaniem sourcePath/version. Wiszące, alias-only lub wieloznaczne referencje nie dostarczają kontekstu ani pól.

Przed wyborem jednostek dla obowiązku oblicza się ich wymagane domknięcie kontekstu. Jeśli całość nie mieści się, wynik jest limited/partial z precyzyjnym brakującym elementem; nie pomijamy kwalifikacji, aby uzyskać complete. Jednostka wspólna dla kilku obowiązków liczy się raz. Selekcja jest stabilna według kolejności obowiązków klienta, potem mniej nowych kompletnych jednostek, potem artifact/physicalrange; nie ma nowego globalnego rankera odpowiedzi.

## 8. Indeks i formy źródłowe

Kompilator jest bezmodelowy i query-independent. Rozpoznaje wszystkie rekordy/kompletne wspierane formy w trzechCSV, nie mapę trzech przykładów. Najpierw filtr namespace, potem metadata; owner łączy się tylko przez literalny unikalny id/ontologyId tego samego namespace, nie alias/prefiks. Źródłowe deklaracje nie stają się świeżą weryfikacją schematu.

V1czytniki: pełne metadataF z nazwą/etykietą/typem/statusami; pełne owned tabelaryczne deklaracje z rzeczywistym własnym nagłówkiem; jawne backtickowe deklaracje pól w owned bullets z zachowanym wspólnym typem/kwalifikacją; jednoznaczne pytania o znaczenie konkretnego pola jako podmiotu w otwartych problemach. Parser nie interpretuje RHS/cytatów/fences/niezamkniętych atomów jako pól/predykatów; wildcard nie deklaruje wymyślonych kolumn. Dziedziczenie tabeli z innego rekordu, czytanie definicji triggera lub mapowanieMCP nie jest implementowane. Nieobsługiwana forma jest jawnie diagnostyczna; brak indeksowego dowodu nie staje się źródłowymUNKNOWN.

Indeks przechowuje tożsamości/fieldcandidates, źródłowe opisy/properties, kompletne jednostki i wszystkie fizyczne powiązania/kwalifikacje. Pełny katalog obecnego `semantic_catalog` może pomóc w etykietach/unikalnych refs; jego surowe split-pipe i wzmianki nie są nowym autorytatywnym czytnikiem dowodów. Potrzebne są osobne, małe czytniki indeksowe wspieranych form z czystym leksykalnym rootem.

PoC jest **immutable-fixture-only**: kompilacja prywatnego artefaktu przed udostępnieniem; wejście dokładnie trzy406996bajtowe pliki, formatindeksu0.1, maksimum8MiB serializowanego indeksuUTF8. Przekroczenie/niekompletny indeks/nieznany format kończy budowę błędem, bez przycinania i per-query fallbacku parsującego od nowa. Indeks nie jest kodem ani źródłem nowych faktów. Każdy jego element prowadzi do wejściowych bajtów/owner/rekordu/jednostki.

`snapshot_id = SHA256` kanonicznego payloadu obejmującego formatwersję, SHAclosurekompilatora i uporządkowane hashe wejść oraz payloadindeksu bez snapshot_id. Zmiana wejść/kompilatora wymaga nowego snapshot. Query/get weryfikują aktywny indeks i hashe przypiętych wejść; zmiana źródła zwraca `SOURCE_SNAPSHOT_CHANGED`, nie automatyczną odbudowę. V1nie obsługuje publikacji produkcyjnej/reindexingu/zmiennych tenantów. Te lifecycle wymagają osobnego projektu przed wdrożeniem.

## 9. MCP, autoryzacja i błędy

Nowe tools mają readOnlyHint/idempotentHint=true, destructiveHint/openWorldHint=false, dedykowane input/outputSchema i dedykowane handlery. Wymagają jawnego profilu dopuszczającego metodę i efektywnego scope OWA; brak/pusty scope jest odrzucany przed indeksem/źródłami. `writeAllowed:true` nie uruchamia zapisów. ID/snapshot/hint od klienta nie nadają uprawnień.

Kolejność: auth/profile/effectivescope → strictschema → namespace/zakreswszystkichrefs → snapshot → literalne istniejące referencje → odczyt indeksu/jednostek → budżet i wynik. Dla mieszanego batch z niedozwolonym scope odrzucenie następuje przed jakimkolwiek odczytem danych tego batch. Nie istnieje dowolna ścieżka/URL do przeczytania z argumentu.

| Sytuacja | Zachowanie |
|---|---|
| Invalidtype/unknownkey/aspect/duplikatID/fieldname przy overview | JSON-RPC -32602, brak uruchamiania indeksowego lookup. |
| Niedopuszczony profil/metoda lub pusty scope | -32001/genericdenied, bez metadanych o cudzym obiekcie. |
| Snapshot niezgodny | Toolerror `SNAPSHOT_MISMATCH`; klient ponawia discovery w nowej interakcji, nie dostaje substytutu. |
| Źródłowe bajty zmieniły się | Toolerror `SOURCE_SNAPSHOT_CHANGED`, żadnego mieszania starego indeksu z nową treścią. |
| Nieznany/wieloznaczny owner lub pole w poprawnym scope | Per-obligation none/not_assessed + jawnyreason; inne poprawne obowiązki nadal ocenione. |
| Brak miejsca na cały dowód/kontekst | Per-obligation limited; żadnego ukrytego faktu ani obciętej tabeli. |
| Worker niedostępny/zajęty/anulowanie | Dotychczasowe kontrolowane błędy; brak synchronicznego fallbacku. |

MCP `structuredContent` zawiera wyłącznie kontrakt0.1; `content[].text` jest jego kanonicznym JSON dla klientów tekstowych. Nie przechodzi przez `answerQuestion`, free-form planer, `renderCompactOwaAnswer`, providerfallback ani learningwriter. Samo source_unknown jest normalnym wynikiem, nie błędem transportu.

## 10. Rzeczywiste punkty integracji przyszłego PoC

| Obszar / aktualna przeszkoda | Wymagana przyszła zmiana |
|---|---|
| `erp_knowledge_mcp_core.mjs` domainTool280–299 / dispatch567–615 wymagająqueryi uruchamiają answerer | osobne typedtooldefinitions i handlery przed ogólną gałęzią; nie dodawać nazw tylko do DOMAIN_TOOL_DESCRIPTIONS. |
| `erp_knowledge_mcp_profiles.mjs:19–23` ma4metody | kontrolowane dodanie dwóch metod wyłącznie w prywatnym profiluPoC; brak reklamy w aktualnej produkcji. |
| `semantic_worker_pool.mjs:6–10` whitelist4 / bridge292–294 fallbackcore | obie nowe nazwy na jawnej worker whitelist, authprzeddispatch; zachować2workers/8queue/cancellation/errorisolation. |
| `semantic_worker_generation.mjs`/offlineharness jawne inventories | każdy nowy moduł w obu listach przy pierwszym imporcie; limit2MiB; prywatny indexartifact w nowym manifestkind, nie w starym79frozen. |
| Source/index/query | małe osobne moduły: genericruntimeindexcompiler, stricttypedcontract/validation, snapshot-boundlookup+budget. Brak query-ownedretentionSession. |
| Harness/ocena | nowy exactkind fixture dla0.1, gold poza runtimefiles, aktualny code+index/data snapshot; stare42/20 nie stają się jego scorerem automatycznie. |

Plan wykonania ma wskazać konkretne pliki i spójny wspólny kontrakt compiler→index→lookup→MCP przed dzieleniem pracy. Dokument nie udaje, że istnieją obecnie callable nowe metody lub wspólny APIreserve do późniejszego dopisania.

## 11. Protokół klienta i nierówne poziomy oceny

Klient może użyć do dwóch discovery (encja, potem pola) i jednego batch evidence dla jednej odpowiedzi. Nie musi wykonać dokładnie dwóch wywołań; są dwa **typy** narzędzi. Niejasny właściciel kończy turę doprecyzowaniem. Zmiana snapshot między discovery unieważnia stary plan. Jedna końcowa odpowiedź opiera się na jednym batch evidence i jego budżecie; zbieranie kolejnych batch w celu obejścia2/3/4000 nie jest dozwolonym protokołemPoC. Serwer egzekwuje limit perbatch; verifier transcriptu egzekwuje tę granicę po stronie klienta, bez nowej serwerowej sesji.

Reprezentatywna sekwencja **NIEWYKONANA**: discoverentity(querykonto) → bank/ledgerkandydaci; klientdoprecyzowuje; discoverfield(queryBRa_IBAN,entityRefbank,expectedsnapshot) → sourcecandidate; evidencebatch prosi osobno o sql_type i meaning → oczekiwany kontrakt source_assertedtype oraz source_unknownmeaning z pełnymi jednostkami, nie wymyślone wartości flagi.

Dla kontrahenta klient wybiera canonicalowner i przekazuje trzy field_definition w jednym batch. Brakująca definicja ma własny missing, a nie zbiorcze „brak dowodów” dla całej encji. Wynik nie jest zaliczeniem całego starego U01 z jego wymaganiem tabeliSQL.

**Ocena kontraktu** testuje jawne inputy/refy i mechanikę dowodów. **Ocena modelu-klienta** dodatkowo testuje przełożenie nowego pytania na te inputy i końcową wypowiedź, bez gold-ID/oczekiwań w promptach. Przejście pierwszej nie dowodzi drugiej. Prompt/modelwersja/narzędzia i koszty całego2–3calltranscriptu muszą zostać zamrożone przed nowymi pytaniami. Dzisiejsze20jest regresją; przyszłyholdout przygotowuje niezależny autor dopiero po zamrożeniu nowegoPoC.

## 12. Kryteria PoC i zatrzymania

P1: wszystkie366wejściowe rekordy uwzględnione jako metadata/complete-supported-source/explicit unsupported lub ambiguous; indeks nie jest ręczną mapą audit/IBAN. Zero reviewer/gold inputów. Hashe/physicalranges/ownerreferences weryfikowalne.

P2: ambiguouskonto daje obu właściwych kandydatów bez automatycznego wyboru; fieldqueryscoped nie podmieniaowner; literalne nieznane ID/pole mają none/not_assessed, nie substytut. Scope/prefix/case/revision/duplicate/dangling/alias-only/quotedvalue negatives nie dostarczają cudzych danych.

P3: trzy definicje audytowe mają trzy wyniki, niezależne dowody/kontekst oraz jawny brak fizycznegoSQLmapping; częściowe wynikipojedynczychpól nie maskująbrakuinnych. TypBRa_IBAN i unknownmeaning mają oddzielnecoverage/knowledge; wildcard lub sourcequestion nie potwierdzakolumny/enum.

P4: wszystkie pozytywne fakty/unknown/qualifiers odwołują się do rzeczywiście pokazanych kompletnych jednostek. Testy headerfragment/partialrow/RHS/fence/nonlocalcondition/niezachowanycontext/niezgodnewersje musząodrzucaćlubuczciwieograniczaćwynik. Żaden rekordnie jest naprawionyprzezcudzyheader/promotedMD.

P5: dokładna definicja grupy, fizycznychrekordów i2/3/4000 egzekwowana dla całego batch. Caseoverbudget ma limited, nieposzatkowane dane; niewyemitowany indeks nie zalicza kompletności. Każdy typjednostki/kwalifikacjizużywa te same limity.

P6: read-only/namespace/auth-beforebody/pinnedgeneration/2workers8queue/2MiB/profileroouting i błędy transportu mają osobne testy. Deklarowana schema jest rzeczywiście walidowana w runtime; obecny sam opisJSONSchema tego nie zapewnia.

P7: raportować zimną budowęindeksu, rozmiarindeksu, pierwszyload+lookup, warm lookupCPU/wall oraz pełny protokół klienta oddzielnie. Brak perquery rebuild-loop po braku pamięci/indeksu. Żadna z tych liczb nie zmienia staregoA8 ani nie dowodzi publicznegoSLA.

Zatrzymać PoC przy niespełnieniu któregokolwiek kryterium poprawności/pochodzenia/scope lub potrzebie poszerzenia inputów/parsingurekonstrukcyjnego. Przejście v0.1 umożliwia dopiero osobną decyzję o ocenie pełnego klienta, szerszych aspektach, produkcyjnejpublikacji i realnychcelachlatencji. Nie ma zaplanowanego automatycznego wdrożenia ani oczekiwanego20/20.

## 13. Samoprzegląd i decyzja użytkownika

Projekt określa zakresy narzędzi, literalne referencje/snapshot, rodzaje jednostek/grup, kwalifikacje, osie coverage/knowledge, błędy, rzeczywiste punkty MCP/workers i rozdzielne poziomy oceny. Wykonalność nie jest mylona z działającymPoC. PełneSQLmappingpozostaje jawniepozakresem, zamiastniemożliwego zapewnienia trzechfizycznychźródełwlimiciedwóch.

**Do akceptacji po przeglądzie:** cztery aspekty v0.1 z field_definition zamiast pełnegoSQLmapping; jawne `versioned_export_owner` jako budżetowe źródło; runtime-onlyimmutableindex i dwa nowe typedtools. Akceptacja pisanego kontraktu pozwala przygotować plan prywatnegoPoC. Dotychczasowe źródła, referencje, benchmarki, main kod i usługi pozostają zachowane jako historyczny stan.
