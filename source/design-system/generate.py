"""Regenerate the shared token outputs with Python 3; no dependencies required."""
from pathlib import Path
import json

def render(data):
    lines = [f'/* Generated from tokens.json — Kobalt {data["meta"]["version"]}. Do not edit by hand. */', ':root{']
    for group in ['color', 'font', 'space', 'radius', 'size', 'layout', 'motion', 'shadow', 'layer']:
        lines.extend(f'  --kb-{group}-{key}:{value};' for key,value in data[group].items())
    for kind, props in data['type'].items():
        lines.extend(f'  --kb-type-{kind}-{key}:{value};' for key,value in props.items())
    lines.append('}')
    for theme, props in data['theme'].items():
        prefix=':root,' if theme=='light' else ''
        lines.append(prefix+f'[data-kb-theme="{theme}"]'+'{')
        lines.append('  color-scheme:'+theme+';')
        lines.extend(f'  --kb-{key}:{value};' for key,value in props.items())
        lines.append('}')
    return '\n'.join(lines)+'\n'

def generate(root):
    data=json.loads((root/'tokens.json').read_text())
    (root/'tokens.css').write_text(render(data))
    (root/'tokens.ts').write_text('// Generated from tokens.json.\nexport const kobaltTokens = '+json.dumps(data,ensure_ascii=False,indent=2)+' as const;\n')
    return data

if __name__=='__main__':
    root=Path(__file__).resolve().parent
    generate(root)
    print('tokens.css e tokens.ts gerados a partir de tokens.json.')
