"""Read an official XLSX sheet (default: Pink Sheet "Monthly Prices"; ANP: "BRASIL") using only Python's standard library.
Input: XLSX bytes on stdin; optional argv[1] = sheet name. Output: sparse rows as JSON.
No formulas are evaluated and no files are extracted to disk.
"""
import io
import json
import posixpath
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'


def read_rows(data, sheet_name='Monthly Prices'):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if sum(i.file_size for i in archive.infolist()) > 40_000_000:
            raise ValueError('Pink Sheet: uncompressed workbook too large')
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            root = ET.fromstring(archive.read('xl/sharedStrings.xml'))
            strings = [''.join(t.text or '' for t in si.findall('.//m:t', NS)) for si in root.findall('m:si', NS)]
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        sheet = next((s for s in workbook.findall('m:sheets/m:sheet', NS) if s.get('name') == sheet_name), None)
        if sheet is None:
            raise ValueError('Workbook: sheet %s absent' % sheet_name)
        relations = ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))
        rel = next(r for r in relations if r.get('Id') == sheet.get(REL))
        if rel.get('TargetMode') == 'External':
            raise ValueError('Pink Sheet: external worksheet forbidden')
        target = rel.get('Target')
        path = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
        if not path.startswith('xl/worksheets/'):
            raise ValueError('Pink Sheet: unexpected worksheet path')
        root = ET.fromstring(archive.read(path))
        rows = []
        for row in root.findall('m:sheetData/m:row', NS):
            values = {}
            for cell in row.findall('m:c', NS):
                column = ''.join(c for c in cell.get('r', '') if c.isalpha())
                value = cell.find('m:v', NS)
                if cell.get('t') == 'inlineStr':
                    values[column] = ''.join(t.text or '' for t in cell.findall('.//m:t', NS))
                elif value is not None and value.text is not None:
                    values[column] = strings[int(value.text)] if cell.get('t') == 's' else value.text
            rows.append(values)
        return rows


if __name__ == '__main__':
    print(json.dumps(read_rows(sys.stdin.buffer.read(), sys.argv[1] if len(sys.argv) > 1 else 'Monthly Prices')))
