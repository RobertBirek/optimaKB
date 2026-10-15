# Odtworzenie treści legacy snapshotów OWA

## Cel i zatwierdzony zakres

Operator zatwierdził naprawę promocji legacy OWA i odtworzenie dokładnie
67 pustych promowanych snapshotów, z zachowaniem dat, statusów i historii.
Podstawa: `docs/reference/OWA_Empty_Promoted_Diagnosis_2026-10-14.md` i JSON.

Wszystkie 67 źródeł mają pełny adjacent raw Markdown. JSON-y nie zawierają
pola `content`; nie są to świadomie zapisane puste treści. Bieżące eksporty
pozostają kompletne dzięki 66 nowszym odpowiednikom i jednemu fallbackowi
eksportera. Naprawa dotyczy snapshotów, nie utraty 190 obecnych chunków.

## Wybrany wariant

Odtworzenie snapshotów i zapobieganie ponowieniu błędu w promocji.
Sam fallback w widoku/loaderze nadal uzależniałby promowane treści od raw.
Globalne uzupełnianie `findRawDrafts()` zmieniłoby 63 wybrane ID w analizie,
więc nie jest częścią tej naprawy.

## Granice kodu

- `scripts/lib/promoted_knowledge.mjs`: ograniczony resolver treści legacy
  OWA, promocja nowych legacy rekordów i jawna operacja naprawy istniejącego
  promowanego snapshotu.
- `scripts/manage_knowledge_inbox.mjs`: CLI dla jawnej operacji naprawy,
  bez połączenia z buildem lub workflow ERP.
- Testy w `scripts/test_*.mjs`: promocja, zachowanie historii, odmowy,
  idempotencja i kompensacja błędów.

Nie zmienia się raw loadera, eksportera, selektora wersji, schematu,
namespace scopes ani danych źródłowych. Nie dodaje się endpointu MCP/HTTP
pozwalającego na niejawne obchodzenie walidacji draftów.

## Resolver legacy treści

1. Istniejący niepusty tekst `content` w JSON zawsze ma pierwszeństwo;
   zachowuje się jego bajty i źródłową proweniencję.
2. Fallback dotyczy tylko `kbNamespace=OWAOntology` i brakującego pola
   `content` w legacy JSON. Jawne puste lub nietekstowe pole nie zostaje
   bezwarunkowo zastąpione Markdownem.
3. Odczytuje się wyłącznie dokładny plik `.md` sparowany z raw `.json`
   wskazanym przez istniejący loader; ścieżki przekazane w treści JSON
   nie stanowią uprawnienia do czytania innych plików.
4. Weryfikuje się realpath containment wewnątrz raw inbox, nazwę pary,
   namespace i brak symlink escape. Czytany plik musi być zwykłym plikiem
   tekstowym, nie większym niż 1 MiB i zawierać niepuste ciało.
5. Missing/empty/unsafe Markdown kończy operację błędem przed zapisem.
   Nie wolno zastąpić go opakowaniem metadanych, LLM lub inną wersją encji.
6. Treść odzyskana z Markdown jest snapshotowana dokładnie, bez czyszczenia,
   skracania, zmiany deklaracji weryfikacji czy poprawiania twierdzeń MSSQL.

Dla przyszłej normalnej promocji legacy OWA resolver wypełnia snapshot
`promoted.content`. Normalne znaczenie nowych dat promocji nie zmienia się.
JSON-y źródłowe i raw Markdown pozostają nietknięte.

## Naprawa istniejących promowanych snapshotów

Jawna funkcja/CLI przyjmuje dokładne ID i działa wyłącznie na obecnym
`promoted` rekordzie OWA. Nie korzysta z gołego `--force`, który zmienia
daty i rekonstruuje wpis rejestru.

Przed naprawą należy sprawdzić zgodność raw, promoted JSON/MD i wpisu
registry z zatwierdzoną listą 67 ID i bieżącą kopią kontrolną. Nie wolno
odtworzyć brakującego/promowanego w innym statusie rekordu bez osobnej decyzji.

Zachowuje się wszystkie istniejące pola promoted i registry, w tym:
`promotedAt`, `promotedBy`, `reviewNote`, `sourceDraftPath`, `metadata`,
tagi, tytuł i deklaracje poziomu weryfikacji. Dopuszczalne zmiany snapshotu:
uzupełnione `content`, jawna proweniencja odtworzenia oraz odpowiadająca treść
sekcji Content w promoted Markdown. Wpis registry nie wymaga przebudowy ani
zmiany daty promocji.

Czas, aktor i powód naprawy zapisuje się osobno w nowej proweniencji naprawy
i audycie. Proweniencja zawiera literalny raw MD path, SHA-256 jego bajtów,
źródłowy JSON path, sposób `legacy_owa_adjacent_markdown` i wersję mechanizmu.
Nie oznacza to ponownej weryfikacji źródeł ani promocji wykonanej dzisiaj.

## Idempotencja i błędy

- Ponowienie po udanej naprawie jest no-op, jeśli treść, jej hash,
  proweniencja i Markdown odpowiadają tej samej zatwierdzonej operacji.
- Nie nadpisuje się istniejącej niepustej, odmiennej treści lub cudzej
  naprawy. Drift źródła/hashu/statusu zatrzymuje zapis.
- JSON/Markdown są zapisywane atomowo per plik i chronione wspieraną blokadą.
  Nie deklaruje się, że dwa pliki i audyt tworzą jedną transakcję.
- Durable journal oraz backup obu oryginalnych plików pozwalają rozpoznać
  częściową operację i bezpiecznie ją dokończyć albo skompensować.
- Błąd między zapisami lub w audycie nie może pozostawić nieoznaczonego
  połowicznego stanu. Testy fault injection sprawdzają rzeczywistą
  kompensację i ponowienie bez utraty pierwotnej historii.

## Kryteria akceptacji

1. Metadata-only raw OWA JSON + pełny MD daje promowany JSON/MD z treścią.
2. Niepusty JSON wygrywa z innym adjacent MD; brak fallbacku dla innych KB.
3. Brak, pusty plik, traversal i symlink escape nie powodują zapisu ani audytu
   udanej promocji/naprawy.
4. Snapshot repair zachowuje wszystkie pierwotne daty/pola/historię; registry
   i raw pliki są bajtowo niezmienione.
5. Idempotencja, drift refusal i błędy zapisu/audytu są pokryte regresjami.
6. Wszystkie 67 odtworzonych `content` odpowiadają dokładnemu, zatwierdzonemu
   raw Markdown; żaden z 67 snapshotów nie pozostaje pusty.
7. 66 pozostałych niepustych snapshotów oraz dodatkowy niepusty rekord OWA
   są zachowane. Wszystkie inne namespace pozostają bez zmian.
8. Ten sam zestaw 67 wybranych draftów, identyczne pięć CSV i 190 chunków;
   brak re-eksportu/builda/grafowych zmian w produkcji w ramach tej naprawy.

## Testy i wykonanie

Najpierw `npm run check`. RED/GREEN i fault injection w izolowanym checkoutcie
oraz tymczasowym ROOT, z zablokowaną siecią, procesami ERP i produkcyjnymi
zapisami. Stan RAW/registry/eksportów porównuje się przed i po.

Po recenzji i kontrolowanej integracji: backup dokładnych 67 promoted par,
registry i fingerprintów raw/CSV; operacja przez CLI jako `mcpbot` z
zatwierdzonym manifestem; dziennik/checkpoint i readback każdej pary.
Backup trwały, chroniony i poza automatycznym pruningiem. Nie wywołuje się
Optima write tools, pipeline builda ani usuwania obiektów grafu.

Przeładowanie dashboardu dla zapobiegania przyszłym pustym promocjom jest
osobnym kontrolowanym krokiem po potwierdzeniu entrypointu i braku aktywnych
operacji. Nie wykonuje się commitu ani push bez polecenia operatora.

## Poza zakresem

Status-blind wybór raw draftów przez eksporter OWA i słabszy ranking/routing
trzech pytań SemanticKB są osobnymi ustaleniami. Nie przypisuje się ich
bez dowodu do pustych snapshotów i nie naprawia przy okazji. Rekord testowy
„Atrybuty test v2” zachowuje deklarowany charakter; odzyskanie jego tekstu
nie certyfikuje go jako nowo zweryfikowanej encji produkcyjnej.

## Zatwierdzone rozszerzenie: checkpoint zachowanego audytu

Po pierwszym dry-run operator zatwierdził rozszerzenie o zgodność kontroli
z zachowanym fragmentem audytu. Zaobserwowano 9111 wewnętrznie spójnych
zdarzeń oraz brak przodka pierwszego zachowanego wpisu, zgodny z udokumentowaną
retencją 90 dni. Brak przodka nie jest dowodem legalnego pruning procesu ani
zweryfikowania historii od początku.

Dopuszcza się dodatkową zmianę `scripts/lib/dashboard_audit.mjs`, wyłącznie
w zakresie read-only capture i jawnej weryfikacji checkpointu. Domyślna
ścisła weryfikacja i konfiguracja retencji pozostają bez zmian.

Checkpoint jest zapisany w chronionym backupie i związany jego SHA-256
z manifestem tej operacji. Zachowuje granice/digesty i uporządkowaną tożsamość
obserwowanych zdarzeń, końcową kotwicę oraz jawny zakres
`checkpointed_retained_suffix`, `ancestryVerified=false`.

Capture odmawia na malformed JSON, hash mismatch, wewnętrzną lukę łańcucha,
niejednoznaczne ID lub obcięcie wymaganego okna. Tryb checkpointu nadal
sprawdza hashe i każde dostępne połączenie oraz obecność/zgodność zaufanej
końcowej kotwicy. Dopuszczalne jest tylko dopisywanie prawidłowych zdarzeń;
zmiana wcześniejszego wpisu, brak kotwicy lub nieudowodnione usunięcie prefiksu
zatrzymują operację. Jeśli obsłużony jest pruning po capture, usunięte wpisy
muszą tworzyć wyłącznie początkowy fragment checkpointu z plików rzeczywiście
kwalifikujących się do istniejącej retencji; środkowych luk nie akceptuje się.
Konserwatywne zatrzymanie przy zmianie granicy jest dopuszczalne.

Recovery wymaga jawnej referencji i sumy checkpointu w manifeście; powiązanie
journalu, proweniencja i wynik podają ten sam zakres. Bez checkpointu stary
ścisły tryb nie jest osłabiany. Nie usuwa się i nie przepisuje logów, nie
manipuluje limitem, aby ukryć pierwsze zdarzenie, i nie wymyśla przodków.
Checkpoint nie nadaje istniejącym logom autentyczności od genezy.

Regresje obejmują zachowany poprawny suffix, jego prawidłowe rozszerzenie,
zmieniony hash, lukę, duplikat, złą kotwicę/SHA, odmowę w starym trybie,
zachowanie przez północ i trwałość checkpointu przed docelowymi zapisami.
Po recenzji ponawia się backup/preflight, 67 dry-runów i wcześniej zatwierdzoną
operację bez zmiany pozostałych granic raw/registry/CSV/grafu.
