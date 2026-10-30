import { initChrome, esc } from './common.js';

initChrome();

const SOURCE = 'https://www.leebmann24.com/de/de/collection/bmw-ersatzteile-10004';
const GROUPS = [
  ['03','Nachrüstung, Umrüstung, Zubehör',['Nachrüstsätze','Anhängerkupplung','Tempomat']],
  ['11','Motor',['Kurbeltrieb – Kolben','Kurbeltrieb – Pleuelstange','Kurbeltrieb – Kurbelwelle','Zylinderkopf','Kurbelgehäuse-Entlüftung','Ölversorgung','Motoraufhängung']],
  ['12','Motor-Elektrik',['Zündspulen und Zündkerzen','Generator','Anlasser','Motorsteuergerät','Motorkabelbaum']],
  ['13','Kraftstoffaufbereitung',['Ansauganlage','Drosselklappe','Einspritzventile','Luftmassenmesser']],
  ['16','Kraftstoffversorgung',['Kraftstofftank','Kraftstoffpumpe','Kraftstoffleitungen','Aktivkohlefilter']],
  ['17','Kühler',['Wasserpumpe','Thermostat','Kühler','Ausgleichsbehälter','Lüfter','Kühlmittelschläuche']],
  ['18','Abgasanlage',['Abgaskrümmer','Katalysator','Mittel- und Endschalldämpfer','Abgashalterungen']],
  ['21','Kupplung',['Kupplungsscheibe','Druckplatte','Ausrücklager','Kupplungsbetätigung']],
  ['23','Getriebe mechanisch',['Schaltgetriebe','Getriebegehäuse','Lager und Dichtungen']],
  ['24','Getriebe automatisch',['Automatikgetriebe','Ölkühler','Getriebesteuerung']],
  ['25','Schaltung',['Schalthebel','Schaltgestänge','Schaltmanschette']],
  ['26','Gelenkwelle',['Kardanwelle','Hardyscheibe','Mittellager']],
  ['31','Vorderachse',['Vorderachsträger','Querlenker','Federbein und Stoßdämpfer','Stabilisator','Radlager']],
  ['32','Lenkung',['Lenkgetriebe','Servopumpe','Lenksäule','Lenkrad']],
  ['33','Hinterachse',['Hinterachsträger','Hinterachsschwinge','Stoßdämpfer hinten','Schraubenfeder hinten','Stabilisator hinten','Differential']],
  ['34','Bremsen',['Bremse vorne','Bremse hinten','Feststellbremse','Bremsleitungen','Hauptbremszylinder']],
  ['35','Fußbetätigung',['Pedalerie','Gaspedal und Gaszug','Kupplungspedal']],
  ['41','Karosserie Blechteile',['Frontblech','Kotflügel','Türen','Heckklappe','Unterboden']],
  ['51','Fahrzeugausstattung',['Stoßfänger','Außenspiegel','Fensterheber','Innenverkleidung','Türdichtungen']],
  ['52','Sitze',['Vordersitze','Rückbank','Sitzschienen','Sitzverstellung']],
  ['54','Schiebedach / Verdeck',['Schiebedach','Cabrioverdeck','Verdeckgestänge','Dichtungen']],
  ['61','Fahrzeug-Elektrik',['Kabelbäume','Sicherungskasten','Relais','Batterie und Leitungen']],
  ['62','Anzeigeinstrumente / Messsysteme',['Kombiinstrument','Bordcomputer','Instrumentensensoren']],
  ['63','Beleuchtungsanlage',['Scheinwerfer vorne','Rückleuchten','Nebelscheinwerfer','Innenleuchten']],
  ['64','Heizung und Klimaanlage',['Klimakompressor','Heizgerät','Gebläse','Lüftungskanäle']],
  ['65','Audio, Navigation, Elektroniksysteme',['Stereo-System','HiFi-System','Top-HiFi-System','Lautsprecher','Radio und Navigation','Verstärker','Audio-Kabelbäume']],
  ['66','Distanzsysteme / Geschwindigkeitsregelung',['Park Distance Control','Geschwindigkeitsregelung','Sensoren']],
  ['71','Ausrüstungsteile',['Bordwerkzeug','Wagenheber','Warndreieck']],
  ['72','Zubehör und Rückhaltesysteme',['Sicherheitsgurte','Airbag-System','Kindersitzbefestigung']],
  ['84','Kommunikations-Systeme',['Telefon','Antenne','Freisprecheinrichtung']]
].map(([code, name, examples]) => ({code,name,examples}));
const VEHICLES = {
  E36: { bodies:['Coupé','Limousine','Touring','Compact','Cabriolet'], engines:['316i','318i','318is','320i','323i','325i','328i','M3'], date:'1997-06' },
  E46: { bodies:['Coupé','Limousine','Touring','Compact','Cabriolet'], engines:['316i','318i','320i','323i','325i','328i','330i','M3'], date:'2002-06' }
};
const state = { series:'E36', group:'11', subgroup:null, q:'', zoom:1, panX:0, panY:0 };
const $ = (id) => document.getElementById(id);
const viewport = $('atlas-viewport');
const car = $('atlas-car-transform');
const groupList = $('atlas-group-list');
const groupDetail = $('atlas-group-detail');
const crumbs = $('atlas-breadcrumbs');
const clamp = (n, min, max) => Math.min(max, Math.max(min,n));

function vehicleSvg(series) {
  const e46 = series === 'E46';
  const body = e46
    ? 'M133 247 Q145 215 195 208 L240 180 Q275 102 344 86 Q460 67 576 86 Q645 102 680 180 L725 208 Q775 215 787 247 L789 331 Q776 366 733 370 L187 370 Q144 366 131 331 Z'
    : 'M132 252 L169 217 L242 195 L285 108 Q300 90 349 86 L571 86 Q620 90 635 108 L678 195 L751 217 L788 252 L786 338 Q770 369 730 371 L190 371 Q150 369 134 338 Z';
  const windshield = e46
    ? 'M284 184 Q310 113 350 109 Q460 92 570 109 Q610 113 636 184 Z'
    : 'M283 188 L315 113 Q324 107 354 106 L566 106 Q596 107 605 113 L637 188 Z';
  const leftLamp = e46
    ? '<path d="M174 242 Q244 209 364 235 L367 279 Q261 293 176 277 Z" fill="#111a21" stroke="#9da9b5" stroke-width="4"/><ellipse cx="235" cy="253" rx="32" ry="23" fill="#a9c4cf" opacity=".8"/><ellipse cx="308" cy="256" rx="29" ry="22" fill="#a9c4cf" opacity=".8"/><ellipse cx="235" cy="253" rx="24" ry="17" fill="#273b49"/><ellipse cx="308" cy="256" rx="22" ry="16" fill="#273b49"/>'
    : '<path d="M170 235 L366 231 L362 280 L174 281 Z" fill="#111a21" stroke="#9da9b5" stroke-width="4"/><circle cx="225" cy="256" r="24" fill="#b9d3db"/><circle cx="308" cy="256" r="24" fill="#b9d3db"/><circle cx="225" cy="256" r="17" fill="#263d49"/><circle cx="308" cy="256" r="17" fill="#263d49"/>';
  const grille = e46
    ? '<path d="M391 239 Q416 226 453 240 L450 296 Q414 306 390 287 Z M467 240 Q504 226 529 239 L530 287 Q506 306 470 296 Z" fill="#0b1014" stroke="#c2ccd5" stroke-width="5"/>'
    : '<path d="M398 234 L452 238 L449 291 L398 290 Z M468 238 L522 234 L522 290 L471 291 Z" fill="#0b1014" stroke="#c2ccd5" stroke-width="5"/>';
  return `<svg viewBox="0 0 920 450" role="img" aria-label="Eigenständige stilisierte Frontansicht BMW ${series}">
    <defs>
      <linearGradient id="atlas-metal" x1="0" y1="0" x2=".2" y2="1"><stop offset="0" stop-color="#3d5360"/><stop offset=".45" stop-color="#1c2b35"/><stop offset=".8" stop-color="#111c24"/><stop offset="1" stop-color="#273741"/></linearGradient>
      <linearGradient id="atlas-glass" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#111c24"/><stop offset="1" stop-color="#2b4654"/></linearGradient>
      <linearGradient id="atlas-bumper" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#2a414c"/><stop offset="1" stop-color="#0b131a"/></linearGradient>
    </defs>
    <ellipse cx="460" cy="393" rx="342" ry="30" fill="#000" opacity=".55"/>
    <path d="${body}" fill="url(#atlas-metal)" stroke="#7592a0" stroke-width="4"/>
    <path d="${windshield}" fill="url(#atlas-glass)" stroke="#8099a7" stroke-width="3"/>
    <path d="M279 191 Q460 204 641 191" fill="none" stroke="#a4b7c1" opacity=".5" stroke-width="3"/>
    <path d="M171 218 Q460 199 749 218" fill="none" stroke="#98acb7" opacity=".4" stroke-width="3"/>
    <path d="M145 299 Q460 312 775 299 L772 344 Q460 364 148 344 Z" fill="url(#atlas-bumper)" stroke="#6c818c" stroke-width="2"/>
    ${leftLamp}
    <g transform="translate(920 0) scale(-1 1)">${leftLamp}</g>
    ${grille}
    <g stroke="#a5b4bf" stroke-width="3" opacity=".85">
      <path d="M406 244v41 M417 244v41 M429 244v41 M440 244v41 M481 244v41 M493 244v41 M504 244v41 M515 244v41"/>
    </g>
    <path d="M348 317 Q460 311 572 317 L563 343 Q460 351 357 343 Z" fill="#080d12" stroke="#536c7a" stroke-width="3"/>
    <path d="M185 317 L304 317 L294 341 L194 341 Z M616 317 L735 317 L726 341 L626 341 Z" fill="#0b141b" stroke="#4e6774" stroke-width="2"/>
    <path d="M426 211 Q460 202 494 211" stroke="#6f8a99" stroke-width="3" fill="none"/>
    <text x="460" y="418" text-anchor="middle" fill="#41c4d9" font-family="Arial,sans-serif" font-size="15" letter-spacing="5">COLDSTART / ${series}</text>
  </svg>`;
}

function applyTransform() {
  car.style.transform = `translate(calc(-50% + ${state.panX}px),calc(-50% + ${state.panY}px)) scale(${state.zoom})`;
  $('atlas-zoom-value').textContent = `${Math.round(state.zoom * 100)} %`;
}
function zoomTo(value) { state.zoom = clamp(value,.65,3.5); applyTransform(); }
function resetView() { state.zoom = 1; state.panX = 0; state.panY = 0; applyTransform(); }
$('atlas-zoom-in').addEventListener('click',()=>zoomTo(state.zoom*1.2));
$('atlas-zoom-out').addEventListener('click',()=>zoomTo(state.zoom/1.2));
$('atlas-reset').addEventListener('click',resetView);
viewport.addEventListener('dblclick',resetView);
viewport.addEventListener('wheel',(event)=>{
  event.preventDefault();
  zoomTo(state.zoom * (event.deltaY < 0 ? 1.12 : 1/1.12));
},{passive:false});
let drag = null;
viewport.addEventListener('pointerdown',(event)=>{
  if(event.button !== 0) return;
  drag = {id:event.pointerId,x:event.clientX,y:event.clientY,panX:state.panX,panY:state.panY};
  viewport.setPointerCapture(event.pointerId);
});
viewport.addEventListener('pointermove',(event)=>{
  if(!drag || event.pointerId !== drag.id) return;
  state.panX = drag.panX + event.clientX-drag.x;
  state.panY = drag.panY + event.clientY-drag.y;
  applyTransform();
});
function endDrag(event) { if(drag?.id === event.pointerId) drag = null; }
viewport.addEventListener('pointerup',endDrag);
viewport.addEventListener('pointercancel',endDrag);
viewport.addEventListener('keydown',(event)=>{
  const directions={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]};
  if(directions[event.key]) {
    event.preventDefault(); state.panX += directions[event.key][0]; state.panY += directions[event.key][1]; applyTransform();
  } else if(event.key==='+' || event.key==='=') { event.preventDefault(); zoomTo(state.zoom*1.2); }
  else if(event.key==='-') { event.preventDefault(); zoomTo(state.zoom/1.2); }
  else if(event.key==='0') { event.preventDefault(); resetView(); }
});

function selectOptions(el, values, selected) {
  el.replaceChildren(...values.map(value=>{
    const opt = document.createElement('option'); opt.value=value; opt.textContent=value; opt.selected=value===selected; return opt;
  }));
}
function renderVehicle() {
  const v=VEHICLES[state.series];
  selectOptions($('atlas-body'),v.bodies,v.bodies[0]);
  selectOptions($('atlas-engine'),v.engines,v.engines.includes('328i')?'328i':v.engines[0]);
  $('atlas-date').value=v.date;
  $('atlas-series-title').textContent=state.series;
  $('atlas-car-title').textContent=`3er ${state.series} · Frontansicht`;
  car.innerHTML=vehicleSvg(state.series);
  document.querySelectorAll('[data-series]').forEach(button=>{
    const active=button.dataset.series===state.series;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  resetView();
}
document.querySelectorAll('[data-series]').forEach(button=>button.addEventListener('click',()=>{
  if(state.series===button.dataset.series)return;
  state.series=button.dataset.series; state.subgroup=null;
  renderVehicle(); renderCatalog(); syncUrl();
}));
function syncUrl(){
  const params=new URLSearchParams();
  params.set('serie',state.series.toLowerCase());
  if(state.group)params.set('gruppe',state.group);
  history.replaceState(null,'',location.pathname+'?'+params);
}
function filteredGroups(){
  const q=state.q.trim().toLocaleLowerCase('de');
  return GROUPS.filter(group=>!q || `${group.code} ${group.name} ${group.examples.join(' ')}`.toLocaleLowerCase('de').includes(q));
}
function renderCatalog(){
  const visible=filteredGroups();
  groupList.innerHTML=visible.length?visible.map(group=>`<button class="atlas-group ${group.code===state.group?'active':''}" type="button" data-group="${group.code}" aria-pressed="${group.code===state.group}"><span class="atlas-group-code">${group.code}</span><span>${esc(group.name)}</span></button>`).join(''):'<p class="atlas-empty">Keine passende Hauptgruppe gefunden.</p>';
  groupList.querySelectorAll('[data-group]').forEach(button=>button.addEventListener('click',()=>{
    state.group=button.dataset.group;state.subgroup=null;renderCatalog();syncUrl();
  }));
  const group=GROUPS.find(g=>g.code===state.group) ?? visible[0];
  if(!group) {groupDetail.innerHTML='<p class="atlas-empty">Bitte einen anderen Suchbegriff eingeben.</p>';crumbs.textContent='';return;}
  crumbs.innerHTML=`<button type="button" id="atlas-back-model">${esc(state.series)}</button><span>›</span><span>${group.code} ${esc(group.name)}</span>${state.subgroup?'<span>›</span><span>'+esc(state.subgroup)+'</span>':''}`;
  $('atlas-back-model').addEventListener('click',()=>{state.group='11';state.subgroup=null;state.q='';$('atlas-search').value='';renderCatalog();syncUrl();});
  const choices=group.examples.filter(s=>!state.q || (`${group.name} ${s}`).toLocaleLowerCase('de').includes(state.q.toLocaleLowerCase('de')) || group.name.toLocaleLowerCase('de').includes(state.q.toLocaleLowerCase('de')));
  const tiles=choices.map((name,i)=>`<button class="atlas-subgroup ${name===state.subgroup?'active':''}" data-subgroup="${i}" type="button"><span>${esc(name)}</span><span>↗</span></button>`).join('');
  groupDetail.innerHTML=`
    <p class="atlas-detail-kicker">Hauptgruppe ${group.code} // ${esc(state.series)}</p>
    <h3>${esc(group.name)}</h3>
    <p class="atlas-detail-desc">Thematische Unterbaugruppen als Einstieg. Die Bezeichnungen sind redaktionelle Beispiele, keine verifizierte vollständige BMW-ETK-Zuordnung.</p>
    <div class="atlas-subgroups">${tiles||'<p class="atlas-empty">Keine Unterbaugruppen für diese Suche.</p>'}</div>
    <div id="atlas-selection"></div>
    <div class="atlas-source-box">Explosionszeichnungen und Teilepositionen: <strong>noch nicht lizenziert/importiert</strong>.<br><a href="${SOURCE}" target="_blank" rel="noopener noreferrer">Originalkatalog bei Leebmann24 aufrufen ↗</a></div>`;
  groupDetail.querySelectorAll('[data-subgroup]').forEach(button=>button.addEventListener('click',()=>{
    state.subgroup=choices[Number(button.dataset.subgroup)];renderCatalog();
  }));
  if(state.subgroup){
    $('atlas-selection').innerHTML=`<div class="atlas-position-status"><strong>${esc(state.subgroup)}</strong><p>Für diese Unterbaugruppe sind noch keine lizenzierten Bildtafeln, Positionsnummern, Teilenummern oder Varianten hinterlegt. Die Zuordnung zu Motor, Produktionsmonat und Sonderausstattung muss vor einer Teileempfehlung geprüft werden.</p></div>`;
  }
}
$('atlas-search').addEventListener('input',event=>{
  state.q=event.target.value.trim();state.subgroup=null;
  const visible=filteredGroups();
  if(visible.length&&!visible.some(g=>g.code===state.group))state.group=visible[0].code;
  renderCatalog();
});
const params=new URLSearchParams(location.search);
if(params.get('serie')?.toUpperCase()==='E46')state.series='E46';
if(GROUPS.some(g=>g.code===params.get('gruppe')))state.group=params.get('gruppe');
renderVehicle();
renderCatalog();
