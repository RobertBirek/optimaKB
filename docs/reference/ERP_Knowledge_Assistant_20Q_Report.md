# ERP Knowledge Assistant 20Q Test Report

Date: `2026-07-31`

## Summary

- PASS: `20`
- PARTIAL: `0`
- MISS: `0`

## By Category

- `schema`: total `20`, PASS `20`, PARTIAL `0`, MISS `0`

## Results

### Q002 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które klucze łączą dokument handlowy z kontrahentem?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`

### Q003 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie obiekty SQL czytają tabelę TraNag?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

### Q004 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie obiekty zapisują do TraElem?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`

### Q005 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć join path od dokumentu do definicji dokumentu?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`

### Q006 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak wygląda ścieżka joinów od BnkZapisy do kontrahenta?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`

### Q007 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które tabele są nagłówkami handlowymi, a które pozycjami?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`

### Q008 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie procedury dotykają Kontrahenci?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`

### Q009 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie funkcje dotykają Towary?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`

### Q010 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które widoki albo funkcje używają TraElem?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

### Q011 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak powiązać VAT nagłówek z VAT pozycjami?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`

### Q012 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie są kluczowe FK dla Kontrahenci w dokumentach handlowych?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`

### Q013 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które obiekty SQL czytają PracEtaty i Pracownicy?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`

### Q014 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie indeksy i FK są na Towary?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

### Q015 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które tabele są słownikowe w obszarze konfiguracji?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

### Q016 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć relacje między CfgKlucze i CfgWartosci?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

### Q017 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie procedury obsługują wydruki lub Wydruki?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`

### Q018 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie tabele łączą się z operatorami i bazami w konfiguracji?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

### Q019 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć obiekty SQL związane z Wydruki?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

### Q020 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które funkcje lub procedury używają BnkZapisy?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`

### Q021 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć zależności obiektu SQL do tabel handlowych?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

