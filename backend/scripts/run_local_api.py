from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from bethany_mock.api import serve


if __name__ == "__main__":
    os.environ.setdefault("BETHANY_API_HOST", "0.0.0.0")
    serve()
