# KB Quality Gate Report

Generated at: 2026-08-03T03:43:50.220Z

Overall: `WARN`

## ComarchOptimaSchema

- Verdict: `PASS`
- Export dir: `exports/optima_schema/v1`
- Staging generatedAt: `2026-07-21T16:27:57.821Z`
- Required files:
  - `table.csv`: exists `true`, rows `630`
  - `column.csv`: exists `true`, rows `12441`
  - `chunk.csv`: exists `true`, rows `13122`
- Jobs:
  - `419` `FINISH` `database_instance.csv`
  - `420` `FINISH` `table.csv`
  - `421` `FINISH` `column.csv`
  - `422` `FINISH` `primary_key.csv`
  - `423` `FINISH` `foreign_key.csv`
  - `424` `FINISH` `index.csv`
  - `425` `FINISH` `constraint.csv`
  - `426` `FINISH` `view.csv`
  - `427` `FINISH` `stored_procedure.csv`
  - `428` `FINISH` `function.csv`
  - `429` `FINISH` `trigger.csv`
  - `430` `FINISH` `parameter.csv`
  - `432` `FINISH` `schema_change.csv`
  - `434` `FINISH` `table_query_guide.csv`
  - `435` `FINISH` `join_path_guide.csv`
  - `436` `FINISH` `object_dependency.csv`
  - `437` `FINISH` `sql_object_guide.csv`
  - `438` `FINISH` `chunk.csv`

## ComarchOptimaAdditionalFunctions

- Verdict: `PASS`
- Export dir: `exports/optima_additional_functions/v1`
- Staging generatedAt: `2026-07-30T13:08:49.847Z`
- Required files:
  - `reference_document.csv`: exists `true`, rows `153`
  - `chunk.csv`: exists `true`, rows `233`
- Jobs:
  - `undefined` `FINISH` `additional_function_capability.csv`
  - `undefined` `FINISH` `additional_function_entry_point.csv`
  - `undefined` `FINISH` `additional_function_execution_mode.csv`
  - `undefined` `FINISH` `additional_function_configuration_option.csv`
  - `undefined` `FINISH` `additional_function_rule.csv`
  - `undefined` `FINISH` `additional_function_pattern.csv`
  - `undefined` `FINISH` `related_feature.csv`
  - `undefined` `FINISH` `com_interface.csv`
  - `undefined` `FINISH` `configuration_catalog_entry.csv`
  - `undefined` `FINISH` `procedure_dictionary_entry.csv`
  - `undefined` `FINISH` `message_catalog_entry.csv`
  - `undefined` `FINISH` `implementation_guide.csv`
  - `undefined` `FINISH` `module_recipe.csv`
  - `undefined` `FINISH` `schema_touchpoint.csv`
  - `undefined` `FINISH` `file_artifact.csv`
  - `undefined` `FINISH` `implementation_example.csv`
  - `undefined` `FINISH` `chunk.csv`
  - `391` `FINISH` `reference_document.csv`

## ComarchOptimaSprint

- Verdict: `WARN`
- Export dir: `exports/optima_sprint/v1`
- Staging generatedAt: `2026-07-30T13:08:44.176Z`
- Warnings:
  - Duplicate sourceUrl values in reference_document.csv: 1
- Required files:
  - `reference_document.csv`: exists `true`, rows `172`
  - `chunk.csv`: exists `true`, rows `312`
- Jobs:
  - `88` `FINISH` `print_technology.csv`
  - `89` `FINISH` `print_workflow.csv`
  - `90` `FINISH` `print_option.csv`
  - `91` `FINISH` `template_feature.csv`
  - `93` `FINISH` `diagnostic_case.csv`
  - `94` `FINISH` `version_change.csv`
  - `95` `FINISH` `print_catalog.csv`
  - `96` `FINISH` `learning_resource.csv`
  - `97` `FINISH` `glossary_term.csv`
  - `98` `FINISH` `schema_touchpoint.csv`
  - `99` `FINISH` `module_recipe.csv`
  - `87` `FINISH` `file_artifact.csv`
  - `92` `FINISH` `sql_pattern.csv`
  - `201` `FINISH` `file_artifact.csv`
  - `202` `FINISH` `sql_pattern.csv`
  - `387` `FINISH` `reference_document.csv`
  - `390` `FINISH` `chunk.csv`

## ComarchOptimaReference

- Verdict: `PASS`
- Export dir: `exports/optima_reference/v1`
- Staging generatedAt: `2026-08-03T03:35:16.062Z`
- Required files:
  - `reference_document.csv`: exists `true`, rows `3368`
  - `chunk.csv`: exists `true`, rows `456`
- Jobs:
  - `102` `FINISH` `help_category.csv`
  - `103` `FINISH` `module_area.csv`
  - `109` `FINISH` `learning_guide.csv`
  - `110` `FINISH` `knowledge_route.csv`
  - `112` `FINISH` `entry_guide.csv`
  - `227` `FINISH` `version_topic.csv`
  - `363` `FINISH` `chunk.csv`
  - `574` `FINISH` `reference_document.csv`

## ComarchOptimaBusinessSemantics

- Verdict: `PASS`
- Export dir: `exports/optima_business_semantics/v1`
- Staging generatedAt: `2026-07-30T13:12:18.455Z`
- Required files:
  - `business_domain.csv`: exists `true`, rows `8`
  - `business_description.csv`: exists `true`, rows `630`
  - `code_meaning.csv`: exists `true`, rows `12`
  - `business_rule.csv`: exists `true`, rows `21`
- Jobs:
  - `336` `FINISH` `business_domain.csv`
  - `337` `FINISH` `business_description.csv`
  - `338` `FINISH` `code_meaning.csv`
  - `339` `FINISH` `business_rule.csv`

## ComarchOptimaPartnerTechnical

- Verdict: `PASS`
- Export dir: `exports/optima_partner_technical/v1`
- Staging generatedAt: `2026-07-30T13:09:02.307Z`
- Required files:
  - `reference_document.csv`: exists `true`, rows `126`
  - `partner_asset.csv`: exists `true`, rows `548`
  - `chunk.csv`: exists `true`, rows `339`
- Jobs:
  - `122` `FINISH` `partner_category.csv`
  - `147` `FINISH` `partner_asset.csv`
  - `124` `FINISH` `asset_type.csv`
  - `125` `FINISH` `version_band.csv`
  - `126` `FINISH` `product_area.csv`
  - `165` `FINISH` `msg_entry.csv`
  - `138` `FINISH` `com_example.csv`
  - `139` `FINISH` `com_interface_use.csv`
  - `140` `FINISH` `com_schema_touchpoint.csv`
  - `127` `FINISH` `knowledge_route.csv`
  - `150` `FINISH` `com_module_recipe.csv`
  - `160` `FINISH` `cfg_entry.csv`
  - `162` `FINISH` `proc_entry.csv`
  - `385` `FINISH` `reference_document.csv`
  - `389` `FINISH` `chunk.csv`

## ComarchBetterflyReference

- Verdict: `PASS`
- Export dir: `exports/betterfly_reference/v1`
- Staging generatedAt: `2026-08-03T03:38:00.837Z`
- Required files:
  - `reference_document.csv`: exists `true`, rows `40`
  - `api_resource.csv`: exists `true`, rows `25`
  - `api_pattern.csv`: exists `true`, rows `80`
  - `chunk.csv`: exists `true`, rows `264`
- Jobs:
  - `167` `FINISH` `help_category.csv`
  - `168` `FINISH` `module_area.csv`
  - `186` `FINISH` `api_resource.csv`
  - `192` `FINISH` `api_pattern.csv`
  - `193` `FINISH` `learning_guide.csv`
  - `194` `FINISH` `entry_guide.csv`
  - `322` `FINISH` `knowledge_route.csv`
  - `522` `FINISH` `reference_document.csv`
  - `523` `FINISH` `chunk.csv`

## ComarchCommunityNews

- Verdict: `PASS`
- Export dir: `exports/community_news/v1`
- Staging generatedAt: `2026-08-03T03:17:10.470Z`
- Required files:
  - `reference_document.csv`: exists `true`, rows `167`
  - `news_topic.csv`: exists `true`, rows `37`
  - `chunk.csv`: exists `true`, rows `597`
- Jobs:
  - `209` `FINISH` `knowledge_route.csv`
  - `210` `FINISH` `entry_guide.csv`
  - `580` `FINISH` `reference_document.csv`
  - `581` `FINISH` `news_topic.csv`
  - `582` `FINISH` `community_attachment.csv`
  - `583` `FINISH` `chunk.csv`

## TaxbellLegalReference

- Verdict: `PASS`
- Export dir: `exports/taxbell_legal_reference/v1`
- Staging generatedAt: `2026-07-31T06:10:44.540Z`
- Required files:
  - `reference_document.csv`: exists `true`, rows `75`
  - `source_topic.csv`: exists `true`, rows `5`
  - `chunk.csv`: exists `true`, rows `392`
- Jobs:
  - `248` `FINISH` `source_topic.csv`
  - `249` `FINISH` `knowledge_route.csv`
  - `250` `FINISH` `entry_guide.csv`
  - `578` `FINISH` `reference_document.csv`
  - `579` `FINISH` `chunk.csv`

## TaxbellPayrollHRReference

- Verdict: `PASS`
- Export dir: `exports/taxbell_payroll_hr_reference/v1`
- Staging generatedAt: `2026-07-31T06:10:44.777Z`
- Required files:
  - `reference_document.csv`: exists `true`, rows `72`
  - `source_topic.csv`: exists `true`, rows `10`
  - `chunk.csv`: exists `true`, rows `579`
- Jobs:
  - `253` `FINISH` `source_topic.csv`
  - `254` `FINISH` `knowledge_route.csv`
  - `255` `FINISH` `entry_guide.csv`
  - `572` `FINISH` `reference_document.csv`
  - `573` `FINISH` `chunk.csv`

## TaxbellAccountingVATReference

- Verdict: `PASS`
- Export dir: `exports/taxbell_accounting_vat_reference/v1`
- Staging generatedAt: `2026-07-31T06:10:44.934Z`
- Required files:
  - `reference_document.csv`: exists `true`, rows `77`
  - `source_topic.csv`: exists `true`, rows `6`
  - `chunk.csv`: exists `true`, rows `418`
- Jobs:
  - `258` `FINISH` `source_topic.csv`
  - `259` `FINISH` `knowledge_route.csv`
  - `260` `FINISH` `entry_guide.csv`
  - `568` `FINISH` `reference_document.csv`
  - `569` `FINISH` `chunk.csv`

## ComarchUniversalKnowledge

- Verdict: `WARN`
- Export dir: `exports/universal_knowledge/v1`
- Staging generatedAt: `2026-06-24T07:39:30.734Z`
- Warnings:
  - Required CSV has zero rows: reference_document.csv (catch-all KB starts empty)
  - Required CSV has zero rows: chunk.csv (catch-all KB starts empty)
- Required files:
  - `reference_document.csv`: exists `true`, rows `0`
  - `chunk.csv`: exists `true`, rows `0`

## OWAOntology

- Verdict: `PASS`
- Export dir: `exports/owa_ontology/v1`
- Staging generatedAt: `2026-07-30T13:08:56.973Z`
- Required files:
  - `ontology_entity.csv`: exists `true`, rows `67`
  - `ontology_field.csv`: exists `true`, rows `109`
  - `ontology_relation.csv`: exists `true`, rows `147`
  - `workflow_pattern.csv`: exists `true`, rows `132`
  - `chunk.csv`: exists `true`, rows `190`
- Jobs:
  - `462` `FINISH` `ontology_entity.csv`
  - `463` `FINISH` `ontology_field.csv`
  - `464` `FINISH` `ontology_relation.csv`
  - `465` `FINISH` `workflow_pattern.csv`
  - `466` `FINISH` `chunk.csv`

