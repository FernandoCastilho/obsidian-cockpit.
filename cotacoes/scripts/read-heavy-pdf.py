"""Read only the published heavy-vehicle overview. No OCR or inferred values."""
import io,json,sys
from pypdf import PdfReader
r=PdfReader(io.BytesIO(sys.stdin.buffer.read()))
for number,page in enumerate(r.pages,1):
 text=page.extract_text()
 if 'Caminhões - Trucks' in text and 'Ônibus - Bus' in text:
  print(json.dumps({'text':text,'page':number}));break
else:
 raise ValueError('Heavy-vehicle overview not found')
