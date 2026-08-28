from pathlib import Path


TARGET = Path(
    "/home/admin/miniconda3/lib/python3.10/site-packages/"
    "kag/common/llm/openai_client.py"
)
MAIN_SOLVER_TARGET = Path(
    "/home/admin/miniconda3/lib/python3.10/site-packages/kag/solver/main_solver.py"
)
SERVER_BRIDGE_TARGET = Path(
    "/home/admin/miniconda3/lib/python3.10/site-packages/kag/bridge/"
    "spg_server_bridge.py"
)
ORIGINAL = (
    '        self.extra_body = {"chat_template_kwargs": '
    '{"enable_thinking": self.think}}\n'
)
REPLACEMENT = (
    "        self.extra_body = (\n"
    '            {} if self.base_url.rstrip("/") == "https://api.openai.com/v1"\n'
    '            else {"chat_template_kwargs": {"enable_thinking": self.think}}\n'
    "        )\n"
)
MAX_TOKENS_ORIGINAL = (
    "            max_tokens=self.max_tokens if self.max_tokens > 0 else NOT_GIVEN,\n"
)
MAX_TOKENS_REPLACEMENT = (
    "            **(\n"
    '                {"max_completion_tokens": self.max_tokens if self.max_tokens > 0 else NOT_GIVEN}\n'
    '                if self.base_url.rstrip("/") == "https://api.openai.com/v1"\n'
    '                else {"max_tokens": self.max_tokens if self.max_tokens > 0 else NOT_GIVEN}\n'
    "            ),\n"
)
TEMPERATURE_ORIGINAL = "            temperature=self.temperature,\n"
TEMPERATURE_REPLACEMENT = (
    '            temperature=NOT_GIVEN if self.base_url.rstrip("/") == '
    '"https://api.openai.com/v1" else self.temperature,\n'
)
PIPELINE_LOG_ORIGINAL = '        logger.error(f"pipeline conf: \\n{pipeline_config}")\n'
PIPELINE_LOG_REPLACEMENT = (
    '        logger.error("pipeline execution failed; pipeline configuration omitted")\n'
)
BRIDGE_LOG_ORIGINAL = (
    '            print(f"run_solver {func_name} args: {params} {args}")\n'
)
BRIDGE_LOG_REPLACEMENT = (
    '            print(f"run_solver {func_name} project={project_id} '
    'session={session_id} task={task_id}")\n'
)
LEGACY_OFFICIAL_OPENAI_CHECK = (
    'self.base_url.rstrip("/").startswith("https://api.openai.com")'
)
OFFICIAL_OPENAI_CHECK = 'self.base_url.rstrip("/") == "https://api.openai.com/v1"'


def patch_source(source: str) -> tuple[str, bool]:
    changed = False
    if LEGACY_OFFICIAL_OPENAI_CHECK in source:
        source = source.replace(LEGACY_OFFICIAL_OPENAI_CHECK, OFFICIAL_OPENAI_CHECK)
        changed = True
    if ORIGINAL in source:
        source = source.replace(ORIGINAL, REPLACEMENT)
        changed = True
    if MAX_TOKENS_ORIGINAL in source:
        source = source.replace(MAX_TOKENS_ORIGINAL, MAX_TOKENS_REPLACEMENT)
        changed = True
    if TEMPERATURE_ORIGINAL in source:
        source = source.replace(TEMPERATURE_ORIGINAL, TEMPERATURE_REPLACEMENT)
        changed = True
    return source, changed


def patch_main_solver_source(source: str) -> tuple[str, bool]:
    if PIPELINE_LOG_ORIGINAL in source:
        return source.replace(PIPELINE_LOG_ORIGINAL, PIPELINE_LOG_REPLACEMENT), True
    if PIPELINE_LOG_REPLACEMENT in source:
        return source, False
    raise RuntimeError("Unexpected OpenSPG main solver source")


def patch_server_bridge_source(source: str) -> tuple[str, bool]:
    if BRIDGE_LOG_ORIGINAL in source:
        return source.replace(BRIDGE_LOG_ORIGINAL, BRIDGE_LOG_REPLACEMENT), True
    if BRIDGE_LOG_REPLACEMENT in source:
        return source, False
    raise RuntimeError("Unexpected OpenSPG server bridge source")


def main() -> None:
    source = TARGET.read_text()
    patched, changed = patch_source(source)
    solver_source = MAIN_SOLVER_TARGET.read_text()
    patched_solver, solver_changed = patch_main_solver_source(solver_source)
    bridge_source = SERVER_BRIDGE_TARGET.read_text()
    patched_bridge, bridge_changed = patch_server_bridge_source(bridge_source)
    if (
        REPLACEMENT not in patched
        or MAX_TOKENS_REPLACEMENT not in patched
        or TEMPERATURE_REPLACEMENT not in patched
    ):
        raise RuntimeError("Unexpected OpenSPG OpenAI client source")
    if changed:
        TARGET.write_text(patched)
    if solver_changed:
        MAIN_SOLVER_TARGET.write_text(patched_solver)
    if bridge_changed:
        SERVER_BRIDGE_TARGET.write_text(patched_bridge)


if __name__ == "__main__":
    main()
