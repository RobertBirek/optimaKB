# OpenSPG Remediation Log

Data wykonania: 2026-05-12

## Wykonane Zmiany

- Utworzono kopie przed zmianami w `backups/20260512T1135/`, w tym logiczny dump MySQL `mysql-openspg.sql`.
- Dodano `.gitignore`, aby ignorowac `.env`, `data/`, `backups/` i logi.
- Przeniesiono konfiguracje wrażliwa z `compose.yaml` do `.env`; ustawiono `.env` na `0600`.
- Przypieto obrazy OpenSPG do digestow SHA256 zamiast tagu `latest`.
- Dodano healthchecki dla `mysql`, `neo4j`, `minio` i `server`.
- Zmieniono `depends_on` dla `server` na warunki `service_healthy`.
- Ograniczono publikacje OpenSPG do interfejsu LAN uzywanego przez NPMplus: `10.10.254.42:8887`.
- Dodano `security_opt: no-new-privileges:true` dla usług.
- Ograniczono Neo4j APOC z `*` do `apoc.*`.
- Zmieniono MinIO z `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` na `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`.
- Przeniesiono konfiguracje `server` z argumentow procesu do zmiennych srodowiskowych; `docker compose top server` nie pokazuje juz sekretow w CMD.
- Wylaczono logowanie klas startowych wypisujacych sekrety przez poziom `WARN`.
- Utworzono uzytkownika MySQL `openspg_app` z uprawnieniami tylko do bazy `openspg`; OpenSPG dziala na nim zamiast na `root`.
- Zrotowano hasla: MySQL root, MySQL `openspg_app`, Neo4j oraz MinIO.

## Walidacja

- `docker compose config` przechodzi poprawnie.
- Wszystkie uslugi sa `healthy`: `mysql`, `neo4j`, `minio`, `server`.
- OpenSPG odpowiada `HTTP 200` na `http://127.0.0.1:8887/`.
- Host nasluchuje dla OpenSPG tylko na `10.10.254.42:8887`.
- Swieze logi `server` nie pokazaly dopasowan dla `password`, `secret`, `sun.java.command`, `EnvironmentPropertiesPrinter`, `StartupConfig` ani `DatabaseEnvironmentPostProcessor`.

## Pozostale Ryzyka

- Aplikacja nadal zwraca liberalne naglowki CORS. Ryzyko jest ograniczone przez bind do `127.0.0.1`, ale publiczne wystawienie przez reverse proxy powinno zawęzic originy na warstwie proxy lub w kodzie aplikacji.
- `server` i `minio` nadal dzialaja jako root wewnatrz kontenera. Zmiana wymaga testu kompatybilnosci obrazu i praw do katalogow.
- Sekrety sa w `.env`, nie w Docker Secrets ani zewnetrznym managerze sekretow. `.env`, backupy i stare logi traktuj jako material poufny.
- MinIO nadal raportuje, ze obraz jest starszy od aktualnego wydania. Aktualizacje obrazow wymagaja osobnego backupu i testu regresji.
- Nie wykonano pelnego skanu CVE obrazow, bo lokalnie nie ma `trivy`, `grype` ani `docker scout`.
