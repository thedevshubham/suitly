# Virtual try-on feasibility

## Objective

Evaluate whether Suitly can add a private, commercially usable, local
one-product virtual try-on experiment on the current development machine.

## Development hardware

- Apple MacBook Air
- Apple M3
- 8 CPU cores
- 8 GPU cores
- 8 GB unified memory
- ARM64 macOS

Hardware identifiers and serial information are intentionally not recorded.

## Requirements

An acceptable experiment must:

- accept the existing temporary shopper image and one trusted garment image;
- produce a plausible preview without claiming guaranteed fit;
- preserve shopper identity and body geometry as far as practical;
- run locally so the photo is not disclosed to a third party;
- have terms compatible with a future commercial product;
- delete generated and source images automatically; and
- complete quickly enough to support an on-demand `Try it on` interaction.

## Options reviewed

### CatVTON

CatVTON reports approximately 8 GB of CUDA VRAM for 1024×768 inference in
bf16. Its official commands are CUDA-oriented. Its code, weights, and demo use
the CC BY-NC-SA 4.0 licence and are restricted to non-commercial use.

Result: unsuitable as Suitly's commercial foundation.

### IDM-VTON

IDM-VTON is another capable research implementation, but its code and
checkpoints also use CC BY-NC-SA 4.0.

Result: unsuitable as Suitly's commercial foundation.

### FASHN VTON v1.5

FASHN VTON v1.5 is a maskless, approximately one-billion-parameter model
published under Apache-2.0. The official package downloads about 2 GB of model
and pose weights, plus a human-parser model.

This is the best licensing fit found for a future Suitly experiment. However,
the official implementation auto-selects CUDA when available and otherwise
uses CPU. It does not auto-select Apple's MPS/Metal backend. CUDA inference can
use bf16; CPU inference converts the model to float32. On an 8 GB unified-memory
Mac, model weights, preprocessing models, activations, the operating system,
Ollama, and the Suitly application would compete for the same memory.

Result: credible model and licence, but not a credible local runtime on the
current development machine.

## Decision

Do not download or integrate virtual try-on weights on the current Mac. The
likely memory pressure and CPU latency would not produce a meaningful customer
experience, and an unverified MPS patch would introduce a separate ML-porting
project.

Do not add a `Try it on` button until a working provider exists. A decorative
button would create a false product promise.

The next valid experiment requires one of:

1. access to a CUDA-capable machine where FASHN VTON can be benchmarked;
2. a verified Apple-MPS implementation tested on hardware with more unified
   memory; or
3. explicit approval to evaluate a commercial hosted API, accepting external
   image processing, cost, retention terms, and network dependency.

## Proposed future spike

When suitable compute is available:

1. use the synthetic shopper fixture and one upper-body product;
2. generate one result at low and standard step counts;
3. record cold start, warm latency, peak memory, and output dimensions;
4. inspect garment fidelity, face/identity preservation, hands, pose, and body
   distortion;
5. confirm source and generated image deletion;
6. test licence and privacy requirements; and
7. proceed to UI integration only if the result is both credible and
   operationally affordable.

## Sources

- [FASHN VTON v1.5 official repository](https://github.com/fashn-AI/fashn-vton-1.5)
- [CatVTON official repository](https://github.com/Zheng-Chong/CatVTON)
- [IDM-VTON official repository](https://github.com/yisol/IDM-VTON)
