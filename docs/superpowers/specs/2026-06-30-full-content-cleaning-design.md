# Full Content Cleaning Design

**Goal:** Systematyczne wykrycie i usunięcie śmieci (boilerplate, szum, powtarzalne
frazy) z discovery candidates, pending drafts, promoted drafts, i finalna
przebudowa dotkniętych KB.

**Architecture:** Dwa nowe skrypty + rozszerzenie istniejącego content_cleaner.mjs.
Wszystkie wzorce czyszczenia przechodzą przez ręczne zatwierdzenie operatora.

**Zakres:** Tylko KB dokumentowe (9 sztuk). Bez Schema, BusinessSemantics,
UniversalKnowledge.

---

## Etapy

### 1. Skanner śmieci
`scripts/scan_content_garbage.mjs` skanuje:
- discovery candidates
- pending inbox drafts (`downloads/knowledge_inbox/`)
- promoted drafts (`docs/reference/knowledge_inbox/promoted/`)
- local source documents używane przez eksportery

Wynik: raport JSON/MD z:
- istniejącymi wzorcami z content_cleaner.mjs i ich coverage
- nowymi proponowanymi wzorcami znalezionymi statystycznie
- frequency per pattern per data source

### 2. Operator review
Operator zatwierdza wzorce przez edycję pliku konfiguracyjnego.

### 3. Cleaner
`scripts/clean_content_garbage.mjs` czyści:
- discovery candidates
- pending inbox drafts (JSON + MD)
- promoted drafts (JSON + MD)
- local source documents

### 4. Rebuild
Dla KB dotkniętych zmianami: `export -> build`.
Bez Schema, BusinessSemantics, UniversalKnowledge.

### 5. Walidacja
Porównanie liczby rekordów/chunków przed/po, sample content check.
