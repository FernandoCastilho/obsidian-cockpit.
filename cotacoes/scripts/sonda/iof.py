# Sonda temporária: imprime o art. 8º do RIOF e os trechos com "IOF" de páginas/PDFs sobre o Finame.
import re, sys, subprocess
u, path = sys.argv[1], sys.argv[2]
raw = open(path, 'rb').read()
if raw[:4] == b'%PDF':
    t = subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True).stdout
else:
    import html2text
    h = html2text.HTML2Text(); h.ignore_links = True; h.ignore_images = True; h.body_width = 0
    t = h.handle(raw.decode('utf-8', errors='ignore') if b'utf-8' in raw[:2000].lower() else raw.decode('latin-1', errors='ignore'))
if 'd6306' in u or 'decreto-6306' in u:
    i = t.find('Art. 8'); print(t[i:i + 14000] if i >= 0 else t[:3000])
else:
    for m in re.finditer(r'(?i)\bIOF\b', t): print('…', t[max(0, m.start() - 350):m.end() + 350].replace('\n', ' '), '…')
    print(t[:1500])
