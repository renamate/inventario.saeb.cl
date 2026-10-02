#!/usr/bin/env python3
import base64, zlib, pathlib
parts = [pathlib.Path(f"db/.package-lock.part{i}.zlib.b64").read_text().strip() for i in range(4)]
pathlib.Path("package-lock.json").write_bytes(zlib.decompress(base64.b64decode("".join(parts))))
print("ok", pathlib.Path("package-lock.json").stat().st_size)
