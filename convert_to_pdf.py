#!/usr/bin/env python3
"""
Convert SDP_REPORT.md to PDF with proper formatting for VITAP submission.
Applies A4 sizing, margins from cover page rules, Times New Roman font, and page numbers.
"""

from pathlib import Path
import re
import html
from xml.sax.saxutils import escape

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Preformatted, PageBreak
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfbase import pdfmetrics
except ImportError as e:
    print(f"Missing required package: {e}")
    print("Install with: pip install reportlab")
    exit(1)

# Paths
base = Path(r'c:/Users/sanja/OneDrive/Desktop/vitap-learnhub sanjay')
source = base / 'SDP_REPORT.md'
outfile = base / 'SDP_REPORT.pdf'

# Register Times New Roman fonts
font_regular = 'Times-Roman'
font_bold = 'Times-Bold'
font_italic = 'Times-Italic'
font_bolditalic = 'Times-BoldItalic'

font_dir = Path('C:/Windows/Fonts')
font_files = {
    'TimesNewRoman': font_dir / 'times.ttf',
    'TimesNewRoman-Bold': font_dir / 'timesbd.ttf',
    'TimesNewRoman-Italic': font_dir / 'timesi.ttf',
    'TimesNewRoman-BoldItalic': font_dir / 'timesbi.ttf',
}

if all(p.exists() for p in font_files.values()):
    try:
        pdfmetrics.registerFont(TTFont('TimesNewRoman', str(font_files['TimesNewRoman'])))
        pdfmetrics.registerFont(TTFont('TimesNewRoman-Bold', str(font_files['TimesNewRoman-Bold'])))
        pdfmetrics.registerFont(TTFont('TimesNewRoman-Italic', str(font_files['TimesNewRoman-Italic'])))
        pdfmetrics.registerFont(TTFont('TimesNewRoman-BoldItalic', str(font_files['TimesNewRoman-BoldItalic'])))
        font_regular = 'TimesNewRoman'
        font_bold = 'TimesNewRoman-Bold'
        font_italic = 'TimesNewRoman-Italic'
        font_bolditalic = 'TimesNewRoman-BoldItalic'
        print("✓ Using Times New Roman from Windows Fonts")
    except Exception as e:
        print(f"Warning: Could not register custom fonts: {e}")
        print("  Falling back to default fonts")
else:
    print("Warning: Times New Roman fonts not found in C:/Windows/Fonts")
    print("  Falling back to default fonts")

# Create styles
styles = getSampleStyleSheet()

style_definitions = {
    'Body': dict(
        fontName=font_regular,
        fontSize=12,
        leading=18,
        spaceAfter=6,
        alignment=TA_LEFT,
    ),
    'Heading1Custom': dict(
        fontName=font_bold,
        fontSize=16,
        leading=20,
        spaceBefore=10,
        spaceAfter=8,
        alignment=TA_LEFT,
    ),
    'Heading2Custom': dict(
        fontName=font_bold,
        fontSize=14,
        leading=18,
        spaceBefore=8,
        spaceAfter=6,
        alignment=TA_LEFT,
    ),
    'Heading3Custom': dict(
        fontName=font_bold,
        fontSize=12,
        leading=15,
        spaceBefore=6,
        spaceAfter=4,
        alignment=TA_LEFT,
    ),
    'ListBody': dict(
        fontName=font_regular,
        fontSize=12,
        leading=18,
        leftIndent=18,
        firstLineIndent=0,
        spaceAfter=4,
    ),
    'TableCell': dict(
        fontName=font_regular,
        fontSize=10,
        leading=12,
        alignment=TA_LEFT,
    ),
    'CodeBlock': dict(
        fontName='Courier',
        fontSize=8.5,
        leading=10,
        leftIndent=12,
        spaceBefore=4,
        spaceAfter=6,
    ),
    'TitlePage': dict(
        fontName=font_bold,
        fontSize=22,
        leading=28,
        alignment=TA_CENTER,
        spaceAfter=12,
    ),
    'SubtitlePage': dict(
        fontName=font_regular,
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        spaceAfter=8,
    ),
}

for name, props in style_definitions.items():
    if name not in styles:
        styles.add(ParagraphStyle(name=name, **props))

body_style = styles['Body']

def inline_markup(text: str) -> str:
    """Convert Markdown inline markup to ReportLab XML."""
    text = html.unescape(text).replace('\t', '    ')
    code_spans = []

    def code_repl(m):
        code_spans.append(escape(m.group(1), entities={"'": '&#39;'}))
        return f'__CODE{len(code_spans) - 1}__'

    text = re.sub(r'`([^`]+)`', code_repl, text)
    text = escape(text, entities={"'": '&#39;'})
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)', r'<i>\1</i>', text)
    text = re.sub(r'__CODE(\d+)__', lambda m: f'<font face="Courier">{code_spans[int(m.group(1))]}</font>', text)
    text = text.replace('->', '&rarr;')
    return text

def is_table_separator(line: str) -> bool:
    """Check if a line is a Markdown table separator."""
    stripped = line.strip().strip('|')
    if not stripped:
        return False
    parts = [part.strip() for part in stripped.split('|')]
    return all(re.fullmatch(r'[:\-\s]+', part or '') for part in parts)

# Read and parse Markdown
lines = source.read_text(encoding='utf-8').splitlines()
story = []

# Title page
story.extend([
    Spacer(1, 6 * cm),
    Paragraph('VITAP LEARNHUB', styles['TitlePage']),
    Paragraph('Senior Development Project Report', styles['SubtitlePage']),
    Spacer(1, 0.5 * cm),
    Paragraph('Converted from Markdown with VITAP submission specifications applied.', styles['SubtitlePage']),
    Spacer(1, 8 * cm),
    Paragraph('Prepared for final submission', styles['SubtitlePage']),
    PageBreak(),
])

# Parse Markdown into story
idx = 0
while idx < len(lines):
    line = lines[idx]
    stripped = line.strip()

    # Empty line
    if not stripped:
        story.append(Spacer(1, 0.18 * cm))
        idx += 1
        continue

    # Code block
    if stripped.startswith('```'):
        code_lines = []
        idx += 1
        while idx < len(lines) and not lines[idx].strip().startswith('```'):
            code_lines.append(lines[idx].rstrip('\n'))
            idx += 1
        if idx < len(lines):
            idx += 1
        story.append(Preformatted('\n'.join(code_lines), styles['CodeBlock']))
        continue

    # Table
    if stripped.startswith('|'):
        table_lines = []
        while idx < len(lines) and lines[idx].strip().startswith('|'):
            table_lines.append(lines[idx].rstrip())
            idx += 1
        rows = []
        for tline in table_lines:
            if is_table_separator(tline):
                continue
            cells = [cell.strip() for cell in tline.strip().strip('|').split('|')]
            rows.append([Paragraph(inline_markup(cell), styles['TableCell']) for cell in cells])
        if rows:
            col_count = max(len(r) for r in rows)
            usable_width = A4[0] - (3.81 * cm) - (2.54 * cm)
            col_widths = [usable_width / col_count] * col_count
            tbl = Table(rows, colWidths=col_widths, repeatRows=1, hAlign='LEFT')
            tbl.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), font_regular),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('LEADING', (0, 0), (-1, -1), 12),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E6E6E6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('GRID', (0, 0), (-1, -1), 0.35, colors.HexColor('#666666')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(tbl)
            story.append(Spacer(1, 0.12 * cm))
        continue

    # Headings
    if stripped.startswith('### '):
        story.append(Paragraph(inline_markup(stripped[4:].strip()), styles['Heading3Custom']))
        idx += 1
        continue
    if stripped.startswith('## '):
        story.append(Paragraph(inline_markup(stripped[3:].strip()), styles['Heading2Custom']))
        idx += 1
        continue
    if stripped.startswith('# '):
        story.append(Paragraph(inline_markup(stripped[2:].strip()), styles['Heading1Custom']))
        idx += 1
        continue

    # Lists
    list_match = re.match(r'^(\s*)([-*]|\d+\.)\s+(.*)$', line)
    if list_match:
        content = list_match.group(3)
        bullet = '•' if list_match.group(2) in ('-', '*') else list_match.group(2)
        story.append(Paragraph(inline_markup(content), styles['ListBody'], bulletText=bullet))
        idx += 1
        continue

    # Paragraph (multi-line)
    paragraph_lines = [stripped]
    idx += 1
    while idx < len(lines):
        next_line = lines[idx].strip()
        if not next_line:
            break
        if next_line.startswith(('```', '|', '#', '##', '###')):
            break
        if re.match(r'^(\s*)([-*]|\d+\.)\s+(.*)$', lines[idx]):
            break
        paragraph_lines.append(next_line)
        idx += 1

    paragraph_text = ' '.join(paragraph_lines)
    story.append(Paragraph(inline_markup(paragraph_text), body_style))

# Page number callback
def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont(font_regular, 10)
    canvas.drawCentredString(A4[0] / 2.0, 1.2 * cm, str(canvas.getPageNumber()))
    canvas.restoreState()

# Build PDF with correct margins from cover page rules
doc = SimpleDocTemplate(
    str(outfile),
    pagesize=A4,
    leftMargin=3.81 * cm,    # Cover page spec
    rightMargin=2.54 * cm,   # Cover page spec
    topMargin=2.54 * cm,     # Cover page spec
    bottomMargin=2.54 * cm,  # Cover page spec
    title='VITAP LearnHub Senior Development Project Report',
    author='GitHub Copilot',
)

doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
print(f"✓ PDF generated: {outfile}")

# Count pages
try:
    from pypdf import PdfReader
    reader = PdfReader(str(outfile))
    num_pages = len(reader.pages)
    print(f"✓ Total pages: {num_pages} (target: 70-75 pages)")
except Exception as e:
    print(f"Note: Could not count pages: {e}")

print("\nConversion complete!")
