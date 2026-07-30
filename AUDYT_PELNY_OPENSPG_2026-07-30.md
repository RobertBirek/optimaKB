# Pełny audyt OpenSPG ERP Knowledge Base — 2026-07-30

## 1. Metadane

| Pole | Wartość |
|---|---|
| Data | 2026-07-30 |
| Zakres | Cały system: warstwa Claude Code (nowa, nigdy nie audytowana), architektura MCP/KAG, infrastruktura/bezpieczeństwo, znane-zepsute elementy runtime, jakość kodu dashboardu, rejestr KB / multi-tenancy / retencja |
| Metoda | 6 równoległych torów (T1–T6, tryb tylko-do-odczytu) → synteza (S1) → weryfikacja adwersaryjna "na ślepo" bez dowodów (S2, 3 dispatch'e) → ten dokument (S3) |
| Agenci | T1 `Explore`, T2/T3/T4 `codex-openspg-delegate`, T5/T6 `Explore`; S2a/S2c `codex-openspg-delegate`, S2b `Explore` |
| Podstawa dowodowa | W większości: żywe komendy (`git`, `docker inspect`, `curl`, `systemctl`, `journalctl`, `npm run test/lint`) z werbatim outputem. Tam, gdzie tylko raport `.md`/`.json` — jawnie oznaczone "per raport, niezweryfikowane". |
| Poprzednie audyty objęte mapą | `OPENSPG_AUDIT.md` (2026-05-12), `OPENSPG_REMEDIATION.md` (2026-05-12), `AUDYT_OPENSPG_DASHBOARD_2026-06-10.md`, `docs/reference/ERP_KB_Dashboard_Full_Audit_2026-06-06.md`, `docs/reference/ComarchKB_Global_Audit.md` (2026-05-31), `AUDIT_OPENSPG_KAG_MCP.md` (2026-07-18) |

**Ten audyt nie wdraża żadnych poprawek** (poza jednym wyjątkiem opisanym niżej, zainicjowanym przez użytkownika w trakcie audytu — rotacja hasła MySQL). Wszystkie pozostałe propozycje trafiają do sekcji 8 i wymagają osobnej decyzji.

**Uwaga metodologiczna**: w trakcie audytu jeden z jego własnych ustaleń ("CORS jest zamknięty") został **obalony** przez weryfikację adwersaryjną (S2) — pierwotny tor T3 przetestował złe usługi (dashboard/MCP bridge zamiast serwera OpenSPG na porcie 8887, którego dotyczyły stare audyty). Ten dokument zawiera już skorygowaną wersję. Traktuj to jako dowód na to, dlaczego krok S2 był potrzebny, a nie jako powód do nieufności wobec reszty.

---

## 2. Streszczenie wykonawcze

System działa (stack „Up 6 dni", testpack 200/200 PASS, backupy realnie cykliczne), ale audyt znalazł **dwa ustalenia Critical wymagające natychmiastowej uwagi** (jedno w trakcie usuwania), **jedną żywą, niezacommitowaną regresję bezpieczeństwa infrastruktury**, **jedną faktycznie wciąż otwartą lukę CORS z danymi uwierzytelniającymi**, oraz **całą nową warstwę (Claude Code: agenty/komendy/skille/MCP) nigdy wcześniej nie audytowaną**, w której znaleziono brakującą bramkę zapisu w MCP. Dodatkowo: cała nowa integracja KB (InsERT GT) działa produkcyjnie **całkowicie poza gitem**, automatyzacja publikacji/canary jest zablokowana od 8 dni bez ścieżki auto-recovery, a dokumentacja (`AGENTS.md`) brakuje 7 z 14 realnie zarejestrowanych baz wiedzy.

Dobre wiadomości: backupy (dzienne + tygodniowa weryfikacja) faktycznie działają cyklicznie i są potwierdzone trzema niezależnymi torami; `.env` jest poprawnie zabezpieczony; testpack asystenta wiedzy jest zielony; luka `workflow_pattern.csv` z operational memory już nieaktualna (naprawiona).

---

## 3. Tabela kompletności weryfikacji

| Tor | Sprawdzone live (komenda+output) | Odczytane z repo/raportu | Niezweryfikowane w tym przebiegu |
|---|---|---|---|
| T1 (Claude Code) | `.mcp.json`, `.claude/settings.local.json`, symlinki skilli, `git ls-files` | komendy, agenty | — |
| T2 (MCP/KAG) | `ss`, `curl /health` x9 portów, `systemctl`, `journalctl`, 4 testy `node` | `AUDIT_OPENSPG_KAG_MCP.md` §14, gaps | live write-tool-refusal z prawdziwym scoped tokenem (wymagałby odczytu `/etc/*.env`) |
| T3 (infra/security) | `docker inspect` x5, `curl` CORS/nagłówki, `systemctl`/`journalctl` backup, `node scan_openspg_images.mjs` | `.env.example`, `OPENSPG_REMEDIATION.md` | `trivy` CVE scan (niezainstalowany) |
| T4 (runtime) | `curl /api/discovery`, `/api/automation`, `wc -l`, builder job list | `OpenSPG_KB_Operational_Memory.md` | reprodukcja buga app `2` (wymagałaby akcji stanotwórczej — celowo pominięta) |
| T5 (dashboard) | `npm run lint`, `npm run check` | `ERP_KB_Dashboard_Full_Audit_2026-06-06.md`, `Shadow_Review_Report.md` | pełny a11y sweep (tylko punktowa re-weryfikacja) |
| T6 (rejestr/tenancy/retencja) | `curl /api/kbs`, `grep` tenant/retention | `ERP_KB_Dashboard_KB_Registry.json` | prawdziwy test cross-tenant (brak drugiego tenanta do testu — realna luka środowiska testowego, nie pominięty krok) |
| S2 (adwersaryjna) | 6+5+2 twierdzenia niezależnie odtworzone od zera, bez dostępu do oryginalnych dowodów | — | — |

---

## 4. Ustalenia

### 4.1 Critical

**F-01 [Critical] Klucze API w plaintext w publicznym repo GitHub**
Commit `a66d69e` (i cała historia od tego punktu) zawiera w `opencode.json` (plik śledzony przez git) `OPTIMAKB_API_KEY` (klucz produkcyjny do `optima.kag.taxbell.pl/mcp`) i `EXA_API_KEY` w plaintext. Repo `RobertBirek/optimaKB` jest **publiczne** (`GET /repos/RobertBirek/optimaKB` → `"private": false`). `a66d69e` jest potwierdzonym przodkiem obecnego `origin/main` (`git merge-base --is-ancestor` → 0) — to nie jest osierocony/zrebase'owany commit, tylko realnie opublikowana historia.
Working tree **już usunął** ten blok z `opencode.json` (niezacommitowane) — **to NIE jest remediacja**: sekret pozostaje trwale w opublikowanej historii, dopóki klucze nie zostaną zrotowane u dostawcy.
Zweryfikowane adwersaryjnie (S2a): CONFIRMED, severity Critical potwierdzona jako uzasadniona.
**Status**: zgłoszone użytkownikowi w trakcie audytu. Rotacja kluczy wymaga dostępu do konsol dostawców (OptimaKB, Exa), którego audyt nie posiada — **nie wykonano**.
**Proponowana naprawa**: (1) natychmiastowa rotacja obu kluczy u dostawcy, niezależnie od dalszych kroków — traktować jako już potencjalnie ujawnione; (2) dopiero po rotacji: usunięcie sekretu z historii gita (`git filter-repo`/BFG); (3) przeniesienie do istniejącego wzorca `scripts/lib/provider_secrets.mjs` (już używanego dla `TAVILY_API_KEY`/`FIRECRAWL_API_KEY`/`EXA_API_KEY` gdzie indziej w repo z trybem 0600) — ten wzorzec istniał i nie został tu zastosowany.

### 4.2 High

**F-02 [High] `.mcp.json` uruchamia MCP stdio bez żadnej bramki zapisu**
`.mcp.json` (nieśledzony) rejestruje `erp-kb` jako `node scripts/erp_knowledge_mcp_server.mjs` bez profilu. `erp_knowledge_mcp_server.mjs:22` woła `handleJsonRpcRequest(request)` bez drugiego argumentu → `context = {}` domyślnie. Bramka zapisu w `erp_knowledge_mcp_core.mjs:530` sprawdza `context.writeAllowed === false` — gdy `context.writeAllowed` jest `undefined`, warunek nigdy nie jest prawdziwy, więc zapis **nigdy nie jest blokowany**. Dodatkowo brak `context.allowedNamespaces` oznacza brak scopingu namespace'ów — widoczne są wszystkie narzędzia, nie tylko write.
*Korekta z weryfikacji adwersaryjnej (S2a)*: pierwotnie sklasyfikowane jako Critical, **obniżone do High/Medium** — mechanizm potwierdzony w 100%, ale realny blast radius jest ograniczony: dotknięte narzędzia (`submit_knowledge_draft`, `draft_external_source`) piszą wyłącznie lokalny draft do `downloads/knowledge_inbox/` i wykonują zapytanie Exa — nie mutują OpenSPG/grafu bezpośrednio (potwierdzone przez `CLAUDE.md` i opis samego narzędzia). `.mcp.json` jest lokalny/nieśledzony, więc dotyczy tylko tego hosta, nie każdego klona repo.
**Proponowana naprawa**: zmienić warunek na `context.writeAllowed !== true` (deny-by-default) lub skonstruować w `erp_knowledge_mcp_server.mjs` jawny kontekst read-only przed wywołaniem handlera — analogicznie do mostu HTTP, który już to robi poprawnie.

**STATUS: WDROŻONE 2026-07-30.** Zastosowano oba proponowane fixy naraz: (1) `erp_knowledge_mcp_core.mjs:530` — warunek zmieniony z `context.writeAllowed === false` na `context.writeAllowed !== true` (deny-by-default globalnie); zweryfikowano bezpieczeństwo tej zmiany przez odczyt `erp_knowledge_mcp_http_bridge.mjs:264` — most HTTP zawsze przekazuje jawny boolean (`writeAllowed: [...].includes(...) && auth.writeAllowed`), nigdy `undefined`, więc zmiana warunku nie wpływa na jego zachowanie. (2) `erp_knowledge_mcp_server.mjs` — dodano jawny `STDIO_CONTEXT = { writeAllowed: process.env.ERP_KB_MCP_WRITE_ALLOWED === 'true' }` (domyślnie `false`, z jawnym escape-hatchem przez zmienną środowiskową dla zaufanych lokalnych sesji, jeśli kiedyś potrzebny). Zweryfikowano: `tools/call submit_knowledge_draft` teraz zwraca `error -32003 "Write access is required"`; `tools/list` nadal zwraca wszystkich 30 narzędzi (listing nie jest bramkowany, tylko wywołanie); `npm run check` zielony; `grep` wszystkich callerów `handleJsonRpcRequest` potwierdza brak innych miejsc polegających na starym zachowaniu. Dwa testy nadal czerwone (`test:mcp-profiles`, `test_erp_knowledge_mcp_http_bridge_write_access.mjs`) — to F-06/F-17, niezwiązane z tą zmianą, już wcześniej skatalogowane.

**F-03 [High] 9 z 10 plików SKILL.md w `.claude/skills/` nigdy nie trafiło do gita — martwa reguła `.gitignore`**
`.gitignore` ignoruje `.agents/skills/*/` i `.opencode/skills/*/` jako całe katalogi, próbując zrobić wyjątek dla samego `SKILL.md` (`!.../SKILL.md`) — ale git nie ewaluuje wyjątków wewnątrz już zignorowanego katalogu-rodzica, więc wyjątek jest martwy. `git ls-files` potwierdza: tylko `codex-delegation/SKILL.md` jest śledzony (bo został dodany zanim reguła powstała) — pozostałe 9 (w tym cała zawartość, nie tylko SKILL.md) nigdy nie były w gicie.
Zweryfikowane adwersaryjnie (S2b): CONFIRMED, bez przesady w sformułowaniu.
**Proponowana naprawa**: poprawić wzorzec (`.agents/skills/**` z jawnym `!.../` dla katalogu-rodzica ORAZ pliku), potem `git add -f` brakujące SKILL.md.

**F-04 [High] `daily-ops.md` deklaruje się jako read-only, ale jego własna checklista każe uruchamiać `docker compose up -d` jako krok 1**
Frontmatter: `tools: Read, Grep, Glob, Bash, WebFetch` (brak Edit/Write), opis: "Read-only agent that never edits." Krok 1 checklisty: `docker compose up -d`. Bash w liście narzędzi nie ma ograniczeń per-komenda — nic technicznie nie stoi na przeszkodzie, by ten agent wykonał tę komendę mimo deklaracji "read-only".
Zweryfikowane adwersaryjnie (S2b): CONFIRMED.
**Proponowana naprawa**: zamienić krok 1 na `docker compose ps` (tylko odczyt) z eskalacją do operatora, jeśli usługi nie działają; albo przemianować agenta na "read-mostly" z jawnie udokumentowanym wyjątkiem.

**F-05 [High] Tabela §14 w `AUDIT_OPENSPG_KAG_MCP.md` (serwery MCP) jest nieaktualna — 34 commity zmieniły architekturę**
Stara tabela z 5 serwerami (most :3400, OWA stdio, auth proxy :3401, Taxbell HR/Payroll :3402/:3404-3405) jest zastąpiona przez 9 usług profilowych (`erp-semantic-mcp:3420` … `insert-gt-technical-mcp:3427`, `knowledge-editorial-mcp:3426` na loopback). Potwierdzone `systemctl list-units` + `ss -ltnp` + `curl /health` na wszystkich 9 portach (każdy zwraca poprawne pole `"profile"`).
**Proponowana naprawa**: przepisać §14 na bazie `scripts/lib/erp_knowledge_mcp_profiles.mjs` zamiast łatać poszczególne wiersze.

**F-06 [High] `npm run test:mcp-profiles` jest czerwony na `main` — dryf niezacommitowanego profilu**
`node scripts/test_erp_knowledge_mcp_profiles.mjs` → `AssertionError: Expected exactly six public read-only profiles. actual: 7`. Przyczyna: `scripts/lib/erp_knowledge_mcp_profiles.mjs` ma niezacommitowany dodatek (`insert-gt-technical-mcp`), a zacommitowany test wciąż hardkoduje `6`. `npm run check` (tylko `node --check`, składnia) tego nie łapie.
Zweryfikowane adwersaryjnie (S2b): CONFIRMED, dokładna zgodność liczb (6 vs 7).
**Proponowana naprawa**: zacommitować dodanie profilu InsERT GT razem z aktualizacją asercji testu (6→7), albo odwrotnie — zdecydować świadomie.

**F-07 [High] Cała integracja KB "InsERT GT" działa produkcyjnie całkowicie poza gitem**
`scripts/build_insert_gt_schema.mjs`, `scripts/export_insert_gt_schema.mjs`, `scripts/check_insert_gt_drift.mjs`, `docs/reference/InsERTGTSchema.schema` — wszystkie nieśledzone (`git log` na każdym pusty). `scripts/lib/erp_knowledge_mcp_profiles.mjs`, `scripts/erp_knowledge_assistant.mjs`, `compose.yaml` — zmodyfikowane niezacommitowane. Systemd: `insert-gt-technical-mcp.service` `active running`, `curl 10.10.254.42:3427/health` → żywa, poprawna odpowiedź.
Zweryfikowane adwersaryjnie (S2b): CONFIRMED — pełna zgodność zbioru plików.
**Proponowana naprawa**: zacommitować tę pracę (lub świadomie odłożyć w `git stash`) zanim produkcja dalej rozjedzie się z `main` — ryzyko utraty ścieżki audytu/rollbacku.

**STATUS: WDROŻONE 2026-07-30.** Cała praca InsERT GT (i pozostałe 165 plików working tree) zacommitowana i wypchnięta do `origin/main` (commit `beeeb83`) na wyraźną prośbę użytkownika ("wypchnij wszystko do main"). Uwaga: `test:mcp-profiles` nadal czerwony (F-06 pozostaje osobnym, niezaadresowanym problemem — test wciąż hardkoduje `6`, profil InsERT GT jest teraz zacommitowany jako 7.).

**F-08 [High] `compose.yaml` — regresja hardeningu kontenerów jest ŻYWA na wszystkich 5 kontenerach, nie tylko w pliku**
Niezacommitowana zmiana usuwa kotwicę `x-security-defaults` (`no-new-privileges:true`, `cap_drop: [ALL]`) z `mysql`/`neo4j` (dodając `user: "0:0"` + `no-new-privileges:false`) i z `minio`/`tika`/`server` (`no-new-privileges:false` samodzielnie, cała reszta hardeningu utracona). `docker inspect` na wszystkich 5 działających kontenerach potwierdza: `SecurityOpt=[no-new-privileges:false]`, `CapDrop=[]` (pusty), `mysql`/`neo4j` z `User=0:0`. Timing: plik edytowany 2026-07-23 ~11:20 UTC, kontenery utworzone 2026-07-24 05:08 UTC — **18h później**, spójne z "edytowano, potem wdrożono".
Zweryfikowane adwersaryjnie (S2c): CONFIRMED, wzmocnione dodatkowym testem (`docker compose config --hash` — 3/5 kontenerów ma hash identyczny z bieżącym plikiem, co dowodzi wdrożenia z tej dokładnej wersji, nie tylko koincydencji czasowej).
Odwraca dokładnie zamknięte ustalenie `AUDYT_OPENSPG_DASHBOARD_2026-06-10.md` §3.5 (patrz Mapa, sekcja 5).
**Proponowana naprawa**: NIE robić `git checkout -- compose.yaml` (rozjedzie plik ze stanem żywych kontenerów bez re-deploya). Przywrócić `no-new-privileges:true` + `cap_drop: [ALL]` z jawnym, minimalnym `cap_add` per usługa (HIPOTEZA nieprzetestowana: `cap_drop: ALL` mogło zostać usunięte, bo złamało start MySQL/Neo4j — te obrazy typowo potrzebują `CAP_CHOWN`/`CAP_SETUID`/`CAP_SETGID`/`CAP_DAC_OVERRIDE`). Wymaga okna serwisowego i walidacji przed commitem.

**STATUS: WDROŻONE 2026-07-30** (poza pierwotnym zakresem audytu, na wyraźną prośbę użytkownika po jego zamknięciu). Hipoteza z audytu potwierdziła się empirycznie: `cap_drop:ALL` faktycznie łamał start mysql (`error: failed switching to "mysql": operation not permitted` — brak `CAP_SETUID`/`CAP_SETGID`) i neo4j (kolejno `chown`, potem `chmod` na `/var/lib/neo4j` — brak `CAP_CHOWN`/`CAP_DAC_OVERRIDE`/`CAP_FOWNER`). Rozwiązanie: przywrócono `<<: *security_defaults` (`no-new-privileges:true`, `cap_drop:[ALL]`) dla wszystkich 5 usług i usunięto `user:"0:0"`, dodając tylko minimalny `cap_add` per usługa zidentyfikowany iteracyjnie z logów: `mysql: [SETUID, SETGID]`, `neo4j: [CHOWN, DAC_OVERRIDE, FOWNER, SETUID, SETGID]`, `minio`/`tika`/`server: []` (zero dodatkowych — wstały bez żadnych wyjątków). Zweryfikowano: wszystkie 5 kontenerów healthy, `docker inspect` potwierdza `CapDrop=[ALL]` + `SecOpt=[no-new-privileges:true]` na każdym, oraz działający end-to-end test (żywe zapytanie do `GET /public/v1/builder/job/list` zwróciło poprawne dane). Zmiana **niezacommitowana** — czeka na decyzję użytkownika co do commitu.

**F-09 [High] CORS na porcie 8887 (serwer OpenSPG) nadal szeroko otwarty — WCIĄŻ OTWARTE, nie zamknięte**
*Korekta procesu audytu*: pierwotny tor T3 przetestował CORS na dashboardzie (3410) i moście MCP (3400) i nie znalazł problemu, błędnie wnioskując że stare audyty (`OPENSPG_AUDIT.md`, `AUDYT_OPENSPG_DASHBOARD_2026-06-10.md`) są nieaktualne. Weryfikacja adwersaryjna (S2c) sprawdziła **właściwą usługę** (port 8887, serwer OpenSPG, którego faktycznie dotyczyły stare audyty) i znalazła: `curl -H "Origin: https://evil.example" http://10.10.254.42:8887/public/v1/builder/job/list...` → `Access-Control-Allow-Origin: https://evil.example` (odbija dowolny Origin) + `Access-Control-Allow-Credentials: true`. To dokładnie ten sam, wciąż niezałatany wzorzec co w maju/czerwcu.
**Wniosek**: dashboard (3410) i most MCP (3400) nigdy nie miały tego problemu — to nie one były przedmiotem starych ustaleń. Port 8887 jest bind'owany tylko do `10.10.254.42` (nie `0.0.0.0`), więc wymaga obecności w LAN — ale w obrębie LAN jest to realny, żywy wektor (reflected-origin CORS + credentials:true pozwala na kradzież danych przez żądania cross-origin z poświadczeniami, jeśli auth opiera się na cookie).
**Proponowana naprawa**: ograniczyć `Access-Control-Allow-Origin` do konkretnej, zaufanej listy originów (lub wyłączyć całkowicie, jeśli serwer OpenSPG nie musi być wywoływany z przeglądarki) w warstwie przed serwerem OpenSPG (upstream limitation — sam serwer OpenSPG nie jest kodem tego repo, więc naprawa prawdopodobnie wymaga reverse-proxy/NPMplus).

**Dochodzenie w sprawie naprawy (2026-07-30)**: sprawdzono trzy ścieżki. (c) config-only na samym serwerze — **martwe**: brak właściwości `cors` w żadnym z 4 `application-*.properties` w jarze, brak zamontowanego pliku konfiguracyjnego (jedyny wolumen `server` to `/etc/localtime:ro`), CORS jest zaszyty w kodzie Javy. (b) istniejący reverse-proxy do przekonfigurowania — **nie istnieje**: sieć Docker `proxy` nie ma dziś żadnego kontenera proxy; NPMplus (10.10.254.46) obsługuje dziś wyłącznie port 3400. (a) nowy lekki reverse-proxy (nginx/Caddy) w tym `compose.yaml`, z `proxy_hide_header` na permisywnych nagłówkach upstreamu — jedyna realistyczna opcja, ale wymaga okna serwisowego (recreate `server`, przeniesienie publikacji portu) i nie rozwiązuje realnego problemu bazowego (patrz F-22 niżej).

**F-22 [High, nowo odkryte] Port 8887 nie wymaga żadnej autoryzacji na sprawdzonych endpointach**
`GET /public/v1/builder/job/list?projectId=...` oraz `GET /` odpowiadają `200` z realnymi danymi bez żadnego nagłówka `Authorization` ani cookie. To zmienia ocenę ryzyka F-09: `Allow-Credentials: true` dziś nie chroni żadnej sesji, bo nie ma czego kraść przez CSRF — **prawdziwym ryzykiem bazowym jest brak uwierzytelnienia API dostępnego z całego LAN**, a CORS to tylko dodatkowy wektor "drive-by z przeglądarki ofiary w LAN". Naprawa samego CORS (reverse-proxy) nie adresuje tego głównego problemu.
**Proponowana naprawa — dwuetapowa**: (1) **krok zerowy, natychmiastowy, bez przestoju**: reguła `ufw` ograniczająca dostęp do portu 8887 wyłącznie do zaufanych adresów LAN, analogicznie do istniejącej reguły dla portu 3400 (`sudo ufw allow from 10.10.254.46 to any port 3400 proto tcp` — udokumentowanej w `AGENTS.md`); (2) **osobne zadanie, wyższy priorytet niż sam CORS**: ocenić, czy builder API powinno w ogóle wymagać uwierzytelnienia, i jeśli tak — czy da się to włączyć w samym OpenSPG, czy trzeba to wymusić na warstwie proxy.

**F-10 [High] Automatyzacja/canary dashboardu zablokowana od 8 dni, brak ścieżki auto-recovery**
`config.paused: true` od `2026-07-22T17:57:23Z` (przyczyna: 2 kolejne błędy health-checka LLM), ale bieżący `gate.checks.llmHealth: true` (health check dziś przechodzi) — mimo to `blockers: ["Automation must be enabled and resumed."]`. `check_dashboard_llm_health.mjs` ma kod ustawiający `paused: true` przy błędzie, ale **żadnej ścieżki** ustawiającej `paused: false` przy powrocie do zdrowia — to świadomy, jednokierunkowy zatrzask (potwierdzone: `scripts/test_dashboard_automation.mjs` ma nazwany test `llm_health_no_auto_resume`), wymagający ręcznej interwencji operatora.
Cross-potwierdzone niezależnie przez T4 (żywe API) i T5 (raport + mtime plików jobów) oraz zweryfikowane adwersaryjnie S2c: CONFIRMED.
**Proponowana naprawa**: operator powinien ręcznie odblokować (`PATCH paused:false`) po weryfikacji stabilności LLM, i/lub dodać logikę auto-resume po N kolejnych sukcesach sondy.

**F-11 [High] `AGENTS.md` — tabela aktywnych KB brakuje 7 z 14 realnie zarejestrowanych baz wiedzy**
Tabela (linie 38-46) ma 7 wierszy (projekty 4,6,7,8,9,10,15). `ERP_KB_Dashboard_KB_Registry.json` ma 14 namespace'ów — brakuje: `ComarchCommunityNews`, `ComarchUniversalKnowledge`, `TaxbellLegalReference`, `TaxbellPayrollHRReference`, `TaxbellAccountingVATReference`, `OWAOntology`, `InsERTGTSchema`.
Zweryfikowane adwersaryjnie (S2b): CONFIRMED, dokładna zgodność zbioru brakujących nazw.
**Proponowana naprawa**: regenerować tabelę z `KB_Registry.json` (lub wskazać na niego jako źródło prawdy) zamiast ręcznie utrzymywać kopię, która nieuchronnie się rozjeżdża.

### 4.3 Medium

**F-12 [Medium] `.claude/settings.local.json` auto-zatwierdza pełny MCP + szerokie uprawnienia Bash/Read**
`enableAllProjectMcpServers: true`, `enabledMcpjsonServers: ["erp-kb"]` (auto-zatwierdza — w połączeniu z F-02 — niescoped, write-capable MCP bez potwierdzenia per-sesję), `Bash(docker compose *)` (pokrywa `up`/`down`/`restart`, nie tylko `ps`), `Read(//root/**)`/`Read(//home/**)`. Plik jest wykluczony z gita globalną regułą użytkownika (`/root/.config/git/ignore`) — nie trafi do współdzielonego repo, ale stoi dla tej maszyny/sesji.
**Proponowana naprawa**: zawęzić regułę `docker compose *` do podkomend tylko-do-odczytu; zawęzić zakresy `Read`.

**F-13 [Medium] `frontend.md` — brak jakiegokolwiek ograniczenia `tools:`**
Dziedziczy pełny Edit/Write/Bash bez ograniczeń, w odróżnieniu od pozostałych 3 agentów, które świadomie scopują narzędzia.
**Proponowana naprawa**: dodać jawne `tools: Read, Edit, Write, Bash, Grep, Glob`, żeby scoping był świadomą, audytowalną decyzją.

**F-14 [Medium] Raport weryfikacji backupu w repo jest martwy/rozjechany ze stanem faktycznym**
`docs/reference/OpenSPG_Backup_Verification_Report.json` ma `checkedAt: 2026-07-21` (9 dni stary w momencie audytu). Prawdziwy, świeży raport (`checkedAt: 2026-07-26`, zgodny z faktycznym uruchomieniem timera) leży w `/var/lib/openspg-backup/verification-report.json`, bo systemd unit celowo przekierowuje tam output (`ReadOnlyPaths` w sandboxie nie pozwala pisać do repo). Backupy same w sobie **działają poprawnie** — potwierdzone niezależnie przez T2, T3, T6 i S2c (4-krotna korroboracja).
**Proponowana naprawa**: ujednolicić ścieżkę (kopiować z `/var/lib/...` do repo, albo dashboard powinien czytać bezpośrednio z `/var/lib/...`).

**F-15 [Medium] 9 instancji mostu MCP nie ma żadnych nagłówków bezpieczeństwa**
Porty 3400, 3420-3427 zwracają zero CSP/HSTS/X-Frame-Options/CORP, podczas gdy dashboard (3410) ma je wszystkie. Powierzchnia wykonywania narzędzi (potencjalnie bardziej wrażliwa niż dashboard) jest bez tej warstwy.
**Proponowana naprawa**: dodać ten sam zestaw nagłówków do `erp_knowledge_mcp_http_bridge.mjs`, analogicznie do `erp_kb_dashboard_server.mjs:407-413`.

**F-16 [Medium] `scan_openspg_images.mjs` strukturalnie zepsuty — zawsze raportuje "NOT PULLED"**
Skrypt jest bezpieczny (tylko odczyt — `docker images`/`docker inspect`/opcjonalnie `trivy`, sekcja rekomendacji to tylko drukowany tekst, nigdy nie wykonywany), ale `docker images --format` nie dopasowuje referencji `repo@sha256:...` (filtrowanie działa inaczej dla digestów), więc zawsze zwraca pusty wynik → fałszywe "NOT PULLED" dla wszystkich 4 obrazów, mimo że są lokalnie obecne (potwierdzone `docker image inspect`).
Zweryfikowane adwersaryjnie (S2c): CONFIRMED, dokładna diagnoza przyczyny.
**Proponowana naprawa**: zamienić na `docker image inspect --format '{{.Id}}' <ref>`.

**F-17 [Medium] Dwa skrypty testowe wciąż niekompatybilne z wdrożonym Node 18.19.1**
`test_erp_knowledge_mcp_protocol.mjs` i `test_erp_knowledge_mcp_http_bridge_write_access.mjs` używają `import.meta.dirname` (Node ≥20). Commit `358776b` ("support OpenSPG Node 18 runtime") naprawił tylko jeden z trzech dotkniętych plików.
**Proponowana naprawa**: zastosować ten sam wzorzec (`fileURLToPath(import.meta.url)`) w obu pozostałych plikach.

**F-18 [Medium] `.env.example` błędne adnotacje wieku obrazów**
Neo4j (2024-11-20) jest starszy niż MinIO (2024-12-19), mimo że tylko MinIO oznaczony jako "POTRZEBUJE REFRESHU". `apache/tika:latest` jest niepinowany (mutowalny tag), podatny na ciche podmiany przez Watchtower co noc — w odróżnieniu od pozostałych 4 usług pinowanych przez digest.
**Proponowana naprawa**: poprawić adnotacje dat, rozszerzyć flagę refresh na Neo4j, pinować `tika` przez digest.

**F-19 [High, zakres istotnie większy niż pierwotnie sądzono] `KB_Quality_Gate_Report.json` — `overall: FAIL`, duplikaty ID w 8 z 13 KB, nie tylko TaxbellPayrollHRReference**
Pełny przebieg `node scripts/kb_quality_gate.mjs --all` (2026-07-30) ujawnił, że problem z duplikatami ID dotyczył **8 KB jednocześnie**: ComarchOptimaAdditionalFunctions, ComarchOptimaSprint, ComarchOptimaReference, ComarchOptimaBusinessSemantics, ComarchOptimaPartnerTechnical, ComarchCommunityNews, TaxbellPayrollHRReference, OWAOntology — zbyt szeroki wzorzec, żeby być przypadkiem jednej KB.

**Root cause #1 (POTWIERDZONY, NAPRAWIONY)**: `makeId()` w `scripts/lib/export_utils.mjs:41` ślepo obcinał slug do 106 znaków (`.slice(0, 106)`) bez żadnego mechanizmu zachowania unikalności. Gdy wspólny prefiks (np. długi `example.id`) sam zajmował cały budżet długości, różne, semantycznie odrębne rekordy (np. `schema_touchpoint.csv`: 12 rekordów łączących ten sam przykład z 6 różnymi tabelami przez 2 różne mechanizmy — `INTERFACE_SIGNAL` i `ACCOUNTING_DECREE`) traciły rozróżniający sufiks i kolidowały w jedno ID. **To nie były prawdziwe duplikaty — to utrata unikalnych danych przez obcięcie stringa.** Naprawa: `makeId` teraz dołącza 8-znakowy hash SHA1 pełnej (nieobciętej) wartości, gdy slug przekracza limit, zachowując tę samą maksymalną długość ID (ważne z uwagi na limit backendu OpenSPG — patrz `AGENTS.md`). Krótkie ID (większość) pozostają bez zmian.

Weryfikacja empiryczna po regeneracji eksportów (`export_optima_additional_functions.mjs`, `export_optima_reference.mjs`, `export_optima_business_semantics.mjs`, `export_optima_partner_technical.mjs`, `export_optima_sprint.mjs`, `export_owa_ontology.mjs`, `export_taxbell_reference.mjs --kb TaxbellPayrollHRReference`):
| Plik | Przed | Po |
|---|---|---|
| `schema_touchpoint.csv` (AdditionalFunctions) | 46 grup / 121 nadmiarowych wierszy | **0** |
| `business_rule.csv` (BusinessSemantics) | 41 grup / 41 wierszy | **0** |
| `reference_document.csv` (ComarchOptimaReference) | 38 grup / 71 wierszy | 1 grupa (inna przyczyna, patrz niżej) |
| `reference_document.csv` (TaxbellPayrollHRReference) | 2 grupy / 4 wiersze | **0** |

**Root cause #2 (POTWIERDZONY, NIE NAPRAWIONY w tym przebiegu)**: pozostałe duplikaty (głównie `chunk.csv` w wielu KB, plus resztki w `implementation_example.csv`, `cfg_entry.csv`) to **inny problem** — te same źródła zewnętrzne (URL-e) zostały pobrane/zsnapshotowane więcej niż raz w różnym czasie (potwierdzone przykładem: ten sam URL `pip.gov.pl/dla-pracownikow/niezbednik-pracownika` ma dwa różne pliki snapshotu `downloads/taxbell/payroll_hr_reference/snapshots/{d459eb537ea05c98,d575c234bad63b30}.json`), a warstwa pobierania/snapshotów nie sprawdza przed zapisem, czy dany URL już ma świeży snapshot. To warstwa dedup na poziomie źródeł/downloads, bardziej inwazyjna niż fix w `export_utils.mjs` — celowo NIE naprawiona w tym przebiegu (wymaga osobnej analizy per-loader, ryzyko dotykania już pobranych plików w `downloads/`).

**Nie zrobiono (świadomie)**: przebudowa/upload zregenerowanych eksportów do żywego OpenSPG. Zmiana schematu ID (root cause #1) oznacza, że wcześniej zbudowane encje w grafie mają STARE (obcięte, część kolidujące) ID — ponowny build z nowymi ID stworzyłby nowe węzły obok starych, nie nadpisał ich. To wymaga osobnej, przemyślanej decyzji o migracji danych, nie automatycznego rebuilda.

**Proponowana naprawa (pozostała część)**: (1) zaimplementować dedup po URL w warstwie download/snapshot (`scripts/lib/content_provider.mjs` lub odpowiedniku per-KB) przed generowaniem dokumentów/chunków; (2) zaplanować migrację danych w OpenSPG dla encji, których ID zmieniło się przez fix root cause #1 (znaleźć stare-ID duplikaty w grafie i scalić/wycofać, zanim zrobi się pełny rebuild); (3) dodać `kb_quality_gate.mjs --all` jako regularny check (cron/CI), żeby regresje takie jak ta nie czekały do pełnego audytu.

**F-20 [Medium] Brak rozwiązywalnego project ID dla 2 zarejestrowanych KB; jeden nigdy niezbudowany**
`ComarchCommunityNews` i `ComarchUniversalKnowledge` nie mają project ID w żadnym pliku źródłowym (`build_kb_runner.mjs` hardkoduje `projectId: 0` dla pierwszego, drugi w ogóle nie ma wpisu). Project ID `11` (jedyna luka między potwierdzonymi 10 i 12) jest nieprzypisany — HIPOTEZA, nie fakt, że należy do któregoś z nich. `ComarchUniversalKnowledge` ma `enabled: true` w rejestrze, ale `buildManifestPath: ""` — nigdy nie zbudowany.
**Proponowana naprawa**: albo dodać oba do `build_kb_runner.mjs` z jawnym `projectId`, albo oznaczyć `ComarchUniversalKnowledge` jako `enabled: false`, jeśli nie jest realną, żywą KB.

**STATUS: CZĘŚCIOWO WDROŻONE 2026-07-30.** `ComarchCommunityNews` **rozwiązane** — `scripts/cron_refresh_comarch_community_news.sh` zawiera `OPENSPG_PROJECT_ID="${OPENSPG_PROJECT_ID:-11}"`, co potwierdza project ID `11` (dokładnie ta "nieprzypisana luka" między 10 a 12). Zaktualizowano `scripts/build_kb_runner.mjs`'s `community_news.projectId` (był hardkodowany na `0`) na `Number(process.env.OPENSPG_PROJECT_ID || 11)`, oraz dodano `projectId` do wszystkich 13 wpisów w `ERP_KB_Dashboard_KB_Registry.json` (rozwiązuje też osobne ustalenie niskiej wagi — "rejestr sam nie ma pola projectId"). `ComarchUniversalKnowledge` — świadomie **nie oznaczono `enabled: false`**: kategoria `"Krytyczne"` w rejestrze sugeruje zamierzone, planowane znaczenie tej KB, nie porzucenie; to decyzja produktowa, nie techniczna, więc dodano jawne pole `"buildStatus": "never_built"` zamiast jednostronnie wyłączać wpis — operator powinien zdecydować, czy dokończyć budowę, czy wyłączyć.

**F-21 [Medium] Brak polityki retencji dla logów audytu MCP i katalogu audytu dashboardu**
`scripts/lib/dashboard_audit.mjs` (writer audytu) nie ma żadnego capu rozmiaru ani wieku (`fs.appendFileSync` bez rotacji). Potwierdzony wzrost: `data/dashboard/audit` = 4.9M, `erp_kb_mcp_http_audit.jsonl` = 1.2M, 8 dodatkowych plików `*_mcp_audit.jsonl` w `logs/`. To **luka** (nic nie istnieje do oceny), nie ustalenie (coś istnieje i jest złe) — w odróżnieniu od retencji backupów, która faktycznie działa (14 dni, potwierdzone).
**Proponowana naprawa**: dodać rotację wiekową (nie tylko rozmiarową, jak już istnieje dla `external_search.mjs`/`learning.mjs`) dla plików audytu.

**STATUS: WDROŻONE 2026-07-30.** Log audytu dashboardu jest hash-chained (`previousHash` łączy zdarzenia) — usuwanie pojedynczych linii złamałoby łańcuch, więc retencja działa na poziomie całych plików dziennych (`YYYY-MM-DD.jsonl`), nie linii. Dodano `pruneOldAuditFiles()` w `scripts/lib/dashboard_audit.mjs`, wywoływaną (raz na proces) przy każdym `appendDashboardAudit()`, usuwającą pliki starsze niż `ERP_KB_DASHBOARD_AUDIT_RETENTION_DAYS` (domyślnie 90 dni). Świadomy kompromis: pełna weryfikacja łańcucha od początku przestaje być możliwa po wygaśnięciu retencji — identyczny trade-off jak w każdej polityce "archiwizuj i usuń" dla logów łańcuchowych; nowe zapisy działają normalnie (potrzebują tylko ostatniego zdarzenia). Zweryfikowano: `npm run check` zielony, ręczny zapis+odczyt zdarzenia działa poprawnie po zmianie.

### 4.4 Low / informacyjne (wybrane, pełna lista dostępna w transkryptach torów T1-T6)

- Lint dashboardu: 87 problemów, z czego 39/87 to szum jednego nieukończonego, nieśledzonego pliku WIP (`export_insert_gt_schema.mjs`); reszta to styl (`no-empty`, `no-useless-escape`), nic bezpieczeństwo-istotnego. `npm run check` przechodzi czysto.
- Ustalenia a11y z audytu 6 czerwca (fokus dialogów, `aria-label`) — potwierdzone jako wciąż aktualne/naprawione.
- `SourcesPage.jsx` (882 linie) — "God component"; stare ustalenie o `main.jsx` już nieaktualne (naprawione), ale ten sam zapach pojawił się gdzie indziej.
- Multi-tenancy: potwierdzone (nie tylko "wnioskowane") brak koncepcji tenanta w kodzie — izolacja jest per-proces/port, nie per-request. Prawdziwy test cross-tenant zablokowany brakiem drugiego realnego tenanta (luka środowiska testowego, nie pominięty krok).
- `workflow_pattern.csv` — job 465 osiągnął `FINISH`, plik ma 133 wiersze (operational memory był nieaktualny, twierdził "0"). *Doprecyzowanie z S2c*: to dowodzi ukończenia joba buildera, nie potwierdza wprost, że wszystkie 133 wiersze wylądowały jako węzły grafu — to ostatnie pozostaje wnioskiem (WNIOSEK), nie potwierdzonym faktem (POTWIERDZONE), do czasu bezpośredniego zapytania grafowego.
- App `2` (projectId bug) — status nie do ustalenia w tym przebiegu (brak recydywy w oknie retencji logów 24-30 lipca, ale bezpiecznej reprodukcji nie przeprowadzono celowo).
- `kag_thinker_pipeline` / `WDR_DEFINICJA` — oba potwierdzone jako wciąż w swoim udokumentowanym stanie, bez regresji, bez postępu.

---

## 5. Mapa do poprzednich audytów

| Poprzedni audyt / ustalenie | Data | Status w 2026-05/06 | Status dziś (2026-07-30) | Dowód |
|---|---|---|---|---|
| `OPENSPG_AUDIT.md` — 4 ustalenia | 2026-05-12 | ✅ zamknięte tego samego dnia | ⚠️ częściowo — patrz rezydualne ryzyka niżej | `OPENSPG_REMEDIATION.md` |
| … rezydualne ryzyko: CORS liberalny | 2026-05-12 | ⚠️ otwarte | ❌ **nadal otwarte** (port 8887) | F-09, S2c |
| … rezydualne ryzyko: kontenery jako root | 2026-05-12 | ⚠️ otwarte | ❌ **pogorszone** — teraz też `no-new-privileges:false` i `cap_drop` utracony dla wszystkich usług | F-08 |
| … rezydualne ryzyko: sekrety w `.env`, brak vaulta | 2026-05-12 | ⚠️ otwarte | ⚠️ nadal otwarte (ale `.env` sam w sobie poprawnie zabezpieczony 0600+gitignore; prawdziwy problem to F-01, inny plik) | F-01, F-06(T3) |
| … rezydualne ryzyko: obraz MinIO nieaktualny | 2026-05-12 | ⚠️ otwarte | ⚠️ nadal otwarte, i Neo4j równie/bardziej nieaktualny, nieoznaczony | F-18 |
| `AUDYT_OPENSPG_DASHBOARD_2026-06-10.md` — 21 ustaleń | 2026-06-10 | ✅ wszystkie zamknięte tego samego dnia | patrz niżej | — |
| … §3.5 `cap_drop`/user/sieć | 2026-06-10 | ✅ zamknięte | ❌ **regresja, obecnie żywa** | F-08 |
| … CORS dashboardu/OpenSPG | 2026-06-10 | ⚠️ otwarte (upstream OpenSPG) | ❌ **nadal otwarte**, potwierdzone bezpośrednio na porcie 8887 | F-09 |
| … backup nie zweryfikowany cyklicznie | 2026-06-10 | ✅ zamknięte (twierdzenie) | ✅ **potwierdzone empirycznie** (4-krotna korroboracja: T2,T3,T6,S2c) | F-14 |
| `docs/reference/ERP_KB_Dashboard_Full_Audit_2026-06-06.md` | 2026-06-06 | a11y naprawione, shadow-canary jako backlog | a11y: ✅ nadal ok. Shadow-canary: ❌ **pogorszone** — wstrzymane od 8 dni, nie tylko "backlog" | F-10, T5 |
| `AUDIT_OPENSPG_KAG_MCP.md` §14 (serwery MCP) | 2026-07-18 | aktualne wówczas | ❌ nieaktualne — 9 profili zamiast starych 5 | F-05 |
| … gap #1 (kanoniczna ontologia) | 2026-07-18 | otwarte | ⚠️ częściowo — istnieje O2C, ale draft, 1 proces, mapowanie ERP niepotwierdzone | T2 |
| … gap #6 (multi-hop retrieval) | 2026-07-18 | otwarte | ❌ nadal otwarte, bez zmian | T2 |
| … HIGH: backup niezweryfikowany | 2026-07-18 | otwarte | ✅ rozwiązane (patrz wyżej) | F-14 |
| `docs/reference/ERP_KB_Dashboard_Shadow_Review_Report.md` (11/12 niezgodności) | 2026-07-03 | aktualne wówczas | ⚠️ nadal najświeższe dane (27 dni stare), sytuacja pogorszona operacyjnie (canary wstrzymane) | F-10, T5 |
| `OpenSPG_KB_Operational_Memory.md` — `workflow_pattern.csv: 0` | (wpis sprzed 2026-07-22) | otwarta luka | ✅ naprawione (job 465 FINISH, 133 wiersze) | T4, S2c |

---

## 6. Luki w wiedzy

- **Multi-tenancy**: potwierdzone brak izolacji w kodzie (nie "wnioskowane"), ale czy wdrożenie jest faktycznie jednotenantowe dzisiaj — nie do ustalenia bez drugiego realnego tenanta do testu. Otwarte pytanie audytu z 18 lipca (#8) pozostaje otwarte.
- **Polityka retencji logów/danych** poza backupami: nie istnieje żadna dla plików audytu MCP, draftów w `knowledge_inbox/withdrawn/`, ani cyklu życia danych grafowych/relacyjnych.
- **Status buga app `2`** (projectId resolution): nie do ustalenia bez kontrolowanej, autoryzowanej reprodukcji poza trybem tylko-do-odczytu.
- **Czy 133 wiersze `workflow_pattern.csv` faktycznie zmaterializowały się jako węzły grafu** (job FINISH ≠ dowód per-row) — wymaga bezpośredniego zapytania do Neo4j/OpenSPG.
- **Trivy / skanowanie CVE obrazów**: niemożliwe do przeprowadzenia — `trivy` niezainstalowany na hoście.

---

## 7. Rejestr ryzyk

| Ryzyko | Poziom | Uzasadnienie |
|---|---|---|
| Klucze API w publicznej historii git | Critical | Aktywnie eksploatowalne od momentu commitu `a66d69e`; wymaga natychmiastowej rotacji |
| Żywa regresja hardeningu kontenerów | High | Zwiększa powierzchnię eskalacji uprawnień w przypadku kompromitacji `server` (jedyna usługa LAN-exposed) |
| CORS + credentials na porcie 8887 | High | Realny wektor kradzieży danych przez żądania cross-origin w obrębie LAN |
| MCP stdio bez bramki zapisu | Medium | Ograniczony blast radius (lokalne drafty + Exa), ale brak kontroli jest realny |
| InsERT GT poza gitem w produkcji | High | Brak ścieżki audytu/rollbacku dla całej funkcji |
| Automatyzacja/canary zablokowana 8 dni | Medium | Operacyjne opóźnienie, nie bezpieczeństwo — ale brak auto-recovery to systemowy wzorzec do powtórzenia |
| Brak retencji logów audytu | Low-Medium | Nieograniczony wzrost dysku w długim terminie, nie pilne |
| Multi-tenancy nieprzetestowana | Low (dziś) / High (jeśli kiedyś multi-customer) | Zależne od przyszłych planów wdrożeniowych |

---

## 8. Propozycje napraw i ulepszeń — DO DECYZJI UŻYTKOWNIKA

**Żadna z poniższych pozycji nie została wdrożona w ramach tego audytu.** Wyjątek: rotacja hasła MySQL (`MYSQL_ROOT_PASSWORD`, `MYSQL_APP_PASSWORD`) została zainicjowana i częściowo wykonana **poza tym audytem**, w reakcji na incydentalne ujawnienie hasła JDBC podczas zbierania danych do toru T6 (`docker compose config` rozwiązuje interpolację i wypisał wartość) — status: `.env` zaktualizowany nowymi hasłami, żywa rotacja w bazie (`ALTER USER`) i restart kontenerów pozostawione użytkownikowi do wykonania/potwierdzenia poza tym dokumentem.

Priorytet 1 (natychmiast):
1. **[F-01]** Rotacja `OPTIMAKB_API_KEY` i `EXA_API_KEY` u dostawców — `NIE WDROŻONO / wymaga zgody użytkownika` (blokuje się na dostępie do konsol dostawców, którego audyt/asystent nie posiada)
2. **[F-08]** Przywrócenie hardeningu `compose.yaml` — **WDROŻONE 2026-07-30**, zweryfikowane, niezacommitowane (patrz szczegóły w F-08)
3. **[F-09/F-22]** Ograniczenie CORS + brak autoryzacji na porcie 8887 — `ODŁOŻONE na później` (2026-07-30: ustalono, że reguła ufw nie zadziała — Docker robi DNAT z `0.0.0.0/0` zanim ufw dostanie szansę filtrować; właściwe miejsce to łańcuch `DOCKER-USER`, ale wymaga ustalenia dokładnej listy zaufanych źródeł — w tym możliwe, że dashboard/skrypty MCP na tym samym hoście łączą się z 8887 przez adres LAN, nie localhost — zanim się to zrobi bezpiecznie)

Priorytet 2 (w tym tygodniu):
4. **[F-02]** Deny-by-default w bramce zapisu MCP stdio — **WDROŻONE 2026-07-30**, zweryfikowane (patrz szczegóły przy F-02), niezacommitowane
5. **[F-07]** Commit lub świadome odłożenie pracy InsERT GT — **WDROŻONE 2026-07-30** (commit + push do `main`, `beeeb83`)
6. **[F-06]** Naprawa `test:mcp-profiles` (aktualizacja asercji 6→7, profil już zacommitowany) — `NIE WDROŻONO / wymaga zgody użytkownika`
7. **[F-10]** Ręczne wznowienie automatyzacji/canary po weryfikacji stabilności LLM — `NIE WDROŻONO / wymaga zgody użytkownika`
8. **[F-11]** Regeneracja tabeli KB w `AGENTS.md` z `KB_Registry.json` — `NIE WDROŻONO / wymaga zgody użytkownika`

Priorytet 3 (kiedy będzie okazja):
9. **[F-03]** Naprawa `.gitignore` dla SKILL.md + `git add -f` brakujących plików
10. **[F-04, F-13]** Doprecyzowanie `tools:` we frontmatterze agentów (`daily-ops`, `frontend`)
11. **[F-12]** Zawężenie `docker compose *` i `Read(//root|home/**)` w `.claude/settings.local.json`
12. **[F-14]** Ujednolicenie ścieżki raportu weryfikacji backupu
13. **[F-15]** Dodanie nagłówków bezpieczeństwa do mostu MCP
14. **[F-16]** Naprawa logiki `scan_openspg_images.mjs`
15. **[F-17]** Naprawa dwóch skryptów testowych pod Node 18
16. **[F-18]** Korekta adnotacji wieku obrazów + pinowanie `tika` przez digest
17. **[F-19]** Root cause #1 (`makeId` truncation) — **WDROŻONE 2026-07-30**, naprawia 4/8 dotkniętych KB w pełni + częściowo resztę. Root cause #2 (dedup snapshotów per-URL) i migracja danych w grafie — `NIE WDROŻONO / wymaga osobnej decyzji`
18. **[F-20]** `ComarchCommunityNews` — **WDROŻONE 2026-07-30** (projectId=11 rozwiązane i zapisane). `ComarchUniversalKnowledge` — pozostaje `NIE WDROŻONO / wymaga decyzji użytkownika` (build vs disable — celowo pozostawione operatorowi, oznaczone `buildStatus: never_built`)
19. **[F-21]** Polityka retencji logów audytu MCP — **WDROŻONE 2026-07-30**
