import unittest

from scripts import patch_openspg_openai_client as patcher


patch_source = patcher.patch_source


class OpenAIClientPatchTest(unittest.TestCase):
    def test_disables_chat_template_kwargs_only_for_official_openai(self):
        source = (
            '        self.extra_body = {"chat_template_kwargs": '
            '{"enable_thinking": self.think}}\n'
        )

        patched, changed = patch_source(source)

        self.assertTrue(changed)
        self.assertIn('self.base_url.rstrip("/") == "https://api.openai.com/v1"', patched)
        self.assertIn('else {"chat_template_kwargs": {"enable_thinking": self.think}}', patched)

    def test_uses_max_completion_tokens_for_official_openai(self):
        source = (
            "            max_tokens=self.max_tokens if self.max_tokens > 0 else NOT_GIVEN,\n"
        )

        patched, changed = patch_source(source)

        self.assertTrue(changed)
        self.assertIn('"max_completion_tokens"', patched)
        self.assertIn('else {"max_tokens": self.max_tokens', patched)

    def test_omits_temperature_for_official_openai(self):
        source = "            temperature=self.temperature,\n"

        patched, changed = patch_source(source)

        self.assertTrue(changed)
        self.assertIn('temperature=NOT_GIVEN if self.base_url.rstrip("/") == "https://api.openai.com/v1"', patched)

    def test_matches_only_the_exact_official_openai_endpoint(self):
        source = (
            '        self.extra_body = {"chat_template_kwargs": '
            '{"enable_thinking": self.think}}\n'
        )

        patched, changed = patch_source(source)

        self.assertTrue(changed)
        self.assertIn(
            'self.base_url.rstrip("/") == "https://api.openai.com/v1"',
            patched,
        )
        self.assertNotIn('.startswith("https://api.openai.com")', patched)

    def test_omits_pipeline_configuration_from_solver_logs(self):
        source = '        logger.error(f"pipeline conf: \\n{pipeline_config}")\n'
        patch_main_solver_source = getattr(
            patcher,
            "patch_main_solver_source",
            None,
        )

        if patch_main_solver_source is None:
            self.fail("patch_main_solver_source is not implemented")
        patched, changed = patch_main_solver_source(source)

        self.assertTrue(changed)
        self.assertNotIn("pipeline_config", patched)
        self.assertIn("pipeline configuration omitted", patched)

    def test_rejects_unexpected_main_solver_source(self):
        with self.assertRaisesRegex(
            RuntimeError,
            "Unexpected OpenSPG main solver source",
        ):
            patcher.patch_main_solver_source("logger.info('different version')\n")

    def test_main_solver_patch_is_idempotent(self):
        source = (
            '        logger.error("pipeline execution failed; '
            'pipeline configuration omitted")\n'
        )

        patched, changed = patcher.patch_main_solver_source(source)

        self.assertFalse(changed)
        self.assertEqual(patched, source)

    def test_migrates_the_previous_openai_patch(self):
        source = (
            '            {} if self.base_url.rstrip("/").startswith("https://api.openai.com")\n'
            '                if self.base_url.rstrip("/").startswith("https://api.openai.com")\n'
            '            temperature=NOT_GIVEN if self.base_url.rstrip("/").startswith('
            '"https://api.openai.com") else self.temperature,\n'
        )

        patched, changed = patch_source(source)

        self.assertTrue(changed)
        self.assertNotIn('.startswith("https://api.openai.com")', patched)
        self.assertEqual(patched.count('== "https://api.openai.com/v1"'), 3)

    def test_omits_solver_arguments_from_bridge_output(self):
        source = '            print(f"run_solver {func_name} args: {params} {args}")\n'
        patch_server_bridge_source = getattr(
            patcher,
            "patch_server_bridge_source",
            None,
        )

        if patch_server_bridge_source is None:
            self.fail("patch_server_bridge_source is not implemented")
        patched, changed = patch_server_bridge_source(source)

        self.assertTrue(changed)
        self.assertNotIn("{params}", patched)
        self.assertNotIn("{args}", patched)
        self.assertIn("project={project_id}", patched)

    def test_server_bridge_patch_is_idempotent(self):
        source = (
            '            print(f"run_solver {func_name} project={project_id} '
            'session={session_id} task={task_id}")\n'
        )

        patched, changed = patcher.patch_server_bridge_source(source)

        self.assertFalse(changed)
        self.assertEqual(patched, source)

    def test_rejects_unexpected_server_bridge_source(self):
        with self.assertRaisesRegex(
            RuntimeError,
            "Unexpected OpenSPG server bridge source",
        ):
            patcher.patch_server_bridge_source("print('different version')\n")


if __name__ == "__main__":
    unittest.main()
