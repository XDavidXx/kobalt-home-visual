"""Font Awesome Free 6.7.2 SVGs, vendored with upstream attribution intact."""
from functools import lru_cache
from pathlib import Path

ASSETS = Path(__file__).resolve().parent / 'assets' / 'fontawesome'


@lru_cache(maxsize=None)
def fa_svg(name, extra_class=''):
    raw = (ASSETS / (name + '.svg')).read_text().strip()
    assert 'Font Awesome Free 6.7.2' in raw and '<svg ' in raw
    attributes = f'class="fa-icon fa-{name} {extra_class}" data-icon="{name}" aria-hidden="true" focusable="false" '
    return raw.replace('<svg ', '<svg ' + attributes, 1)


METHOD_ICONS = {
    'routine': 'sliders', 'people': 'users', 'data': 'database',
    'rules': 'shield-halved', 'ai': 'microchip', 'systems': 'laptop-code',
    'interfaces': 'window-maximize', 'connections': 'link',
    'check': 'circle-check', 'use': 'chart-line',
    'results': 'chart-column', 'evolution': 'arrows-rotate'
}


def fa_report_ui(report):
    replacements = {
        '↗</a>': fa_svg('arrow-right', 'report-external-icon') + '</a>',
        '⤢</button>': fa_svg('magnifying-glass-plus') + '</button>',
        '→</button>': fa_svg('arrow-right') + '</button>',
        '>→</span>': '>' + fa_svg('arrow-right') + '</span>',
        'Fechar ×': 'Fechar ' + fa_svg('xmark'),
        '<span class="expand-symbol" aria-hidden="true">+</span>': '<span class="expand-symbol" aria-hidden="true">' + fa_svg('plus') + '</span>'
    }
    for before, after in replacements.items():
        report = report.replace(before, after)
    if 'id="fontawesome-report-style"' not in report:
        style = '<style id="fontawesome-report-style">.fa-icon{display:inline-block;width:.95em;height:.95em;vertical-align:-.12em;fill:currentColor;stroke:none;pointer-events:none}.report-external-icon{transform:rotate(-45deg);margin-left:.2em}</style>'
        report = report.replace('</head>', style + '</head>')
    return report
