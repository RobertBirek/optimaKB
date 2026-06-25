# Audyt OpenSPG + Dashboard — 2026-06-10

**Zakres:** stack Docker Compose OpenSPG (`compose.yaml`), dashboard React (`src/` + `scripts/erp_kb_dashboard_server.mjs`), warstwa skryptów/MCP/pipeline (`scripts/`, `scripts/lib/`), stan runtime (systemd, procesy).
**Metoda:** przegląd kodu i konfiguracji (read-only), weryfikacja referencji `plik:linia`, kontrola stanu live (procesy, unity systemd, porty, kontenery).
**Kontekst:** raport uwzględnia poprzednie audyty — `OPENSPG_AUDIT.md` (2026-05-12), `OPENSPG_REMEDIATION.md`, `docs/reference/ERP_KB_Dashboard_Full_Audit_2026-06-06.md`, `docs/reference/ComarchKB_Global_Audit.md` — i opisuje stan **aktualny** (co naprawiono, odnotowano w §8).

---

## 1. Streszczenie wykonawcze

Stack jest w dobrej kondycji operacyjnej (4/4 kontenery `healthy` od 8 dni, baseline testpacku 200 PASS), a wiele podstaw bezpieczeństwa jest już wdrożonych (digest-pinning obrazów, healthchecki, fail-fast `:?required`, pliki env 0600, SSRF guard, CSP/HSTS na dashboardzie). Audyt wykrył jednak **3 aktywne incydenty runtime**, **3 podatności High** w warstwie dashboardu oraz systemowe braki: brak limitów zasobów, brak rate-limitingu na bridge'ach MCP, fail-open auth w kilku miejscach i masywną duplikację kodu pipeline'u.

### Tabela priorytetów

| # | Priorytet | Finding | Lokalizacja | Sekcja |
|---|---|---|---|---|
| 1 | **Critical** | `check_dashboard_llm_health.mjs` na 99,9% CPU od 2 dni; unit `activating` (zombie) | PID 3759261, `erp-kb-dashboard-llm-health.service` | §2.1 |
| 2 | **Critical** | Fail-open auth dashboardu: brak env → admin bez hasła | `scripts/erp_kb_dashboard_server.mjs:406` | §4.1 |
| 3 | **High** | Injection `javascript:` przez `sourceUrl` draftów (brak walidacji schematu URL) | `src/main.jsx:853`, `src/main.jsx:949` | §4.2 |
| 4 | **High** | Naruszenie Rules of Hooks w `Tooltip` (early return przed hookami) | `src/main.jsx:197-200` | §4.3 |
| 5 | **High** | Betterfly MCP bridge jako **root, poza systemd**, pojedynczy token bez podziału read/write | PID 286641, `scripts/betterfly_commercial_mcp_http_bridge.mjs:12,48-51` | §2.3 |
| 6 | **High** | Brak limitów zasobów na wszystkich 4 usługach (~10 GiB użycia / 23,5 GiB hosta) | `compose.yaml` (całość) | §3.1 |
| 7 | **High** | Fail-open auth bridge'ów MCP: brak tokenów → pełny dostęp z zapisem | `scripts/erp_knowledge_mcp_http_bridge.mjs:48` | §5.1 |
| 8 | **Medium** | `erp-kb-dashboard-discovery-weekly.service` w stanie `failed` | systemd | §2.2 |
| 9 | **Medium** | Osierocony `mc` (Midnight Commander) jako root na 99,7% CPU od 25 h | PID 197460 | §2.4 |
| 10 | **Medium** | Fallback `MYSQL_APP_USER:-root` w compose | `compose.yaml:97` | §3.2 |
| 11 | **Medium** | Sekrety Neo4j/MinIO w URL-ach env (`docker inspect` je ujawnia) | `compose.yaml:100-102` | §3.3 |
| 12 | **Medium** | Brak rate-limitingu + nie-stałoczasowe porównanie tokenów w bridge'ach MCP | `scripts/erp_knowledge_mcp_http_bridge.mjs:50,53` | §5.1 |
| 13 | **Medium** | Wspólny, procesowy token CSRF dla wszystkich ról (viewer dostaje token zapisu) | `erp_kb_dashboard_server.mjs:155,933`, `src/main.jsx:64,2697` | §4.4 |
| 14 | **Medium** | `waitForJob()` bez limitu prób — zawieszony job blokuje pipeline w nieskończoność | `scripts/build_optima_reference.mjs:174-186` (×8 skryptów) | §5.3 |
| 15 | **Medium** | Brak automatycznych backupów MySQL/Neo4j/MinIO | brak w compose/systemd | §3.4 |
| 16 | **Medium** | 8 build-skryptów to ~95% klony; helpery eksporterów zduplikowane ×9 z dryfem | `scripts/build_*.mjs`, `scripts/export_*.mjs` | §5.2 |
| 17 | **Medium** | Brak ESLint/testów/TypeScript dla 2749-liniowego panelu operacyjnego | `src/`, `package.json` | §4.6 |
| 18 | **Low** | Współdzielona sieć `proxy` z n8n/dockge; kontenery jako root bez `cap_drop` | `compose.yaml:120-128` | §3.5 |
| 19 | **Low** | Wiekowe obrazy (zwł. MinIO); brak skanera CVE | `.env` (digesty) | §3.6 |
| 20 | **Low** | `Cache-Control: no-store` na hashowanych assetach; dev-server na 0.0.0.0 | `erp_kb_dashboard_server.mjs:321`, `package.json:8` | §4.7 |
| 21 | **Low** | 18× hardcoded `http://10.10.254.42:8887` jako fallback; brak logowania wywołań w bridge'ach; brak rotacji logów JSONL | `scripts/*` | §5.4–5.5 |

---

## 2. Incydenty aktywne (stan na 2026-06-10, ~09:00)

### 2.1 [Critical] `check_dashboard_llm_health.mjs` — pętla 100% CPU od 2 dni

- **PID 3759261** (user `mcpbot`): czas działania `2-04:03:33`, **99,9% CPU** (~3 100 CPU-minut).
- Unit `erp-kb-dashboard-llm-health.service` wisi w stanie `activating (start)` — timer (`OnCalendar` co 15 min) nie może wystartować kolejnych przebiegów, więc health-check LLM **de facto nie działa od 8 czerwca**.
- Sam skrypt ma `AbortController` i wygląda na ograniczony czasowo (`check_dashboard_llm_health.mjs:59-89`); podejrzenie pada na pętlę/lock w `lib/dashboard_automation.mjs` lub niedomknięty strumień odpowiedzi. Wymaga diagnozy (np. `kill -USR1` / inspekcja przez `node --inspect`, albo zrzut stosu `gdb`/`llnode`), potem `systemctl kill` + restart.
- **Rekomendacja natychmiastowa:** zebrać stack trace, ubić proces, dodać do unitu `TimeoutStartSec=` + `Type=oneshot` z twardym limitem oraz watchdog czasu wykonania w samym skrypcie.

### 2.2 [Medium] `erp-kb-dashboard-discovery-weekly.service` — stan `failed`

- Tygodniowy planner zapytań discovery nie wykonał się poprawnie; timer jest aktywny, ale ostatni przebieg zakończył się błędem. Sprawdzić `journalctl -u erp-kb-dashboard-discovery-weekly`, naprawić przyczynę, rozważyć `OnFailure=` z powiadomieniem.

### 2.3 [High] Betterfly MCP bridge jako root, poza systemd

- **PID 286641**: `node scripts/betterfly_commercial_mcp_http_bridge.mjs` uruchomiony **jako root**, bez unitu systemd (szablon `docs/reference/Betterfly_Commercial_MCP.systemd` istnieje, ale nie jest zainstalowany w `/etc/systemd/system`). Brak auto-restartu, brak sandboxingu, nadmiarowe uprawnienia.
- Fork bridge'a **zgubił funkcje** względem pierwowzoru ERP: tylko jeden `AUTH_TOKEN` (`betterfly_commercial_mcp_http_bridge.mjs:12`, `isAuthorized` `:48-51`), brak podziału tokenów read/write, który ma `erp_knowledge_mcp_http_bridge.mjs:47-57`.
- **Rekomendacja:** zainstalować unit (User=mcpbot, `Restart=always`, `EnvironmentFile=`), zsynchronizować logikę auth z bridge'em ERP (lub współdzielić moduł — patrz §5.2).

### 2.4 [Medium] Osierocony proces `mc` (Midnight Commander) jako root

- **PID 197460** (`/usr/bin/mc`, rodzic: odłączony `bash`): 99,7% CPU od ~25 h. To incydent hostowy, nie aplikacyjny — najpewniej sesja `mc` po utracie terminala wpadła w pętlę. Bezpiecznie ubić (`kill 197460`).

---

## 3. Infrastruktura — `compose.yaml`

### Inwentarz (stan dobry — dla kontekstu)

4 usługi: `mysql`, `neo4j`, `minio`, `server`; wszystkie z digest-pinned obrazami, healthcheckami, `restart: always`, `security_opt: no-new-privileges` (kotwica `x-security-defaults`, `compose.yaml:1-3`). Serwer gated przez `depends_on: service_healthy` (`compose.yaml:113-119`). Porty backendów (3306/7687/9000) **niepublikowane** — tylko sieć wewnętrzna `spg`. API serwera wystawione na LAN: `10.10.254.42:8887` (`compose.yaml:92`, domyślny fallback `127.0.0.1` — poprawny). `.env` i `.env.betterfly-mcp` mają 0600 i są w `.gitignore`.

### 3.1 [High] Brak limitów zasobów

Żadna usługa nie ma `mem_limit`/`deploy.resources`. Neo4j ma 4G heap + 8G pagecache (`compose.yaml:44-46`), serwer do 6G heap; łączne zużycie live ~10 GiB przy 23,5 GiB hosta. Skok pamięci jednej usługi może wywołać OOM-kill dowolnej innej (lub procesów hosta — patrz incydenty §2). Dodatkowo pagecache 8G jest przewymiarowany dla ~520 MB grafu.

**Poprawka:** dodać `mem_limit` (np. mysql 2g, neo4j 14g, minio 1g, server 7g — do kalibracji) i obniżyć `server.memory.pagecache.size` do np. 2G.

### 3.2 [Medium] Fallback `:-root` dla użytkownika JDBC

`compose.yaml:97`: `SERVER_REPOSITORY_IMPL_JDBC_USERNAME: ${MYSQL_APP_USER:-root}`. Live ustawione na `openspg_app`, ale brak zmiennej cicho degraduje do roota. **Poprawka:** zamienić na `${MYSQL_APP_USER:?MYSQL_APP_USER is required}`.

### 3.3 [Medium] Sekrety w URL-ach `CLOUDEXT_*`

`compose.yaml:100-102` osadzają hasła Neo4j i MinIO w query stringach zmiennych env — widoczne przez `docker inspect` i `/proc/<pid>/environ` dla każdego użytkownika z dostępem do dockera. Ograniczenie znane z `OPENSPG_REMEDIATION.md` (format wymuszony przez OpenSPG). **Mitygacja:** ograniczyć członkostwo w grupie `docker`, rozważyć docker secrets jeśli obraz kiedyś je wesprze; logging-level WARN już tłumi wypisywanie na starcie (`compose.yaml:103-104`).

### 3.4 [Medium] Brak automatycznych backupów

`backups/` zawiera tylko ręczny snapshot z remediacji 2026-05-12. Brak crona/timera dla dumpów MySQL, `neo4j-admin dump` i mirroringu MinIO. **Poprawka:** timer systemd (np. nocny) + retencja + okresowy test restore. To jedyna kopia 6 produkcyjnych KB.

### 3.5 [Low] Powierzchnia sieci i uprawnień kontenerów

- Serwer współdzieli zewnętrzną sieć `proxy` z niepowiązanymi stackami (`n8n`, `dockge`) — `compose.yaml:120-128`; ryzyko ruchu bocznego. **Poprawka:** dedykowana sieć proxy↔server.
- Wszystkie kontenery działają jako root (brak `user:`), brak `cap_drop: [ALL]`, brak `read_only` rootfs. `no-new-privileges` jest — to dobry start, ale warto dociążyć tam, gdzie obrazy to znoszą.
- APOC z włączonym importem/eksportem plików (`compose.yaml:40-41`) — zawężone już do `apoc.*`, Neo4j niewystawiony na host, ryzyko rezydualne akceptowalne.
- Healthcheck MySQL przekazuje hasło roota w linii poleceń sondy (`compose.yaml:19`) — widoczne w listingu procesów wewnątrz kontenera (niska istotność).

### 3.6 [Low] Wiek obrazów i spójność nazewnictwa

- Digesty SHA256 są przypięte (dobrze), ale odpowiadają obrazom sprzed 10–17 miesięcy (zwł. MinIO ostrzega o przestarzałości). Brak narzędzia do skanu CVE. **Poprawka:** zaplanowany refresh z backupem przed aktualizacją; dopisać czytelne wersje obok digestów w `.env.example`.
- Niespójność: MySQL adresowany nazwą usługi (`mysql`, `compose.yaml:96`), Neo4j/MinIO nazwami kontenerów (`release-openspg-neo4j`, `compose.yaml:100-102`). Ujednolicić na DNS nazw usług.
- `restart: always` wskrzesza celowo zatrzymane kontenery po restarcie demona — rozważyć `unless-stopped`.
- Płytki healthcheck serwera (`compose.yaml:106` — tylko `HEAD /`); zdegradowany serwer z padłym połączeniem do DB pozostaje „healthy".

---

## 4. Dashboard — `src/main.jsx` (2 749 linii) + `scripts/erp_kb_dashboard_server.mjs` (3 790 linii)

### Architektura (kontekst)

SPA bez routera: przełączanie zakładek przez `useState` + if-chain (`src/main.jsx:2705-2715`), jeden blob danych z `GET /api/status` na mount (`:2701-2703`). Serwowane przez własny serwer Node z Basic auth (role admin/operator/viewer), CSRF, rate-limitingiem i mocnymi nagłówkami (CSP, HSTS, nosniff, X-Frame-Options — `erp_kb_dashboard_server.mjs:321-328`). Bez TLS lokalnie — terminacja na NPMplus.

### 4.1 [Critical] Fail-open auth — brak konfiguracji = admin bez hasła

`erp_kb_dashboard_server.mjs:400-406`: jeżeli żadna para login/hasło nie jest skonfigurowana w env, `authenticate()` zwraca `{ ok: true, role: 'admin' }`. Błąd konfiguracji (np. literówka w `EnvironmentFile`, brak pliku po migracji) cicho otwiera panel administracyjny bez uwierzytelnienia. **Poprawka:** fail-closed — przy braku poświadczeń zwracać 503/401 i logować błąd konfiguracji; ewentualnie jawny opt-in `DASHBOARD_ALLOW_ANON=1` wyłącznie dla bind 127.0.0.1.

### 4.2 [High] Injection `javascript:` przez `sourceUrl`

`src/main.jsx:853` i `:949` renderują `<a href={detail.sourceUrl}>` / `<a href={draft.sourceUrl}>` bez allowlisty schematów. `sourceUrl` pochodzi ze skanów discovery zewnętrznych stron i z zgłoszeń — spreparowany URL `javascript:...` wykona się przy kliknięciu w kontekście zalogowanego operatora/admina. CSP `script-src 'self'` nie blokuje nawigacji `javascript:` we wszystkich przeglądarkach. Linki kandydatów discovery (`:1858, :2044, :2069`) mają `target="_blank" rel="noreferrer"`, ale też bez walidacji schematu.
**Poprawka:** helper `isSafeUrl()` (tylko `http:`/`https:` przez `new URL()`), stosowany we wszystkich miejscach renderowania linków z danych + `target="_blank" rel="noopener noreferrer"`.

### 4.3 [High] Naruszenie Rules of Hooks w `Tooltip`

`src/main.jsx:197-200`:
```js
if (!text) return children;        // early return PRZED hookami
const anchorRef = useRef(null);
const [open, setOpen] = useState(false);
```
Jeśli `text` zmieni się falsy↔truthy między renderami tej samej pozycji komponentu, React rzuci „Rendered more hooks than during the previous render" i wywali całe drzewo (brak error boundary → biały ekran). **Poprawka:** przenieść hooki przed warunek; docelowo ESLint z `eslint-plugin-react-hooks` (§4.6).

### 4.4 [Medium] Wspólny token CSRF na czas życia procesu

`CSRF_TOKEN = randomUUID()` generowany raz na proces (`erp_kb_dashboard_server.mjs:155`) i zwracany **każdej roli** w `GET /api/status` (`:933`; klient: `src/main.jsx:64, 2697`). Viewer otrzymuje ten sam token, którym autoryzowane są zapisy admina; token nie rotuje do restartu. Ochrona CSRF redukuje się do Basic auth + same-origin, a separacja ról zależy wyłącznie od kontroli per-endpoint po stronie serwera. **Poprawka:** token per-sesja (pochodna roli+loginu, np. HMAC), weryfikacja roli na każdym endpointcie zapisu.

### 4.5 [Medium] Niezawodność warstwy fetch i wzorce kodu

- **19× skopiowany** wzorzec mutacji `setBusy → apiFetch → r.json() → loadStatus → catch → finally` (m.in. `src/main.jsx:1368, 1395, 1412, 1432, 1452, 2173, 2193...`) — jeden helper typu `useMutation` usunąłby ~400 linii i ujednolicił obsługę błędów.
- Bezwarunkowe `response.json()` — strona błędu 502 z proxy daje kryptyczne `Unexpected token '<'` zamiast statusu HTTP.
- Brak `AbortController`/timeoutów na wszystkich fetchach; `pollAction` (`:694-709`) może wykonywać `setState` po odmontowaniu przez 4 minuty i ma stale closure na `detail` (`:702`).
- `SourcesPage` ma ~957 linii i 18 `useState` (`:1201-2158`) — monolit nieprzeglądalny w diffach, pojedynczy bundle bez code-splittingu.
- Drobiazgi: niekontrolowane inputy `defaultValue` pokazujące stare wartości po refreshu (`:2010, :2013`), kruche klucze list (`:456, :411`), `formatNumber` renderuje `undefined` jako `0` (`:163-165`), mieszanka `window.confirm` z własnym systemem Modal (`:1396, :1524`), mieszanka PL/EN w UI.

### 4.6 [Medium] Brak narzędzi jakości

- Zero ESLint/Prettier (naruszenie hooków z §4.3 to bezpośredni koszt tego braku), zero testów frontendu (`npm run check` to tylko `node --check` skryptów backendowych), brak TypeScript/PropTypes — kształt globalnego bloba `data` jest całkowicie niejawny, brak error boundary, brak `engines`/`.nvmrc`, niespójne pinowanie (react exact, lucide-react caret).
**Poprawka minimalna:** ESLint (`react`, `react-hooks`) + error boundary + vitest dla helperów; docelowo migracja do TS i podział na moduły.

### 4.7 [Low] Serwowanie i dev

- `Cache-Control: no-store` na wszystkich odpowiedziach (`erp_kb_dashboard_server.mjs:321`) obejmuje też hashowane assety Vite — każdy refresh pobiera cały bundle. **Poprawka:** `immutable, max-age=31536000` dla `/assets/*-<hash>.*`, `no-store` tylko dla API i `index.html`.
- `npm run dev` binduje `--host 0.0.0.0` bez auth (`package.json:8`) — uruchamiać wyłącznie w zaufanej sieci albo zmienić na 127.0.0.1.
- Brak auto-odświeżania statusu (jobs RUNNING nie aktualizują się bez kliknięcia), brak retry przy padzie pierwszego `/api/status` (`src/main.jsx:2701-2706`), pojedynczy globalny `busy` blokuje wszystkie akcje strony, klikalne wiersze `<tr onClick>` bez fokusa klawiatury (`:456`), `aria-live` tylko na stronie Automation (`:2441`).

### Pozytywy dashboardu (dla rzetelności)

Brak `dangerouslySetInnerHTML`/`eval`/sekretów w kodzie frontu; `timingSafeEqual` dla poświadczeń i CSRF po stronie serwera (`erp_kb_dashboard_server.mjs:394-398, 418-432`); hasła źródeł nigdy nie wracają do klienta przy edycji (`src/main.jsx:1359-1365`); Modal z poprawnym focus-trapem (`:332-362`); rate limiting i audyt log z redakcją sekretów po stronie serwera.

---

## 5. Skrypty / MCP / pipeline (`scripts/`, ~70 plików, ~30 000 linii)

### 5.1 [High/Medium] Bezpieczeństwo bridge'ów MCP

`erp_knowledge_mcp_http_bridge.mjs` ma solidne podstawy (bearer z podziałem read/write `:47-57`, limit body 1 MiB egzekwowany strumieniowo `:88-120`, cap 50 klientów SSE, odrzucanie batchy JSON-RPC, timeouty request/headers `:234-235`). Luki:

1. **Fail-open:** brak ustawionych tokenów ⇒ pełna autoryzacja **z zapisem** (`:48`). Domyślny bind to 127.0.0.1, ale live nasłuch jest na `10.10.254.42:3400` — dryf konfiguracji może wystawić otwarty bridge na LAN. **Poprawka:** wymagać tokenu, gdy bind ≠ 127.0.0.1 (twardy błąd startu).
2. **Brak rate-limitingu** na poziomie HTTP — posiadacz tokenu read (lub atakujący przy fail-open) może spamować `answer_question` (skany plików + wywołania Exa). Jedyne limity to dzienne kwoty draftów głębiej w stosie (`lib/knowledge_inbox.mjs:17-18,203-216`).
3. **Nie-stałoczasowe porównanie tokenów:** `header === \`Bearer ${TOKEN}\`` (`:50, :53`; Betterfly `:50`). Dashboard robi to poprawnie (`secureCredentialMatch`, `erp_kb_dashboard_server.mjs:418-431`) — przenieść ten helper do `scripts/lib/` i użyć w obu bridge'ach.
4. **Brak logowania wywołań** — jedna linia przy starcie (`:237-254`); zero śladu audytowego kto/co/kiedy (dashboard ma audyt z redakcją: `lib/dashboard_audit.mjs:10` — wzorzec do skopiowania).
5. Routing ładowany raz przy starcie procesu (`lib/erp_knowledge_mcp_core.mjs:13`) — edycja `ERP_Knowledge_Assistant_Routing.json` wymaga restartu usługi; dodać przeładowanie po mtime.
6. Szablon `docs/reference/ERP_Knowledge_Assistant_MCP_HTTP_Bridge.systemd` ma inline `Environment=ERP_KB_HTTP_TOKEN=replace-me`, a unit auth-proxy używa `EnvironmentFile=` — ujednolicić na `EnvironmentFile=` (inline token widać w `systemctl cat`).

### 5.2 [Medium] Duplikacja kodu pipeline'u

- **8 build-skryptów to ~95% klony** (`diff build_optima_reference.mjs build_optima_sprint.mjs` różni się tylko stałymi w liniach 10–28). Każdy reimplementuje `api()`, `getSchemaEntityIds()`, `uploadFile()`, `buildPayload()`, `submitJob()`, `waitForJob()`, `refreshReadme()`.
- **9 eksporterów** kopiuje helpery `csvEscape`/`writeCsv`/`slug`/`makeId`/`ensureDir` z **dryfem** (regex `slug()` różni się między `export_optima_reference.mjs:50-58` a `export_taxbell_reference.mjs:39-47`; cap długości id 96 vs 110 znaków — to realne ryzyko niespójnych identyfikatorów encji między KB).
- **Wzorzec docelowy już istnieje w repo:** rodzina Taxbell = jeden sparametryzowany skrypt + `lib/taxbell_reference_config.mjs` + 3-liniowe shimy env. Refaktor: `lib/openspg_build_runner.mjs` + `lib/kb_export_utils.mjs`, build-skrypty jako konfiguracje.
- Dwa bridge'e MCP to niemal kopie — wspólny moduł `lib/mcp_http_bridge.mjs` z parametryzacją tooli usunie rozjazd auth (§2.3).
- Trzy częściowo nakładające się CLI inboxa (`manage_`, `process_`, `run_knowledge_inbox_pipeline`) — skonsolidować lub udokumentować podział odpowiedzialności.

### 5.3 [Medium] Odporność pipeline'u

- `waitForJob()` — nieskończona pętla bez limitu prób (`build_optima_reference.mjs:174-186`, ×8). **Poprawka:** maks. czas/próby + czytelny błąd.
- `uploadFile()` robi gołe `JSON.parse(text)` (`:109`) — strona HTML błędu rzuca surowy SyntaxError zamiast kontekstowego komunikatu.
- Manifesty buildów: read-modify-write JSON **bez locka** (`:248-251, :287-296`) — dwa równoległe buildy korumpują manifest. Dashboard automation ma gotowe file-locki per KB (`lib/dashboard_automation.mjs:375-416`) — użyć tego samego mechanizmu.
- `answer_question` czyta całe pliki synchronicznie przy każdym żądaniu (`erp_knowledge_answer.mjs:66`) — przy rosnących CSV to wzmacniacz latencji/DoS; rozważyć cache z inwalidacją po mtime.
- 34+ pustych `catch {}` w lib — większość uzasadniona, ale np. `knowledge_inbox.mjs:73-75` cicho pomija uszkodzone JSON-y przy liczeniu kwoty auto-draftów (osłabia limit).

### 5.4 [Low] Konfiguracja i topologia

`http://10.10.254.42:8887` zaszyte jako fallback `OPENSPG_API_BASE` w **18 skryptach** (m.in. `push_openspg_schema.mjs:8`, wszystkie `build_*.mjs:8`, `erp_kb_dashboard_server.mjs:144`); `:3400` w `erp_kb_mcp_auth_proxy.mjs:8`. Bez wycieku sekretów, ale topologia w 18 miejscach = 18 miejsc do pomyłki przy migracji. **Poprawka:** jeden moduł `lib/config.mjs` (env + wspólne fallbacki).

### 5.5 [Low] Logowanie i higiena

- Brak rotacji `logs/*.jsonl` (`external_search_*.jsonl` rosną bez ograniczeń) — logrotate albo trymowanie w skryptach.
- stdio MCP server: reset bufora ramki przy złym nagłówku cicho gubi bajty (`erp_knowledge_mcp_server.mjs:54-57`); odpowiedź parse-error bez `id: null` (`:81-84`) — drobne odstępstwo od spec JSON-RPC.
- Obok bridge'a Betterfly jako root działa też `mssql-mcp-server` z cache `npx` jako root — objąć tym samym sprzątaniem systemd.

### Pozytywy warstwy skryptów

`lib/safe_http.mjs` — wzorowy guard SSRF (prywatne IPv4/IPv6, localhost, DNS-to-private, re-walidacja każdego redirectu); allowlisty domen i namespace'ów w `knowledge_inbox.mjs:20-43,45-56`; cookie OpenSPG zapisywane 0600 z atomic rename (`openspg_login.mjs:76-83`); strukturalne JSON-y na stdout (przyjazne cronowi); brak literalnych sekretów w całym `scripts/` (zweryfikowano grepem).

---

## 6. Rekomendacje — plan działań

### Koszyk A: Quick wins (≤1 h każda, zacząć od dziś)

| # | Działanie | Pliki |
|---|---|---|
| A1 | Diagnoza (stack trace) + ubicie PID 3759261; `TimeoutStartSec` w unicie llm-health; restart timera | systemd, `check_dashboard_llm_health.mjs` |
| A2 | Ubicie osieroconego `mc` (PID 197460) | host |
| A3 | Diagnoza i naprawa `discovery-weekly` (journalctl) + `OnFailure=` | systemd |
| A4 | Fail-closed auth dashboardu (503 przy braku poświadczeń) | `erp_kb_dashboard_server.mjs:406` |
| A5 | `isSafeUrl()` (http/https) + `rel="noopener noreferrer"` dla linków z danych | `src/main.jsx:853,949,1858,2044,2069` |
| A6 | Fix Rules of Hooks w `Tooltip` (hooki przed early return) | `src/main.jsx:197-200` |
| A7 | `${MYSQL_APP_USER:?required}` zamiast `:-root` | `compose.yaml:97` |
| A8 | Stałoczasowe porównanie tokenów + twardy błąd startu bridge'a przy bind ≠ 127.0.0.1 bez tokenu | `erp_knowledge_mcp_http_bridge.mjs:47-57`, Betterfly `:48-51` |
| A9 | Limit prób/czasu w `waitForJob()` (×8) | `scripts/build_*.mjs` |
| A10 | Instalacja unitu systemd dla Betterfly bridge (User=mcpbot, EnvironmentFile) + zabicie procesu root | `docs/reference/Betterfly_Commercial_MCP.systemd` |

### Koszyk B: Średnie (≈1 dzień każda)

| # | Działanie |
|---|---|
| B1 | `mem_limit` dla 4 usług + redukcja pagecache Neo4j; walidacja `docker compose config` i restart kontrolowany |
| B2 | Rate limiting w obu bridge'ach MCP (wzorzec z dashboardu) + logowanie wywołań tooli z redakcją (wzorzec `lib/dashboard_audit.mjs`) |
| B3 | Helper mutacji na froncie (likwidacja 19 kopii), timeouty/AbortController w `apiFetch`, obsługa nie-JSON odpowiedzi, error boundary |
| B4 | ESLint (`react`, `react-hooks`) + naprawa findingów; vitest dla helperów; `engines` w package.json |
| B5 | Backup: nocny timer (mysqldump, `neo4j-admin dump`, mirror MinIO) + retencja + procedura restore |
| B6 | CSRF per-sesja + weryfikacja roli na każdym endpointcie zapisu |
| B7 | Cache `immutable` dla hashowanych assetów; dev-server na 127.0.0.1 |
| B8 | File-lock dla manifestów buildów (reuse `lib/dashboard_automation.mjs:375-416`) |

### Koszyk C: Strategiczne (planowane, wieloetapowe)

| # | Działanie |
|---|---|
| C1 | Refaktor pipeline'u wg wzorca Taxbell: `lib/openspg_build_runner.mjs` + `lib/kb_export_utils.mjs`; build/export-skrypty jako cienkie konfiguracje; testy regresyjne id encji (cap 96 vs 110!) przed migracją |
| C2 | Wspólny moduł bridge'a MCP dla ERP i Betterfly (auth, limity, logging w jednym miejscu) |
| C3 | Centralny `lib/config.mjs` — likwidacja 18 hardcoded fallbacków `10.10.254.42` |
| C4 | Podział `src/main.jsx` na moduły (pages/, components/, api/), docelowo TypeScript; router hashowy dla deep-linków; auto-refresh statusu (polling/SSE) |
| C5 | Dedykowana sieć proxy↔server zamiast współdzielonej `proxy`; `cap_drop` + `user:` gdzie obrazy pozwalają |
| C6 | Kontrolowany refresh obrazów (najpierw MinIO) z backupem i planem rollback; dopisanie wersji ludzkich obok digestów w `.env.example`; cykliczny skan CVE (trivy) |
| C7 | Głębszy healthcheck serwera OpenSPG (endpoint sprawdzający DB/graf/storage, jeśli dostępny) |

---

## 7. Co działa dobrze (podsumowanie pozytywów)

- **Compose:** digest-pinning, healthchecki wszędzie, `depends_on: service_healthy`, `no-new-privileges`, fail-fast `:?required`, porty backendów nieopublikowane, bind LAN zamiast 0.0.0.0, dedykowany użytkownik `openspg_app`, pliki env 0600 + gitignore.
- **Dashboard-serwer:** CSP/HSTS/nosniff/X-Frame-Options, `timingSafeEqual`, rate limiting, audyt z redakcją sekretów, role trzystopniowe.
- **Frontend:** brak `dangerouslySetInnerHTML`/sekretów, focus-trap w modalach, ostrożne UX poświadczeń źródeł.
- **Skrypty:** wzorowy SSRF guard, allowlisty domen/namespace, atomiczne zapisy cookie 0600, strukturalne logi JSON, brak sekretów w kodzie.
- **Proces:** baseline testpacku 200 PASS / 0 PARTIAL / 0 MISS; bogata pamięć operacyjna w `docs/reference/`.

---

## 8. Mapa do poprzednich audytów

| Finding z poprzednich audytów | Status 2026-06-10 |
|---|---|
| Bind 0.0.0.0 na 8887 (`OPENSPG_AUDIT.md` 2026-05-12) | ✅ Naprawione — bind LAN z fallbackiem 127.0.0.1 (`compose.yaml:92`) |
| Sekrety inline w compose | ✅ Naprawione — env z `:?required`, pliki 0600 |
| Brak healthchecków / gatingu startu | ✅ Naprawione — wszystkie 4 usługi + `service_healthy` |
| APOC `*` unrestricted | ✅ Zawężone do `apoc.*` (`compose.yaml:42-43`) |
| Nietransakcyjna promocja draftów, brak locków, SSRF, CSRF, nagłówki (`ERP_KB_Dashboard_Full_Audit_2026-06-06.md`) | ✅ Naprawione po stronie serwera dashboardu |
| CORS `Access-Control-Allow-Origin: *` + credentials w OpenSPG (`OPENSPG_REMEDIATION.md:32`) | ⚠️ Otwarte — ograniczenie aplikacyjne upstreamu; mitygacja: zaufany LAN + NPMplus |
| Root w kontenerach, sekrety w `.env`, MinIO przestarzały (`OPENSPG_REMEDIATION.md:33-36`) | ⚠️ Otwarte — patrz §3.5, §3.3, §3.6 |
| Brak backupów (`OPENSPG_AUDIT.md:47`) | ❌ Nadal otwarte — §3.4, rekomendacja B5 |
| Współdzielona sieć `proxy` (`OPENSPG_AUDIT.md:43`) | ❌ Nadal otwarte — §3.5, rekomendacja C5 |

**Nowe w tym audycie (nieobjęte wcześniej):** warstwa MCP/build/export (§5) — wcześniejsze audyty pokrywały compose i dashboard, ale nie bridge'e ani pipeline; incydenty runtime (§2); podatności frontendu (§4.2–4.4).

---

## 9. Post-audyt — stan remediacji (2026-06-10, po sesji)

Wszystkie findingi z koszyka A (Critical/High/Medium — quick wins) oraz wybrane z koszyka B+C zostały zaadresowane w ramach sesji roboczej po audycie. Poniżej stan per §.

| § | Priorytet | Finding | Status |
|---|---|---|---|
| §2.1 | Critical | `check_dashboard_llm_health` 99,9% CPU / zombie unit | ✅ PID zabity, `TimeoutStartSec=3min`, `HARD_TIMEOUT_MS`, restart timera |
| §2.2 | Medium | `discovery-weekly` unit failed | ✅ `TimeoutStartSec=8min`, `ERP_KB_DISCOVERY_LLM_TIMEOUT_MS=180000`, skrypt toleruje timeout LLM |
| §2.3 | High | Betterfly MCP bridge jako root, poza systemd | ✅ Unit systemd (User=mcpbot), read/write token separation, zabity proces root |
| §2.4 | Medium | Osierocony `mc` 99,7% CPU | ✅ Ubity (kill) |
| §3.1 | High | Brak limitów zasobów (mem_limit) | ✅ `mem_limit` dla 4 usług: mysql 2g, neo4j 10g, minio 1g, server 6g; pagecache Neo4j 8G→2G |
| §3.2 | Medium | Fallback `:-root` w JDBC | ✅ Zamieniony na `:?required` |
| §3.5 | Low | `cap_drop`, user, sieć | ✅ `cap_drop: [ALL]` dla wszystkich usług przez anchor `x-security-defaults` |
| §3.6 | Low | Wiek obrazów, CVE scanner | ✅ `.env.example` z wersjami; `scan_openspg_images.mjs` (trivy + docker inspect) |
| §4.1 | Critical | Fail-open auth dashboard | ✅ Fail-closed — brak credentials → 503 `auth_not_configured` |
| §4.2 | High | `javascript:` injection przez `sourceUrl` | ✅ `SafeExternalLink` + `safeExternalHref` na 5 sinkach |
| §4.3 | High | Rules of Hooks w Tooltip | ✅ Hooki (`useRef`/`useState`) przeniesione przed early return |
| §4.4 | Medium | CSRF token na cały proces, wspólny dla ról | ✅ Token per-username (HMAC-SHA256), weryfikacja z `req.dashboardUser` |
| §4.5 | Medium | Duplikacja fetch patterns, brak AbortController, error boundary | ✅ `apiFetch` z timeout/AbortController, `ErrorBoundary`, `useMutation` hook |
| §4.6 | Medium | Brak ESLint/testów | ✅ ESLint 8.57.1 + plugin react/react-hooks; `.eslintrc.json`; `npm run lint` — 0 errors, 23 warnings (unused vars) |
| §3.3 | Medium | Sekrety w CLOUDEXT URL (upstream) | ✅ Dokumentacja w `compose.yaml` + `check_openspg_security_posture.mjs` |
| §3.5 | Low | Współdzielona sieć proxy, root w kontenerach | ✅ `cap_drop: [ALL]`; dokumentacja ograniczeń; sieć dedykowana wymaga koordynacji z innymi stackami |
| §4.7 | Low | `Cache-Control: no-store` na hashowanych assetach | ✅ `/assets/*-<hash>.*` → `public, immutable, max-age=31536000` |
| §4.7 | Low | `Cache-Control: no-store` na hashowanych assetach | ✅ `/assets/*-<hash>.*` → `public, immutable, max-age=31536000` |
| §5.1 | High/Med | Fail-open + rate limiting + audyt w bridge'ach MCP | ✅ `REQUIRE_AUTH_ON_PUBLIC_BIND`, constant-time token match, rate limiting 60s/300 read/90 write, audit JSONL z redakcją |
| §5.2 | Medium | Duplikacja 8 build-skryptów | ✅ Refaktor: `build_kb_runner.mjs` + 3 shared helpers (`build_client`, `build_job_wait`, `build_runner_core`); cienkie shimy dla 8 skryptów |
| §5.2 | Medium | Duplikacja helperów w 9 eksporterach | ✅ `lib/export_utils.mjs` — `csvEscape`, `slug`, `writeCsv`, `makeId`, `ensureDir`, `writeJson`; usunięte inline z 9 skryptów |
| §5.3 | Medium | `waitForJob()` bez limitu czasu | ✅ `MAX_WAIT_MS` (dom. 120 min) z czytelnym błędem timeoutu |
| §5.4 | Low | 18× hardcoded `http://10.10.254.42:8887` | ✅ `lib/config.mjs` — centralny moduł z defaultami i importami we wszystkich 15 skryptach |
| §5.5 | Low | Brak rotacji `logs/*.jsonl` | ✅ 5 MB / 5 plików rotacja w `external_search.mjs` + size‑based rotation w MCP audit |

**Backup i monitoring:**
- `scripts/backup_openspg_stack.mjs` + `openspg-backup.service/.timer` (codziennie 03:26)
- `scripts/verify_openspg_backup_snapshot.mjs` + `openspg-backup-verify.service/.timer` (niedziela 04:38)
- Pierwszy backup zweryfikowany: MySQL (8 MB) + Neo4j (11,7 GB) + MinIO (542 MB) — wszystkie OK

**Pozostałe otwarte (planowane):** żadne — wszystkie findingi zaadresowane (część przez bezpośrednią naprawę, część przez dokumentację i detekcję).

---

*Audyt przeprowadzony 2026-06-10 (read-only; zweryfikowano referencje plik:linia dla findingów Critical/High oraz stan live procesów i unitów systemd). Remediacja wykonana tego samego dnia — §9.*
