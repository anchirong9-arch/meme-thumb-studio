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
    sStroke: $('#sStroke'), sZoom: $('#sZoom'), sTitleSize: $('#sTitleSize')
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
      ctx.fillText('아래 "이미지 선택"으로 넣어 주세요', W / 2, box.y + box.h / 2 + 52);
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
      y += 58;

      if (showList) {
        const lt = '정가 ' + won(list) + '원';
        ctx.font = fontStr(28, 600);
        const lw = ctx.measureText(lt).width;
        ctx.fillStyle = '#a3aab6';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lt, W / 2, y + 18);
        // 취소선
        ctx.strokeStyle = '#a3aab6';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(W / 2 - lw / 2, y + 19);
        ctx.lineTo(W / 2 + lw / 2, y + 19);
        ctx.stroke();
        y += 34;
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
        mode: state.mode, ratio: state.ratio, caption: state.caption,
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
    if (e.target.closest && e.target.closest('.stage')) return;
    if (e.dataTransfer && e.dataTransfer.files.length) e.preventDefault();
  });

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

  // 모드 전환
  $$('.modes button').forEach(b => b.addEventListener('click', () => {
    state.mode = b.dataset.mode;
    if (state.mode === 'card' && state.ratio === '9:16') state.ratio = '4:5';
    if (state.mode === 'thumb' && state.ratio === '4:5' && !state.c.img) state.ratio = '1:1';
    syncInputs();
    render();
  }));

  // 비율
  $$('.ratio button').forEach(b => b.addEventListener('click', () => {
    state.ratio = b.dataset.ratio;
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

  load();
  if (state.mode === 'card' && state.ratio === '1:1') state.ratio = '4:5';
  syncInputs();
  render();
})();
