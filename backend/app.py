import os
import sys

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.main import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"LifeLink AI Flask Backend starting on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=False)
