#!/usr/bin/env python3
import base64, zlib, pathlib, re
parts = [re.sub(r"\s+", "", pathlib.Path(f"db/.package-lock.part{i}.zlib.b64").read_text()) for i in range(16)]
pathlib.Path("package-lock.json").write_bytes(zlib.decompress(base64.b64decode("".join(parts))))
print("ok", pathlib.Path("package-lock.json").stat().st_size)
