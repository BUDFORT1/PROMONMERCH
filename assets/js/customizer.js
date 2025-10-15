/* =============== CUSTOMIZER MVP (T-Shirts) =================
   - background mockup per color (preview only)
   - fixed print area (art must stay inside)
   - add image + add text (fonts, color, outline)
   - move / scale (aspect lock) / rotate
   - snap to center + safe-area margins
   - DPI warning for images
   - simple layer list (select / dup / lock / delete / z-order)
   - export preview + design “recipe” JSON for backend
   --------------------------------------------------------- */

const Customizer = (() => {
  // ---- CONFIG (hook these up to your product/variant data) ----
  const PRODUCT = {
    slug: 'classic-tee',
    // mockups per color; swap these URLs when user changes color
    variants: {
      Black:  { front: '/media/mockups/tee/black/front.webp'  },
      White:  { front: '/media/mockups/tee/white/front.webp'  },
      Heather:{ front: '/media/mockups/tee/heather/front.webp'}
    },
    // print area in MOCKUP PIXELS (align across all colors)
    printArea: { x: 420, y: 300, w: 960, h: 1200 },
    // real-world printable area inches (for DPI warnings only)
    printInches: { w: 12, h: 15 }
  };

  // Fonts you ship (names must match CSS @font-face family names you host)
  const FONT_OPTIONS = [
    'Bebas Neue', 'League Spartan', 'Cinzel', 'Kaushan Script', 'Caveat', 'Black Ops One'
  ];

  // ---- STATE ----
  let canvas, bgImage, safeRect, activeColor = 'Black';
  let ui = {};

  // ---- INIT ----
  async function init() {
    // Cache UI hooks (expect these IDs to exist in your HTML)
    ui.canvasEl    = document.getElementById('c');
    ui.addImgInput = document.getElementById('add-img');
    ui.addTextBtn  = document.getElementById('add-text');
    ui.textColor   = document.getElementById('text-color');
    ui.textOutline = document.getElementById('text-outline');
    ui.fontSelect  = document.getElementById('font-select');
    ui.sizeSlider  = document.getElementById('size-slider');
    ui.rotateSlider= document.getElementById('rotate-slider');
    ui.layerList   = document.getElementById('layers');
    ui.variantSel  = document.getElementById('variant-color');
    ui.saveBtn     = document.getElementById('save-design');
    ui.checkoutBtn = document.getElementById('checkout');
    ui.dpiBadge    = document.getElementById('dpi-badge');

    // Populate fonts / variants
    populateSelect(ui.fontSelect, FONT_OPTIONS);
    populateSelect(ui.variantSel, Object.keys(PRODUCT.variants));

    // Canvas sized to device width (keeps aspect of mockup image later)
    canvas = new fabric.Canvas('c', {
      preserveObjectStacking: true,
      selection: true,
      backgroundColor: '#fff'
    });
    fabric.Object.prototype.transparentCorners = false;
    fabric.Object.prototype.cornerStyle = 'circle';
    fabric.Object.prototype.cornerColor = '#111827';
    fabric.Object.prototype.cornerSize  = 10;

    // Load initial mockup
    await loadMockup(activeColor);

    // UI events
    ui.variantSel.addEventListener('change', e => swapColor(e.target.value));
    ui.addImgInput.addEventListener('change', onAddImage);
    ui.addTextBtn.addEventListener('click', onAddText);
    ui.fontSelect.addEventListener('change', onChangeFont);
    ui.textColor.addEventListener('input', onChangeTextColor);
    ui.textOutline.addEventListener('input', onChangeTextOutline);
    ui.sizeSlider.addEventListener('input', onChangeSize);
    ui.rotateSlider.addEventListener('input', onChangeRotate);
    ui.saveBtn.addEventListener('click', () => emitSave(false));
    ui.checkoutBtn.addEventListener('click', () => emitSave(true));

    // Fabric events
    canvas.on('object:added', refreshLayers);
    canvas.on('object:removed', refreshLayers);
    canvas.on('selection:created', onSelectChanged);
    canvas.on('selection:updated', onSelectChanged);
    canvas.on('selection:cleared', onSelectChanged);
    canvas.on('object:scaling',  clampAndWarn);
    canvas.on('object:moving',   clampToPrintArea);
    canvas.on('object:rotating', () => {/* no-op */});
  }

  function populateSelect(sel, items){
    sel.innerHTML = items.map(v => `<option value="${v}">${v}</option>`).join('');
  }

  // ---- MOCKUP / SAFE AREA ----
  async function loadMockup(colorName) {
    const url = PRODUCT.variants[colorName]?.front;
    if (!url) return;
    activeColor = colorName;

    // Load background image
    bgImage = await fabric.FabricImage.fromURL(url, { selectable: false, evented: false });
    // Scale canvas to fit device width while keeping mockup aspect
    const maxW = Math.min(window.innerWidth, 600); // keep it comfortable on phones
    const scale = maxW / bgImage.width;
    canvas.setWidth(maxW);
    canvas.setHeight(bgImage.height * scale);
    bgImage.scale(scale);

    // Clear canvas but keep user objects if any (we re-add safeRect)
    const userObjects = canvas.getObjects().filter(o => o !== safeRect && o !== bgImage);
    canvas.clear();
    canvas.add(bgImage);

    // Safe/print rect overlay (non-interactive)
    const { x, y, w, h } = PRODUCT.printArea;
    safeRect = new fabric.Rect({
      left: x * scale,
      top:  y * scale,
      width:  w * scale,
      height: h * scale,
      fill: 'rgba(0, 0, 0, 0.02)',
      stroke: 'rgba(17,24,39,0.25)',
      strokeDashArray: [6, 6],
      selectable: false,
      evented: false
    });
    canvas.add(safeRect);

    // Re-add user objects
    userObjects.forEach(o => {
      o.left *= scale / (o._lastScale || 1);
      o.top  *= scale / (o._lastScale || 1);
      o.scaleX *= scale / (o._lastScale || 1);
      o.scaleY *= scale / (o._lastScale || 1);
      o._lastScale = scale;
      canvas.add(o);
    });

    canvas.renderAll();
    ui.variantSel.value = activeColor;
  }

  function swapColor(colorName) {
    loadMockup(colorName);
  }

  function getPrintBounds() {
    // current safeRect bounds in canvas coordinates
    return safeRect.getBoundingRect(true, true);
  }

  // ---- ADD ELEMENTS ----
  function onAddImage(e){
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => fabric.FabricImage.fromURL(reader.result, img => {
      // Fit new image roughly within print area
      const pb = getPrintBounds();
      const maxW = pb.width * 0.8;
      const scale = Math.min(1, maxW / img.width);
      img.set({
        left: pb.left + pb.width/2 - (img.width * scale)/2,
        top:  pb.top  + pb.height/2 - (img.height* scale)/2,
        scaleX: scale, scaleY: scale,
        hasRotatingPoint: true
      });
      img.setControlsVisibility({ mtr: true }); // rotation handle
      img._isArtwork = true;
      canvas.add(img).setActiveObject(img).renderAll();
      clampAndWarn({ target: img });
      e.target.value = ''; // reset input
    });
    reader.readAsDataURL(file);
  }

  function onAddText(){
    const pb = getPrintBounds();
    const t = new fabric.IText('Your Text', {
      left: pb.left + pb.width/2,
      top:  pb.top  + pb.height/2,
      originX: 'center', originY: 'center',
      fontFamily: FONT_OPTIONS[0],
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 0,
      fontSize: Math.round(pb.width * 0.08),
      textAlign: 'center',
      editable: true
    });
    t._isArtwork = true;
    canvas.add(t).setActiveObject(t).renderAll();
    syncTextControls(t);
  }

  // ---- CONTROLS ----
  function onSelectChanged() {
    const obj = canvas.getActiveObject();
    syncTextControls(obj);
    refreshLayers();
  }

  function syncTextControls(obj){
    const isText = obj && obj.type === 'i-text';
    ui.fontSelect.disabled = !isText;
    ui.textColor.disabled  = !isText;
    ui.textOutline.disabled= !isText;
    if (isText) {
      ui.fontSelect.value = obj.fontFamily || FONT_OPTIONS[0];
      ui.textColor.value  = rgbToHex(obj.fill || '#ffffff');
      ui.textOutline.value= obj.stroke ? rgbToHex(obj.stroke) : '#000000';
    }
    // size & rotate for any object
    if (obj){
      ui.sizeSlider.value   = Math.round((obj.scaleX || 1) * 100);
      ui.rotateSlider.value = Math.round(obj.angle || 0);
    }
  }

  function onChangeFont(e){
    const obj = canvas.getActiveObject();
    if (obj && obj.type === 'i-text'){
      obj.set({ fontFamily: e.target.value });
      canvas.requestRenderAll();
    }
  }

  function onChangeTextColor(e){
    const obj = canvas.getActiveObject();
    if (obj && obj.type === 'i-text'){
      obj.set({ fill: e.target.value });
      canvas.requestRenderAll();
    }
  }

  function onChangeTextOutline(e){
    const obj = canvas.getActiveObject();
    if (obj && obj.type === 'i-text'){
      const v = e.target.value;
      if (!v || v === '#00000000') {
        obj.set({ strokeWidth: 0 });
      } else {
        obj.set({ stroke: v, strokeWidth: Math.max(2, obj.strokeWidth || 2) });
      }
      canvas.requestRenderAll();
    }
  }

  function onChangeSize(e){
    const obj = canvas.getActiveObject();
    if (!obj) return;
    const scale = Math.max(0.05, Number(e.target.value)/100);
    obj.scaleX = obj.scaleY = scale;
    clampAndWarn({ target: obj });
    canvas.requestRenderAll();
  }

  function onChangeRotate(e){
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.angle = Number(e.target.value);
    canvas.requestRenderAll();
  }

  // ---- SNAP + CLAMP + DPI ----
  function clampToPrintArea(opt){
    const o = opt.target;
    const pb = getPrintBounds();
    const br = o.getBoundingRect(true, true);

    // snap to center lines
    const snap = 6; // px
    const centerX = pb.left + pb.width/2;
    const centerY = pb.top  + pb.height/2;

    if (Math.abs((br.left + br.width/2) - centerX) < snap) {
      o.left += centerX - (br.left + br.width/2);
    }
    if (Math.abs((br.top + br.height/2) - centerY) < snap) {
      o.top += centerY - (br.top + br.height/2);
    }

    // clamp inside safe rect
    const nb = o.getBoundingRect(true, true);
    if (nb.left < pb.left) o.left += pb.left - nb.left;
    if (nb.top < pb.top)   o.top  += pb.top  - nb.top;
    if (nb.left + nb.width  > pb.left + pb.width) {
      o.left -= (nb.left + nb.width) - (pb.left + pb.width);
    }
    if (nb.top + nb.height > pb.top + pb.height) {
      o.top  -= (nb.top + nb.height) - (pb.top + pb.height);
    }
  }

  function clampAndWarn(opt){
    clampToPrintArea(opt);
    // quick DPI check for images
    const o = opt.target;
    if (o && o.type === 'image') {
      const pb = getPrintBounds();
      const pxW = (o.width * (o.scaleX || 1));
      const pxH = (o.height* (o.scaleY || 1));
      const ppiX = pxW / PRODUCT.printInches.w;
      const ppiY = pxH / PRODUCT.printInches.h;
      const ppi = Math.min(ppiX, ppiY);
      setDpiBadge(ppi);
    }
  }

  function setDpiBadge(ppi){
    if (!ui.dpiBadge) return;
    ui.dpiBadge.textContent = `${Math.round(ppi)} PPI`;
    ui.dpiBadge.className = 'badge ' + (ppi < 150 ? 'bad' : ppi < 200 ? 'warn' : 'good');
  }

  // ---- LAYERS PANEL ----
  function refreshLayers(){
    if (!ui.layerList) return;
    const objs = canvas.getObjects().filter(o => o._isArtwork);
    ui.layerList.innerHTML = objs.map((o, i) => {
      const label = o.type === 'i-text' ? (o.text || 'Text') : 'Image';
      const active = o === canvas.getActiveObject() ? 'active' : '';
      return `<div class="layer ${active}" data-idx="${i}">
        <span>${label}</span>
        <div class="actions">
          <button data-act="up">▲</button>
          <button data-act="down">▼</button>
          <button data-act="dup">⧉</button>
          <button data-act="lock">${o.lockMovementX ? '🔓' : '🔒'}</button>
          <button data-act="del">🗑</button>
        </div>
      </div>`;
    }).join('');
    ui.layerList.querySelectorAll('.layer').forEach(row => {
      row.addEventListener('click', e => {
        const idx = Number(row.dataset.idx);
        const obj = canvas.getObjects().filter(o => o._isArtwork)[idx];
        if (!obj) return;
        const act = e.target.dataset.act;
        if (!act) { canvas.setActiveObject(obj); canvas.requestRenderAll(); onSelectChanged(); return; }
        layerAction(obj, act);
      });
    });
  }

  function layerAction(obj, act){
    switch (act) {
      case 'up':   canvas.bringForward(obj); break;
      case 'down': canvas.sendBackwards(obj); break;
      case 'dup':  const clone = fabric.util.object.clone(obj); clone.set({ left: obj.left+20, top: obj.top+20 }); canvas.add(clone); break;
      case 'lock':
        const locked = !obj.lockMovementX;
        obj.lockMovementX = obj.lockMovementY = obj.lockScalingX = obj.lockScalingY = obj.lockRotation = locked;
        break;
      case 'del':  canvas.remove(obj); break;
    }
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    refreshLayers();
  }

  // ---- EXPORT (preview + recipe) ----
  function buildRecipe(){
    const objs = canvas.getObjects().filter(o => o._isArtwork);
    const scale = 1; // working in canvas px; Windows app will map recipe → print px
    const layers = objs.map(o => {
      if (o.type === 'i-text') {
        return {
          type: 'text',
          text: o.text,
          font: o.fontFamily,
          size: Math.round((o.fontSize || 0) * (o.scaleY || 1)),
          fill: o.fill,
          outline: o.strokeWidth ? { width: Math.round(o.strokeWidth), color: o.stroke } : null,
          x: Math.round(o.left * scale),
          y: Math.round(o.top * scale),
          angle: Math.round(o.angle || 0),
          align: o.textAlign || 'left'
        };
      } else {
        return {
          type: 'image',
          // NOTE: for real use, replace dataURL sources with your uploaded R2 URLs
          src: (o._originalSrc || o._element?.src || ''),
          w: Math.round(o.width * (o.scaleX || 1)),
          h: Math.round(o.height* (o.scaleY || 1)),
          x: Math.round(o.left * scale),
          y: Math.round(o.top  * scale),
          angle: Math.round(o.angle || 0)
        };
      }
    });

    return {
      product_slug: PRODUCT.slug,
      variant_color: activeColor,
      print_area: PRODUCT.printArea,
      print_inches: PRODUCT.printInches,
      canvas_px: { w: canvas.getWidth(), h: canvas.getHeight() },
      layers
    };
  }

  async function emitSave(isCheckout){
    // preview (small) — good enough for listing / order detail
    const previewDataUrl = canvas.toDataURL({ format: 'png', quality: 0.92 });
    const recipe = buildRecipe();

    // TODO (later): upload preview to R2 via /api/presign, then POST /api/designs
    console.log('[preview]', previewDataUrl.slice(0,64)+'…');
    console.log('[recipe]', recipe);

    // hand off:
    if (isCheckout) {
      // TODO: call /api/orders with recipe → /api/checkout/create → redirect to Stripe
      alert('Checkout would start now (wire to your API).');
    } else {
      alert('Design saved locally (wire this to /api/designs).');
    }
  }

  // ---- UTIL ----
  function rgbToHex(c){
    if (!c) return '#000000';
    if (c.startsWith('#')) return c;
    // convert rgb(a) → hex (rough)
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '#000000';
    return '#'+[m[1],m[2],m[3]].map(n => Number(n).toString(16).padStart(2,'0')).join('');
  }

  // expose for manual init (call Customizer.init() after DOM ready)
  return { init };
})();

// Auto-init if canvas exists
document.addEventListener('DOMContentLoaded', () => {
  const hasCanvas = document.getElementById('c');
  if (hasCanvas) Customizer.init();
});