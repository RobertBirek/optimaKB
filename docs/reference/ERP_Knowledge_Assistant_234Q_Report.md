# ERP Knowledge Assistant 234Q Test Report

Date: `2026-06-12`

## Summary

- PASS: `229`
- PARTIAL: `0`
- MISS: `0`

## By Category

- `schema`: total `49`, PASS `49`, PARTIAL `0`, MISS `0`
- `additional_functions`: total `39`, PASS `39`, PARTIAL `0`, MISS `0`
- `sprint`: total `29`, PASS `29`, PARTIAL `0`, MISS `0`
- `reference`: total `19`, PASS `19`, PARTIAL `0`, MISS `0`
- `partner`: total `29`, PASS `29`, PARTIAL `0`, MISS `0`
- `betterfly`: total `30`, PASS `30`, PARTIAL `0`, MISS `0`
- `taxbell_accounting_vat`: total `11`, PASS `11`, PARTIAL `0`, MISS `0`
- `taxbell_legal`: total `10`, PASS `10`, PARTIAL `0`, MISS `0`
- `taxbell_payroll_hr`: total `9`, PASS `9`, PARTIAL `0`, MISS `0`
- `community_news`: total `2`, PASS `2`, PARTIAL `0`, MISS `0`
- `business_semantics`: total `2`, PASS `2`, PARTIAL `0`, MISS `0`

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

### Q106 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak wygląda relacja między operatorami, bazami i modułami operatora?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

### Q107 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć procedury i funkcje używające CfgWartosci?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`

### Q108 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które tabele konfiguracji są lookup tables?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`

### Q109 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak wygląda ścieżka od dokumentu handlowego do pozycji VAT?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

### Q110 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć procedury związane z GetReportHeader?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

### Q111 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które funkcje używają BnkZapisy albo raportów kasowych?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`

### Q112 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć indeksy i klucze na Kontrahenci?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`

### Q113 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które obiekty SQL dotykają pracowników i etatów?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`

### Q114 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie tabele w konfiguracji odpowiadają za klucze i wartości konfiguracji?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

### Q115 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć joiny od TraElem do dokumentu i produktu?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`

### Q116 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które procedury dotykają faktur VAT albo korekt?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

### Q117 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie obiekty SQL dotykają WdrParametry albo WdrDefinicja?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`

### Q118 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć zależności dla CfgKlucze w obiektach SQL?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

### Q119 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jakie tabele i klucze są potrzebne do połączenia dokumentu z towarem i kontrahentem?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

### Q120 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które triggery albo funkcje odnoszą się do Wydruki?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

### Q121 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak wygląda relacja między raportem bankowym a kontrahentem?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

### Q122 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć obiekty SQL związane z Dekrety albo Konta?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/join_path_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`

### Q123 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Które tabele i zależności są ważne dla wydruków VAT?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/table_query_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`

### Q124 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć wszystkie procedury raportowe z GetReportContent?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/trigger.csv`

### Q125 PASS

- Category: `schema`
- Expected primary KB: `ComarchOptimaSchema`
- Actual primary KB: `ComarchOptimaSchema`
- Support KBs: `ComarchOptimaSprint`
- Question: Jak znaleźć object dependency do tabel handlowych i konfiguracji jednocześnie?
- Evidence:
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/object_dependency.csv`
  - `ComarchOptimaSchema` -> `exports/optima_schema/v1/sql_object_guide.csv`
  - `ComarchOptimaSchema` -> `docs/reference/ComarchOptimaSchema.schema`

### Q126 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady FD dotyczą eksportu PEF?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q127 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady dotyczą importu dokumentów sprzedażowych z XML?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q128 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady dotyczą eksportu dokumentów zakupowych do XML?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q129 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie COM examples dotyczą okna postępu albo IE?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q130 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady COM mamy dla wydruków i zmiennych dynamicznych?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q131 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady funkcji dodatkowych dotyczą raportów bankowych?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q132 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Które przykłady FD są bardziej SQL niż COM?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q133 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jak znaleźć przykład COM dla operatora albo logowania?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q134 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie recipes mamy dla handlu i magazynu w FD?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_guide.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q135 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie recipes mamy dla księgowości i dekretów w FD?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_guide.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q136 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie funkcje dodatkowe dotyczą skanowania albo OCR dokumentów?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q137 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie funkcje dotyczą anulowanych dokumentów magazynowych?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q138 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie touchpointy do schemy mają przykłady dla TraNag i TraElem?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_guide.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q139 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady FD dotyczą paragonów?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`

### Q140 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady FD dotyczą ewidencji dodatkowej i VAT?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q141 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie słowniki partnerowe mogą wspierać funkcje dodatkowe?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_guide.csv`

### Q142 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady XML importu i eksportu są już widoczne w FD?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q143 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady dotyczą definicji funkcji dodatkowej jako formularza?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q144 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Czy dla rozszerzenia listy handlowej lepsza będzie FD czy kolumna użytkownika?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`

### Q145 PASS

- Category: `additional_functions`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie przykłady COM mamy dla wydruków, raportów i eksportów?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/schema_touchpoint.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`

### Q146 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie technologie wydruków widać po rodzinach 1/4/0, 1/3/0, 1/2/3?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`

### Q147 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jak znaleźć wydruki typu GenRap?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`

### Q148 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jak znaleźć wydruki typu sPrint?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`

### Q149 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie SQL patterny są dobre dla wydruku z agregacją pozycji?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`

### Q150 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie recipes mamy dla wydruków VAT?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `docs/reference/Optima_Wydruki_FD_TypeFamily_Map_2026-06-01.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`

### Q151 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie recipes mamy dla wydruków handlowych z TraNag i TraElem?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`

### Q152 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie są różnice między wydrukiem tekstowym a Word/XML według rodzin WDR?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/Optima_Wydruki_FD_TypeFamily_Map_2026-06-01.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`

### Q153 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie wydruki wyglądają na deklaracyjne albo formularzowe?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`

### Q154 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jak znaleźć wydruki dotyczące Rejestr VAT marża?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/Optima_Wydruki_FD_TypeFamily_Map_2026-06-01.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`

### Q155 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jak znaleźć wydruki dotyczące klasyfikacji zakupów i sprzedaży?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/Optima_Wydruki_FD_TypeFamily_Map_2026-06-01.md`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`

### Q156 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie patterny mamy dla własnego zapytania SQL w wydruku?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`

### Q157 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie diagnozy są typowe dla problemów z parametrami dynamicznymi?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`

### Q158 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie schema touchpointy są najważniejsze dla wydruków handlowych?
- Evidence:
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/module_recipe.csv`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`

### Q159 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie SQL patterny dotyczą nagłówka i pozycji dokumentu?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`
  - `ComarchOptimaSprint` -> `docs/reference/Optima_Wydruki_FD_TypeFamily_Map_2026-06-01.md`

### Q160 PASS

- Category: `sprint`
- Expected primary KB: `ComarchOptimaSprint`
- Actual primary KB: `ComarchOptimaSprint`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`
- Question: Jakie artefakty Sprint najlepiej czytać na start przy nowym wydruku?
- Evidence:
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/diagnostic_case.csv`
  - `ComarchOptimaSprint` -> `docs/reference/ComarchOptimaSprint.seed.md`
  - `ComarchOptimaSprint` -> `exports/optima_sprint/v1/sql_pattern.csv`

### Q161 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Gdzie szukać oficjalnej dokumentacji modułu Handel?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`

### Q162 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Jak znaleźć oficjalne info o funkcjach dodatkowych w dokumentacji?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`

### Q163 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Jak znaleźć oficjalne informacje o wydrukach Sprint?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`

### Q164 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Gdzie w dokumentacji są informacje o konfiguracji i administracji?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`

### Q165 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Jak znaleźć oficjalne informacje o szkoleniach e-learningowych?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`

### Q166 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Gdzie szukać oficjalnych wpisów o nowych wersjach i aktualizacjach?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`

### Q167 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Jak znaleźć oficjalny artykuł o strojeniu MSSQL dla Optimy?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `docs/reference/ComarchOptimaReference.seed.md`

### Q168 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Gdzie w dokumentacji jest opis IWD?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`

### Q169 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Jak znaleźć oficjalne informacje o kolumnach użytkownika na listach?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`

### Q170 PASS

- Category: `reference`
- Expected primary KB: `ComarchOptimaReference`
- Actual primary KB: `ComarchOptimaReference`
- Support KBs: `ComarchOptimaSchema`, `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSprint`
- Question: Która KB jest pierwszym wejściem do oficjalnych pytań o moduły i instrukcje?
- Evidence:
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/reference_document.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/entry_guide.csv`
  - `ComarchOptimaReference` -> `exports/optima_reference/v1/version_topic.csv`

### Q171 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe procedures.csv dotyczą wydruków?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`

### Q172 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe messages.csv dotyczą konfiguracji wydruków?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`

### Q173 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaAdditionalFunctions`
- Actual primary KB: `ComarchOptimaAdditionalFunctions`
- Support KBs: `ComarchOptimaPartnerTechnical`, `ComarchOptimaSchema`
- Question: Jakie partnerowe słowniki dotyczą formularza definicji funkcji dodatkowej?
- Evidence:
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_example.csv`
  - `ComarchOptimaAdditionalFunctions` -> `docs/reference/ComarchOptimaAdditionalFunctions.seed.md`
  - `ComarchOptimaAdditionalFunctions` -> `exports/optima_additional_functions/v1/implementation_guide.csv`

### Q174 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe materiały XML mamy dla dodatkowej kolumny?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`

### Q175 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe COM sample dotyczą wydruków i raportowania?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`

### Q176 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe COM sample dotyczą utility i general COM?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`

### Q177 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe COM sample dotyczą handlu, magazynu i faktur?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`

### Q178 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe assety dotyczą XML structures i helper files?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `docs/reference/ComarchOptimaPartnerTechnical.seed.md`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`

### Q179 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe materiały mamy dla makr księgowych?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `downloads/partner/optima_technical/source_registry.json`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`

### Q180 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe recipes COM pomagają w logowaniu i środowisku uruchomieniowym?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `docs/reference/ComarchOptimaPartnerTechnical.seed.md`

### Q181 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe procedures albo messages dotyczą funkcji dodatkowych użytkownika?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`

### Q182 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jak znaleźć partnerowy asset z KSeF API?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `docs/reference/ComarchOptimaPartnerTechnical.seed.md`

### Q183 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe materiały dotyczą przykładowego procesu dodatkowej akceptacji płatności?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `downloads/partner/optima_technical/source_registry.json`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`

### Q184 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Jakie partnerowe source URL warto sprawdzić dla technicznych assetów?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/msg_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/proc_entry.csv`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`

### Q185 PASS

- Category: `partner`
- Expected primary KB: `ComarchOptimaPartnerTechnical`
- Actual primary KB: `ComarchOptimaPartnerTechnical`
- Support KBs: `ComarchOptimaAdditionalFunctions`, `ComarchOptimaSchema`, `ComarchOptimaSprint`
- Question: Które partnerowe materiały są najlepszym wsparciem dla COM examples?
- Evidence:
  - `ComarchOptimaPartnerTechnical` -> `docs/reference/ComarchOptimaPartnerTechnical.seed.md`
  - `ComarchOptimaPartnerTechnical` -> `exports/optima_partner_technical/v1/com_module_recipe.csv`
  - `ComarchOptimaPartnerTechnical` -> `downloads/partner/optima_technical/source_registry.json`

### Q186 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jak pobrać access token z Betterfly API?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`

### Q187 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie wersje endpointów Betterfly występują dla customers i invoices?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`

### Q188 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie API resources Betterfly dotyczą payments?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`

### Q189 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie API patterns mamy dla paymentdetails?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`

### Q190 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie są write-side cautions dla Betterfly?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`

### Q191 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jak wygląda create/update flow dla dokumentów Betterfly?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`

### Q192 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jak wygląda confirm flow dla Betterfly API?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`

### Q193 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jak wygląda correction sequence dla Betterfly?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`

### Q194 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jak wygląda finalize flow dla advanceInvoices?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`

### Q195 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie ostrzeżenia mamy dla print endpointów Betterfly?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`

### Q196 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie archived API pages mamy dla invoices i payments v1.4?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`

### Q197 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie contract notes mamy dla products i customers?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`

### Q198 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie entry guides mamy dla Betterfly auth i write-side?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`

### Q199 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Jakie learning guides mamy dla Betterfly API usage?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_resource.csv`

### Q200 PASS

- Category: `betterfly`
- Expected primary KB: `ComarchBetterflyReference`
- Actual primary KB: `ComarchBetterflyReference`
- Question: Które artefakty Betterfly najlepiej czytać, żeby zrozumieć auth, versioning i write-side?
- Evidence:
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/api_pattern.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/reference_document.csv`
  - `ComarchBetterflyReference` -> `exports/betterfly_reference/v1/chunk.csv`

### Q201 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Actual primary KB: `TaxbellAccountingVATReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jakie są obowiązki księgowe związane z przesyłaniem JPK_V7M przy rozliczeniu VAT?
- Evidence:
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/chunk.csv`
  - `TaxbellAccountingVATReference` -> `downloads/taxbell/accounting_vat_reference/meta/source_registry.json`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/reference_document.csv`

### Q202 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Actual primary KB: `TaxbellAccountingVATReference`
- Support KBs: `TaxbellLegalReference`
- Question: Kiedy należy wystawić fakturę korygującą VAT w księgowości i jak wpływa na rozliczenie?
- Evidence:
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/chunk.csv`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/reference_document.csv`
  - `TaxbellAccountingVATReference` -> `downloads/taxbell/accounting_vat_reference/meta/source_registry.json`

### Q203 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Actual primary KB: `TaxbellAccountingVATReference`
- Support KBs: `TaxbellLegalReference`
- Question: Czy deklaracja VAT za miesiąc może być złożona przez KSeF, a jakie są terminy rozliczenia?
- Evidence:
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/reference_document.csv`
  - `TaxbellAccountingVATReference` -> `downloads/taxbell/accounting_vat_reference/meta/source_registry.json`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/chunk.csv`

### Q204 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Actual primary KB: `TaxbellAccountingVATReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jakie elementy musi zawierać faktura VAT zgodna z wymogami KSeF w rachunkowości?
- Evidence:
  - `TaxbellAccountingVATReference` -> `downloads/taxbell/accounting_vat_reference/meta/source_registry.json`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/chunk.csv`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/reference_document.csv`

### Q205 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Actual primary KB: `TaxbellAccountingVATReference`
- Support KBs: `TaxbellLegalReference`
- Question: Czy przy rozliczeniu VAT od importu towarów księgowość wymaga dodatkowej deklaracji?
- Evidence:
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/chunk.csv`
  - `TaxbellAccountingVATReference` -> `downloads/taxbell/accounting_vat_reference/meta/source_registry.json`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/reference_document.csv`

### Q206 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Actual primary KB: `TaxbellAccountingVATReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jak prawidłowo ująć fakturę zakupu w księgowości, aby była zgodna z przepisami JPK?
- Evidence:
  - `TaxbellAccountingVATReference` -> `downloads/taxbell/accounting_vat_reference/meta/source_registry.json`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/reference_document.csv`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/chunk.csv`

### Q207 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Actual primary KB: `TaxbellAccountingVATReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jakie są różnice między rozliczeniem VAT miesięcznym a kwartalnym w rachunkowości?
- Evidence:
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/chunk.csv`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/reference_document.csv`
  - `TaxbellAccountingVATReference` -> `downloads/taxbell/accounting_vat_reference/meta/source_registry.json`

### Q208 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Actual primary KB: `TaxbellAccountingVATReference`
- Support KBs: `TaxbellLegalReference`
- Question: Czy w księgowości trzeba przechowywać potwierdzenia nadania deklaracji VAT przez KSeF?
- Evidence:
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/reference_document.csv`
  - `TaxbellAccountingVATReference` -> `downloads/taxbell/accounting_vat_reference/meta/source_registry.json`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/chunk.csv`

### Q209 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Actual primary KB: `TaxbellAccountingVATReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jakie sankcje grożą za nieterminowe rozliczenie VAT i błędne prowadzenie księgowości?
- Evidence:
  - `TaxbellAccountingVATReference` -> `downloads/taxbell/accounting_vat_reference/meta/source_registry.json`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/reference_document.csv`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/chunk.csv`

### Q210 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Actual primary KB: `TaxbellLegalReference`
- Support KBs: `TaxbellAccountingVATReference`
- Question: Czy zgodnie z ustawą o CIT mogę odliczyć straty z lat ubiegłych?
- Evidence:
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/chunk.csv`
  - `TaxbellLegalReference` -> `downloads/taxbell/legal_reference/meta/source_registry.json`
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/reference_document.csv`

### Q211 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Actual primary KB: `TaxbellLegalReference`
- Support KBs: `TaxbellAccountingVATReference`
- Question: Jaka jest aktualna interpretacja podatkowa dotycząca kosztów uzyskania przychodów w PIT?
- Evidence:
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/chunk.csv`
  - `TaxbellLegalReference` -> `downloads/taxbell/legal_reference/meta/source_registry.json`
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/reference_document.csv`

### Q212 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Actual primary KB: `TaxbellLegalReference`
- Support KBs: `TaxbellAccountingVATReference`
- Question: Jakie przepisy prawa podatkowego regulują kwestię amortyzacji środków trwałych?
- Evidence:
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/chunk.csv`
  - `TaxbellLegalReference` -> `downloads/taxbell/legal_reference/meta/source_registry.json`
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/reference_document.csv`

### Q213 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Actual primary KB: `TaxbellLegalReference`
- Support KBs: `TaxbellAccountingVATReference`
- Question: Czy kodeks spółek handlowych ma wpływ na rozliczenia CIT?
- Evidence:
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/chunk.csv`
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/reference_document.csv`
  - `TaxbellLegalReference` -> `downloads/taxbell/legal_reference/meta/source_registry.json`

### Q214 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Actual primary KB: `TaxbellLegalReference`
- Support KBs: `TaxbellAccountingVATReference`
- Question: Jaka jest stawka podatku PIT dla dochodów z najmu?
- Evidence:
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/chunk.csv`
  - `TaxbellLegalReference` -> `downloads/taxbell/legal_reference/meta/source_registry.json`
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/reference_document.csv`

### Q215 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Actual primary KB: `TaxbellLegalReference`
- Support KBs: `TaxbellAccountingVATReference`
- Question: Gdzie znajdę interpretację podatkową dotyczącą ulgi badawczo-rozwojowej w CIT?
- Evidence:
  - `TaxbellLegalReference` -> `downloads/taxbell/legal_reference/meta/source_registry.json`
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/reference_document.csv`
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/chunk.csv`

### Q216 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Actual primary KB: `TaxbellLegalReference`
- Support KBs: `TaxbellAccountingVATReference`
- Question: Czy ustawa o podatku dochodowym od osób prawnych przewiduje zwolnienia dla fundacji?
- Evidence:
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/chunk.csv`
  - `TaxbellLegalReference` -> `downloads/taxbell/legal_reference/meta/source_registry.json`
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/reference_document.csv`

### Q217 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Actual primary KB: `TaxbellLegalReference`
- Support KBs: `TaxbellAccountingVATReference`
- Question: Jakie dokumenty są wymagane przez prawo podatkowe przy składaniu zeznania CIT-8?
- Evidence:
  - `TaxbellLegalReference` -> `downloads/taxbell/legal_reference/meta/source_registry.json`
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/chunk.csv`
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/reference_document.csv`

### Q218 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Actual primary KB: `TaxbellLegalReference`
- Support KBs: `TaxbellAccountingVATReference`
- Question: Czy istnieje interpretacja podatkowa wyjaśniająca zasady opodatkowania dywidend w PIT?
- Evidence:
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/chunk.csv`
  - `TaxbellLegalReference` -> `downloads/taxbell/legal_reference/meta/source_registry.json`
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/reference_document.csv`

### Q219 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Actual primary KB: `TaxbellPayrollHRReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jakie są obowiązki pracodawcy wobec PIP w zakresie wynagrodzeń i składek ZUS?
- Evidence:
  - `TaxbellPayrollHRReference` -> `downloads/taxbell/payroll_hr_reference/meta/source_registry.json`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/chunk.csv`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/reference_document.csv`

### Q220 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Actual primary KB: `TaxbellPayrollHRReference`
- Support KBs: `TaxbellLegalReference`
- Question: Kiedy pracownik ma prawo do urlopu wypoczynkowego i jak naliczać wynagrodzenie za ten urlop?
- Evidence:
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/chunk.csv`
  - `TaxbellPayrollHRReference` -> `downloads/taxbell/payroll_hr_reference/meta/source_registry.json`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/reference_document.csv`

### Q221 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Actual primary KB: `TaxbellPayrollHRReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jakie składki ZUS powinny być potrącane z wynagrodzenia pracownika w 2026 roku?
- Evidence:
  - `TaxbellPayrollHRReference` -> `downloads/taxbell/payroll_hr_reference/meta/source_registry.json`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/chunk.csv`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/reference_document.csv`

### Q222 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Actual primary KB: `TaxbellPayrollHRReference`
- Support KBs: `TaxbellLegalReference`
- Question: Czy PIP może kontrolować dokumentację kadrową i płacową firmy?
- Evidence:
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/chunk.csv`
  - `TaxbellPayrollHRReference` -> `downloads/taxbell/payroll_hr_reference/meta/source_registry.json`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/reference_document.csv`

### Q223 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Actual primary KB: `TaxbellPayrollHRReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jak prawidłowo obliczyć wynagrodzenie chorobowe i jakie składki ZUS od niego odprowadzić?
- Evidence:
  - `TaxbellPayrollHRReference` -> `downloads/taxbell/payroll_hr_reference/meta/source_registry.json`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/chunk.csv`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/reference_document.csv`

### Q224 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Actual primary KB: `TaxbellPayrollHRReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jakie są limity potrąceń z wynagrodzenia pracownika według przepisów kadrowych i ZUS?
- Evidence:
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/chunk.csv`
  - `TaxbellPayrollHRReference` -> `downloads/taxbell/payroll_hr_reference/meta/source_registry.json`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/reference_document.csv`

### Q225 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Actual primary KB: `TaxbellPayrollHRReference`
- Support KBs: `TaxbellLegalReference`
- Question: Czy pracodawca musi zgłaszać nowego pracownika do ZUS przed rozpoczęciem pracy?
- Evidence:
  - `TaxbellPayrollHRReference` -> `downloads/taxbell/payroll_hr_reference/meta/source_registry.json`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/chunk.csv`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/reference_document.csv`

### Q226 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Actual primary KB: `TaxbellPayrollHRReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jakie obowiązki HR ma firma wobec PIP w zakresie bhp i wynagrodzeń?
- Evidence:
  - `TaxbellPayrollHRReference` -> `downloads/taxbell/payroll_hr_reference/meta/source_registry.json`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/chunk.csv`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/reference_document.csv`

### Q227 PASS

- Category: `taxbell_payroll_hr`
- Expected primary KB: `TaxbellPayrollHRReference`
- Actual primary KB: `TaxbellPayrollHRReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jaka jest różnica między składką emerytalną a rentową w kontekście wynagrodzenia pracownika?
- Evidence:
  - `TaxbellPayrollHRReference` -> `downloads/taxbell/payroll_hr_reference/meta/source_registry.json`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/reference_document.csv`
  - `TaxbellPayrollHRReference` -> `exports/taxbell_payroll_hr_reference/v1/chunk.csv`

### Q228 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Actual primary KB: `TaxbellAccountingVATReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jakie obowiązki sprawozdawcze w zakresie JPK_VAT ciążą na przedsiębiorcy?
- Evidence:
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/chunk.csv`
  - `TaxbellAccountingVATReference` -> `downloads/taxbell/accounting_vat_reference/meta/source_registry.json`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/reference_document.csv`

### Q229 PASS

- Category: `taxbell_accounting_vat`
- Expected primary KB: `TaxbellAccountingVATReference`
- Actual primary KB: `TaxbellAccountingVATReference`
- Support KBs: `TaxbellLegalReference`
- Question: Jak JPK wpływa na obowiązki sprawozdawcze w zakresie podatku VAT?
- Evidence:
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/chunk.csv`
  - `TaxbellAccountingVATReference` -> `exports/taxbell_accounting_vat_reference/v1/reference_document.csv`
  - `TaxbellAccountingVATReference` -> `downloads/taxbell/accounting_vat_reference/meta/source_registry.json`

### Q230 PASS

- Category: `taxbell_legal`
- Expected primary KB: `TaxbellLegalReference`
- Actual primary KB: `TaxbellLegalReference`
- Support KBs: `TaxbellAccountingVATReference`
- Question: Jakie są powiązania między obowiązkami wynikającymi z MDR w ustawie o CIT a regulacjami dotyczącymi sprawozdawczości i jawności w kodeksie spółek handlowych?
- Evidence:
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/chunk.csv`
  - `TaxbellLegalReference` -> `downloads/taxbell/legal_reference/meta/source_registry.json`
  - `TaxbellLegalReference` -> `exports/taxbell_legal_reference/v1/reference_document.csv`

### Q231 PASS

- Category: `community_news`
- Expected primary KB: `ComarchCommunityNews`
- Actual primary KB: `ComarchCommunityNews`
- Support KBs: `ComarchOptimaReference`, `ComarchBetterflyReference`
- Question: Czy są aktualności społeczności Comarch o planowanej przerwie technicznej?
- Evidence:
  - `ComarchCommunityNews` -> `exports/community_news/v1/reference_document.csv`
  - `ComarchCommunityNews` -> `exports/community_news/v1/news_topic.csv`
  - `ComarchCommunityNews` -> `exports/community_news/v1/chunk.csv`

### Q232 PASS

- Category: `community_news`
- Expected primary KB: `ComarchCommunityNews`
- Actual primary KB: `ComarchCommunityNews`
- Support KBs: `ComarchOptimaReference`, `ComarchBetterflyReference`
- Question: Jakie publiczne aktualności Comarch mówią o nowej wersji?
- Evidence:
  - `ComarchCommunityNews` -> `exports/community_news/v1/reference_document.csv`
  - `ComarchCommunityNews` -> `exports/community_news/v1/chunk.csv`
  - `ComarchCommunityNews` -> `exports/community_news/v1/news_topic.csv`

### Q233 PASS

- Category: `business_semantics`
- Expected primary KB: `ComarchOptimaBusinessSemantics`
- Actual primary KB: `ComarchOptimaBusinessSemantics`
- Support KBs: `ComarchOptimaSchema`
- Question: Co oznacza typ dokumentu i dopuszczalne wartości kodu w Optimie?
- Evidence:
  - `ComarchOptimaBusinessSemantics` -> `exports/optima_business_semantics/v1/business_rule.csv`
  - `ComarchOptimaBusinessSemantics` -> `exports/optima_business_semantics/v1/business_description.csv`
  - `ComarchOptimaBusinessSemantics` -> `exports/optima_business_semantics/v1/code_meaning.csv`

### Q234 PASS

- Category: `business_semantics`
- Expected primary KB: `ComarchOptimaBusinessSemantics`
- Actual primary KB: `ComarchOptimaBusinessSemantics`
- Support KBs: `ComarchOptimaSchema`
- Question: Jakie jest znaczenie kodu typu dokumentu w domenie biznesowej Optimy?
- Evidence:
  - `ComarchOptimaBusinessSemantics` -> `exports/optima_business_semantics/v1/business_description.csv`
  - `ComarchOptimaBusinessSemantics` -> `exports/optima_business_semantics/v1/code_meaning.csv`
  - `ComarchOptimaBusinessSemantics` -> `exports/optima_business_semantics/v1/business_rule.csv`

