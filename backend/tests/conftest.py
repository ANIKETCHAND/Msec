"""Test isolation guard.

The API tests import ``app.main``, which builds the SQLAlchemy engine from
``settings.DATABASE_URL`` at import time. Without this file the suite runs
against the real ``medishield.db`` used by the running application, so every
test scan, assessment and report is written into the analyst's live history --
which is exactly how the Reports page ended up listing audits nobody ran.

Pointing the suite at a throwaway SQLite file keeps test artefacts out of the
application database entirely. The file is recreated on every run, and the suite
seeds it through the normal ``seed_database()`` path.
"""

import os
import tempfile
from pathlib import Path

_TEST_DB = Path(tempfile.gettempdir()) / "medishield_pytest.db"

# Start from a clean database for each session so stale fixtures cannot leak in.
if _TEST_DB.exists():
    _TEST_DB.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB.as_posix()}"

# Record files are written to backend/reports; keep tests off the app's archive.
os.environ.setdefault("MEDISHIELD_TEST_MODE", "1")

# Import after the URL is set, then create the schema and demo fixtures once for
# the whole session. Some test modules assume the database is already seeded.
from app.database.init_db import seed_database  # noqa: E402

seed_database()
