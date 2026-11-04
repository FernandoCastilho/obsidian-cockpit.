# Sonda temporária: imprime o art. 8º do RIOF (planalto) e os trechos com "IOF" das páginas de Finame dos bancos e da Abimaq.
import html2text, re, sys
u, path = sys.argv[1], sys.argv[2]
h = html2text.HTML2Text(); h.ignore_links = True; h.ignore_images = True; h.body_width = 0
raw = open(path, 'rb').read()
txt = raw.decode('latin-1' if 'planalto' in u else 'utf-8', errors='ignore')
t = h.handle(txt)
if 'planalto' in u:
    i = t.find('Art. 8'); print(t[i:i + 12000] if i >= 0 else t[:3000])
else:
    for m in re.finditer(r'(?i)\bIOF\b', t): print('…', t[max(0, m.start() - 350):m.end() + 350].replace('\n', ' '), '…')
    print(t[:2000])
