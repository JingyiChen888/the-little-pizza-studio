(() => {
  'use strict';

  const canvas = document.querySelector('#pizza-canvas');
  const ctx = canvas.getContext('2d');
  const atlas = new Image();
  atlas.src = 'assets/toppings-atlas.png';
  const rawDough = new Image();
  rawDough.src = 'assets/dough-raw.png';
  const bakedDough = new Image();
  bakedDough.src = 'assets/dough-baked.png';
  const paintStamps = new Image();
  paintStamps.src = 'assets/sauce-cheese-stamps.png';
  const $ = (selector) => document.querySelector(selector);
  const WIDTH = 900;
  const HEIGHT = 700;
  const CENTER = { x: 450, y: 350 };
  const STORAGE_KEY = 'little-pizza-studio-v1';
  const STEPS = [
    { name: 'Crust', en: 'DOUGH', title: 'Choose your crust', description: 'Classic, thin, or whole wheat: choose the starting point for your pizza.', tip: 'Choose a crust on the right' },
    { name: 'Sauce', en: 'SAUCE', title: 'Spread the sauce', description: 'Choose a sauce, then press and drag to spread it across the pizza.', tip: 'Press and drag on the crust to spread your sauce' },
    { name: 'Cheese', en: 'CHEESE', title: 'Add the cheese', description: 'Press and drag to scatter cheese by hand. Your finished layer will look deliciously full.', tip: 'Drag over the pizza to scatter cheese' },
    { name: 'Toppings', en: 'TOPPINGS', title: 'Place your toppings', description: 'Choose an ingredient, then click the pizza. Drag, rotate, or resize it afterward.', tip: 'Choose a topping, click to place it, or drag one to move it' },
    { name: 'Bake', en: 'BAKE', title: 'Bake your pizza', description: 'Your toppings stay in place while the crust and cheese turn golden.', tip: 'Set the timer, then start baking' },
    { name: 'Save', en: 'SAVE', title: 'Name your pizza', description: 'Give your handmade pizza a name and save it as an image.', tip: 'Give it a name, then download your image' }
  ];
  const TOPPINGS = [
    { id: 'mushroom', name: 'Mushroom', col: 0, row: 0 },
    { id: 'onion', name: 'Onion', col: 1, row: 0 },
    { id: 'basil', name: 'Basil', col: 2, row: 0 },
    { id: 'pepperoni', name: 'Pepperoni', col: 3, row: 0 },
    { id: 'tomato', name: 'Cherry tomato', col: 0, row: 1 },
    { id: 'pepper', name: 'Green pepper', col: 1, row: 1 },
    { id: 'olive', name: 'Black olive', col: 2, row: 1 },
    { id: 'mozzarella', name: 'Mozzarella', col: 3, row: 1 }
  ];
  const SAUCES = [
    { id: 'tomato', name: 'Tomato sauce', color: '#b8543d', sub: 'Tangy and classic' },
    { id: 'pesto', name: 'Basil pesto', color: '#688559', sub: 'Fresh and herby' },
    { id: 'cream', name: 'Cream sauce', color: '#e8d5a6', sub: 'Mild and rich' }
  ];
  const BASES = [
    { id: 'classic', name: 'Classic crust', sub: 'Soft and chewy' },
    { id: 'thin', name: 'Thin crust', sub: 'Light and crisp' },
    { id: 'wheat', name: 'Whole wheat', sub: 'Warm and nutty' }
  ];

  const freshState = () => ({ step: 0, base: null, sauce: 'tomato', sauceStrokes: [], cheeseDabs: [], toppings: [], activeTopping: 'mushroom', selected: -1, toppingSize: 100, brushSize: 58, bakeTime: 8, baked: false, name: '' });
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.sauceStrokes) || !Array.isArray(saved.cheeseDabs) || !Array.isArray(saved.toppings)) return freshState();
      const restored = { ...freshState(), ...saved, selected: -1, step: Math.max(0, Math.min(5, Number(saved.step) || 0)) };
      if (restored.step < 4) restored.baked = false;
      return restored;
    } catch { return freshState(); }
  }
  let state = restore();
  let undoStack = [];
  let pointerMode = null;
  let lastPaintPoint = null;
  let pointerMoved = false;
  let isBaking = false;
  let sizeSession = false;

  function snapshot() { return JSON.stringify(state); }
  function remember() { undoStack.push(snapshot()); if (undoStack.length > 50) undoStack.shift(); }
  function persist() { try { localStorage.setItem(STORAGE_KEY, snapshot()); } catch { /* Storage may be disabled. */ } }
  function commit() { persist(); renderUI(); renderCanvas(); }
  function canContinue() {
    return [Boolean(state.base), state.sauceStrokes.length > 0, state.cheeseDabs.length > 0, state.toppings.length > 0, state.baked, false][state.step];
  }
  function feedbackText() {
    if (state.step === 0) return state.base ? 'Crust selected. You can move on to the sauce.' : 'Choose a crust to continue.';
    if (state.step === 1) return state.sauceStrokes.length ? 'Looking good! Add more if you like, then select Next for a full finish.' : 'Press and drag across the pizza to spread sauce.';
    if (state.step === 2) return state.cheeseDabs.length ? 'Cheese is on! Add a little more, or select Next for a full finish.' : 'Drag your finger or mouse to scatter cheese.';
    if (state.step === 3) return state.toppings.length ? `${state.toppings.length} toppings placed. Select one on the pizza to adjust it.` : 'Choose a topping on the right, then click the pizza to place it.';
    if (state.step === 4) return state.baked ? 'Fresh from the oven! Select Next to name your pizza.' : 'Choose a baking time, then select Start baking.';
    return 'Enter a name, then download the image to your device.';
  }

  function renderProgress() {
    $('#progress-list').innerHTML = STEPS.map((s, i) => `<li class="${i === state.step ? 'active' : i < state.step ? 'done' : ''}"><button type="button" data-step="${i}" ${i >= state.step ? 'disabled' : ''} aria-current="${i === state.step ? 'step' : 'false'}"><span class="num">${i < state.step ? '✓' : i + 1}</span><span class="label">${s.name}</span></button></li>`).join('');
  }
  function toolMarkup() {
    if (state.step === 0) return `<p class="tool-section-label">01 / CHOOSE A CRUST</p><div class="choice-list dough-list">${BASES.map(b => `<button class="choice-card ${state.base === b.id ? 'active' : ''}" type="button" data-base="${b.id}" aria-pressed="${state.base === b.id}"><span class="dough-preview ${b.id}"></span><span><strong>${b.name}</strong><small>${b.sub}</small></span></button>`).join('')}</div><div class="tool-hint">Your choice will appear on the workbench right away.</div>`;
    if (state.step === 1) return `<p class="tool-section-label">02 / CHOOSE A SAUCE</p><div class="choice-list">${SAUCES.map(s => `<button class="choice-card ${state.sauce === s.id ? 'active' : ''}" type="button" data-sauce="${s.id}" aria-pressed="${state.sauce === s.id}"><span class="sauce-preview ${s.id}"></span><strong>${s.name}</strong><small>${s.sub}</small></button>`).join('')}</div><div class="control-box"><div class="control-line"><label for="brush-size">Brush width</label><output id="brush-size-value">${state.brushSize}px</output></div><input id="brush-size" type="range" min="28" max="92" value="${state.brushSize}"></div><div class="tool-hint">Try spreading from the center outward. A light spread fills out beautifully when you move on.</div>`;
    if (state.step === 2) return `<p class="tool-section-label">03 / MOZZARELLA</p><div class="choice-list"><div class="choice-card active" aria-label="Mozzarella cheese"><canvas class="ingredient-thumb" data-topping-thumb="mozzarella" width="130" height="130"></canvas><strong>Hand-scattered cheese</strong><small>Add as much as you like</small></div></div><div class="control-box"><div class="control-line"><label for="brush-size">Cheese brush size</label><output id="brush-size-value">${state.brushSize}px</output></div><input id="brush-size" type="range" min="28" max="92" value="${state.brushSize}"></div><div class="tool-hint">Press and drag to scatter cheese. The finished layer will be generous, with hints of sauce showing through.</div>`;
    if (state.step === 3) return `<p class="tool-section-label">04 / CHOOSE TOPPINGS</p><div class="choice-list">${TOPPINGS.map(t => `<button class="choice-card ${state.activeTopping === t.id ? 'active' : ''}" type="button" data-topping="${t.id}" aria-pressed="${state.activeTopping === t.id}"><canvas class="ingredient-thumb" data-topping-thumb="${t.id}" width="130" height="130"></canvas><strong>${t.name}</strong></button>`).join('')}</div><div class="control-box"><div class="control-line"><label for="topping-size">${state.selected >= 0 ? 'Selected topping size' : 'Next topping size'}</label><output id="topping-size-value">${state.selected >= 0 ? Math.round(state.toppings[state.selected].size * 100) : state.toppingSize}%</output></div><input id="topping-size" type="range" min="55" max="155" value="${state.selected >= 0 ? Math.round(state.toppings[state.selected].size * 100) : state.toppingSize}"><div class="selected-tools"><button class="small-tool" type="button" data-edit="rotate-left">↶ Rotate</button><button class="small-tool" type="button" data-edit="rotate-right">Rotate ↷</button><button class="small-tool danger" type="button" data-edit="remove">× Remove</button></div></div><div class="tool-hint">The menu and pizza use the same topping artwork. Click to place, drag to move, then resize or rotate.</div>`;
    if (state.step === 4) return `<div class="bake-card"><span class="oven-emoji">♨</span><strong>${state.baked ? 'Fresh from the oven!' : 'Watch your pizza turn golden'}</strong><small>The crust browns while toppings stay in place</small></div><div class="control-line"><label for="bake-time">Baking time</label><output id="bake-time-value">${state.bakeTime} min</output></div><input id="bake-time" type="range" min="6" max="12" value="${state.bakeTime}" ${state.baked ? 'disabled' : ''}><button id="bake-action" class="bake-action" type="button" ${state.baked || isBaking ? 'disabled' : ''}>${state.baked ? '✓ Baked' : 'Start baking →'}</button><div class="tool-hint">This is a quick game animation; no need to wait ${state.bakeTime} real minutes.</div>`;
    return `<p class="tool-section-label">06 / YOUR PIZZA</p><div class="bake-card"><span class="oven-emoji">✳</span><strong>A pizza made by you</strong><small>Every topping is right where you placed it</small></div><label class="name-label" for="pizza-name">Name your pizza</label><input id="pizza-name" class="name-input" type="text" maxlength="26" placeholder="e.g. Sunday Special"><button id="save-action" class="save-action" type="button">Download your pizza ↓</button><div class="tool-hint">Download a PNG with your toppings and your pizza name.</div>`;
  }
  function renderThumbs() {
    document.querySelectorAll('[data-topping-thumb]').forEach(el => {
      const t = TOPPINGS.find(x => x.id === el.dataset.toppingThumb);
      if (!t) return;
      const thumbCtx = el.getContext('2d');
      thumbCtx.clearRect(0, 0, el.width, el.height);
      drawAtlas(thumbCtx, t, 65, 65, 112);
    });
  }
  function renderUI() {
    const stage = STEPS[state.step];
    renderProgress();
    $('#step-counter').textContent = String(state.step + 1).padStart(2, '0');
    $('#canvas-title').textContent = stage.title;
    $('#tool-step').textContent = `STEP ${String(state.step + 1).padStart(2, '0')} / 06`;
    $('#tool-title').textContent = stage.name;
    $('#tool-description').textContent = stage.description;
    $('#canvas-tip').textContent = state.step === 4 && state.baked ? 'All baked! Select Next to name your pizza' : stage.tip;
    $('#canvas-tip').hidden = state.step === 5;
    $('#work-status').textContent = state.step === 5 ? 'Pizza complete' : canContinue() ? 'Ready for the next step' : 'In progress';
    $('#piece-count').textContent = `${state.toppings.length} toppings`;
    $('#feedback').textContent = feedbackText();
    $('#back').disabled = state.step === 0 || isBaking;
    $('#undo').disabled = undoStack.length === 0 || isBaking;
    $('#next').disabled = !canContinue() || isBaking;
    $('#next').innerHTML = state.step === 5 ? 'Complete' : 'Next <span>→</span>';
    $('#tool-content').innerHTML = toolMarkup();
    if (state.step === 5) $('#pizza-name').value = state.name;
    renderThumbs();
  }

  function random(n) { const x = Math.sin(n * 127.1 + 17.49) * 43758.5453; return x - Math.floor(x); }
  function roundedRect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  function drawBackground(c) {
    c.fillStyle = '#ebdcc5'; c.fillRect(0, 0, WIDTH, HEIGHT);
    const wood = c.createLinearGradient(0, 0, WIDTH, HEIGHT); wood.addColorStop(0, '#f4e5cc'); wood.addColorStop(.55, '#ecdbc0'); wood.addColorStop(1, '#e4cfaf'); c.fillStyle = wood; c.fillRect(0, 0, WIDTH, HEIGHT);
    c.save(); c.globalAlpha = .22; c.strokeStyle = '#be9e79'; c.lineWidth = 2;
    for (let i = 0; i < 26; i++) { const y = (i * 47 + random(i) * 22) % HEIGHT; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(220, y + random(i+4)*16-8, 650, y + random(i+8)*18-9, WIDTH, y + random(i+12)*10-5); c.stroke(); }
    c.restore();
    c.save(); c.shadowColor = '#7e5e3a42'; c.shadowBlur = 26; c.shadowOffsetY = 15; roundedRect(c, 100, 45, 700, 610, 45); c.fillStyle = '#c99f75'; c.fill(); c.restore();
    const board = c.createLinearGradient(100, 45, 800, 655); board.addColorStop(0, '#d5aa7f'); board.addColorStop(.5, '#c99c72'); board.addColorStop(1, '#be8e67'); roundedRect(c, 100, 45, 700, 610, 45); c.fillStyle = board; c.fill();
    c.save(); roundedRect(c, 100, 45, 700, 610, 45); c.clip(); c.strokeStyle = '#9c6d4b26'; c.lineWidth = 3; for (let i = 0; i < 28; i++) { const y = 61 + i * 22; c.beginPath(); c.moveTo(92, y); c.bezierCurveTo(290, y - 16, 580, y + 9, 810, y - 4); c.stroke(); } c.restore();
    c.strokeStyle = '#f0d1a879'; c.lineWidth = 4; roundedRect(c, 112, 57, 676, 586, 38); c.stroke();
  }
  function drawPlaceholder(c) {
    c.save(); c.strokeStyle = '#f8e6c6a8'; c.lineWidth = 3; c.setLineDash([8, 12]); c.beginPath(); c.arc(CENTER.x, CENTER.y, 257, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#fff0d1c9'; c.textAlign = 'center'; c.font = '600 27px Fraunces, serif'; c.fillText('Your pizza starts here', CENTER.x, CENTER.y - 5); c.font = '14px "DM Sans", sans-serif'; c.fillText('Choose a crust on the right to begin', CENTER.x, CENTER.y + 27); c.restore();
  }
  function pizzaRadius(s) { return s.base === 'thin' ? 244 : 260; }
  function innerRadius(s) { return pizzaRadius(s) - (s.base === 'thin' ? 28 : 42); }
  function drawCrust(c, s) {
    const R = pizzaRadius(s); const inner = innerRadius(s); const baked = s.baked;
    const doughImage = baked ? bakedDough : rawDough;
    if (doughImage.complete && doughImage.naturalWidth) {
      const imageSize = s.base === 'thin' ? 535 : 570;
      c.save();
      c.shadowColor = '#5d381e73'; c.shadowBlur = 23; c.shadowOffsetY = 11;
      if (s.base === 'wheat') c.filter = 'sepia(38%) saturate(82%) brightness(91%)';
      c.drawImage(doughImage, CENTER.x-imageSize/2, CENTER.y-imageSize/2, imageSize, imageSize);
      c.restore();
      return;
    }
    c.save(); c.shadowColor = '#5d381e73'; c.shadowBlur = 26; c.shadowOffsetY = 13; c.beginPath(); c.arc(CENTER.x, CENTER.y, R, 0, Math.PI * 2); c.fillStyle = '#9f704c'; c.fill(); c.restore();
    const g = c.createRadialGradient(CENTER.x-85, CENTER.y-80, inner*.55, CENTER.x, CENTER.y, R); 
    if (s.base === 'wheat') { g.addColorStop(0, baked ? '#c9a26e' : '#dcc39b'); g.addColorStop(.78, baked ? '#be8a50' : '#c3a577'); g.addColorStop(1, baked ? '#87512f' : '#a78359'); }
    else { g.addColorStop(0, baked ? '#f1cf92' : '#f3dfb8'); g.addColorStop(.78, baked ? '#e9b773' : '#e8c99a'); g.addColorStop(1, baked ? '#b9763e' : '#c89d69'); }
    c.beginPath(); c.arc(CENTER.x, CENTER.y, R, 0, Math.PI*2); c.fillStyle = g; c.fill();
    c.save(); c.globalAlpha = .65; c.strokeStyle = baked ? '#fff0bf' : '#fff4d9'; c.lineWidth = s.base === 'thin' ? 8 : 12; c.beginPath(); c.arc(CENTER.x, CENTER.y, R - 18, 3.4, 5.8); c.stroke(); c.restore();
    const ig = c.createRadialGradient(CENTER.x-50,CENTER.y-75,20,CENTER.x,CENTER.y,inner); ig.addColorStop(0,s.base==='wheat'?'#e9d0a5':baked?'#f1d29b':'#f7e6c5'); ig.addColorStop(1,s.base==='wheat'?'#ceb184':baked?'#eec17f':'#efdab3'); c.beginPath(); c.arc(CENTER.x,CENTER.y,inner,0,Math.PI*2); c.fillStyle=ig; c.fill();
    c.save(); c.globalAlpha = baked ? .72 : .24;
    for (let i=0;i<150;i++) { const a=random(i*3+1)*Math.PI*2; const r=inner+random(i*3+2)*(R-inner); const x=CENTER.x+Math.cos(a)*r; const y=CENTER.y+Math.sin(a)*r; const dot=1.5+random(i*3+3)*(baked?9:5); c.beginPath(); c.ellipse(x,y,dot,dot*.72,a,0,Math.PI*2); c.fillStyle=baked?(random(i+38)>.5?'#8a4b2c':'#bc7442'):'#d4a878'; c.fill(); }
    if (s.base==='wheat') { for(let i=0;i<90;i++){ const a=random(i*7+6)*Math.PI*2; const r=random(i*7+1)*inner; c.beginPath(); c.arc(CENTER.x+Math.cos(a)*r,CENTER.y+Math.sin(a)*r,1.3,0,Math.PI*2); c.fillStyle='#86643f'; c.fill(); } }
    c.restore();
  }
  function sauceColor(id) { return SAUCES.find(x => x.id === id)?.color || '#b8543d'; }
  function drawSauce(c, s) {
    if (!s.sauceStrokes.length) return;
    const radius = innerRadius(s) - 8;
    c.save(); c.beginPath(); c.arc(CENTER.x,CENTER.y,radius,0,Math.PI*2); c.clip();
    // Keep the hand-painted marks visible while painting, then finish the layer
    // when the player advances. The last sauce used determines its final color.
    if (s.step >= 2) {
      const kind = s.sauceStrokes.at(-1).kind;
      const fill = c.createRadialGradient(CENTER.x-42,CENTER.y-56,15,CENTER.x,CENTER.y,radius);
      if (kind === 'pesto') { fill.addColorStop(0,'#8a9d68'); fill.addColorStop(1,'#547046'); }
      else if (kind === 'cream') { fill.addColorStop(0,'#f3e3bf'); fill.addColorStop(1,'#d7bb84'); }
      else { fill.addColorStop(0,'#c96445'); fill.addColorStop(1,'#a9402d'); }
      c.fillStyle=fill; c.beginPath(); c.arc(CENTER.x,CENTER.y,radius,0,Math.PI*2); c.fill();
      if (kind === 'tomato' && paintStamps.complete && paintStamps.naturalWidth) {
        const cell = paintStamps.naturalWidth / 2;
        const size = radius * 2.14;
        c.globalAlpha = .82;
        c.drawImage(paintStamps,0,0,cell,paintStamps.naturalHeight,CENTER.x-size/2,CENTER.y-size/2,size,size);
        c.globalAlpha = 1;
      }
    }
    for (const stroke of s.sauceStrokes) {
      if (!stroke.points.length) continue;
      c.lineCap='round'; c.lineJoin='round'; c.strokeStyle=sauceColor(stroke.kind); c.fillStyle=sauceColor(stroke.kind); c.lineWidth=stroke.width || 58; c.globalAlpha=.91;
      if (stroke.points.length===1) { c.beginPath(); c.arc(stroke.points[0].x,stroke.points[0].y,c.lineWidth/2,0,Math.PI*2); c.fill(); }
      else { c.beginPath(); c.moveTo(stroke.points[0].x,stroke.points[0].y); for(const p of stroke.points.slice(1)) c.lineTo(p.x,p.y); c.stroke(); }
      c.globalAlpha=.14; c.strokeStyle=stroke.kind==='cream'?'#fff6dc':'#f8c080'; c.lineWidth=(stroke.width||58)*.68;
      if(stroke.points.length>1){c.beginPath();c.moveTo(stroke.points[0].x,stroke.points[0].y);for(const p of stroke.points.slice(1))c.lineTo(p.x,p.y);c.stroke();}
      if (stroke.kind === 'tomato' && paintStamps.complete && paintStamps.naturalWidth) {
        c.save(); c.globalAlpha = .42;
        const cell = paintStamps.naturalWidth / 2;
        let travelled = 0;
        for (let j = 0; j < stroke.points.length; j++) {
          const p = stroke.points[j];
          if (j) travelled += Math.hypot(p.x-stroke.points[j-1].x,p.y-stroke.points[j-1].y);
          if (j === 0 || travelled > 18) {
            const size = (stroke.width || 58) * (1.22 + random(j+71)*.23);
            c.drawImage(paintStamps,0,0,cell,paintStamps.naturalHeight,p.x-size/2,p.y-size/2,size,size);
            travelled = 0;
          }
        }
        c.restore();
      }
    }
    c.restore();
  }
  function drawCheese(c, s) {
    if (!s.cheeseDabs.length) return;
    c.save(); c.beginPath(); c.arc(CENTER.x,CENTER.y,innerRadius(s)-5,0,Math.PI*2); c.clip();
    // A sparse gesture becomes a generous, finished cheese layer on the next step.
    if (s.step >= 3) {
      const radius = innerRadius(s)-5;
      const fill = c.createRadialGradient(CENTER.x-35,CENTER.y-42,18,CENTER.x,CENTER.y,radius);
      fill.addColorStop(0,s.baked?'#ffe9bac7':'#fff4d6c4');
      fill.addColorStop(1,s.baked?'#edc985a6':'#f0ddab99');
      c.fillStyle=fill; c.beginPath(); c.arc(CENTER.x,CENTER.y,radius,0,Math.PI*2); c.fill();
      if (paintStamps.complete && paintStamps.naturalWidth) {
        const cell=paintStamps.naturalWidth/2, size=radius*2.04;
        c.globalAlpha=.94;
        c.drawImage(paintStamps,cell,0,cell,paintStamps.naturalHeight,CENTER.x-size/2,CENTER.y-size/2,size,size);
        c.globalAlpha=1;
      }
      if (s.baked) {
        for (let i=0;i<42;i++) {
          const angle=random(i+219)*Math.PI*2, distance=Math.sqrt(random(i+289))*radius*.91;
          const x=CENTER.x+Math.cos(angle)*distance, y=CENTER.y+Math.sin(angle)*distance;
          c.beginPath(); c.ellipse(x,y,3+random(i+332)*8,2+random(i+423)*4,angle,0,Math.PI*2);
          c.fillStyle=i%3===0?'#bd774957':'#e0aa5d66'; c.fill();
        }
      }
    }
    s.cheeseDabs.forEach((d,i)=>{ c.save(); c.translate(d.x,d.y); c.rotate(d.a); const sz=d.size;
      if (paintStamps.complete && paintStamps.naturalWidth) {
        const cell=paintStamps.naturalWidth/2, drawSize=sz*1.8;
        c.globalAlpha=.88; c.drawImage(paintStamps,cell,0,cell,paintStamps.naturalHeight,-drawSize/2,-drawSize/2,drawSize,drawSize);
        if(s.baked && i%5===0){c.fillStyle='#d8a86285';c.beginPath();c.ellipse(sz*.04,-sz*.08,sz*.17,sz*.08,.4,0,Math.PI*2);c.fill();}
      } else {
        c.shadowColor='#754b302c'; c.shadowBlur=3; c.fillStyle=s.baked?'#f7e5bb':'#fff5dc'; c.beginPath(); c.moveTo(-sz*.56,-sz*.23); c.quadraticCurveTo(-sz*.15,-sz*.46,sz*.25,-sz*.18); c.lineTo(sz*.58,sz*.05); c.quadraticCurveTo(sz*.25,sz*.42,-sz*.2,sz*.26); c.closePath(); c.fill();
      }
      c.restore(); });
    c.restore();
  }
  function drawAtlas(c, topping, x, y, size, angle=0) {
    if (!topping) return;
    c.save(); c.translate(x,y); c.rotate(angle);
    if (atlas.complete && atlas.naturalWidth) { const sw=atlas.naturalWidth/4,sh=atlas.naturalHeight/2; c.drawImage(atlas,topping.col*sw,topping.row*sh,sw,sh,-size/2,-size/2,size,size); }
    else { c.fillStyle='#e0b18c';c.beginPath();c.arc(0,0,size*.36,0,Math.PI*2);c.fill(); }
    c.restore();
  }
  function drawToppings(c,s,showSelection) {
    s.toppings.forEach((item,i)=>{ const topping=TOPPINGS.find(t=>t.id===item.id); const size=104*item.size; drawAtlas(c,topping,item.x,item.y,size,item.angle); if(showSelection && s.step===3 && i===s.selected){ c.save();c.strokeStyle='#fffaf0';c.lineWidth=3;c.setLineDash([7,5]);c.beginPath();c.arc(item.x,item.y,size*.44,0,Math.PI*2);c.stroke();c.strokeStyle='#a26049';c.lineWidth=1.5;c.beginPath();c.arc(item.x,item.y,size*.44,0,Math.PI*2);c.stroke();c.restore(); } });
  }
  function drawScene(c,s,showSelection=true) { drawBackground(c); if(!s.base){drawPlaceholder(c);return;} drawCrust(c,s); drawSauce(c,s); drawCheese(c,s); drawToppings(c,s,showSelection); }
  function renderCanvas() { ctx.clearRect(0,0,WIDTH,HEIGHT); drawScene(ctx,state,true); }

  function canvasPoint(e) { const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*HEIGHT/r.height}; }
  function insidePizza(p, inset=18) { if(!state.base) return false; return Math.hypot(p.x-CENTER.x,p.y-CENTER.y) < innerRadius(state)-inset; }
  function confinePoint(p) { const limit=innerRadius(state)-30; const dx=p.x-CENTER.x,dy=p.y-CENTER.y,dist=Math.hypot(dx,dy); return dist<=limit?p:{x:CENTER.x+dx/dist*limit,y:CENTER.y+dy/dist*limit}; }
  function hitTopping(p) { for(let i=state.toppings.length-1;i>=0;i--){const t=state.toppings[i];if(Math.hypot(p.x-t.x,p.y-t.y)<(104*t.size*.41))return i;}return -1; }
  function addCheese(p) { const point=confinePoint(p); const i=state.cheeseDabs.length; const density=state.brushSize/58; state.cheeseDabs.push({x:point.x,y:point.y,a:random(i+21)*Math.PI*2,size:(19+random(i+33)*17)*density}); if(state.cheeseDabs.length>800)state.cheeseDabs.shift(); }
  function onPointerDown(e) {
    if (isBaking || !state.base) return;
    const p=canvasPoint(e);
    if(state.step===1 && insidePizza(p,6)){remember();state.sauceStrokes.push({kind:state.sauce,width:state.brushSize,points:[confinePoint(p)]});pointerMode='sauce';lastPaintPoint=p;canvas.setPointerCapture(e.pointerId);renderCanvas();e.preventDefault();return;}
    if(state.step===2 && insidePizza(p,6)){remember();addCheese(p);pointerMode='cheese';lastPaintPoint=p;canvas.setPointerCapture(e.pointerId);renderCanvas();e.preventDefault();return;}
    if(state.step===3){const hit=hitTopping(p);if(hit>=0){state.selected=hit;pointerMode='drag';pointerMoved=false;lastPaintPoint=p;canvas.setPointerCapture(e.pointerId);renderUI();renderCanvas();e.preventDefault();return;}
      if(insidePizza(p,4)){remember();const point=confinePoint(p);state.toppings.push({id:state.activeTopping,x:point.x,y:point.y,size:state.toppingSize/100,angle:0});state.selected=state.toppings.length-1;commit();e.preventDefault();return;}
      state.selected=-1;renderUI();renderCanvas();}
  }
  function onPointerMove(e) {
    if(!pointerMode)return;const p=canvasPoint(e);if(!lastPaintPoint)return;
    if(pointerMode==='sauce'){if(Math.hypot(p.x-lastPaintPoint.x,p.y-lastPaintPoint.y)<6)return;const q=confinePoint(p);state.sauceStrokes.at(-1).points.push(q);lastPaintPoint=p;renderCanvas();e.preventDefault();}
    if(pointerMode==='cheese'){if(Math.hypot(p.x-lastPaintPoint.x,p.y-lastPaintPoint.y)<Math.max(12,30-state.brushSize*.16))return;addCheese(p);lastPaintPoint=p;renderCanvas();e.preventDefault();}
    if(pointerMode==='drag'&&state.selected>=0){if(!pointerMoved){remember();pointerMoved=true;}const q=confinePoint(p);state.toppings[state.selected].x=q.x;state.toppings[state.selected].y=q.y;renderCanvas();e.preventDefault();}
  }
  function onPointerUp() { if(!pointerMode)return;pointerMode=null;lastPaintPoint=null;pointerMoved=false;commit(); }

  function changeStep(to) { if(to<0||to>5||isBaking)return;if(to<4&&state.baked){remember();state.baked=false;}state.step=to;state.selected=-1;commit(); }
  function undo() { if(!undoStack.length || isBaking)return;state=JSON.parse(undoStack.pop());commit(); }
  function downloadImage() {
    const name=($('#pizza-name')?.value||'').trim()||'My Pizza';state.name=name;persist();
    const out=document.createElement('canvas');out.width=1400;out.height=1260;const c=out.getContext('2d');c.fillStyle='#faf6ed';c.fillRect(0,0,out.width,out.height);
    c.fillStyle='#61765e';c.font='700 19px "DM Sans",sans-serif';c.letterSpacing='4px';c.fillText('THE LITTLE PIZZA STUDIO',105,80);
    c.save();c.translate(115,130);c.scale(1.3,1.3);drawScene(c,{...state,selected:-1},false);c.restore();
    c.fillStyle='#354638';c.font='600 47px Fraunces,serif';c.fillText(name,105,1130);
    c.fillStyle='#9aa390';c.font='18px "DM Sans",sans-serif';c.fillText('One pizza, a little imagination.',107,1170);
    c.textAlign='right';c.fillText(new Date().toLocaleDateString('en-US'),1295,1170);
    out.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${name.replace(/[\\/:*?"<>|]/g,'-')}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);},'image/png');
    $('#feedback').textContent=`Downloading ${name}.`;
  }

  document.querySelector('#tool-content').addEventListener('click',e=>{
    const base=e.target.closest('[data-base]');if(base){remember();state.base=base.dataset.base;commit();return;}
    const sauce=e.target.closest('[data-sauce]');if(sauce){state.sauce=sauce.dataset.sauce;commit();return;}
    const topping=e.target.closest('[data-topping]');if(topping){state.activeTopping=topping.dataset.topping;state.selected=-1;commit();return;}
    const edit=e.target.closest('[data-edit]');if(edit){if(state.selected<0){$('#feedback').textContent='Select a topping on the pizza before editing it.';return;}remember();const item=state.toppings[state.selected];if(edit.dataset.edit==='rotate-left')item.angle-=Math.PI/12;if(edit.dataset.edit==='rotate-right')item.angle+=Math.PI/12;if(edit.dataset.edit==='remove'){state.toppings.splice(state.selected,1);state.selected=-1;}commit();return;}
    if(e.target.closest('#bake-action')){if(state.baked||isBaking)return;remember();isBaking=true;$('#oven-overlay').hidden=false;renderUI();setTimeout(()=>{state.baked=true;isBaking=false;$('#oven-overlay').hidden=true;commit();},1500);return;}
    if(e.target.closest('#save-action'))downloadImage();
  });
  document.querySelector('#tool-content').addEventListener('input',e=>{
    if(e.target.id==='brush-size'){state.brushSize=Number(e.target.value);$('#brush-size-value').textContent=`${state.brushSize}px`;persist();}
    if(e.target.id==='bake-time'){state.bakeTime=Number(e.target.value);$('#bake-time-value').textContent=`${state.bakeTime} min`;persist();}
    if(e.target.id==='topping-size'){if(!sizeSession&&state.selected>=0){remember();sizeSession=true;}const value=Number(e.target.value);state.toppingSize=value;if(state.selected>=0)state.toppings[state.selected].size=value/100;$('#topping-size-value').textContent=`${value}%`;persist();renderCanvas();}
    if(e.target.id==='pizza-name'){state.name=e.target.value;persist();}
  });
  document.querySelector('#tool-content').addEventListener('change',e=>{if(e.target.id==='topping-size')sizeSession=false;});
  $('#progress-list').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b&&!b.disabled)changeStep(Number(b.dataset.step));});
  $('#back').addEventListener('click',()=>changeStep(state.step-1));
  $('#undo').addEventListener('click',undo);
  $('#next').addEventListener('click',()=>{if(canContinue())changeStep(state.step+1);});
  $('#restart').addEventListener('click',()=>$('#restart-dialog').showModal());
  $('#cancel-restart').addEventListener('click',()=>$('#restart-dialog').close());
  $('#confirm-restart').addEventListener('click',()=>{state=freshState();undoStack=[];persist();$('#restart-dialog').close();commit();});
  canvas.addEventListener('pointerdown',onPointerDown);
  canvas.addEventListener('pointermove',onPointerMove);
  canvas.addEventListener('pointerup',onPointerUp);
  canvas.addEventListener('pointercancel',onPointerUp);
  window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.matches('input')){e.preventDefault();undo();}});
  atlas.addEventListener('load',()=>{renderThumbs();renderCanvas();});
  rawDough.addEventListener('load',renderCanvas);
  bakedDough.addEventListener('load',renderCanvas);
  paintStamps.addEventListener('load',renderCanvas);
  renderUI();renderCanvas();
})();
