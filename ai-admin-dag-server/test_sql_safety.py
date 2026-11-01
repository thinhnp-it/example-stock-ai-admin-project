import unittest
from sql_safety import validate_read_query


class QuerySafetyTests(unittest.TestCase):
    def test_allowed_queries(self):
        for query in (
            "SELECT COUNT(*) FROM stocks",
            "WITH x AS (SELECT * FROM stocks) SELECT * FROM x",
        ):
            self.assertTrue(validate_read_query(query, "postgres"))

    def test_dangerous_queries_are_rejected(self):
        queries = (
            "DELETE FROM stocks",
            "SELECT 1; DELETE FROM stocks",
            "WITH x AS (DELETE FROM stocks RETURNING *) SELECT * FROM x",
            "SELECT * INTO backup FROM stocks",
            "SELECT pg_sleep(10)",
            "SELECT * FROM stocks FOR UPDATE",
        )
        for query in queries:
            with self.subTest(query=query), self.assertRaises(ValueError):
                validate_read_query(query, "postgres")


if __name__ == "__main__":
    unittest.main()
