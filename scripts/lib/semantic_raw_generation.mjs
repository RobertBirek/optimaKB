import { validateRawType } from './semantic_raw_contract.mjs';
import { authorizeRawScope, pinRawDataDescriptor, captureRawArtifact, validateRawArtifactCapture } from './semantic_raw_artifact.mjs';
import { createRawHandle } from './semantic_raw_lookup.mjs';

export function createRawGenerationLoader(trusted,code) {
  // Deliberately lazy: construction, and every rejected load, never observes a
  // descriptor getter. The controller supplies one descriptor per worker.
  let pinned, fingerprints, handle, failure;
  return Object.freeze({load(authorized) {
    authorizeRawScope(authorized);
    if (failure) return {ok:false,code:failure};
    try {
      if (!pinned) pinned = pinRawDataDescriptor(trusted,code,authorized);
      const captured = captureRawArtifact(pinned.trusted,pinned.code,authorized,fingerprints);
      if (!handle) {
        validateRawArtifactCapture(captured);
        handle = createRawHandle({manifest:captured.manifest,index:captured.index,sourceBytes:captured.sourceBytes});
        fingerprints = captured.fingerprints;
      }
      return {ok:true,handle};
    } catch(e) {
      failure = validateRawType('LoadError',e.code) ? e.code : 'INDEX_CORRUPT';
      handle = undefined; fingerprints = undefined;
      return {ok:false,code:failure};
    }
  }});
}
export function loadRawGeneration(trusted,code,authorized) {
  authorizeRawScope(authorized);
  return createRawGenerationLoader(trusted,code).load(authorized);
}
