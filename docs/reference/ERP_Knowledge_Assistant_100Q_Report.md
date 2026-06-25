# ERP Knowledge Assistant 100Q Test Report

Date: `2026-06-12`

## Summary

- PASS: `100`
- PARTIAL: `0`
- MISS: `0`

## By Category

- `schema`: total `29`, PASS `29`, PARTIAL `0`, MISS `0`
- `additional_functions`: total `19`, PASS `19`, PARTIAL `0`, MISS `0`
- `sprint`: total `14`, PASS `14`, PARTIAL `0`, MISS `0`
- `reference`: total `9`, PASS `9`, PARTIAL `0`, MISS `0`
- `partner`: total `14`, PASS `14`, PARTIAL `0`, MISS `0`
- `betterfly`: total `15`, PASS `15`, PARTIAL `0`, MISS `0`

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

### Q022 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Który join route prowadzi od dokumentu do produktu?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

### Q023 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie triggery są na tabelach handlowych?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

### Q024 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć object dependency dla TraNag i Kontrahenci?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `docs/reference/ComarchOptimaSchema.schema`

### Q025 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie procedury raportowe mają GetReportContent albo GetReportHeader?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

### Q027 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie są tryby uruchamiania funkcji dodatkowych?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q028 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady COM dotyczą handlu i magazynu?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q029 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie interfejsy COM pojawiają się przy logowaniu?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_guide.csv`

### Q030 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Które przykłady FD dotykają TraNag albo TraElem?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_guide.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q031 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jak znaleźć przykład dodawania operatora przez COM?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q032 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie funkcje dodatkowe dotyczą eksportu XML dokumentów?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q033 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady dotyczą ewidencji dodatkowej?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q034 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie ostrzeżenia implementacyjne mamy dla FD?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_guide.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`

### Q035 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Które przykłady COM dotyczą księgowości i dekretów?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q036 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Czy mam użyć FD czy własnego SQL dla prostego rozszerzenia listy?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q037 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie słowniki i komunikaty są związane z funkcjami dodatkowymi?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q038 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady dotyczą importu faktur z XML?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q039 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady dotyczą eksportu dokumentów do XML?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q040 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jak znaleźć funkcję dodatkową do automatyzacji bufora?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q041 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Które obiekty schemy są anchorami dla przykładów funkcji dodatkowych?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q042 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie COM examples mamy dla wydruków i raportowania?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_guide.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`

### Q043 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady FD dotyczą skanowania dokumentów?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q044 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady FD dotyczą magazynu albo anulowanych dokumentów?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q045 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jak wybrać między FD, COM i kolumną użytkownika dla rozszerzenia listy?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_guide.csv`

### Q047 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie SQL patterny mamy dla Sprint?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`

### Q048 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jak użyć RO_GetReportHeader i RO_GetReportContent?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

### Q049 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie są typowe źródła danych dla wydruków sPrint?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`

### Q050 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie są najczęstsze problemy diagnostyczne wydruków?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`

### Q051 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie modułowe recipes mamy dla wydruków handlowych?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`
  - `ComarchOptimaSprint` -> `docs/reference/Optima_Wydruki_FD_TypeFamily_Map_2026-06-01.md`

### Q052 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie wydruki wyglądają na sPrint według rodzin WDR?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`

### Q053 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jak odróżnić sPrint od GenRap w naszych definicjach?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`

### Q054 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie print technology families mamy w Optimie?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `docs/reference/Optima_Wydruki_FD_TypeFamily_Map_2026-06-01.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`

### Q055 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jak zacząć własne zapytanie SQL do wydruku?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`

### Q056 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie parametry dynamiczne pojawiają się w wydrukach?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`

### Q057 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie wzorce mamy dla agregacji pozycji na wydruku?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`

### Q058 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jak znaleźć wydruki dotyczące rejestrów VAT?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`

### Q059 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jak znaleźć wydruki dotyczące dokumentów handlowych?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`

### Q060 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie artefakty Sprint mamy dziś jako najbardziej praktyczne?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`

### Q062 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Jak zacząć pracę z oficjalną dokumentacją Optimy?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`

### Q063 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Gdzie szukać oficjalnych instrukcji o aktualizacjach?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`

### Q064 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Gdzie w dokumentacji są szkolenia i onboarding?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `docs/reference/ComarchOptimaReference.seed.md`

### Q065 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Jak znaleźć oficjalne info o kolumnach użytkownika?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`

### Q066 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Gdzie w dokumentacji jest strojenie MSSQL dla Optimy?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `docs/reference/ComarchOptimaReference.seed.md`

### Q067 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Jak znaleźć oficjalne artykuły dla Internetowej Wymiany Dokumentów?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`

### Q068 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Gdzie szukać ogólnej dokumentacji modułów Optimy?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`

### Q069 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Która KB powinna być pierwszym wejściem przy niejasnym pytaniu o Optimę?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

### Q070 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Gdzie w dokumentacji znajdę informacje o aktualizacjach po wydaniu wersji?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`

### Q072 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe procedury dotyczą wydruków i parametrów dynamicznych?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`

### Q073 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe komunikaty mamy dla konfiguracji?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`

### Q074 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie COM sample partnerowe dotyczą logowania?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`

### Q075 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie COM sample partnerowe dotyczą handlu i magazynu?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`

### Q076 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie assety partnerowe są z obszaru XML structures?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `docs/reference/ComarchOptimaPartnerTechnical.seed.md`
  - `ComarchOptimaPartnerTechnical` -> `downloads/partner/optima_technical/source_registry.json`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`

### Q077 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie makra partnerowe mamy dla księgowości?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`

### Q078 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie pliki pomocnicze partnerowe są istotne dla wydruków?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `downloads/partner/optima_technical/source_registry.json`
  - `ComarchOptimaPartnerTechnical` -> `docs/reference/ComarchOptimaPartnerTechnical.seed.md`

### Q079 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie dictionaries z partnera dotyczą wydruków?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`

### Q080 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie procedures.csv z partnera dotyczą funkcji dodatkowych?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`

### Q081 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jak znaleźć partnerowy przykład dodatkowej kolumny XML?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `downloads/partner/optima_technical/source_registry.json`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`

### Q082 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jak znaleźć partnerowy przykład procesu dodatkowej akceptacji płatności?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `downloads/partner/optima_technical/source_registry.json`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`

### Q083 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe recipes COM mamy dla wydruków i raportowania?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `docs/reference/ComarchOptimaPartnerTechnical.seed.md`

### Q084 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe materiały są unikalne i nie dublują innych KB?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `docs/reference/ComarchOptimaPartnerTechnical.seed.md`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`

### Q085 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe materiały dotyczą API KSeF?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `docs/reference/ComarchOptimaPartnerTechnical.seed.md`

### Q086 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jak działa token Betterfly API?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`

### Q087 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Które endpointy Betterfly są wersjonowane?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`

### Q088 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jaka jest różnica między payments i paymentdetails?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`

### Q089 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jak wygląda Bearer auth w Betterfly?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`

### Q090 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie endpointy dotyczą invoices w Betterfly?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`

### Q091 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie endpointy dotyczą advanceInvoices?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`

### Q092 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie endpointy dotyczą profit margin invoices?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`

### Q093 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jak modelować create update confirm delete dla Betterfly?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`
  - `ComarchBetterflyReference` -> `docs/reference/ComarchBetterflyReference.usability_test.md`

### Q094 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jak wygląda flow finalize dla advance invoice?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`
  - `ComarchBetterflyReference` -> `docs/reference/ComarchBetterflyReference.usability_test.md`

### Q095 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie są ostrzeżenia przy print endpointach Betterfly?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`

### Q096 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie są family endpointów customers, products, invoices?
- Evidence:
  - `ComarchBetterflyReference` -> `docs/reference/ComarchBetterflyReference.usability_test.md`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`

### Q097 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie są metadata-only notatki kontraktowe dla Betterfly API?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`

### Q098 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie są write-side notes dla Betterfly?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`

### Q099 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jak wygląda auth error behavior albo envelope shape w Betterfly?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`

### Q100 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie artefakty Betterfly mam sprawdzić, jeśli chcę zrozumieć API bez danych biznesowych?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`

### Q101 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć relację dokumentu handlowego do płatnika?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

### Q102 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które obiekty SQL używają Wydruki w bazie konfiguracyjnej?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`

### Q103 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie procedury raportowe dotykają wydruków handlowych?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`

### Q104 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć triggery związane z TraNag?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`

### Q105 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które obiekty SQL czytają Towary i Kontrahenci jednocześnie?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

