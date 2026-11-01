import asyncio
from io import BytesIO
from pathlib import Path
import unittest
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
import main


class UploadTests(unittest.TestCase):
    @patch("main.s3.upload_fileobj")
    def test_upload_sanitizes_filename(self, upload):
        file = UploadFile(filename="../../financial.txt", file=BytesIO(b"content"))
        result = asyncio.run(main.upload_file(file))
        key = result["filename"]
        self.assertNotIn("/", key)
        self.assertTrue(key.endswith("_financial.txt"))
        self.assertEqual(upload.call_args.args[2], key)

    def test_rejects_unsupported_or_oversized_file(self):
        for name, content, status in (
            ("script.exe", b"x", 400),
            ("large.txt", b"x" * (20 * 1024 * 1024 + 1), 413),
        ):
            with self.subTest(name=name), self.assertRaises(HTTPException) as raised:
                asyncio.run(
                    main.upload_file(UploadFile(filename=name, file=BytesIO(content)))
                )
            self.assertEqual(raised.exception.status_code, status)

    @patch("main.initialize_vector_store")
    @patch("main.s3.download_file")
    @patch("main.iter_bucket_objects")
    def test_index_uses_scoped_temporary_file(self, objects, download, index):
        objects.return_value = iter([{"Key": "../../financial.txt", "Size": 1}])
        result = main.insert_file()
        temp_path = Path(download.call_args.args[2])
        self.assertNotIn("..", temp_path.parts)
        self.assertFalse(temp_path.parent.exists())
        self.assertEqual(result["processed"], ["../../financial.txt"])
        index.assert_called_once()


if __name__ == "__main__":
    unittest.main()
