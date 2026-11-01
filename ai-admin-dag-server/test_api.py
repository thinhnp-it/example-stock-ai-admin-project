import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from main import app
from security import require_user


class DagApiTests(unittest.TestCase):
    def test_health_probe_is_public_but_query_is_not(self):
        client = TestClient(app)
        self.assertEqual(client.get("/healthz").status_code, 200)
        self.assertEqual(client.post("/query-database", json={"question": "show data"}).status_code, 401)

    def test_unconfigured_database_fails_before_query(self):
        app.dependency_overrides[require_user] = lambda: {"sub": "test"}
        self.addCleanup(app.dependency_overrides.clear)
        with patch.dict("os.environ", {"DAG_READ_ONLY_DB_CONFIRMED": "false"}), patch("main.generate_report") as query:
            response = TestClient(app).post("/query-database", json={"question": "show data"})
        self.assertEqual(response.status_code, 503)
        query.assert_not_called()


if __name__ == "__main__":
    unittest.main()
