"""CLI entry points for label-dev, label-serve, label-build."""

import subprocess
import signal
import sys
import os


def dev():
    """Start FastAPI (port 8000, reload) + Vite dev server (port 3000) in parallel."""
    frontend_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
    frontend_dir = os.path.normpath(frontend_dir)

    procs = []
    try:
        procs.append(subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "label_software.main:app", "--reload", "--port", "8888"],
        ))
        procs.append(subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=frontend_dir,
        ))
        for p in procs:
            p.wait()
    except KeyboardInterrupt:
        for p in procs:
            p.send_signal(signal.SIGTERM)
        sys.exit(0)


def serve():
    """Production: run uvicorn on port 8000."""
    subprocess.run(
        [sys.executable, "-m", "uvicorn", "label_software.main:app", "--host", "0.0.0.0", "--port", "8888"],
    )


def build():
    """Build the frontend for production."""
    frontend_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend")
    frontend_dir = os.path.normpath(frontend_dir)
    subprocess.run(["npm", "run", "build"], cwd=frontend_dir, check=True)
