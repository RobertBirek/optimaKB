// Explicit offline controller, never a runtime/query import.
import { captureCurrentRawCompiler, readProductionRawInputs, stageRawCompilation, RAW_SOURCE_ROOT } from './lib/semantic_raw_compile_controller.mjs';
import { RAW_BASE_MANIFEST_SHA256, RAW_BUILD_ERRORS, sha256 } from './lib/semantic_raw_contract.mjs';
import { register } from 'node:module';

try {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--source-root' || args[1] !== RAW_SOURCE_ROOT || args[2] !== '--output' || !args[3].startsWith('/tmp/opencode/')) throw Error('INDEX_CONTRACT_INVALID');
  const capture = captureCurrentRawCompiler();
  // Execute the newly imported compiler from the measured immutable bytes.
  // Parent bootstrap/controller modules are trusted startup code, not repinned
  // merely by describing them. No domain application is imported here.
  const sources = {...capture.generation.sources};
  for (const [file,source] of Object.entries(capture.compiler_sources)) sources[new URL('../'+file,import.meta.url).href] = source;
  const loader = `
    import { isBuiltin } from 'node:module';
    let sources;
    export function initialize(data) { sources = data; }
    export async function resolve(specifier, context, next) {
      if (isBuiltin(specifier)) return next(specifier, context);
      const url = new URL(specifier, context.parentURL).href;
      if (Object.hasOwn(sources,url)) return {url,shortCircuit:true};
      throw Error('Compiler capture dependency unavailable');
    }
    export function load(url, context, next) {
      if (Object.hasOwn(sources,url)) return {source:sources[url],format:'module',shortCircuit:true};
      return next(url,context);
    }
  `;
  // This literal loader is itself part of the captured CLI file.
  register('data:text/javascript,'+encodeURIComponent(loader),import.meta.url,{data:sources});
  const { installRawCompilerCapture, compileRawIndex } = await import('./lib/semantic_raw_index.mjs');
  installRawCompilerCapture(capture);
  const inputs = readProductionRawInputs(args[1]);
  const result = compileRawIndex({compiler:capture.compiler,runtime_files:capture.code.runtime_files,runtime_code_sha256:capture.code.runtime_code_sha256,worker_generation_id:capture.generation.id,environment:capture.code.environment,base_manifest_sha256:RAW_BASE_MANIFEST_SHA256,inputs});
  if (!result.ok) throw Object.assign(new Error(result.code),{code:result.code});
  stageRawCompilation(args[3],result,inputs);
  process.stdout.write(JSON.stringify({ok:true,snapshot_id:result.snapshot_id,manifest_sha256:sha256(result.manifest_bytes)})+'\n');
} catch (e) {
  process.stderr.write(JSON.stringify({ok:false,code:RAW_BUILD_ERRORS.includes(e.code) ? e.code : 'INDEX_CONTRACT_INVALID'})+'\n');
  process.exitCode = 1;
}
