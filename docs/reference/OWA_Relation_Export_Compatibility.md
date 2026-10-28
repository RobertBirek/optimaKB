# OWA: zgodność eksportu relacji, format v1

Zakres: izolowana wersja `export_owa_ontology.mjs` i gałąź OWA w
`kb_quality_gate.mjs`. Próba offline nie upoważnia do publikacji, budowy,
uploadu, migracji grafu ani uruchomienia tej wersji na produkcyjnym `ROOT`.

## Tożsamość relacji i polityka

Eksporter identyfikuje relację przez pełną trójkę:
`[sourceEntityRefId, predicate, legacyTargetRefId]`. Właścicielem pozostaje
encja wybranego snapshotu, nawet gdy komórka źródła wymienia inną etykietę.
`legacyTargetRefId` pochodzi z historycznej reguły ID dla etykiety celu.
Służy do zgodności i proweniencji; nie oznacza zatwierdzonego FK.

Wersjonowana polityka `scripts/lib/owa_relation_id_policy.json` zawiera
datę obserwacji, hashe zachowanych dowodów i 147 wpisów: 134 zachowane,
12 wycofanych, jeden dopuszczony nowy. Rezerwuje wszystkie 146 historycznych
ID, w tym 12 wycofanych. Dla celu `DekretyElem` dopuszcza nowy ID
`OWA_REL_DOKUMENT_KSIEGOWY_PK_BO_WB_MA_ELEMENTY_DEKRETYELEM`;
zachowuje osobną tożsamość relacji do `KsiDokElem`.

Loader czyta politykę obok modułu, bez zależności od prywatnych pakietów
audytu lub konfiguracji `ROOT`. Nieznana trójka, wycofany wpis, brak albo
uszkodzenie polityki, duplikat lub kolizja ID powodują odmowę przed zapisem
eksportu. Nowa relacja wymaga jawnej zmiany polityki i przeglądu.
Nie kluczuj po pustym celu CSV ani po samym predykacie.

## Pięć CSV i dodatkowy JSON

`_manifest.json.files` zawiera dokładnie po jednym wpisie dla:
`ontology_entity.csv`, `ontology_field.csv`, `ontology_relation.csv`,
`workflow_pattern.csv`, `chunk.csv`. Builder otrzymuje tylko te CSV.

Oddzielny deskryptor `_manifest.json.relationAudit` zawiera:
`schemaVersion: 1`, `fileName: "relation_audit.json"`, `rowCount`, `sha256`
oraz `policySha256`. SHA256 obejmuje rzeczywiste bajty pliku. Eksporter
zapisuje JSON jako `JSON.stringify(value, null, 2) + '\n'`.

`relation_audit.json` ma `schemaVersion: 1`, `namespace: "OWAOntology"`,
metadane `policy: {schemaVersion, sha256, observedAt}` i tablicę `rows`.
Każdy rekord zachowuje:

- ID relacji i właściciela, predykat, etykiety źródła/celu oraz historyczny ID celu;
- `targetResolution: {status: "unresolved", resolvedRefId: "", reason: "not_approved"}`
  i `idAssignment.kind` (`preserved` lub `new`);
- `draftId`, `equivalentDraftIds`, root-relative ścieżki JSON/Markdown
  promoted i raw, SHA256 oryginalnej treści;
- `source.lineBasis: "snapshot.content"`, `tableIndex: 1`, `headerLine`,
  `rowLine`, `rawHeaders`, `rawCells`, `evidence`.

Numery linii są fizyczne, 1-based, w oryginalnym `snapshot.content`, przed
normalizacją. Nie licz ich w opakowaniu Markdown ani pliku JSON. Parser
odczytuje znaczenie kolumn według nagłówków, zachowuje zapis surowych komórek
i rozdziela JOIN, status oraz Dowód. Brak opcjonalnej kolumny daje pustą
wartość; nie przesuwa sąsiedniej komórki do innego pola.

Na zatwierdzonym korpusie wszystkie 135 relacji ma pusty
`targetEntityRefId` i stan `unresolved` w sidecar. Nie zatwierdzono mapowania
75 etykiet celu. Puste pole CSV nie dowodzi usunięcia istniejącej właściwości
po późniejszym UPSERT. Ta zmiana nie rozstrzyga zachowania UPSERT ani nie
wykonuje usuwania 12 dawnych relacji lub dziewięciu workflow z grafu.

## Gate i zachowanie źródeł

Gate wymaga formatu v1 również dla starszego manifestu OWA. Brak lub
niepełny deskryptor daje FAIL `missing_or_unsupported_relation_audit`.
Gate sprawdza pełny zestaw CSV, strukturę relacji i wszystkie pola sidecar
względem zakwalifikowanych snapshotów oraz polityki. Sam ponownie policzony
hash zmienionego JSON nie wystarcza. Nie używaj `--auto-fix` do tej próby.

Poprawna próba bez builda daje WARN, zero errors i dwa ostrzeżenia:
`OWA unresolved relation targets: 135; publicationReady=false` oraz
`Missing or empty build manifest: build_owa_ontology_jobs_manifest.json`.
Zwykły WARN kończy się exit 0; `--fail-on-warn` daje exit 2.
`relationAudit.publicationReady` pozostaje `false`. Nie kopiuj starego
build manifestu do nowego ROOT jako dowodu publikacji.

Dla niezmienionego zatwierdzonego korpusu oczekujemy 130 aktywnych snapshotów
w 67 grupach i 67/109/135/123/211 wierszy pięciu CSV w kolejności powyżej.
Cztery CSV poza relacjami pozostają bajtowo zgodne z poprawioną wcześniejszą
próbą. Dwa prywatne eksporty mają identyczne pięć CSV i sidecar; porównanie
manifestu i README pomija wyłącznie ich jawne timestampy.

Zachowaj dosłownie 20 `sourceRefs` PS/FPF/WZ i ich pierwotną bazę ścieżek
dowodowych. FA zachowuje treść, cytowania S1/S2/S3 i metadane. Nowy sidecar
opisuje pochodzenie wierszy relacji, nie zastępuje wcześniejszych archiwów
źródeł. Zachowane pakiety dowodowe nadal są potrzebne.

Przed próbą sprawdź świeże hashe korpusu, rejestru i dawnych pakietów,
skopiuj bieżący kod z polityką oraz ustaw prywatny ROOT od startu procesu.
Gate wymaga także prywatnych `KB_QUALITY_GATE_OUT_JSON` i
`KB_QUALITY_GATE_OUT_MD`. Uruchamiaj procesy z czystym środowiskiem bez
poświadczeń. Istotna zmiana korpusu OWA wymaga zatrzymania i decyzji
operatora, a nie dopasowania liczników. Wyniki nie dowodzą aktualnego stanu
grafu ani gotowości do publikacji.
