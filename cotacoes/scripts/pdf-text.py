"""Extract public policy PDFs from stdin. Dependency is pinned by the collector workflow."""
import io
import sys

from pypdf import PdfReader

reader = PdfReader(io.BytesIO(sys.stdin.buffer.read()))
sys.stdout.reconfigure(encoding="utf-8")
sys.stdout.write("\n".join(page.extract_text() or "" for page in reader.pages))
