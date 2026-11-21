/* 짤 썸네일 스튜디오 — 순수 JS, 빌드 없음 */
(() => {
  'use strict';

  const BASE_W = 1080;
  const RATIOS = { '1:1': 1080, '4:5': 1350, '9:16': 1920 };
  const FONT_STACK = '"Pretendard","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,-apple-system,sans-serif';
  const LS_KEY = 'meme-thumb-studio:v1';

  const state = {
    ratio: '1:1',
    img: null,
    zoom: 1,
    ox: 0,
    oy: 0,
    text: '이거 보고\n웃으면 1승',
    size: 104,
    lh: 1.15,
    pad: 1,
    opacity: 78,
    stroke: 16,
    align: 'center',
    caption: '상품이 궁금하면 프로필 링크에서 021번!',
    tab: 'yt',
    mask: false
  };

  const $ = (s, r = document) => r.querySelector(s);
  const els = {
    stage: $('#stage'),
    stageCanvas: $('#stageCanvas'),
    stageEmpty: $('#stageEmpty'),
    dims: $('#dims'),
    pickBtn: $('#pickBtn'),
    clearBtn: $('#clearBtn'),
    fileInput: $('#fileInput'),
    textInput: $('#textInput'),
    lineCount: $('#lineCount'),
    captionInput: $('#captionInput'),
    ytTitle: $('#ytTitle'),
    ytImg: $('#ytImg'),
    ttImg: $('#ttImg'),
    ttCaption: $('#ttCaption'),
    checkList: $('#checkList'),
    frameYt: $('#frameYt'),
    frameTt: $('#frameTt'),
    maskBtn: $('#maskBtn'),
    ttMask: $('#ttMask'),
    downloadBtn: $('#downloadBtn'),
    toast: $('#toast'),
    sSize: $('#sSize'), sLh: $('#sLh'), sPad: $('#sPad'), sOpacity: $('#sOpacity'), sStroke: $('#sStroke'), sZoom: $('#sZoom'),
    oSize: $('#oSize'), oLh: $('#oLh'), oPad: $('#oPad'), oOpacity: $('#oOpacity'), oStroke: $('#oStroke'), oZoom: $('#oZoom')
  };

  const base = document.createElement('canvas');
  const baseCtx = base.getContext('2d');
  const stageCtx = els.stageCanvas.getContext('2d');
  const ytCtx = els.ytImg.getContext('2d');
  const ttCtx = els.ttImg.getContext('2d');

  let bandInfo = { top: 0, height: 0, baseH: 1080 };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const canvasH = () => RATIOS[state.ratio];

  /* ───────── 그리기 ───────── */

  function fontStr(px, weight = 900) {
    return `${weight} ${px}px ${FONT_STACK}`;
  }

  function drawCoverFill(ctx, w, h) {
    const img = state.img;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const scale = Math.max(w / iw, h / ih) * state.zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    let dx = (w - dw) / 2 + state.ox;
    let dy = (h - dh) / 2 + state.oy;
    if (dw >= w) dx = clamp(dx, w - dw, 0); else dx = (w - dw) / 2;
    if (dh >= h) dy = clamp(dy, h - dh, 0); else dy = (h - dh) / 2;
    // 클램프 결과를 상태에 되돌려 드래그가 벽을 넘지 않게
    state.ox = dx - (w - dw) / 2;
    state.oy = dy - (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function textLines() {
    const raw = state.text.replace(/\r/g, '').split('\n');
    while (raw.length > 1 && raw[raw.length - 1].trim() === '') raw.pop();
    return raw;
  }

  function drawBand(ctx, w, h) {
    const lines = textLines();
    if (!lines.length || lines.every(l => l.trim() === '')) return { top: h, height: 0 };

    let size = state.size;
    ctx.font = fontStr(size);
    const maxW = w * 0.92;
    let fit = 1;
    for (const line of lines) {
      const mw = ctx.measureText(line).width;
      if (mw > maxW) fit = Math.min(fit, maxW / mw);
    }
    size = Math.max(16, size * fit);
    ctx.font = fontStr(size);

    const lineH = size * state.lh;
    const padY = size * 0.34 * state.pad;
    const blockH = lineH * lines.length;
    const bandH = Math.min(h, blockH + padY * 2);
    const top = h - bandH;

    ctx.fillStyle = `rgba(0,0,0,${state.opacity / 100})`;
    ctx.fillRect(0, top, w, bandH + 1);

    ctx.textBaseline = 'middle';
    ctx.textAlign = state.align;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    const x = state.align === 'left' ? w * 0.05 : state.align === 'right' ? w * 0.95 : w / 2;
    const strokeW = (state.stroke / 100) * size;

    lines.forEach((line, i) => {
      if (!line.trim()) return;
      const y = top + padY + lineH * (i + 0.5);
      if (strokeW > 0.5) {
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = '#000';
        ctx.strokeText(line, x, y);
      }
      ctx.fillStyle = '#fff';
      ctx.fillText(line, x, y);
    });

    return { top, height: bandH };
  }

  function renderBase() {
    const w = BASE_W;
    const h = canvasH();
    if (base.width !== w || base.height !== h) { base.width = w; base.height = h; }
    baseCtx.setTransform(1, 0, 0, 1, 0, 0);
    baseCtx.clearRect(0, 0, w, h);
    baseCtx.fillStyle = '#0a0b0e';
    baseCtx.fillRect(0, 0, w, h);
    if (state.img) drawCoverFill(baseCtx, w, h);
    const band = drawBand(baseCtx, w, h);
    bandInfo = { top: band.top, height: band.height, baseH: h };
    return bandInfo;
  }

  function sizeCanvas(canvas, w, h) {
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  function drawStage() {
    const w = BASE_W, h = canvasH();
    sizeCanvas(els.stageCanvas, w, h);
    stageCtx.setTransform(1, 0, 0, 1, 0, 0);
    stageCtx.clearRect(0, 0, w, h);
    stageCtx.drawImage(base, 0, 0);
    els.stage.classList.toggle('empty', !state.img);
    els.dims.textContent = `${w} × ${h}`;
  }

  /* 유튜브 커뮤니티: 피드에서는 정사각으로 잘려 보인다 */
  function drawYt() {
    const S = 1080;
    sizeCanvas(els.ytImg, S, S);
    ytCtx.setTransform(1, 0, 0, 1, 0, 0);
    ytCtx.fillStyle = '#0a0a0a';
    ytCtx.fillRect(0, 0, S, S);
    const bw = base.width, bh = base.height;
    const scale = Math.max(S / bw, S / bh);
    const dw = bw * scale, dh = bh * scale;
    ytCtx.drawImage(base, (S - dw) / 2, (S - dh) / 2, dw, dh);
  }

  /* 틱톡: 9:16 프레임에 원본 비율 유지(contain), 남는 곳은 검정 */
  function drawTt() {
    const W = 1080, H = 1920;
    sizeCanvas(els.ttImg, W, H);
    ttCtx.setTransform(1, 0, 0, 1, 0, 0);
    ttCtx.fillStyle = '#000';
    ttCtx.fillRect(0, 0, W, H);
    const bw = base.width, bh = base.height;
    const scale = Math.min(W / bw, H / bh);
    const dw = bw * scale, dh = bh * scale;
    const dx = (W - dw) / 2, dy = (H - dh) / 2;
    ttCtx.drawImage(base, dx, dy, dw, dh);
    return { dy, dh, scale, frameH: H };
  }

  /* ───────── 검수 문구 ───────── */

  function row(kind, text) {
    const div = document.createElement('div');
    div.className = 'row ' + kind;
    const e = document.createElement('span');
    e.className = 'e';
    e.textContent = kind === 'ok' ? '✅' : kind === 'warn' ? '⚠️' : 'ℹ️';
    const t = document.createElement('span');
    t.textContent = text;
    div.append(e, t);
    return div;
  }

  function updateChecks(tt) {
    const frag = document.createDocumentFragment();
    const lines = textLines().filter(l => l.trim());
    const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), '');

    if (!state.img) frag.append(row('info', '이미지를 올리면 미리보기가 채워집니다.'));

    if (state.tab === 'yt') {
      if (state.ratio === '1:1') frag.append(row('ok', '커뮤니티 사진은 정사각(1:1) 그대로 잘리지 않고 올라갑니다.'));
      else frag.append(row('warn', `${state.ratio} 비율이라 피드에서 위아래(옆)가 잘려 보입니다. 유튜브는 1:1 권장.`));
    } else {
      if (state.ratio === '9:16') frag.append(row('ok', '9:16이라 틱톡 화면을 꽉 채웁니다.'));
      else frag.append(row('warn', `${state.ratio} 비율 — 틱톡에서는 위아래가 여백(검정)으로 남습니다. 9:16 권장.`));

      // 띠 ↔ 캡션 겹침
      if (bandInfo.height > 0) {
        const topF = (tt.dy + bandInfo.top * tt.scale) / tt.frameH;
        const botF = (tt.dy + (bandInfo.top + bandInfo.height) * tt.scale) / tt.frameH;
        const CAP_TOP = 0.705, CAP_BOT = 0.955;
        if (botF > CAP_TOP && topF < CAP_BOT) {
          frag.append(row('warn', '하단 띠가 틱톡 캡션 자리와 겹칩니다. 띠 두께를 줄이거나 9:16으로 바꾸면 캡션이 살아납니다.'));
        } else {
          frag.append(row('ok', '하단 띠가 캡션·아이콘 자리를 피했습니다.'));
        }
      }
    }

    if (lines.length === 0) frag.append(row('info', '띠 문구가 비어 있습니다. 문구를 넣으면 검은 띠와 글자가 그려집니다.'));
    else if (longest.length > 14) frag.append(row('info', `한 줄이 ${longest.length}자로 깁니다. 피드에서는 작게 보이니 12자 안쪽을 권장.`));

    if (lines.length > 3) frag.append(row('warn', `${lines.length}줄 — 3줄까지가 피드에서 읽기 좋습니다.`));

    els.checkList.replaceChildren(frag);
  }

  let raf = 0;
  function render() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      renderBase();
      drawStage();
      drawYt();
      const tt = drawTt();
      updateChecks(tt);
      updateLabels();
      save();
    });
  }

  function updateLabels() {
    els.oSize.textContent = state.size;
    els.oLh.textContent = Number(state.lh).toFixed(2);
    els.oPad.textContent = Number(state.pad).toFixed(1);
    els.oOpacity.textContent = state.opacity + '%';
    els.oStroke.textContent = state.stroke;
    els.oZoom.textContent = Math.round(state.zoom * 100) + '%';
    const n = textLines().length;
    els.lineCount.textContent = n + '줄';
    els.ytTitle.textContent = state.caption || '(제목 없음)';
    els.ttCaption.textContent = state.caption || '';
    els.downloadBtn.disabled = !state.img;
  }

  /* ───────── 저장/복원 ───────── */

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        ratio: state.ratio, text: state.text, size: state.size, lh: state.lh, pad: state.pad,
        opacity: state.opacity, stroke: state.stroke, align: state.align, caption: state.caption
      }));
    } catch (_) {}
  }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (!s) return;
      if (RATIOS[s.ratio]) state.ratio = s.ratio;
      if (typeof s.text === 'string') state.text = s.text;
      ['size', 'lh', 'pad', 'opacity', 'stroke'].forEach(k => {
        if (typeof s[k] === 'number') state[k] = s[k];
      });
      if (['left', 'center', 'right'].includes(s.align)) state.align = s.align;
      if (typeof s.caption === 'string') state.caption = s.caption;
    } catch (_) {}
  }

  function syncInputs() {
    els.textInput.value = state.text;
    els.captionInput.value = state.caption;
    els.sSize.value = state.size;
    els.sLh.value = state.lh;
    els.sPad.value = state.pad;
    els.sOpacity.value = state.opacity;
    els.sStroke.value = state.stroke;
    document.querySelectorAll('.ratio button').forEach(b => b.classList.toggle('on', b.dataset.ratio === state.ratio));
    document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.align === state.align));
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
    els.frameYt.classList.toggle('on', state.tab === 'yt');
    els.frameTt.classList.toggle('on', state.tab === 'tt');
    els.ttMask.classList.toggle('on', state.mask);
    els.maskBtn.textContent = state.mask ? '가림 영역 숨기기' : '가림 영역 보기';
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('on'), 1800);
  }

  /* ───────── 파일 넣기 ───────── */

  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast('이미지 파일만 넣을 수 있어요'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      state.img = img;
      state.zoom = 1;
      state.ox = 0;
      state.oy = 0;
      els.sZoom.value = 100;
      URL.revokeObjectURL(url);
      render();
      if (img.naturalWidth && img.naturalWidth < 600) toast('원본이 작아 확대하면 흐려질 수 있어요');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('이미지를 읽지 못했어요 (HEIC는 JPG로 변환 필요)'); };
    img.src = url;
  }

  /* ───────── 이벤트 ───────── */

  els.pickBtn.addEventListener('click', () => els.fileInput.click());
  els.stageEmpty.addEventListener('click', () => els.fileInput.click());
  els.stage.addEventListener('click', e => {
    if (!state.img && e.target === els.stage) els.fileInput.click();
  });
  els.fileInput.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) loadFile(f);
    e.target.value = '';
  });
  els.clearBtn.addEventListener('click', () => {
    state.img = null;
    state.zoom = 1; state.ox = 0; state.oy = 0;
    els.sZoom.value = 100;
    render();
    toast('이미지를 비웠어요');
  });

  // 드래그 앤 드롭
  ['dragenter', 'dragover'].forEach(t => els.stage.addEventListener(t, e => {
    e.preventDefault(); els.stage.classList.add('dragging');
  }));
  ['dragleave', 'dragend'].forEach(t => els.stage.addEventListener(t, () => els.stage.classList.remove('dragging')));
  els.stage.addEventListener('drop', e => {
    e.preventDefault();
    els.stage.classList.remove('dragging');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadFile(f);
  });
  window.addEventListener('dragover', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  window.addEventListener('drop', e => { if (e.target.closest('.stage')) return; if (e.dataTransfer && e.dataTransfer.files.length) e.preventDefault(); });

  // 붙여넣기
  window.addEventListener('paste', e => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (f) { loadFile(f); e.preventDefault(); return; }
      }
    }
  });

  // 비율
  document.querySelectorAll('.ratio button').forEach(b => {
    b.addEventListener('click', () => {
      state.ratio = b.dataset.ratio;
      state.ox = 0; state.oy = 0;
      syncInputs();
      render();
    });
  });

  // 문구
  els.textInput.addEventListener('input', () => { state.text = els.textInput.value; render(); });
  document.querySelectorAll('#presetChips button').forEach(b => {
    b.addEventListener('click', () => {
      const n = Number(b.dataset.preset);
      state.text = n === 1 ? '이거 보고 웃으면 1승' : n === 2 ? '이거 보고\n웃으면 1승' : '이거 보고\n웃으면\n1승';
      els.textInput.value = state.text;
      render();
    });
  });

  // 정렬
  document.querySelectorAll('.seg button').forEach(b => {
    b.addEventListener('click', () => {
      state.align = b.dataset.align;
      syncInputs();
      render();
    });
  });

  // 슬라이더
  const bind = (el, key, map = v => v) => el.addEventListener('input', () => {
    state[key] = map(parseFloat(el.value));
    render();
  });
  bind(els.sSize, 'size');
  bind(els.sLh, 'lh');
  bind(els.sPad, 'pad');
  bind(els.sOpacity, 'opacity');
  bind(els.sStroke, 'stroke');
  bind(els.sZoom, 'zoom', v => v / 100);

  // 캡션
  els.captionInput.addEventListener('input', () => { state.caption = els.captionInput.value; render(); });

  // 탭
  document.querySelectorAll('.tabs button').forEach(b => {
    b.addEventListener('click', () => {
      state.tab = b.dataset.tab;
      syncInputs();
      render();
    });
  });

  els.maskBtn.addEventListener('click', () => {
    state.mask = !state.mask;
    syncInputs();
  });

  // 드래그로 위치 이동
  let drag = null;
  els.stageCanvas.addEventListener('pointerdown', e => {
    if (!state.img) return;
    const rect = els.stageCanvas.getBoundingClientRect();
    drag = { x: e.clientX, y: e.clientY, ox: state.ox, oy: state.oy, k: base.width / rect.width };
    els.stageCanvas.classList.add('dragging');
    els.stageCanvas.setPointerCapture(e.pointerId);
  });
  els.stageCanvas.addEventListener('pointermove', e => {
    if (!drag) return;
    state.ox = drag.ox + (e.clientX - drag.x) * drag.k;
    state.oy = drag.oy + (e.clientY - drag.y) * drag.k;
    renderBase();
    drawStage();
    drawYt();
    drawTt();
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    els.stageCanvas.classList.remove('dragging');
    render();
  };
  els.stageCanvas.addEventListener('pointerup', endDrag);
  els.stageCanvas.addEventListener('pointercancel', endDrag);

  // 다운로드
  els.downloadBtn.addEventListener('click', () => {
    if (!state.img) { toast('이미지를 먼저 넣어주세요'); return; }
    renderBase();
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    const name = `meme-thumb-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.png`;
    base.toBlob(blob => {
      if (!blob) { toast('저장에 실패했어요. 다시 눌러주세요'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('PNG 저장 완료 · ' + name);
    }, 'image/png');
  });

  // 초기화
  load();
  syncInputs();
  render();
})();
