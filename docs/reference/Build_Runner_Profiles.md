# Build Runner Profiles

Ten dokument opisuje uruchamianie zunifikowanego runnera buildów `scripts/build_kb_runner.mjs` oraz cienkich shimów `build_*.mjs`.

## Szybki start

- Uniwersalny runner:

```bash
node scripts/build_kb_runner.mjs --profile optima_reference
```

- Shim kompatybilny wstecz (to samo):

```bash
node scripts/build_optima_reference.mjs
```

## Dostępne profile

- `optima_reference`
- `optima_additional_functions`
- `optima_sprint`
- `optima_partner_technical`
- `optima_schema_metadata`
- `betterfly_reference`
- `community_news`
- `taxbell_reference` (wymaga namespace KB, patrz niżej)

## Polityka reuse

- `optima_partner_technical` - reuse tylko dla aktywnych jobów młodszych niż `45` minut
- `betterfly_reference` - reuse tylko dla aktywnych jobów młodszych niż `45` minut
- `community_news` - reuse tylko dla aktywnych jobów młodszych niż `30` minut
- `taxbell_reference` - reuse tylko dla aktywnych jobów młodszych niż `30` minut
- starsze aktywne joby są traktowane jako stale i runner tworzy nowy job zamiast czekać

## Taxbell

Profil `taxbell_reference` wykorzystuje mapowanie projektu z pliku:

- `docs/reference/Taxbell_KB_Project_Map.json`

Namespace można przekazać trzema sposobami (priorytet: `--namespace`, `--kb`, `OPENSPG_NAMESPACE`):

```bash
node scripts/build_kb_runner.mjs --profile taxbell_reference --namespace TaxbellLegalReference
```

```bash
node scripts/build_kb_runner.mjs --profile taxbell_reference --kb TaxbellPayrollHRReference
```

```bash
OPENSPG_NAMESPACE=TaxbellAccountingVATReference node scripts/build_kb_runner.mjs --profile taxbell_reference
```

Wrappery Taxbell działają jak wcześniej:

```bash
node scripts/build_taxbell_legal_reference.mjs
node scripts/build_taxbell_payroll_hr_reference.mjs
node scripts/build_taxbell_accounting_vat_reference.mjs
```

## Najważniejsze zmienne środowiskowe

- `OPENSPG_BUILD_PROFILE` - profil builda (alternatywa dla `--profile`)
- `OPENSPG_NAMESPACE` - namespace KB (szczególnie dla Taxbell)
- `OPENSPG_PROJECT_ID` - nadpisanie projectId
- `OPENSPG_JOB_PREFIX` - nadpisanie prefiksu nazwy joba
- `OPENSPG_EXPORT_DIR` - nadpisanie katalogu eksportu
- `OPENSPG_CREATE_USER` - `createUser` dla payloadu buildera (domyślnie `mcpadmin`)
- `OPENSPG_FORCE_FILES` - lista CSV wymuszonych do re-uploadu/re-build (CSV po przecinku)
- `OPENSPG_JOB_WAIT_TIMEOUT_MINUTES` - timeout czekania na job
- `OPENSPG_ACTIVE_JOB_MAX_AGE_MINUTES` - maksymalny wiek aktywnego joba kwalifikującego się do reuse (starsze są traktowane jako stale)
- `OPENSPG_API_BASE` - URL API OpenSPG

## Przykłady praktyczne

- Wymuszenie tylko `chunk.csv` i `reference_document.csv`:

```bash
OPENSPG_FORCE_FILES=chunk.csv,reference_document.csv node scripts/build_kb_runner.mjs --profile betterfly_reference
```

- Nadpisanie projectId i prefiksu jobów:

```bash
OPENSPG_PROJECT_ID=10 OPENSPG_JOB_PREFIX=CBRF node scripts/build_kb_runner.mjs --profile betterfly_reference
```

- Uruchomienie po shimie (wygodne dla istniejących procesów):

```bash
OPENSPG_FORCE_FILES=chunk.csv node scripts/build_optima_sprint.mjs
```

## Diagnostyka

- Jeżeli runner zgłasza `Unknown or missing OPENSPG_BUILD_PROFILE`, podaj `--profile` albo `OPENSPG_BUILD_PROFILE`.
- Jeżeli Taxbell zgłasza brak projectId, odśwież mapę `Taxbell_KB_Project_Map.json` (przez `create_taxbell_reference_projects.mjs`).
- Jeżeli job kończy się statusem innym niż `FINISH`, runner zwraca błąd i zapisuje aktualny status do manifestu builda.
- Jeżeli runner znajdzie aktywny, ale stary job, nie będzie na nim wisiał tylko utworzy nowy, a pominięcie zaloguje do stderr.
