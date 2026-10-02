#!/usr/bin/env python3
"""Decode db/.seed.sql.zlib.b64 -> db/seed.sql"""
import base64, zlib, pathlib
src = pathlib.Path(__file__).resolve().parent / ".seed.sql.zlib.b64"
dst = pathlib.Path(__file__).resolve().parent / "seed.sql"
dst.write_bytes(zlib.decompress(base64.b64decode(src.read_text().strip())))
print(f"wrote {dst} ({dst.stat().st_size} bytes)")
