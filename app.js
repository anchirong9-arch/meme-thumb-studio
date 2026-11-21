/* 짤 썸네일 스튜디오 — 순수 JS, 빌드 없음
   - 짤 썸네일: 이미지 + 문구 띠(색/투명도/위치/테두리 조절)
   - 상품 후기 카드: 상품 사진 + 형광펜 제목 + 가격 + 후기 본문
   - 유튜브 커뮤니티 / 틱톡 피드 미리보기 + 검수, 1080px PNG 저장 */
(() => {
  'use strict';

  const BASE_W = 1080;
  const RATIOS = { '1:1': 1080, '4:5': 1350, '9:16': 1920 };
  const FONT_STACK = '"Pretendard","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,-apple-system,sans-serif';
  const LS_KEY = 'meme-thumb-studio:v2';

  const state = {
    mode: 'thumb',
    ratio: '1:1',
    ratioByMode: { thumb: '1:1', card: '4:5' },
    tab: 'yt',
    mask: false,
    caption: '상품이 궁금하면 프로필 링크에서 021번!',
    t: {
      img: null, zoom: 1, ox: 0, oy: 0,
      text: '이거 보고\n웃으면 1승',
      size: 104, lh: 1.15, pad: 1, opacity: 78, stroke: 16,
      textColor: '#ffffff', strokeColor: '#000000', bandColor: '#000000',
      pos: 'bottom', align: 'center'
    },
    c: {
      img: null,
      title: '좋은데 저평가 받는 제품 甲',
      titleSize: 66,
      highlight: '#ffe94d',
      accent: '#e93e5d',
      name: '', listPrice: '', salePrice: '', body: ''
    }
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const els = {
    stage: $('#stage'),
    stageCanvas: $('#stageCanvas'),
    stageEmpty: $('#stageEmpty'),
    emptyTitle: $('#emptyTitle'),
    dims: $('#dims'),
    pickBtn: $('#pickBtn'),
    clearBtn: $('#clearBtn'),
    fileInput: $('#fileInput'),
    panelThumb: $('#panelThumb'),
    panelCard: $('#panelCard'),
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
    dlHint: $('#dlHint'),
    toast: $('#toast'),
    titleInput: $('#titleInput'),
    nameInput: $('#nameInput'),
    listPrice: $('#listPrice'),
    salePrice: $('#salePrice'),
    bodyInput: $('#bodyInput'),
    bodyCount: $('#bodyCount'),
    priceHint: $('#priceHint'),
    oSize: $('#oSize'), oLh: $('#oLh'), oPad: $('#oPad'), oOpacity: $('#oOpacity'),
    oStroke: $('#oStroke'), oZoom: $('#oZoom'), oTitleSize: $('#oTitleSize'),
    sSize: $('#sSize'), sLh: $('#sLh'), sPad: $('#sPad'), sOpacity: $('#sOpacity'),
    sStroke: $('#sStroke'), sZoom: $('#sZoom'), sTitleSize: $('#sTitleSize'),

    layoutMain: $('#layoutMain'),
    batchView: $('#batchView'),
    batchDrop: $('#batchDrop'),
    batchInput: $('#batchInput'),
    batchGrid: $('#batchGrid'),
    batchCount: $('#batchCount'),
    batchZip: $('#batchZip'),
    batchClear: $('#batchClear'),
    batchBg: $('#batchBg'),
    batchHint: $('#batchHint'),
    editModal: $('#editModal'),
    editName: $('#editName'),
    editMeta: $('#editMeta'),
    editCanvas: $('#editCanvas'),
    editClose: $('#editClose'),
    editUndo: $('#editUndo'),
    editReset: $('#editReset'),
    editCount: $('#editCount'),
    editTools: $('#editTools'),
    sMosaic: $('#sMosaic'),
    oMosaic: $('#oMosaic'),
    mosaicWrap: $('#mosaicWrap')
  };

  const base = document.createElement('canvas');
  const bctx = base.getContext('2d');
  const stageCtx = els.stageCanvas.getContext('2d');
  const ytCtx = els.ytImg.getContext('2d');
  const ttCtx = els.ttImg.getContext('2d');

  let bandInfo = { top: 0, height: 0 };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const canvasH = () => RATIOS[state.ratio];
  const digits = v => String(v == null ? '' : v).replace(/[^0-9]/g, '');
  const won = v => Number(v || 0).toLocaleString('ko-KR');

  function activeImage() {
    return state.mode === 'card' ? state.c.img : state.t.img;
  }

  /* ───────── 그리기 도우미 ───────── */

  function fontStr(px, weight = 900) { return `${weight} ${px}px ${FONT_STACK}`; }

  function hexToRgba(hex, alpha) {
    let h = String(hex || '#000000').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6) h = '000000';
    const n = parseInt(h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }

  function roundPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawCoverInto(ctx, img, box) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const s = Math.max(box.w / iw, box.h / ih);
    const dw = iw * s, dh = ih * s;
    ctx.drawImage(img, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
  }

  function wrapLines(ctx, text, maxW, maxLines) {
    const out = [];
    const paras = String(text || '').split('\n');
    for (const para of paras) {
      if (!para) { out.push(''); if (out.length >= maxLines) break; continue; }
      let line = '';
      for (const ch of para) {
        const test = line + ch;
        if (line && ctx.measureText(test).width > maxW) {
          out.push(line.replace(/\s+$/, ''));
          line = ch === ' ' ? '' : ch;
          if (out.length >= maxLines) break;
        } else {
          line = test;
        }
      }
      if (out.length >= maxLines) break;
      if (line) out.push(line.replace(/\s+$/, ''));
    }
    if (out.length > maxLines) out.length = maxLines;
    // 마지막 줄이 잘렸으면 말줄임
    const plain = String(text || '').replace(/\n/g, '');
    const joined = out.join('');
    if (plain && joined.length < plain.replace(/\s/g, '').length) {
      let last = out[out.length - 1] || '';
      while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      out[out.length - 1] = last + '…';
    }
    return out;
  }

  /* ───────── 짤 썸네일 ───────── */

  function drawThumbImage(ctx, w, h) {
    const img = state.t.img;
    if (!img) return;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const scale = Math.max(w / iw, h / ih) * state.t.zoom;
    const dw = iw * scale, dh = ih * scale;
    let dx = (w - dw) / 2 + state.t.ox;
    let dy = (h - dh) / 2 + state.t.oy;
    if (dw >= w) dx = clamp(dx, w - dw, 0); else dx = (w - dw) / 2;
    if (dh >= h) dy = clamp(dy, h - dh, 0); else dy = (h - dh) / 2;
    state.t.ox = dx - (w - dw) / 2;
    state.t.oy = dy - (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function thumbLines() {
    const raw = state.t.text.replace(/\r/g, '').split('\n');
    while (raw.length > 1 && raw[raw.length - 1].trim() === '') raw.pop();
    return raw;
  }

  function drawThumbBand(ctx, w, h) {
    const t = state.t;
    const lines = thumbLines();
    if (!lines.length || lines.every(l => l.trim() === '')) return { top: h, height: 0 };

    let size = t.size;
    ctx.font = fontStr(size);
    const maxW = w * 0.92;
    let fit = 1;
    for (const line of lines) {
      const mw = ctx.measureText(line).width;
      if (mw > maxW) fit = Math.min(fit, maxW / mw);
    }
    size = Math.max(16, size * fit);
    ctx.font = fontStr(size);

    const lineH = size * t.lh;
    const padY = size * 0.34 * t.pad;
    const bandH = Math.min(h, lineH * lines.length + padY * 2);
    const top = t.pos === 'top' ? 0 : h - bandH;

    ctx.fillStyle = hexToRgba(t.bandColor, t.opacity / 100);
    ctx.fillRect(0, top, w, bandH + 1);

    ctx.textBaseline = 'middle';
    ctx.textAlign = t.align;
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    const x = t.align === 'left' ? w * 0.05 : t.align === 'right' ? w * 0.95 : w / 2;
    const strokeW = (t.stroke / 100) * size;

    lines.forEach((line, i) => {
      if (!line.trim()) return;
      const y = top + padY + lineH * (i + 0.5);
      if (strokeW > 0.5) {
        ctx.lineWidth = strokeW;
        ctx.strokeStyle = t.strokeColor;
        ctx.strokeText(line, x, y);
      }
      ctx.fillStyle = t.textColor;
      ctx.fillText(line, x, y);
    });

    return { top, height: bandH };
  }

  /* ───────── 상품 후기 카드 ───────── */

  function drawCard(ctx, W, H) {
    const c = state.c;
    const PAD = Math.round(W * 0.055);          // 59
    const innerW = W - PAD * 2;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    let y = PAD;

    /* 1. 상품 사진 */
    const photoH = Math.round(Math.min(H * (H <= 1150 ? 0.40 : 0.45), innerW * 0.92));
    const box = { x: PAD, y, w: innerW, h: photoH };
    ctx.save();
    roundPath(ctx, box.x, box.y, box.w, box.h, 30);
    ctx.fillStyle = '#f1f3f7';
    ctx.fill();
    ctx.clip();
    if (c.img) {
      drawCoverInto(ctx, c.img, box);
    } else {
      ctx.fillStyle = '#b8bfcc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = fontStr(64, 800);
      ctx.fillText('상품 사진', W / 2, box.y + box.h / 2 - 16);
      ctx.font = fontStr(30, 600);
      ctx.fillStyle = '#cbd1db';
      ctx.fillText('아래 "상품 사진 선택"으로 넣어 주세요', W / 2, box.y + box.h / 2 + 52);
    }
    ctx.restore();
    y += photoH + Math.round(H * 0.026);

    /* 2. 형광펜 제목 */
    const tSize = Math.round(c.titleSize * (W / 1080));
    ctx.font = fontStr(tSize, 900);
    const tLines = wrapLines(ctx, c.title || '제목을 입력하세요', innerW - 20, 3);
    const tLH = tSize * 1.24;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    tLines.forEach((line, i) => {
      const lw = ctx.measureText(line).width;
      const cx = W / 2;
      const cy = y + tLH * i + tLH / 2;
      const hh = tSize * 0.74;
      ctx.save();
      ctx.translate(cx, cy + tSize * 0.10);
      ctx.rotate(-0.008);
      roundPath(ctx, -lw / 2 - tSize * 0.14, -hh / 2, lw + tSize * 0.28, hh, hh * 0.28);
      ctx.fillStyle = hexToRgba(c.highlight, 0.92);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#15181d';
      ctx.fillText(line, cx, cy);
    });
    y += tLH * tLines.length + Math.round(H * 0.012);

    /* 3. 상품명 */
    if (c.name.trim()) {
      ctx.font = fontStr(34, 600);
      ctx.fillStyle = '#59606e';
      const nameLines = wrapLines(ctx, c.name.trim(), innerW - 10, 2);
      nameLines.forEach((line, i) => ctx.fillText(line, W / 2, y + 20 + i * 44));
      y += 20 + nameLines.length * 44 + Math.round(H * 0.008);
    }

    /* 4. 가격 */
    const sale = Number(digits(c.salePrice));
    const list = Number(digits(c.listPrice));
    if (sale > 0 || list > 0) {
      y += Math.round(H * 0.008);
      const main = sale > 0 ? sale : list;
      const showList = sale > 0 && list > sale;
      const off = showList ? Math.round((1 - sale / list) * 100) : 0;
      const priceSize = 52;
      ctx.font = fontStr(priceSize, 900);
      const priceText = won(main) + '원';
      const pw = ctx.measureText(priceText).width;

      let badgeW = 0;
      if (off > 0) {
        ctx.font = fontStr(30, 800);
        badgeW = ctx.measureText(off + '%').width + 28;
      }
      const gap = off > 0 ? 16 : 0;
      const totalW = badgeW + gap + pw;
      let cx = W / 2 - totalW / 2;

      if (off > 0) {
        roundPath(ctx, cx, y + 6, badgeW, 44, 12);
        ctx.fillStyle = c.accent;
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = fontStr(30, 800);
        ctx.textAlign = 'center';
        ctx.fillText(off + '%', cx + badgeW / 2, y + 29);
        cx += badgeW + gap;
      }
      ctx.font = fontStr(priceSize, 900);
      ctx.textAlign = 'left';
      ctx.fillStyle = c.accent;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(priceText, cx, y + 50);
      y += 72;

      if (showList) {
        const lt = '정가 ' + won(list) + '원';
        ctx.font = fontStr(28, 600);
        const lw = ctx.measureText(lt).width;
        ctx.fillStyle = '#a3aab6';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lt, W / 2, y + 24);
        // 취소선
        ctx.strokeStyle = '#a3aab6';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(W / 2 - lw / 2, y + 25);
        ctx.lineTo(W / 2 + lw / 2, y + 25);
        ctx.stroke();
        y += 42;
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }

    /* 5. 후기 본문 */
    const body = (c.body || '').trim();
    const footerH = 86;
    const availBottom = H - PAD - footerH;
    if (body) {
      y += Math.round(H * 0.014);
      const maxBoxH = availBottom - y;
      let bSize = 31;
      let lines = [];
      for (const s of [31, 29, 27, 25, 23]) {
        ctx.font = fontStr(s, 500);
        const l = wrapLines(ctx, body, innerW - 72, 6);
        if (l.length * s * 1.62 + 68 <= maxBoxH) { bSize = s; lines = l; break; }
        bSize = s; lines = l;
      }

      const lineH = bSize * 1.62;
      const boxH = lines.length * lineH + 64;
      if (boxH <= maxBoxH || !body) {
        roundPath(ctx, PAD, y, innerW, Math.min(boxH, maxBoxH), 26);
        ctx.fillStyle = '#f5f6f9';
        ctx.fill();
        ctx.font = fontStr(bSize, 500);
        ctx.fillStyle = '#3a414d';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.beginPath();
        ctx.rect(PAD, y, innerW, Math.min(boxH, maxBoxH));
        ctx.clip();
        lines.forEach((line, i) => {
          ctx.fillText(line, PAD + 36, y + 32 + lineH * (i + 0.5));
        });
        ctx.restore();
      }
    }

    /* 6. 광고 표기 */
    ctx.font = fontStr(21, 500);
    ctx.fillStyle = '#a7aebb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const foot = wrapLines(ctx, '[광고 포함] 쿠팡 파트너스 활동의 일환으로 일정액의 수수료를 받습니다', innerW, 2);
    const fy = H - PAD - (foot.length - 1) * 28 - 8;
    foot.forEach((line, i) => ctx.fillText(line, W / 2, fy + i * 28));
  }

  /* ───────── 렌더 파이프라인 ───────── */

  function renderBase() {
    const W = BASE_W;
    const H = canvasH();
    if (base.width !== W || base.height !== H) { base.width = W; base.height = H; }
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.clearRect(0, 0, W, H);
    bctx.fillStyle = state.mode === 'card' ? '#ffffff' : '#0a0b0e';
    bctx.fillRect(0, 0, W, H);

    if (state.mode === 'thumb') {
      drawThumbImage(bctx, W, H);
      bandInfo = drawThumbBand(bctx, W, H);
    } else {
      bandInfo = { top: 0, height: 0 };
      drawCard(bctx, W, H);
    }
    return { W, H };
  }

  function sizeCanvas(canvas, w, h) {
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  function drawStage() {
    const { W, H } = { W: base.width, H: base.height };
    sizeCanvas(els.stageCanvas, W, H);
    stageCtx.setTransform(1, 0, 0, 1, 0, 0);
    stageCtx.clearRect(0, 0, W, H);
    stageCtx.drawImage(base, 0, 0);
    els.stage.classList.toggle('empty', !activeImage());
    els.stage.classList.toggle('cardmode', state.mode === 'card');
    els.dims.textContent = `${W} × ${H}`;
  }

  /* 유튜브 커뮤니티: 썸네일은 정사각으로 잘리고, 카드는 원본 비율 그대로 */
  function drawYt() {
    const S = 1080;
    const isCard = state.mode === 'card';
    if (isCard) {
      const h = Math.round(S * (base.height / base.width));
      sizeCanvas(els.ytImg, S, h);
      els.ytImg.style.aspectRatio = `${S} / ${h}`;
      ytCtx.setTransform(1, 0, 0, 1, 0, 0);
      ytCtx.clearRect(0, 0, S, h);
      ytCtx.drawImage(base, 0, 0, S, h);
    } else {
      sizeCanvas(els.ytImg, S, S);
      els.ytImg.style.aspectRatio = '1 / 1';
      ytCtx.setTransform(1, 0, 0, 1, 0, 0);
      ytCtx.fillStyle = '#0a0a0a';
      ytCtx.fillRect(0, 0, S, S);
      const bw = base.width, bh = base.height;
      const scale = Math.max(S / bw, S / bh);
      const dw = bw * scale, dh = bh * scale;
      ytCtx.drawImage(base, (S - dw) / 2, (S - dh) / 2, dw, dh);
    }
  }

  /* 틱톡: 9:16 프레임에 원본 비율 유지(contain) */
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
    return { dy, scale, frameH: H };
  }

  /* ───────── 검수 ───────── */

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

    if (!activeImage()) frag.append(row('info', state.mode === 'card' ? '상품 사진을 넣으면 카드 위쪽이 채워집니다.' : '이미지를 올리면 미리보기가 채워집니다.'));

    if (state.mode === 'thumb') {
      const lines = thumbLines().filter(l => l.trim());
      const longest = lines.reduce((a, b) => (b.length > a.length ? b : a), '');

      if (state.tab === 'yt') {
        if (state.ratio === '1:1') frag.append(row('ok', '커뮤니티 사진은 정사각(1:1) 그대로 잘리지 않고 올라갑니다.'));
        else frag.append(row('warn', `${state.ratio} 비율이라 피드에서 일부가 잘려 보입니다. 유튜브는 1:1 권장.`));
      } else {
        if (state.ratio === '9:16') frag.append(row('ok', '9:16이라 틱톡 화면을 꽉 채웁니다.'));
        else frag.append(row('warn', `${state.ratio} 비율 — 틱톡에서는 남는 곳이 검정 여백으로 보입니다. 9:16 권장.`));

        if (bandInfo.height > 0) {
          if (state.t.pos === 'bottom') {
            const topF = (tt.dy + bandInfo.top * tt.scale) / tt.frameH;
            const botF = (tt.dy + (bandInfo.top + bandInfo.height) * tt.scale) / tt.frameH;
            if (botF > 0.705 && topF < 0.955) {
              frag.append(row('warn', '하단 띠가 틱톡 캡션 자리와 겹칩니다. 띠 두께를 줄이거나 9:16으로 바꾸면 캡션이 살아납니다.'));
            } else {
              frag.append(row('ok', '하단 띠가 캡션·아이콘 자리를 피했습니다.'));
            }
          } else {
            const topF = (tt.dy + bandInfo.top * tt.scale) / tt.frameH;
            const botF = (tt.dy + (bandInfo.top + bandInfo.height) * tt.scale) / tt.frameH;
            if (topF < 0.13) frag.append(row('warn', '상단 띠가 틱톡 위쪽 탭(팔로잉·추천)과 겹칩니다. 아래로 살짝 내리거나 띠를 줄여 보세요.'));
            else frag.append(row('ok', '상단 띠가 위쪽 탭을 피했습니다.'));
            void botF;
          }
        }
      }

      if (!lines.length) frag.append(row('info', '띠 문구가 비어 있습니다. 문구를 넣으면 띠와 글자가 그려집니다.'));
      else if (longest.length > 14) frag.append(row('info', `한 줄이 ${longest.length}자로 깁니다. 피드에서는 작게 보이니 12자 안쪽을 권장.`));
      if (lines.length > 3) frag.append(row('warn', `${lines.length}줄 — 3줄까지가 피드에서 읽기 좋습니다.`));
    } else {
      const c = state.c;
      const sale = Number(digits(c.salePrice)), list = Number(digits(c.listPrice));

      if (state.tab === 'yt') frag.append(row('ok', '카드는 원본 비율 그대로 커뮤니티 게시물에 붙습니다.'));
      else if (state.ratio === '9:16') frag.append(row('ok', '9:16이라 틱톡 화면을 꽉 채웁니다.'));
      else frag.append(row('info', `지금은 ${state.ratio} 카드라 틱톡에서 위아래가 여백으로 보입니다. 틱톡용은 9:16.`));

      if (sale > 0 && list > 0 && sale >= list) frag.append(row('warn', '할인가가 정가보다 크거나 같습니다. 숫자를 확인하세요.'));
      else if (sale > 0 && list > sale) frag.append(row('ok', `할인율 ${Math.round((1 - sale / list) * 100)}% 배지가 붙습니다.`));
      else frag.append(row('info', '정가와 할인가를 둘 다 넣으면 할인율 배지가 자동 계산됩니다.'));

      if (!c.name.trim()) frag.append(row('info', '상품명을 넣으면 제목 아래에 표시됩니다.'));
      if (!c.body.trim()) frag.append(row('info', '후기 본문을 넣어 주세요. 비어 있으면 상품 정보만 남습니다.'));
      if ((c.title || '').length > 22) frag.append(row('info', '제목이 길어 형광펜이 2~3줄로 나뉩니다.'));
    }

    els.checkList.replaceChildren(frag);
  }

  let raf = 0;
  function render() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (state.mode === 'batch') return;
      try {
        renderBase();
        drawStage();
        drawYt();
        const tt = drawTt();
        updateChecks(tt);
        updateLabels();
        save();
      } catch (err) {
        console.error(err);
      }
    });
  }

  function updateLabels() {
    els.oSize.textContent = state.t.size;
    els.oLh.textContent = Number(state.t.lh).toFixed(2);
    els.oPad.textContent = Number(state.t.pad).toFixed(1);
    els.oOpacity.textContent = state.t.opacity + '%';
    els.oStroke.textContent = state.t.stroke;
    els.oZoom.textContent = Math.round(state.t.zoom * 100) + '%';
    els.oTitleSize.textContent = state.c.titleSize;
    els.lineCount.textContent = thumbLines().length + '줄';
    els.bodyCount.textContent = (state.c.body || '').length + '자';
    els.ytTitle.textContent = state.caption || '(제목 없음)';
    els.ttCaption.textContent = state.caption || '';
    els.downloadBtn.disabled = !activeImage();
    els.dlHint.textContent = base.width + 'px 고해상도 PNG';

    const sale = Number(digits(state.c.salePrice)), list = Number(digits(state.c.listPrice));
    els.priceHint.textContent = (sale > 0 && list > sale)
      ? `할인율 ${Math.round((1 - sale / list) * 100)}% · ${won(list - sale)}원 할인`
      : '할인율은 정가·할인가로 자동 계산합니다.';
  }

  /* ───────── 저장/복원 ───────── */

  function save() {
    try {
      const { t, c } = state;
      localStorage.setItem(LS_KEY, JSON.stringify({
        mode: state.mode, ratio: state.ratio, ratioByMode: state.ratioByMode, caption: state.caption,
        t: { text: t.text, size: t.size, lh: t.lh, pad: t.pad, opacity: t.opacity, stroke: t.stroke, textColor: t.textColor, strokeColor: t.strokeColor, bandColor: t.bandColor, pos: t.pos, align: t.align },
        c: { title: c.title, titleSize: c.titleSize, highlight: c.highlight, accent: c.accent, name: c.name, listPrice: c.listPrice, salePrice: c.salePrice, body: c.body }
      }));
    } catch (_) { /* 저장 실패는 무시 */ }
  }

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (!s) return;
      if (RATIOS[s.ratio]) state.ratio = s.ratio;
      if (s.ratioByMode) {
        ['thumb', 'card'].forEach(m => { if (RATIOS[s.ratioByMode[m]]) state.ratioByMode[m] = s.ratioByMode[m]; });
      }
      if (s.mode === 'thumb' || s.mode === 'card') state.mode = s.mode;
      if (typeof s.caption === 'string') state.caption = s.caption;
      if (s.t) {
        if (typeof s.t.text === 'string') state.t.text = s.t.text;
        ['size', 'lh', 'pad', 'opacity', 'stroke'].forEach(k => { if (typeof s.t[k] === 'number') state.t[k] = s.t[k]; });
        ['textColor', 'strokeColor', 'bandColor'].forEach(k => { if (typeof s.t[k] === 'string') state.t[k] = s.t[k]; });
        if (s.t.pos === 'top' || s.t.pos === 'bottom') state.t.pos = s.t.pos;
        if (['left', 'center', 'right'].includes(s.t.align)) state.t.align = s.t.align;
      }
      if (s.c) {
        ['title', 'highlight', 'accent', 'name', 'listPrice', 'salePrice', 'body'].forEach(k => {
          if (typeof s.c[k] === 'string') state.c[k] = s.c[k];
        });
        if (typeof s.c.titleSize === 'number') state.c.titleSize = s.c.titleSize;
      }
    } catch (_) { /* 복원 실패는 무시 */ }
  }

  function syncInputs() {
    $$('.modes button').forEach(b => b.classList.toggle('on', b.dataset.mode === state.mode));

    const isBatch = state.mode === 'batch';
    els.layoutMain.hidden = isBatch;
    els.batchView.hidden = !isBatch;
    $$('.ratio').forEach(el => { el.hidden = isBatch; });
    $$('.ratio button').forEach(b => b.classList.toggle('on', b.dataset.ratio === state.ratio));
    $$('.seg button[data-align]').forEach(b => b.classList.toggle('on', b.dataset.align === state.t.align));
    $$('.seg button[data-pos]').forEach(b => b.classList.toggle('on', b.dataset.pos === state.t.pos));
    $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));

    els.panelThumb.hidden = state.mode !== 'thumb';
    els.panelCard.hidden = state.mode !== 'card';
    els.frameYt.classList.toggle('on', state.tab === 'yt');
    els.frameTt.classList.toggle('on', state.tab === 'tt');
    els.ttMask.classList.toggle('on', state.mask);
    els.maskBtn.textContent = state.mask ? '가림 영역 숨기기' : '가림 영역 보기';

    els.textInput.value = state.t.text;
    els.captionInput.value = state.caption;
    els.sSize.value = state.t.size;
    els.sLh.value = state.t.lh;
    els.sPad.value = state.t.pad;
    els.sOpacity.value = state.t.opacity;
    els.sStroke.value = state.t.stroke;
    els.sZoom.value = Math.round(state.t.zoom * 100);
    $('#cText').value = state.t.textColor;
    $('#cStroke').value = state.t.strokeColor;
    $('#cBand').value = state.t.bandColor;

    els.titleInput.value = state.c.title;
    els.nameInput.value = state.c.name;
    els.listPrice.value = state.c.listPrice;
    els.salePrice.value = state.c.salePrice;
    els.bodyInput.value = state.c.body;
    els.sTitleSize.value = state.c.titleSize;
    $('#cHighlight').value = state.c.highlight;
    $('#cAccent').value = state.c.accent;

    els.pickBtn.textContent = state.mode === 'card' ? '상품 사진 선택' : '이미지 선택';
    els.emptyTitle.textContent = state.mode === 'card' ? '상품 사진을 끌어다 놓기' : '이미지를 끌어다 놓기';
    $$('#titlePresets button').forEach(b => b.classList.toggle('on', b.textContent.trim() === state.c.title.trim()));
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('on'), 1900);
  }

  /* ───────── 파일 ───────── */

  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast('이미지 파일만 넣을 수 있어요'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (state.mode === 'card') {
        state.c.img = img;
      } else {
        state.t.img = img;
        state.t.zoom = 1; state.t.ox = 0; state.t.oy = 0;
      }
      URL.revokeObjectURL(url);
      syncInputs();
      render();
      if (img.naturalWidth && img.naturalWidth < 600) toast('원본이 작아 확대하면 흐려질 수 있어요');
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('이미지를 읽지 못했어요 (HEIC는 JPG로 변환 필요)'); };
    img.src = url;
  }

  /* ───────── 이벤트 ───────── */

  els.pickBtn.addEventListener('click', () => els.fileInput.click());
  els.stageEmpty.addEventListener('click', () => els.fileInput.click());
  els.stage.addEventListener('click', e => { if (!activeImage() && e.target === els.stage) els.fileInput.click(); });
  els.fileInput.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) loadFile(f);
    e.target.value = '';
  });
  els.clearBtn.addEventListener('click', () => {
    if (state.mode === 'card') state.c.img = null;
    else { state.t.img = null; state.t.zoom = 1; state.t.ox = 0; state.t.oy = 0; }
    syncInputs();
    render();
    toast('이미지를 비웠어요');
  });

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
  window.addEventListener('drop', e => {
    if (!els.editModal.hidden) { e.preventDefault(); return; }
    if (state.mode === 'batch') {
      if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); batchAddFiles(e.dataTransfer.files); }
      return;
    }
    if (e.target.closest && e.target.closest('.stage')) return;
    if (e.dataTransfer && e.dataTransfer.files.length) e.preventDefault();
  });

  window.addEventListener('paste', e => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    if (state.mode === 'batch') {
      const files = [...items].filter(it => it.type.startsWith('image/')).map(it => it.getAsFile()).filter(Boolean);
      if (files.length) { batchAddFiles(files); e.preventDefault(); }
      return;
    }
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (f) { loadFile(f); e.preventDefault(); return; }
      }
    }
  });

  // 모드 전환
  $$('.modes button').forEach(b => b.addEventListener('click', () => {
    const next = b.dataset.mode;
    if (state.mode === next) return;
    if (state.mode !== 'batch') state.ratioByMode[state.mode] = state.ratio;
    state.mode = next;
    if (next === 'batch') {
      syncInputs();
      batchRender();
      return;
    }
    state.ratio = state.ratioByMode[next] || (next === 'card' ? '4:5' : '1:1');
    syncInputs();
    render();
  }));

  // 비율
  $$('.ratio button').forEach(b => b.addEventListener('click', () => {
    state.ratio = b.dataset.ratio;
    state.ratioByMode[state.mode] = state.ratio;
    state.t.ox = 0; state.t.oy = 0;
    syncInputs();
    render();
  }));

  // 문구
  els.textInput.addEventListener('input', () => { state.t.text = els.textInput.value; render(); });
  $$('#presetChips button').forEach(b => b.addEventListener('click', () => {
    const n = Number(b.dataset.preset);
    state.t.text = n === 1 ? '이거 보고 웃으면 1승' : n === 2 ? '이거 보고\n웃으면 1승' : '이거 보고\n웃으면\n1승';
    els.textInput.value = state.t.text;
    render();
  }));

  $$('.seg button[data-align]').forEach(b => b.addEventListener('click', () => {
    state.t.align = b.dataset.align; syncInputs(); render();
  }));
  $$('.seg button[data-pos]').forEach(b => b.addEventListener('click', () => {
    state.t.pos = b.dataset.pos; syncInputs(); render();
  }));

  const bindRange = (el, set) => el.addEventListener('input', () => { set(parseFloat(el.value)); render(); });
  bindRange(els.sSize, v => { state.t.size = v; });
  bindRange(els.sLh, v => { state.t.lh = v; });
  bindRange(els.sPad, v => { state.t.pad = v; });
  bindRange(els.sOpacity, v => { state.t.opacity = v; });
  bindRange(els.sStroke, v => { state.t.stroke = v; });
  bindRange(els.sZoom, v => { state.t.zoom = v / 100; });
  bindRange(els.sTitleSize, v => { state.c.titleSize = v; });

  const bindColor = (sel, set) => $(sel).addEventListener('input', e => { set(e.target.value); render(); });
  bindColor('#cText', v => { state.t.textColor = v; });
  bindColor('#cStroke', v => { state.t.strokeColor = v; });
  bindColor('#cBand', v => { state.t.bandColor = v; });
  bindColor('#cHighlight', v => { state.c.highlight = v; });
  bindColor('#cAccent', v => { state.c.accent = v; });

  els.captionInput.addEventListener('input', () => { state.caption = els.captionInput.value; render(); });

  // 카드 입력
  els.titleInput.addEventListener('input', () => { state.c.title = els.titleInput.value; syncInputs(); render(); });
  $$('#titlePresets button').forEach(b => b.addEventListener('click', () => {
    state.c.title = b.textContent.trim();
    els.titleInput.value = state.c.title;
    syncInputs();
    render();
  }));
  els.nameInput.addEventListener('input', () => { state.c.name = els.nameInput.value; render(); });
  els.listPrice.addEventListener('input', () => { state.c.listPrice = els.listPrice.value; render(); });
  els.salePrice.addEventListener('input', () => { state.c.salePrice = els.salePrice.value; render(); });
  els.bodyInput.addEventListener('input', () => { state.c.body = els.bodyInput.value; render(); });
  const bodyTemplates = {
    '마감 만족': '써보니 마감이 생각보다 깔끔하고 튼튼해서 만족했습니다. 이 가격이면 충분히 괜찮은 것 같아요.',
    '가격 대비 굿': '가격 생각하면 이 정도면 잘 산 것 같습니다. 매일 쓰고 있는데 아직 불편한 점은 없어요.',
    '재구매 의사': '한 번 써보고 괜찮아서 하나 더 살까 고민 중입니다. 선물용으로도 부담 없는 가격이에요.'
  };
  $$('#bodyPresets button').forEach(b => b.addEventListener('click', () => {
    const add = bodyTemplates[b.textContent.trim()] || '';
    state.c.body = state.c.body.trim() ? state.c.body.trim() + ' ' + add : add;
    els.bodyInput.value = state.c.body;
    render();
  }));

  // 미리보기 탭 / 가림 영역
  $$('.tabs button').forEach(b => b.addEventListener('click', () => {
    state.tab = b.dataset.tab; syncInputs(); render();
  }));
  els.maskBtn.addEventListener('click', () => {
    state.mask = !state.mask; syncInputs();
  });

  // 드래그 이동 (썸네일 전용)
  let drag = null;
  els.stageCanvas.addEventListener('pointerdown', e => {
    if (!activeImage() || state.mode !== 'thumb') return;
    const rect = els.stageCanvas.getBoundingClientRect();
    drag = { x: e.clientX, y: e.clientY, ox: state.t.ox, oy: state.t.oy, k: base.width / rect.width };
    els.stageCanvas.classList.add('dragging');
    try { els.stageCanvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  els.stageCanvas.addEventListener('pointermove', e => {
    if (!drag) return;
    state.t.ox = drag.ox + (e.clientX - drag.x) * drag.k;
    state.t.oy = drag.oy + (e.clientY - drag.y) * drag.k;
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
    if (!activeImage()) { toast('이미지를 먼저 넣어주세요'); return; }
    renderBase();
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
    const name = state.mode === 'card' ? `review-card-${stamp}.png` : `meme-thumb-${stamp}.png`;
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

  /* ───────── 일괄 여백 변환 (4:5 · 1:1 · 9:16 · 16:9) ───────── */

  const BATCH_MAX = 20;
  const OUT_SIZES = { '4:5': [1080, 1350], '1:1': [1080, 1080], '9:16': [1080, 1920], '16:9': [1920, 1080] };
  const batch = {
    items: [], bg: '#ffffff', out: '4:5', busy: false, seq: 0,
    edit: null, tool: 'mosaic', strength: 16, drag: null, geo: null
  };

  const pad2 = n => String(n).padStart(2, '0');
  const ratioTag = () => batch.out.replace(':', 'x');

  function fmtBytes(b) {
    if (!b) return '';
    return b >= 1048576 ? (b / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1024)) + 'KB';
  }

  /* 큰 이미지를 한 번에 줄이면 계단현상이 생겨서 절반씩 나눠 줄인다 */
  function stepped(img, maxW, maxH) {
    let w = img.naturalWidth || img.width || 1;
    let h = img.naturalHeight || img.height || 1;
    let src = img;
    while (w > maxW * 2 && h > maxH * 2) {
      const cw = Math.max(1, Math.round(w / 2));
      const ch = Math.max(1, Math.round(h / 2));
      const c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      const cx = c.getContext('2d');
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(src, 0, 0, cw, ch);
      src = c; w = cw; h = ch;
    }
    return { src, w, h };
  }

  /* 비율 유지(contain)로 캔버스 가운데 배치, 남는 곳은 bg */
  function paintContain(ctx, img, W, H, bg) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); }
    const iw = img.naturalWidth || img.width || 0;
    const ih = img.naturalHeight || img.height || 0;
    if (!iw || !ih) return;
    const s = Math.min(W / iw, H / ih);
    const dw = Math.max(1, Math.round(iw * s));
    const dh = Math.max(1, Math.round(ih * s));
    const dx = Math.round((W - dw) / 2), dy = Math.round((H - dh) / 2);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (s < 0.5) {
      const st = stepped(img, dw, dh);
      ctx.drawImage(st.src, dx, dy, dw, dh);
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
  }

  /* 모자이크: 영역을 작게 줄였다가 픽셀 그대로 확대 */
  function pixelateRegion(ctx, rect, block) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const x = clamp(Math.round(rect.x), 0, W);
    const y = clamp(Math.round(rect.y), 0, H);
    const w = clamp(Math.round(rect.w), 1, W - x);
    const h = clamp(Math.round(rect.h), 1, H - y);
    if (w < 2 || h < 2) return;
    const b = Math.max(2, Math.round(block));
    const tw = Math.max(1, Math.round(w / b));
    const th = Math.max(1, Math.round(h / b));
    const tmp = document.createElement('canvas');
    tmp.width = tw; tmp.height = th;
    const tctx = tmp.getContext('2d');
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(ctx.canvas, x, y, w, h, 0, 0, tw, th);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, 0, 0, tw, th, x, y, tw * b, th * b);
    ctx.restore();
  }

  /* 편집 정보는 원본 기준 0~1 좌표라서 출력 비율이 바뀌어도 그대로 따라간다 */
  function applyEdit(ctx, e) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const r = { x: e.x * W, y: e.y * H, w: e.w * W, h: e.h * H };
    if (e.type === 'mosaic') {
      pixelateRegion(ctx, r, (e.strength || 16) * (W / 1080));
    } else {
      ctx.fillStyle = e.type === 'black' ? '#000000' : '#ffffff';
      ctx.fillRect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
    }
  }

  function buildEdited(item) {
    const img = item.img;
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const s = Math.min(1, 1600 / Math.max(iw, ih));
    const W = Math.max(1, Math.round(iw * s));
    const H = Math.max(1, Math.round(ih * s));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, W, H);
    item.edits.forEach(e => applyEdit(ctx, e));
    return c;
  }

  function sourceFor(item) {
    if (!item.img) return null;
    if (!item.edits || !item.edits.length) return item.img;
    if (item._edited && item._rev === item.rev) return item._edited;
    item._edited = buildEdited(item);
    item._rev = item.rev;
    return item._edited;
  }

  function batchCanvasFor(item) {
    const [W, H] = OUT_SIZES[batch.out];
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    paintContain(c.getContext('2d'), sourceFor(item), W, H, batch.bg);
    return c;
  }

  const canvasBlob = c => new Promise(res => {
    try { c.toBlob(b => res(b), 'image/png'); } catch (_) { res(null); }
  });

  function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 6000);
  }

  function safeBaseName(name, fallback) {
    const base = String(name || '').replace(/\.[^.\\/]+$/, '');
    const clean = base.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 60);
    return clean || fallback;
  }

  /* ───────── ZIP (무압축 store) ───────── */

  let crcTable = null;
  function crc32(buf) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        crcTable[n] = c >>> 0;
      }
    }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function dosStamp(d) {
    return {
      time: ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31),
      date: (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31)
    };
  }

  function buildZip(files) {
    const enc = new TextEncoder();
    const { time, date } = dosStamp(new Date());
    const parts = [], central = [];
    let offset = 0;

    for (const f of files) {
      const nameBytes = enc.encode(f.name);
      const crc = crc32(f.data);
      const size = f.data.length;

      const lh = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, time, true);
      lv.setUint16(12, date, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);
      lv.setUint32(22, size, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      lh.set(nameBytes, 30);
      parts.push(lh, f.data);

      const ch = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, time, true);
      cv.setUint16(14, date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      ch.set(nameBytes, 46);
      central.push(ch);

      offset += lh.length + size;
    }

    const cdSize = central.reduce((a, c) => a + c.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    return new Blob([...parts, ...central, eocd], { type: 'application/zip' });
  }

  /* ───────── 그리드 ───────── */

  let batchRaf = 0;
  function batchRender() {
    if (batchRaf) return;
    batchRaf = requestAnimationFrame(() => { batchRaf = 0; batchPaint(); });
  }

  function batchPaint() {
    const [OW, OH] = OUT_SIZES[batch.out];
    els.batchCount.textContent = `${batch.items.length} / ${BATCH_MAX}장`;
    els.batchZip.disabled = batch.busy || !batch.items.length;
    els.batchClear.disabled = !batch.items.length;
    els.batchHint.textContent = batch.items.length
      ? `사진을 누르면 크게 보면서 모자이크·가리기를 할 수 있어요. 지금 설정이면 ${OW} × ${OH} PNG로 저장됩니다.`
      : '사진을 올리면 올린 순서대로 변환됩니다. 사진을 누르면 원본 복구·모자이크 편집이 열립니다.';

    const frag = document.createDocumentFragment();

    batch.items.forEach((item, idx) => {
      const fig = document.createElement('figure');
      fig.className = 'batch-card';

      const box = document.createElement('div');
      box.className = 'bc-img';
      box.style.aspectRatio = `${OW} / ${OH}`;
      box.title = '눌러서 크게 보기 · 모자이크 편집';

      const cv = document.createElement('canvas');
      cv.width = Math.min(560, OW);
      cv.height = Math.round(cv.width * OH / OW);
      cv.className = 'bc-canvas';
      if (item.img) {
        paintContain(cv.getContext('2d'), sourceFor(item), cv.width, cv.height, batch.bg);
      } else {
        const c2 = cv.getContext('2d');
        c2.fillStyle = '#0f131a';
        c2.fillRect(0, 0, cv.width, cv.height);
      }

      const open = document.createElement('span');
      open.className = 'bc-open';
      open.textContent = '눌러서 크게 보기';

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'bc-del';
      del.textContent = '×';
      del.title = '이 사진 빼기';
      del.addEventListener('click', ev => { ev.stopPropagation(); batchRemove(item.id); });

      box.append(cv, open, del);

      if (item.edits.length) {
        const badge = document.createElement('span');
        badge.className = 'bc-badge';
        badge.textContent = `편집 ${item.edits.length}`;
        box.append(badge);
      }

      if (item.img) box.addEventListener('click', () => openBatchEditor(item));

      const cap = document.createElement('figcaption');
      const nm = document.createElement('b');
      nm.textContent = item.name;
      nm.title = `${item.name}${item.size ? ' · ' + fmtBytes(item.size) : ''}`;
      const meta = document.createElement('small');
      meta.textContent = item.img
        ? `${item.img.naturalWidth}×${item.img.naturalHeight} → ${OW}×${OH}`
        : '불러오는 중…';

      const acts = document.createElement('div');
      acts.className = 'bc-acts';
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn tiny';
      editBtn.textContent = '편집';
      editBtn.disabled = !item.img;
      editBtn.addEventListener('click', ev => { ev.stopPropagation(); openBatchEditor(item); });
      const dlBtn = document.createElement('button');
      dlBtn.type = 'button';
      dlBtn.className = 'btn tiny';
      dlBtn.textContent = 'PNG';
      dlBtn.title = '이 사진만 저장';
      dlBtn.disabled = !item.img;
      dlBtn.addEventListener('click', ev => { ev.stopPropagation(); batchDownloadOne(item); });
      acts.append(editBtn, dlBtn);

      cap.append(nm, meta, acts);
      fig.append(box, cap);
      frag.append(fig);
    });

    els.batchGrid.replaceChildren(frag);
  }

  /* ───────── 담기·빼기 ───────── */

  const looksLikeImage = f => !!f && (/^image\//.test(f.type || '') || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name || ''));

  function batchAddFiles(fileList) {
    const files = [...(fileList || [])];
    const imgs = files.filter(looksLikeImage);
    if (!imgs.length) { toast('이미지 파일만 넣을 수 있어요'); return; }
    const room = BATCH_MAX - batch.items.length;
    if (room <= 0) { toast(`최대 ${BATCH_MAX}장까지예요. 몇 장 빼고 다시 넣어 주세요`); return; }
    const take = imgs.slice(0, room);
    if (imgs.length > room) toast(`최대 ${BATCH_MAX}장까지만 담았어요`);

    let pending = take.length;
    take.forEach(file => {
      const item = {
        id: ++batch.seq,
        name: file.name || `image-${batch.seq}`,
        size: file.size || 0,
        img: null,
        edits: [],
        rev: 0,
        _edited: null,
        _rev: -1
      };
      batch.items.push(item);

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        item.img = img;
        URL.revokeObjectURL(url);
        if (--pending === 0) batchRender();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        batch.items = batch.items.filter(x => x !== item);
        toast(`${item.name} 읽기 실패 (HEIC는 JPG로 변환 필요)`);
        if (--pending === 0) batchRender();
      };
      img.src = url;
    });

    batchRender();
  }

  function batchRemove(id) {
    if (batch.edit && batch.edit.id === id) closeBatchEditor();
    batch.items = batch.items.filter(x => x.id !== id);
    batchRender();
  }

  function batchClearAll() {
    if (!batch.items.length) return;
    closeBatchEditor();
    batch.items = [];
    batchRender();
    toast('올린 사진을 모두 비웠어요');
  }

  /* ───────── 저장 ───────── */

  async function batchDownloadOne(item) {
    if (!item || !item.img) return;
    const canvas = batchCanvasFor(item);
    const blob = await canvasBlob(canvas);
    if (!blob) { toast('저장에 실패했어요. 다시 눌러주세요'); return; }
    const name = `${safeBaseName(item.name, 'image')}-${ratioTag()}.png`;
    saveBlob(blob, name);
    toast('PNG 저장 완료 · ' + name);
  }

  async function batchDownloadZip() {
    if (batch.busy) return;
    const ready = batch.items.filter(x => x.img);
    if (!ready.length) { toast('이미지를 먼저 넣어 주세요'); return; }

    batch.busy = true;
    const label = els.batchZip.textContent;
    const used = new Set();
    const files = [];

    try {
      for (let i = 0; i < ready.length; i++) {
        els.batchZip.textContent = `변환 중 ${i + 1} / ${ready.length}`;
        await new Promise(r => setTimeout(r, 0));
        const item = ready[i];
        const canvas = batchCanvasFor(item);
        const blob = await canvasBlob(canvas);
        canvas.width = 1; canvas.height = 1;
        if (!blob) continue;
        const base = safeBaseName(item.name, `image-${i + 1}`);
        let entry = `${pad2(i + 1)}-${base}`;
        let k = 2;
        while (used.has(entry)) entry = `${pad2(i + 1)}-${base}-${k++}`;
        used.add(entry);
        files.push({ name: entry + '.png', data: new Uint8Array(await blob.arrayBuffer()) });
      }

      if (!files.length) { toast('변환된 이미지가 없어요'); return; }

      els.batchZip.textContent = `ZIP 묶는 중 (${files.length}장)`;
      await new Promise(r => setTimeout(r, 0));
      const zip = buildZip(files);
      const d = new Date();
      const stamp = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
      saveBlob(zip, `${ratioTag()}-batch-${stamp}.zip`);
      toast(`ZIP 저장 완료 · ${files.length}장`);
    } catch (err) {
      console.error(err);
      toast('ZIP을 만드는 중 문제가 생겼어요');
    } finally {
      batch.busy = false;
      els.batchZip.textContent = label;
      batchRender();
    }
  }

  /* ───────── 비율 ───────── */

  function setOutRatio(r) {
    if (!OUT_SIZES[r] || batch.out === r) return;
    batch.out = r;
    syncRatioChips();
    batchRender();
    if (batch.edit) paintEditor();
  }

  function syncRatioChips() {
    $$('#batchRatios button, #editRatios button').forEach(b => {
      b.classList.toggle('on', b.dataset.out === batch.out);
    });
  }

  /* ───────── 크게 보기 + 모자이크 편집 ───────── */

  function openBatchEditor(item) {
    if (!item || !item.img) return;
    batch.edit = item;
    batch.drag = null;
    els.editName.textContent = item.name;
    els.editModal.hidden = false;
    document.body.classList.add('modal-open');

    const lastMosaic = [...item.edits].reverse().find(e => e.type === 'mosaic');
    if (lastMosaic && lastMosaic.strength) {
      batch.strength = lastMosaic.strength;
      els.sMosaic.value = lastMosaic.strength;
    }

    syncRatioChips();
    updateEditUI();
    paintEditor();
  }

  function closeBatchEditor() {
    if (els.editModal.hidden) return;
    batch.edit = null;
    batch.drag = null;
    batch.geo = null;
    els.editModal.hidden = true;
    document.body.classList.remove('modal-open');
    batchRender();
  }

  /* 모달 캔버스 = 지금 비율의 출력 화면. 편집 좌표는 원본 기준으로 되돌려 저장한다 */
  function paintEditor(tempSrcRect) {
    const item = batch.edit;
    if (!item || !item.img) return;

    const [OW, OH] = OUT_SIZES[batch.out];
    const k = Math.min(1, 900 / Math.max(OW, OH));
    const W = Math.round(OW * k), H = Math.round(OH * k);
    const canvas = els.editCanvas;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }

    const src = sourceFor(item);
    const iw = src.naturalWidth || src.width;
    const ih = src.naturalHeight || src.height;
    const s = Math.min(W / iw, H / ih);
    const dw = iw * s, dh = ih * s;
    batch.geo = { W, H, dw, dh, dx: (W - dw) / 2, dy: (H - dh) / 2 };

    const ctx = canvas.getContext('2d');
    paintContain(ctx, src, W, H, batch.bg);

    if (tempSrcRect && tempSrcRect.w > 0 && tempSrcRect.h > 0) {
      const r = srcRectToOut(tempSrcRect);
      const x = r.x * W, y = r.y * H, w = r.w * W, h = r.h * H;
      ctx.save();
      ctx.fillStyle = batch.tool === 'white' ? 'rgba(255,255,255,.5)'
        : batch.tool === 'black' ? 'rgba(0,0,0,.5)' : 'rgba(255,77,109,.22)';
      ctx.fillRect(x, y, w, h);
      ctx.setLineDash([7, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ff4d6d';
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }

    els.editMeta.textContent = `${iw}×${ih} → ${OW}×${OH} · ${batch.out}`;
  }

  function srcRectToOut(r) {
    const g = batch.geo;
    if (!g) return { x: 0, y: 0, w: 0, h: 0 };
    return {
      x: (g.dx + r.x * g.dw) / g.W,
      y: (g.dy + r.y * g.dh) / g.H,
      w: (r.w * g.dw) / g.W,
      h: (r.h * g.dh) / g.H
    };
  }

  function pointerSrc(e) {
    const g = batch.geo;
    const rect = els.editCanvas.getBoundingClientRect();
    if (!g || !rect.width || !rect.height) return null;
    const nx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const ny = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    const px = nx * g.W, py = ny * g.H;
    if (px < g.dx - 1 || px > g.dx + g.dw + 1 || py < g.dy - 1 || py > g.dy + g.dh + 1) {
      return null; /* 여백은 가릴 것이 없음 */
    }
    return {
      x: clamp((px - g.dx) / g.dw, 0, 1),
      y: clamp((py - g.dy) / g.dh, 0, 1)
    };
  }

  function normRect(a, b) {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      w: Math.abs(b.x - a.x),
      h: Math.abs(b.y - a.y)
    };
  }

  function updateEditUI() {
    const item = batch.edit;
    const n = item ? item.edits.length : 0;
    els.editCount.textContent = `수정 ${n}개`;
    els.editUndo.disabled = n === 0;
    els.editReset.disabled = n === 0;
    els.mosaicWrap.hidden = batch.tool !== 'mosaic';
    els.oMosaic.textContent = batch.strength;
    $$('#editTools button').forEach(b => b.classList.toggle('on', b.dataset.tool === batch.tool));
    syncRatioChips();
  }

  /* ───────── 일괄 탭 이벤트 ───────── */

  els.batchDrop.addEventListener('click', e => {
    if (e.target === els.batchInput) return;
    els.batchInput.click();
  });
  els.batchInput.addEventListener('change', e => {
    batchAddFiles(e.target.files);
    e.target.value = '';
  });
  ['dragenter', 'dragover'].forEach(t => els.batchDrop.addEventListener(t, e => {
    e.preventDefault();
    els.batchDrop.classList.add('dragging');
  }));
  ['dragleave', 'dragend'].forEach(t => els.batchDrop.addEventListener(t, () => els.batchDrop.classList.remove('dragging')));
  els.batchDrop.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    els.batchDrop.classList.remove('dragging');
    batchAddFiles(e.dataTransfer && e.dataTransfer.files);
  });
  els.batchView.addEventListener('dragover', e => {
    if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) e.preventDefault();
  });
  els.batchView.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    els.batchDrop.classList.remove('dragging');
    batchAddFiles(e.dataTransfer && e.dataTransfer.files);
  });

  $$('#batchRatios button, #editRatios button').forEach(b => {
    b.addEventListener('click', () => setOutRatio(b.dataset.out));
  });

  els.batchBg.addEventListener('input', e => {
    batch.bg = e.target.value;
    batchRender();
    if (batch.edit) paintEditor();
  });

  els.batchClear.addEventListener('click', batchClearAll);
  els.batchZip.addEventListener('click', batchDownloadZip);

  els.editClose.addEventListener('click', closeBatchEditor);
  els.editModal.addEventListener('click', e => { if (e.target === els.editModal) closeBatchEditor(); });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !els.editModal.hidden) closeBatchEditor();
  });

  $$('#editTools button').forEach(b => b.addEventListener('click', () => {
    batch.tool = b.dataset.tool;
    updateEditUI();
    if (batch.edit) paintEditor();
  }));

  els.sMosaic.addEventListener('input', () => {
    const v = Number(els.sMosaic.value);
    batch.strength = v;
    const item = batch.edit;
    if (item) {
      for (let i = item.edits.length - 1; i >= 0; i--) {
        if (item.edits[i].type === 'mosaic') {
          item.edits[i].strength = v;
          item.rev++;
          item._edited = null;
          paintEditor();
          break;
        }
      }
    }
    updateEditUI();
  });

  els.editUndo.addEventListener('click', () => {
    const item = batch.edit;
    if (!item || !item.edits.length) return;
    item.edits.pop();
    item.rev++;
    item._edited = null;
    updateEditUI();
    paintEditor();
  });

  els.editReset.addEventListener('click', () => {
    const item = batch.edit;
    if (!item || !item.edits.length) return;
    item.edits = [];
    item.rev++;
    item._edited = null;
    updateEditUI();
    paintEditor();
    toast('원본 상태로 돌렸어요');
  });

  els.editCanvas.addEventListener('pointerdown', e => {
    if (!batch.edit) return;
    const p = pointerSrc(e);
    if (!p) return;
    batch.drag = { x0: p.x, y0: p.y };
    try { els.editCanvas.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });

  els.editCanvas.addEventListener('pointermove', e => {
    if (!batch.drag) return;
    const p = pointerSrc(e);
    if (!p) return;
    paintEditor(normRect({ x: batch.drag.x0, y: batch.drag.y0 }, p));
  });

  const endEditDrag = e => {
    if (!batch.drag) return;
    const p = pointerSrc(e);
    const start = { x: batch.drag.x0, y: batch.drag.y0 };
    batch.drag = null;
    if (!p) { paintEditor(); return; }
    const r = normRect(start, p);
    const item = batch.edit;
    if (item && r.w > 0.004 && r.h > 0.004) {
      const edit = { type: batch.tool, x: r.x, y: r.y, w: r.w, h: r.h };
      if (batch.tool === 'mosaic') edit.strength = batch.strength;
      item.edits.push(edit);
      item.rev++;
      item._edited = null;
    }
    updateEditUI();
    paintEditor();
  };
  els.editCanvas.addEventListener('pointerup', endEditDrag);
  els.editCanvas.addEventListener('pointercancel', e => {
    batch.drag = null;
    paintEditor();
    void e;
  });

  syncRatioChips();
  batchPaint();

  // 디버그용 (앱 동작에는 영향 없음)
  window.__mts = { state, render, updateLabels, renderBase, drawCard, batch, batchPaint, buildZip };

  load();
  if (state.mode === 'card' && state.ratio === '1:1') state.ratio = '4:5';
  syncInputs();
  render();
})();
