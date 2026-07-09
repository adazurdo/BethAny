from __future__ import annotations

import signal
import subprocess
import sys
import threading
from pathlib import Path
from queue import Queue

ROOT_DIR = Path(__file__).resolve().parents[1]
processes: dict[str, subprocess.Popen[str]] = {}
events: Queue[tuple[str, int]] = Queue()


def _monitor_process(name: str, process: subprocess.Popen[str]) -> None:
    exit_code = process.wait()
    events.put((name, exit_code))


def _terminate_all() -> None:
    for process in processes.values():
        if process.poll() is None:
            process.terminate()
    for process in processes.values():
        if process.poll() is None:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()


def _handle_signal(signum: int, frame) -> None:  # noqa: ARG001
    _terminate_all()
    raise SystemExit(128 + signum)


def main() -> int:
    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    backend = subprocess.Popen(
        [sys.executable, str(ROOT_DIR / "backend" / "scripts" / "run_local_api.py")],
        cwd=str(ROOT_DIR),
    )
    frontend = subprocess.Popen(["npm", "--prefix", "frontend", "start"], cwd=str(ROOT_DIR))

    processes["backend"] = backend
    processes["frontend"] = frontend

    threading.Thread(target=_monitor_process, args=("backend", backend), daemon=True).start()
    threading.Thread(target=_monitor_process, args=("frontend", frontend), daemon=True).start()

    name, exit_code = events.get()
    other_name = "frontend" if name == "backend" else "backend"
    other_process = processes.get(other_name)
    if other_process is not None and other_process.poll() is None:
        other_process.terminate()
        try:
            other_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            other_process.kill()

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
