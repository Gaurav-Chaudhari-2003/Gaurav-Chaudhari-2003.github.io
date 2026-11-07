#!/usr/bin/env python3
"""
Gaurav Vilas Chaudhari, résumé builder (ATS-friendly, one A4 page).

Edit the CONTENT section below, then run from the repo root:

    python3 assets/resume-src/build_resume.py

It writes three files from the same content:
    assets/resume-src/resume.html        the page that Chrome prints
    assets/Gaurav Chaudhari AI CV.pdf    used by the website's "View résumé" buttons
    assets/Gaurav Chaudhari AI CV.docx   Word version for job portals that ask for .docx

ATS rules this layout follows: one column, standard section names, real text
(no icons, images or text boxes), contact details in the body (not a page
header), right-aligned dates on the title line, no ligatures in the PDF text.
Needs Google Chrome or Chromium for the PDF; nothing outside the standard library.
"""
import html
import re
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HTML_OUT = ROOT / 'assets' / 'resume-src' / 'resume.html'
PDF_OUT = ROOT / 'assets' / 'Gaurav Chaudhari AI CV.pdf'
DOCX_OUT = ROOT / 'assets' / 'Gaurav Chaudhari AI CV.docx'

# =============================================================== CONTENT ===
NAME = 'Gaurav Vilas Chaudhari'
HEADLINE = 'AI/ML Engineer | LLMs, RAG, Agentic AI and Computer Vision'
CONTACT = [  # (visible text, link or None)
    [('Pune, Maharashtra, India', None),
     ('+91 96653 05197', 'tel:+919665305197'),
     ('chaudharigaurav177@gmail.com', 'mailto:chaudharigaurav177@gmail.com')],
    [('linkedin.com/in/gaurav-chaudhari-8129ab206', 'https://www.linkedin.com/in/gaurav-chaudhari-8129ab206'),
     ('github.com/Gaurav-Chaudhari-2003', 'https://github.com/Gaurav-Chaudhari-2003'),
     ('gaurav-chaudhari-2003.github.io', 'https://gaurav-chaudhari-2003.github.io/')],
]

SUMMARY = ('AI/ML Engineer at Stark Digital building production LLM systems for government and enterprise clients: '
           'retrieval-augmented generation (RAG), natural-language-to-SQL analytics, LangGraph multi-agent workflows '
           'and real-time computer vision, served with FastAPI, PostgreSQL/pgvector, Celery and Redis and deployed '
           'on edge and mobile devices.')

SKILLS = [
    ('Generative AI & LLMs', 'Large Language Models (LLMs), Retrieval-Augmented Generation (RAG), Prompt Engineering, '
     'LLM Orchestration, LangGraph, LangChain, Multi-Agent Systems, Model Context Protocol (MCP), Text-to-SQL, '
     'Embeddings, Hybrid Search, HyDE, Gemini'),
    ('Machine Learning & Vision', 'PyTorch, TensorFlow, scikit-learn, YOLOv8, OpenCV, OCR, NLP, SHAP'),
    ('Backend & Data', 'FastAPI, REST APIs, WebSockets, PostgreSQL, pgvector, Vector Search, Redis, Celery, '
     'Distributed Inference'),
    ('MLOps & Tools', 'Docker, Git, GitHub, LangSmith'),
    ('Languages & Frameworks', 'Python, C++, Java, JavaScript, TypeScript, SQL, React, Next.js, React Native, Flutter'),
]

EXPERIENCE = [
    {'title': 'AI Engineer', 'org': 'Stark Digital, Pune', 'dates': 'Jun 2026 – Present', 'proof': None,
     'bullets': [
         'Built a natural-language-to-SQL analytics assistant (FastAPI, Vanna 2.0, PostgreSQL) for PMRDA and PMC '
         'government databases, with role-based access, a read-only SQL guard and questions in English, Marathi '
         'and Hinglish.',
         'Architected a multi-tenant RAG document search platform (DMS) with hybrid pgvector and keyword search, a '
         'HyDE fallback, multilingual query expansion and asynchronous ingestion on Celery and Redis.',
         'Developed Project Iris, a multi-camera occupancy system using YOLOv8 and OpenCV that streams telemetry '
         'over WebSockets to IoT controllers, switching lighting and HVAC by zone at about 1 s latency.',
         'Delivered an edge-AI pothole detection app for MIDC (React Native, FastAPI) that combines YOLO detection '
         'with Gemini multimodal analysis for severity scoring and false-positive filtering.',
         'Built a LangGraph multi-agent intent router with a pgvector semantic classifier that auto-answers FAQs '
         'and escalates investment proposals to officers.',
     ]},
    {'title': 'Engineering Apprentice', 'org': 'CMPDI RI-4, Nagpur', 'dates': 'Feb 2025 – Feb 2026',
     'proof': ('Certificate', 'https://photos.app.goo.gl/cXYuocPE2nUkgQCb9'),
     'bullets': [
         'Engineered backend automation workflows and SQL data-access layers for enterprise web applications.',
         'Built the Vehicle Booking System (PHP, SQL) with login, availability checks and an admin approval panel.',
     ]},
    {'title': 'Python Intern', 'org': 'MDB Electrosoft Pvt. Ltd., Amravati', 'dates': 'Jul 2022 – Aug 2022',
     'proof': ('Certificate', 'https://photos.app.goo.gl/87jyKpqd8yQv7u2EA'),
     'bullets': [
         'Completed a six-week internship in Python programming and GUI development, delivering the assigned '
         'projects on time.',
     ]},
]

PROJECTS = [  # (name, stack, description, link or None)
    ('Pustakosh: AI Document Library', 'FastAPI, PostgreSQL/pgvector, Celery, Next.js',
     'hybrid search with reranking, multilingual query expansion, page-cited answers and per-tenant '
     'row-level security.', None),
    ('Multi-Agent PMC Officer Assistant', 'FastMCP, OpenRouter, PostgreSQL',
     'five-agent orchestrator with a guarded MCP tool server (row limits, timeouts, no writes) and '
     'e5-embedding template retrieval with reciprocal rank fusion.', None),
    ('AI FinTech Auto-Reconciler', 'React Native, Kotlin, C++/JSI',
     'on-device receipt reading with Gemini Nano and ML Kit OCR, and three-tier transaction matching '
     'through a custom JSI bridge.', None),
    ('Credit-Card Fraud Detection', 'scikit-learn, SHAP, FastAPI',
     'Random Forest classifier with ROC-AUC 0.98 on held-out data, a cost-weighted decision threshold and '
     'SHAP explanations.', None),
]

EDUCATION = [  # (degree, result, institution, dates)
    ('B.E. in Computer Science and Engineering', 'SGPA 8.6',
     'Shri Sant Gajanan Maharaj College of Engineering (SSGMCE), Shegaon', '2023 – 2026'),
    ('Diploma in Computer Engineering', '87.09%', 'Government Polytechnic, Achalpur', '2020 – 2023'),
]

CERTIFICATIONS = [  # (course, issuer, certificate link)
    ('Introduction to Large Language Models (LLMs)', 'NPTEL, IIT Madras',
     'https://drive.google.com/file/d/1LKiKiCSyHxDSOxd8qfE8MVaAI8nxudE7/view?usp=sharing'),
    ('Deep Learning', 'NPTEL, IIT Ropar', 'https://nptel.ac.in/noc/E_Certificate/NOC26CS66S16510000604448586'),
    ('Data Structure and Algorithms using Java', 'NPTEL, IIT Kharagpur',
     'https://archive.nptel.ac.in/content/noc/NOC25/SEM2/Ecertificates/106/noc25-cs148/Course/'
     'NPTEL25CS148S106440125410436430.pdf'),
    ('Machine Learning with Python', 'IBM (Coursera)',
     'https://www.coursera.org/account/accomplishments/verify/9J72WXSGN29V'),
    ('Introduction to Git and GitHub', 'Google (Coursera)',
     'https://www.coursera.org/account/accomplishments/verify/3QEFFAUMZB5U'),
    ('Building Web Applications in PHP', 'University of Michigan (Coursera)',
     'https://www.coursera.org/account/accomplishments/verify/P52DN9MHYMEX'),
]

# ================================================================ STYLE ===
ACCENT = '1F4E79'   # headings, links, bullet markers
INK = '1F2328'      # body text
MUTED = '4B5563'    # dates
RULE = 'C9D3DF'     # line under section headings


# ================================================================= HTML ===
def e(s):
    return html.escape(s, quote=True)


HYPHENATED = re.compile(r'[\w/.+#]+(?:-[\w/.+#]+)+')


def t(s):
    """Escape body text and stop line breaks inside hyphenated terms: a break there makes PDF text
    extraction (and so an ATS) read 'retrieval-augmented' as 'retrievalaugmented'."""
    return HYPHENATED.sub(lambda m: f'<span class="nw">{m.group(0)}</span>', e(s))


def a(text, url):
    return f'<a href="{e(url)}">{e(text)}</a>' if url else e(text)


def build_html():
    contact = '\n'.join(
        '<p class="contact">' + ' <span class="sep">|</span> '.join(a(t, u) for t, u in line) + '</p>'
        for line in CONTACT)
    skills = '\n'.join(f'<p class="skill"><b>{e(k)}:</b> {t(v)}</p>' for k, v in SKILLS)
    jobs = []
    for j in EXPERIENCE:
        proof = f' <span class="sep">·</span> {a(*j["proof"])}' if j['proof'] else ''
        bullets = ''.join(f'<li>{t(b)}</li>' for b in j['bullets'])
        jobs.append(f'<div class="job"><div class="row"><span><b>{e(j["title"])}</b> <span class="sep">|</span> '
                    f'{e(j["org"])}{proof}</span><span class="when">{e(j["dates"])}</span></div>'
                    f'<ul>{bullets}</ul></div>')
    projects = ''.join(f'<li><b>{a(n, l) if l else e(n)}</b> <i>({e(s)})</i>: {t(d)}</li>' for n, s, d, l in PROJECTS)
    edu = '\n'.join(f'<div class="school"><div class="row"><span><b>{e(d)}</b> <span class="sep">|</span> {e(r)}</span>'
                    f'<span class="when">{e(dt)}</span></div><div>{e(i)}</div></div>' for d, r, i, dt in EDUCATION)
    certs = ''.join(f'<li>{a(c, u)} <span class="sep">|</span> {e(i)}</li>' for c, i, u in CERTIFICATIONS)
    return f'''<!DOCTYPE html>
<!-- Generated by build_resume.py. Edit the content there, not here. -->
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{e(NAME)} - AI/ML Engineer Resume</title>
<meta name="author" content="{e(NAME)}">
<style>
@page {{ size: A4; margin: 0.42in 0.5in; }}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: Calibri, Carlito, Arial, sans-serif; font-size: 10pt; line-height: 1.17; color: #{INK};
       font-variant-ligatures: none; font-feature-settings: "liga" 0, "clig" 0;
       -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
a {{ color: #{ACCENT}; text-decoration: none; }}
h1 {{ font-size: 22pt; line-height: 1.1; color: #111827; letter-spacing: 0.3pt; }}
.headline {{ margin-top: 2pt; font-size: 11pt; font-weight: 700; color: #{ACCENT}; }}
.contact {{ margin-top: 2pt; font-size: 9.5pt; }}
.contact a {{ color: #{INK}; }}
.sep {{ color: #9ca3af; margin: 0 2pt; }}
h2 {{ margin: 8pt 0 3pt; padding-bottom: 1.5pt; border-bottom: 0.8pt solid #{RULE};
     font-size: 10.5pt; text-transform: uppercase; color: #{ACCENT}; }}
.nw {{ white-space: nowrap; }}
.skill {{ margin: 1pt 0; }}
.row {{ display: flex; justify-content: space-between; align-items: baseline; gap: 14pt; }}
.when {{ white-space: nowrap; font-weight: 700; color: #{MUTED}; }}
.job + .job {{ margin-top: 4pt; }}
ul {{ margin-top: 1.5pt; padding-left: 13pt; }}
li {{ margin: 1pt 0; padding-left: 1pt; }}
li::marker {{ color: #{ACCENT}; }}
.school + .school {{ margin-top: 3pt; }}
</style>
</head>
<body>
<h1>{e(NAME)}</h1>
<p class="headline">{e(HEADLINE)}</p>
{contact}
<h2>Summary</h2>
<p>{t(SUMMARY)}</p>
<h2>Technical Skills</h2>
{skills}
<h2>Experience</h2>
{''.join(jobs)}
<h2>Projects</h2>
<ul>{projects}</ul>
<h2>Education</h2>
<div class="edu">{edu}</div>
<h2>Certifications</h2>
<ul>{certs}</ul>
</body>
</html>
'''


# ================================================================= DOCX ===
W_NS = ('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"')
PAGE_W, PAGE_H = 11906, 16838          # A4 in twips
MARGIN_LR, MARGIN_TB = 720, 605        # 0.5in, 0.42in
TAB_RIGHT = PAGE_W - 2 * MARGIN_LR     # right edge of the text area


def x(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


class Docx:
    def __init__(self):
        self.links = []   # (rId, url)
        self.body = []

    def link_id(self, url):
        rid = f'rId{10 + len(self.links)}'
        self.links.append((rid, url))
        return rid

    @staticmethod
    def run(text, b=False, i=False, color=None, sz=None, caps=False):
        pr = ''.join([
            '<w:b/><w:bCs/>' if b else '', '<w:i/><w:iCs/>' if i else '', '<w:caps/>' if caps else '',
            f'<w:color w:val="{color}"/>' if color else '', f'<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/>' if sz else ''])
        return f'<w:r><w:rPr>{pr}</w:rPr><w:t xml:space="preserve">{x(text)}</w:t></w:r>'

    def link(self, text, url, **kw):
        kw.setdefault('color', ACCENT)
        return f'<w:hyperlink r:id="{self.link_id(url)}" w:history="1">{self.run(text, **kw)}</w:hyperlink>'

    def p(self, runs, style=None, tabs=False, bullet=False, before=0, after=0, keep_next=False):
        ppr = []
        if style:
            ppr.append(f'<w:pStyle w:val="{style}"/>')
        if keep_next:
            ppr.append('<w:keepNext/>')
        if bullet:
            ppr.append('<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')
        if tabs:
            ppr.append(f'<w:tabs><w:tab w:val="right" w:pos="{TAB_RIGHT}"/></w:tabs>')
        if before or after:
            ppr.append(f'<w:spacing w:before="{before}" w:after="{after}"/>')
        if bullet:
            ppr.append('<w:ind w:left="284" w:hanging="200"/>')
        self.body.append(f'<w:p><w:pPr>{"".join(ppr)}</w:pPr>{"".join(runs)}</w:p>')

    def heading(self, text):
        self.p([self.run(text)], style='Heading1', keep_next=True)

    def build(self):
        R, sep = self.run, self.run(' | ', color='9CA3AF')
        self.p([R(NAME, b=True, sz=44, color='111827')], style='Title')
        self.p([R(HEADLINE, b=True, sz=22, color=ACCENT)], after=40)
        for line in CONTACT:
            runs = []
            for k, (t, u) in enumerate(line):
                if k:
                    runs.append(self.run(' | ', color='9CA3AF', sz=19))
                runs.append(self.link(t, u, color=INK, sz=19) if u else R(t, sz=19))
            self.p(runs, after=10)

        self.heading('Summary')
        self.p([R(SUMMARY)])

        self.heading('Technical Skills')
        for k, v in SKILLS:
            self.p([R(k + ': ', b=True), R(v)], after=12)

        self.heading('Experience')
        for n, j in enumerate(EXPERIENCE):
            head = [R(j['title'], b=True), sep, R(j['org'])]
            if j['proof']:
                head += [R(' · ', color='9CA3AF'), self.link(*j['proof'])]
            head += ['<w:r><w:tab/></w:r>', R(j['dates'], b=True, color=MUTED)]
            self.p(head, tabs=True, before=60 if n else 0, after=10, keep_next=True)
            for b in j['bullets']:
                self.p([R(b)], bullet=True, after=10)

        self.heading('Projects')
        for name, stack, desc, url in PROJECTS:
            first = self.link(name, url, b=True) if url else R(name, b=True)
            self.p([first, R(' (' + stack + ')', i=True), R(': ' + desc)], bullet=True, after=10)

        self.heading('Education')
        for n, (d, result, inst, dates) in enumerate(EDUCATION):
            self.p([R(d, b=True), sep, R(result), '<w:r><w:tab/></w:r>', R(dates, b=True, color=MUTED)],
                   tabs=True, before=60 if n else 0, keep_next=True)
            self.p([R(inst)])

        self.heading('Certifications')
        for course, issuer, url in CERTIFICATIONS:
            self.p([self.link(course, url), sep, R(issuer)], bullet=True, after=10)

    # ---- package parts ----
    def document_xml(self):
        sect = (f'<w:sectPr><w:pgSz w:w="{PAGE_W}" w:h="{PAGE_H}"/>'
                f'<w:pgMar w:top="{MARGIN_TB}" w:right="{MARGIN_LR}" w:bottom="{MARGIN_TB}" w:left="{MARGIN_LR}" '
                f'w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>')
        return (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document {W_NS}><w:body>'
                + ''.join(self.body) + sect + '</w:body></w:document>')

    @staticmethod
    def styles_xml():
        return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles {W_NS}>
<w:docDefaults>
<w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>
<w:color w:val="{INK}"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="en-IN"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/>
<w:pPr><w:spacing w:after="20" w:line="240" w:lineRule="auto"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/>
<w:next w:val="Normal"/><w:qFormat/>
<w:pPr><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="{RULE}"/></w:pBdr>
<w:spacing w:before="140" w:after="50"/><w:outlineLvl w:val="0"/></w:pPr>
<w:rPr><w:b/><w:bCs/><w:caps/><w:color w:val="{ACCENT}"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>
</w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="{ACCENT}"/></w:rPr></w:style>
</w:styles>'''

    @staticmethod
    def numbering_xml():
        return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering {W_NS}>
<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>
<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>
<w:pPr><w:ind w:left="284" w:hanging="200"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:color w:val="{ACCENT}"/></w:rPr></w:lvl>
</w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>'''

    def write(self, path):
        now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
        rel_links = ''.join(
            f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/'
            f'hyperlink" Target="{x(u)}" TargetMode="External"/>' for rid, u in self.links)
        parts = {
            '[Content_Types].xml':
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                '<Default Extension="xml" ContentType="application/xml"/>'
                '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
                '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
                '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
                '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
                '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
                '</Types>',
            '_rels/.rels':
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
                '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
                '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
                '</Relationships>',
            'word/_rels/document.xml.rels':
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'
                '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'
                + rel_links + '</Relationships>',
            'word/document.xml': self.document_xml(),
            'word/styles.xml': self.styles_xml(),
            'word/numbering.xml': self.numbering_xml(),
            'word/settings.xml':
                f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings {W_NS}>'
                '<w:defaultTabStop w:val="720"/><w:compat><w:compatSetting w:name="compatibilityMode" '
                'w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>',
            'docProps/core.xml':
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
                'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
                'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
                f'<dc:title>{x(NAME)} - AI/ML Engineer Resume</dc:title><dc:creator>{x(NAME)}</dc:creator>'
                f'<cp:lastModifiedBy>{x(NAME)}</cp:lastModifiedBy>'
                f'<dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>'
                f'<dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified></cp:coreProperties>',
            'docProps/app.xml':
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">'
                '<Application>build_resume.py</Application></Properties>',
        }
        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
            for name, data in parts.items():
                z.writestr(name, data)


# ================================================================== RUN ===
def find_chrome():
    for name in ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'):
        if shutil.which(name):
            return shutil.which(name)
    sys.exit('Chrome/Chromium not found: install one to print the PDF.')


def main():
    HTML_OUT.write_text(build_html(), encoding='utf-8')
    print('wrote', HTML_OUT.relative_to(ROOT))

    subprocess.run([find_chrome(), '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
                    f'--print-to-pdf={PDF_OUT}', HTML_OUT.as_uri()],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    print('wrote', PDF_OUT.relative_to(ROOT))

    d = Docx()
    d.build()
    d.write(DOCX_OUT)
    print('wrote', DOCX_OUT.relative_to(ROOT))


if __name__ == '__main__':
    main()
