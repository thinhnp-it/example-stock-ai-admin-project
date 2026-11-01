import unittest
from datetime import date
from types import SimpleNamespace
from unittest.mock import Mock
import main


class SummaryTests(unittest.TestCase):
    def test_latest_rows_are_reversed_into_time_order(self):
        rows = [
            SimpleNamespace(date=date(2024, 1, 3), close=30, high=32, low=28, volume=300, name="TSLA"),
            SimpleNamespace(date=date(2024, 1, 2), close=20, high=22, low=18, volume=200, name="TSLA"),
        ]
        db = Mock()
        db.execute.return_value.scalars.return_value.all.return_value = rows
        result = main.get_stock_summary("tsla", None, None, 2, db)
        self.assertIn("DESC", str(db.execute.call_args.args[0]))
        self.assertEqual(result.latest_date, date(2024, 1, 3))
        self.assertEqual(result.latest_close, 30)
        self.assertEqual(result.change_pct, 50)


if __name__ == "__main__":
    unittest.main()
