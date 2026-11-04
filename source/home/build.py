from pathlib import Path
from html import escape
import json, base64, shutil
from fontawesome import fa_svg, METHOD_ICONS

ROOT = Path(__file__).resolve().parent
WORKSPACE = ROOT.parent
DIST = ROOT.parents[1] / 'build'
REPORT = WORKSPACE / 'relatorios' / '2026-10-28-meta-ads'
copy = json.loads((ROOT.parent / 'content' / 'copy-home.json').read_text())
visual = json.loads((ROOT / 'visual-copy.json').read_text())
results = json.loads((ROOT.parent / 'content' / 'resultados-clientes.json').read_text())
capabilities = json.loads((ROOT.parent / 'content' / 'aplicacoes-empresa.json').read_text())
client_logos = {item['name']: item for item in json.loads((ROOT / 'assets' / 'client-logos.json').read_text())}
sections = {s['id']: s for s in copy['sections']}
DIST.mkdir(parents=True, exist_ok=True)

def e(value):
    return escape(value, quote=True)

def asset_uri(name):
    mime = {'.mp4':'video/mp4','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'}[Path(name).suffix]
    return 'data:'+mime+';base64,'+base64.b64encode((ROOT/'assets'/name).read_bytes()).decode()

images = {'ai':asset_uri('ai-colleague.png'),'systems':asset_uri('systems.png'),'connect':asset_uri('connected-workspace.png')}

def result_panel(case, index):
    name = e(case['label'])
    logo = f'<img src="{asset_uri(case["logo"])}" alt="{name}" width="357" height="87" decoding="async">' if case.get('logo') else f'<span>{name}</span>'
    secondary = case.get('secondary')
    extra = f'<div class="case-secondary"><strong>{e(secondary["value"])}<span>{e(secondary["suffix"])}</span></strong><p>{e(secondary["metric"])}</p></div>' if secondary else ''
    return f'<article class="case-panel" id="case-{e(case["id"])}" role="tabpanel" aria-labelledby="case-tab-{e(case["id"])}"{ " hidden" if index else ""}><div class="case-story"><div class="case-brand">{logo}</div><p class="case-category">{e(case["category"])}</p><h3>{e(case["headline"])}</h3></div><div class="case-impact"><p class="case-value">{e(case["value"])}<span>{e(case["suffix"])}</span></p><p class="case-metric">{e(case["metric"])}</p>{extra}</div></article>'

def capability_icon(kind):
    names = {'people':'users','finance':'chart-line','tax':'receipt','contract':'file-signature','crm':'people-arrows','routine':'mobile-screen-button'}
    return fa_svg(names[kind])

def capability_card(area, index):
    return f'<details class="capability-card" id="capability-{e(area["id"])}"><summary><span class="capability-top"><span class="capability-icon">{capability_icon(area["icon"])}</span><span class="capability-area">{e(area["name"])}</span><span class="capability-index">0{index+1}</span></span><h3>{e(area["headline"])}</h3><span class="capability-summary">{e(area["summary"])}</span><span class="capability-more">Ver possibilidades<span aria-hidden="true">{fa_svg('plus')}</span></span></summary><div class="capability-detail"><p>Podemos construir para sua operação</p><ul>'+''.join(f'<li>{e(item)}</li>' for item in area['examples'])+'</ul></div></details>'

tokens = {
    'HERO_DESCRIPTION': e(visual['hero_lead']),
    'HERO_CTA': e(sections['hero']['cta']),
    'CLIENTS': ''.join(f'<div class="kb-logo-item kb-logo-item--{e(client_logos[n]["slug"])}" role="listitem"><img src="{asset_uri(client_logos[n]["file"])}" alt="{e(n)}" width="{client_logos[n]["width"]}" height="{client_logos[n]["height"]}" loading="eager" decoding="async"></div>' for n in sections['hero']['clients']),
    'SOLUTION_DESCRIPTION': e(sections['solucoes']['paragraphs'][0]),
    'SOLUTION_ITEMS': ''.join(f'<details class="build-card build-{kind}"><summary><img class="build-art" src="{images[kind]}" alt="{e(alt)}" loading="lazy" decoding="async"><span class="build-copy"><h3>{e(item["title"])}</h3><span class="build-deck">{e(visual["solution_summaries"][i])}</span></span><span class="build-open">Explorar <b aria-hidden="true">{fa_svg('plus')}</b></span></summary><div class="build-detail"><p>{e(item["text"])}</p></div></details>' for i,(item,kind,label,alt) in enumerate(zip(sections['solucoes']['items'],['ai','systems','connect'],['FUNCIONÁRIOS DE IA','TECNOLOGIA SOB MEDIDA','INTEGRAÇÃO'],['Imagem conceitual de uma colaboradora digital de IA','Imagem conceitual de uma estrutura digital sob medida','Imagem conceitual de um ambiente de trabalho conectado']))),
    'RESULT_TABS': ''.join(f'<button type="button" role="tab" id="case-tab-{e(case["id"])}" aria-selected="{str(index==0).lower()}" aria-controls="case-{e(case["id"])}" tabindex="{0 if index==0 else -1}" data-case="{e(case["id"])}"><span>{e(case["label"])}</span><small>{e(case["value"])}{e(case["suffix"])}</small></button>' for index,case in enumerate(results['cases'])),
    'RESULT_PANELS': ''.join(result_panel(case,index) for index,case in enumerate(results['cases'])),
    'RESULT_NOTE': e(results['note']),
    'CAPABILITY_INTRO': e(capabilities['intro']),
    'CAPABILITY_CARDS': ''.join(capability_card(area,index) for index,area in enumerate(capabilities['areas'])),
    'IMPLEMENTATION_EYEBROW': e(capabilities['implementation']['eyebrow']),
    'IMPLEMENTATION_TITLE': e(capabilities['implementation']['title']),
    'IMPLEMENTATION_TEXT': e(capabilities['implementation']['text']),
    'IMPLEMENTATION_CTA': e(capabilities['implementation']['cta']),
    'METHOD_STEPS': ''.join(f'<div class="method-accordion-item{ " is-active" if i==0 else ""}"><h3><button class="method-accordion-trigger" type="button" id="method-trigger-{i}" data-step="{i}" aria-expanded="{str(i==0).lower()}" aria-disabled="{str(i==0).lower()}" aria-controls="method-step-{i}"><span class="method-accordion-number" aria-hidden="true">0{i+1}</span><span class="method-accordion-title">{e(s["title"])}</span><span class="method-accordion-mark" aria-hidden="true">{fa_svg('plus')}{fa_svg('minus')}</span></button></h3><div class="method-accordion-panel" id="method-step-{i}" role="region" aria-labelledby="method-trigger-{i}"{ " hidden" if i else ""}><p>{e(s["text"])}</p></div><span class="method-progress" aria-hidden="true"></span></div>' for i,s in enumerate(sections['metodo']['steps'])),
    'METHOD_DATA': json.dumps(sections['metodo']['steps'],ensure_ascii=False).replace('</','<\\/'),
    'FAQ': ''.join(f'<details class="faq-item"><summary>{e(s["question"])}<span aria-hidden="true">{fa_svg('plus')}</span></summary><p>{e(s["answer"])}</p></details>' for s in sections['perguntas']['faq']),
    'CONTACT_CTA': 'Vamos conversar',
    'CONTACT_MICROCOPY': e(sections['contato']['microcopy'])
}
tokens.update(ASSET_BRAND=asset_uri('kobalt-original.svg'),ASSET_WORKSPACE=images['connect'])
for name in ['file-lines','microchip','diagram-project','user-tie','sliders','users','database','shield-halved','arrow-right','arrow-down','arrow-up']:
    tokens['FA_'+name.upper().replace('-','_')] = fa_svg(name, 'inline-arrow' if name == 'arrow-right' else '')
tokens['FA_MENU_BARS'] = fa_svg('bars', 'menu-open-icon')
tokens['FA_MENU_CLOSE'] = fa_svg('xmark', 'menu-close-icon')
method_js = (ROOT/'method-lab.js').read_text().replace('__FA_METHOD_ICONS__', json.dumps({key:fa_svg(value) for key,value in METHOD_ICONS.items()}, ensure_ascii=False))
html = (ROOT / 'template.html').read_text()
for key,value in tokens.items():
    html = html.replace('__'+key+'__',value)
assert '__HERO_' not in html
forge_js = (ROOT/'hero-forge.js').read_text().replace('__FORGE_SHADERS__', (ROOT/'hero-forge-shaders.js').read_text())
html = html.replace('__CSS__',(ROOT/'styles.css').read_text()+'\n'+(ROOT/'breathing.css').read_text()+'\n'+(ROOT/'media.css').read_text()+'\n'+(ROOT/'palette.css').read_text()+'\n'+(ROOT/'workflow.css').read_text()+'\n'+(ROOT/'results.css').read_text()+'\n'+(ROOT/'capabilities.css').read_text()+'\n'+(ROOT/'method-lab.css').read_text()+'\n'+(ROOT/'readability.css').read_text()+'\n'+(ROOT/'method-accordion.css').read_text()+'\n'+(ROOT/'closing-card.css').read_text()+'\n'+(ROOT/'fontawesome.css').read_text()+'\n'+(ROOT/'hero-forge.css').read_text()+'\n'+(WORKSPACE/'design-system'/'home-theme.css').read_text()+'\n'+(WORKSPACE/'design-system'/'components.css').read_text()+'\n'+(WORKSPACE/'design-system'/'logo-carousel.css').read_text()+'\n'+(ROOT/'hero-transition.css').read_text()+'\n'+(ROOT/'hero-mineral-3d.css').read_text()).replace('__JS__',(ROOT/'script.js').read_text()+'\n'+(ROOT/'hero-transition.js').read_text()+'\n'+(ROOT/'hero-mineral-3d.js').read_text()+'\n'+forge_js+'\n'+(ROOT/'workflow.js').read_text()+'\n'+(ROOT/'results.js').read_text()+'\n'+method_js+'\n'+(WORKSPACE/'design-system'/'logo-carousel.js').read_text())
(DIST/'index.html').write_text(html)
hero_dir = DIST / 'assets/hero'
hero_dir.mkdir(parents=True, exist_ok=True)
shutil.copy2(ROOT / 'assets/mineral-azul-no-espaco.png', hero_dir / 'mineral-azul-no-espaco.png')
shutil.copytree(ROOT / 'assets/hero/vendor', hero_dir / 'vendor', dirs_exist_ok=True)
print(DIST / 'index.html')
