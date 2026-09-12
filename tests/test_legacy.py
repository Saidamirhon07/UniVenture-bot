import unittest
from unittest.mock import patch

from backend import legacy


class LegacyAsyncTests(unittest.IsolatedAsyncioTestCase):
    async def test_load_rag_runs_blocking_lookup_in_thread(self):
        with patch("backend.legacy.rag_context", return_value="reference context") as lookup:
            result = await legacy.load_rag("essays_personal", "student text")

        self.assertEqual(result, "reference context")
        lookup.assert_called_once_with("essays_personal", "student text")


if __name__ == "__main__":
    unittest.main()
