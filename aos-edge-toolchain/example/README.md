# AosEdge Hello Service Example

A simple C++ service demonstrating the complete aos-edge-toolchain workflow.

**Status:** ✅ **v1.0.0 deployed and running on unit 36082!**

---

## Quick Start

```bash
# Build ARM64 binary
docker run --rm -v $(pwd):/workspace aos-edge-toolchain build src/main.cpp hello-aos

# ⭐ CRITICAL: Copy binary to src/ for packaging
cp hello-aos src/

# Sign service package
docker run --rm -v $(pwd):/workspace aos-edge-toolchain sign

# Upload to AosCloud
docker run --rm -v $(pwd):/workspace aos-edge-toolchain upload
```

---

## Project Structure

```
example/
├── src/
│   ├── main.cpp          # C++ source code
│   └── hello-aos         # Compiled ARM64 binary (after build)
├── meta/
│   ├── config.yaml       # Service configuration
│   └── default_state.dat
```

---

## Service Details

| Property | Value |
|----------|-------|
| **Service UUID** | `84d98700-694c-45f6-a00b-3423a7523b95` |
| **Version** | 1.0.0 |
| **Binary Name** | `hello-aos` |
| **Architecture** | aarch64 (ARM64) |

---

## Deployment

This service is configured for the **vm-azure** subject on unit `8c85e914e91c4947be78f86889ca9444`.

To redeploy after changes:

```bash
# Update version in meta/config.yaml
sed -i 's/version: "1.0.0"/version: "1.0.1"/' meta/config.yaml

# Rebuild and copy to src/
docker run --rm -v $(pwd):/workspace aos-edge-toolchain build src/main.cpp hello-aos
cp hello-aos src/

# Sign and upload
docker run --rm -v $(pwd):/workspace aos-edge-toolchain sign
docker run --rm -v $(pwd):/workspace aos-edge-toolchain upload
```

---

## View Logs

```bash
# View live output on the unit
ssh user@<unit-ip> \
  "sudo journalctl -u aos-servicemanager -f | grep Hello"
```

---

## Expected Output

```
========================================
AosEdge Hello Service
Version: 1.0.0
Deployed via aos-edge-toolchain!
========================================
[1] Hello from AosEdge! v1.0.0
[2] Hello from AosEdge! v1.0.0
...
```

---

## Important Notes

⭐ **Binary must be in `src/` directory before signing!**

The aos-signer packages files from the `src/` directory. If you only build the binary in the root, it won't be included in the service package.

**Wrong:** Only `src/main.cpp` → Package = 2KB (source only)
**Right:** `src/main.cpp` + `src/hello-aos` → Package = 900KB (with binary)

### Why is this required?

The aos-signer tool recursively copies files from the `src/` directory into the service package. The AosCloud platform then deploys these files to `/` inside the container. So:

- `src/main.cpp` → `/main.cpp` (unused at runtime)
- `src/hello-aos` → `/hello-aos` (the executable specified in `cmd`)

Without the binary in `src/`, the `cmd: /hello-aos` will fail with "executable not found".

---

## Full Workflow Explanation

### 1. Build Cross-Compile Binary

```bash
docker run --rm -v $(pwd):/workspace aos-edge-toolchain build src/main.cpp hello-aos
```

This compiles the C++ code to an ARM64 static binary using the cross-compiler in the container.

### 2. Copy Binary to src/

```bash
cp hello-aos src/
```

**⭐ This is the critical step!** The binary must be in `src/` for aos-signer to package it.

### 3. Sign Service Package

```bash
docker run --rm -v $(pwd):/workspace aos-edge-toolchain sign
```

This creates `service.tar.gz` containing:
- `./config.yaml`
- `./default_state.dat`
- `./service/main.cpp` (from `src/main.cpp`)
- `./service/hello-aos` (from `src/hello-aos`) ← The binary!

### 4. Upload to AosCloud

```bash
docker run --rm -v $(pwd):/workspace aos-edge-toolchain upload
```

The signed package is uploaded to AosCloud and associated with the service UUID in `config.yaml`.

---

## Troubleshooting

### Package size is too small (< 100KB)

**Problem:** Binary not included in package.

**Solution:** Make sure you copied the binary to `src/` before signing:
```bash
cp hello-aos src/
docker run ... sign
```

### Service fails with "executable not found"

**Problem:** Binary name in `cmd:` doesn't match filename in `src/`.

**Solution:** Ensure `meta/config.yaml` has the correct `cmd:` value:
```yaml
configuration:
    cmd: /hello-aos  # Must match filename in src/
```

### Version already exists

**Problem:** Uploading same version twice.

**Solution:** Bump the version in `meta/config.yaml`:
```bash
sed -i 's/version: "1.0.0"/version: "1.0.1"/' meta/config.yaml
```

---

## Related

- [../README.md](../README.md) - Full aos-edge-toolchain documentation
- hello-world-aos - Python reference
- cpp-test-project - C++ test project
