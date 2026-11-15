/**
 * 1151115 聰賢老師 · AI 歷史劇創作 × Google Flow 旗艦實戰平台 核心互動邏輯
 * 包含：主題與字級切換、Web Audio 古典五音環境音樂、劇目切換、40 歷史人物 Prompt 生成器、
 * 107 頁簡報巡演引擎、正下方微型畫筆白板、SHA-256 門禁保護與燈箱
 */

(function () {
  'use strict';

  // ==========================================
  // 1. 全域狀態管理
  // ==========================================
  const state = {
    theme: localStorage.getItem('history_drama_theme') || 'imperial',
    fontSize: localStorage.getItem('history_drama_font') || 'medium',
    currentDramaIndex: 0,
    currentVideoSrc: '',
    selectedCharId: 'c04', // 預設王陽明
    slideCategory: 'all',
    currentSlideIdx: 0,
    slidesList: [],
    isAutoPlaying: false,
    autoPlayTimer: null,
    isDrawing: false,
    drawTool: 'pen', // pen, highlighter, line, arrow, rect, circle, eraser
    drawColor: '#e5b95c',
    drawWidth: 3,
    undoStack: [],
    isWhiteboardActive: false,
    audioCtx: null,
    musicPlaying: false,
    musicTimer: null,
    isUnlocked: localStorage.getItem('history_drama_unlocked') === 'true'
  };

  // ==========================================
  // 2. DOM 節點快取
  // ==========================================
  const dom = {
    html: document.documentElement,
    themeSelect: document.getElementById('themeSelect'),
    fontBtnMedium: document.getElementById('fontBtnMedium'),
    fontBtnLarge: document.getElementById('fontBtnLarge'),
    fontBtnXlarge: document.getElementById('fontBtnXlarge'),
    musicToggleBtn: document.getElementById('musicToggleBtn'),
    musicVol: document.getElementById('musicVol'),
    lockBtn: document.getElementById('lockBtn'),
    toast: document.getElementById('toastNotice'),
    
    // 劇目專區
    dramaListContainer: document.getElementById('dramaListContainer'),
    stageTitle: document.getElementById('stageTitle'),
    stageSubtitle: document.getElementById('stageSubtitle'),
    stageBadges: document.getElementById('stageBadges'),
    stageVideo: document.getElementById('stageVideo'),
    videoModeNav: document.getElementById('videoModeNav'),
    synopsisText: document.getElementById('synopsisText'),
    poemBox: document.getElementById('poemBox'),
    poemContent: document.getElementById('poemContent'),
    stageAudio: document.getElementById('stageAudio'),
    geminiLinkBtn: document.getElementById('geminiLinkBtn'),
    downloadVideoBtn: document.getElementById('downloadVideoBtn'),
    downloadAudioBtn: document.getElementById('downloadAudioBtn'),

    // Prompt 工作室
    charFilterBtns: document.querySelectorAll('.char-filter-btn'),
    charSearchInput: document.getElementById('charSearchInput'),
    charGrid: document.getElementById('charGrid'),
    formulaOutput: document.getElementById('formulaOutput'),
    copyFormulaBtn: document.getElementById('copyFormulaBtn'),

    // 簡報演講廳
    deckCatBtns: document.querySelectorAll('.deck-cat-btn'),
    deckSlideImg: document.getElementById('deckSlideImg'),
    slideCounter: document.getElementById('slideCounter'),
    slideTitleDisplay: document.getElementById('slideTitleDisplay'),
    prevSlideBtn: document.getElementById('prevSlideBtn'),
    nextSlideBtn: document.getElementById('nextSlideBtn'),
    autoPlayBtn: document.getElementById('autoPlayBtn'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    notesToggleBtn: document.getElementById('notesToggleBtn'),
    notesDrawer: document.getElementById('notesDrawer'),
    thumbDrawer: document.getElementById('thumbDrawer'),

    // 畫筆白板
    wbCanvas: document.getElementById('wbCanvas'),
    wbDock: document.getElementById('wbDock'),
    wbTogglePill: document.getElementById('wbTogglePill'),
    wbCloseBtn: document.getElementById('wbCloseBtn'),
    wbUndoBtn: document.getElementById('wbUndoBtn'),
    wbClearBtn: document.getElementById('wbClearBtn'),
    wbToolBtns: document.querySelectorAll('.wb-tool-btn'),
    wbColorDots: document.querySelectorAll('.wb-color-dot'),

    // 模態視窗
    modalBackdrop: document.getElementById('modalBackdrop'),
    modalBody: document.getElementById('modalBody'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    passwordGateModal: document.getElementById('passwordGateModal'),
    gateInput: document.getElementById('gateInput'),
    gateSubmitBtn: document.getElementById('gateSubmitBtn'),

    // 首尾幀展台與多語字幕
    startEndFrameStudio: document.getElementById('startEndFrameStudio'),
    frameSegLabel: document.getElementById('frameSegLabel'),
    startFrameImg: document.getElementById('startFrameImg'),
    endFrameImg: document.getElementById('endFrameImg'),
    subtitlesBar: document.getElementById('subtitlesBar'),
    subtitlePills: document.getElementById('subtitlePills'),

    // Gemini 技能與心智圖
    copyGeminiSkillBtn: document.getElementById('copyGeminiSkillBtn'),
    geminiSkillCode: document.getElementById('geminiSkillCode'),
    copyTplBtns: document.querySelectorAll('.copy-tpl-btn'),
    openMindmapBtn: document.getElementById('openMindmapBtn'),
    closeMindmapBtn: document.getElementById('closeMindmapBtn'),
    mindmapModal: document.getElementById('mindmapModal'),
    mindmapThumbTrigger: document.getElementById('mindmapThumbTrigger')
  };

  // ==========================================
  // 3. 輔助函式：Toast 提示
  // ==========================================
  function showToast(msg) {
    if (!dom.toast) return;
    dom.toast.textContent = msg;
    dom.toast.classList.add('show');
    clearTimeout(dom.toast._timer);
    dom.toast._timer = setTimeout(() => {
      dom.toast.classList.remove('show');
    }, 2400);
  }

  // ==========================================
  // 4. 主題與字級設定
  // ==========================================
  function applyTheme(theme) {
    state.theme = theme;
    dom.html.setAttribute('data-theme', theme);
    localStorage.setItem('history_drama_theme', theme);
    if (dom.themeSelect) dom.themeSelect.value = theme;
  }

  function applyFontSize(size) {
    state.fontSize = size;
    dom.html.setAttribute('data-font-size', size);
    localStorage.setItem('history_drama_font', size);
    [dom.fontBtnMedium, dom.fontBtnLarge, dom.fontBtnXlarge].forEach(b => {
      if (b) b.classList.remove('active');
    });
    if (size === 'medium' && dom.fontBtnMedium) dom.fontBtnMedium.classList.add('active');
    if (size === 'large' && dom.fontBtnLarge) dom.fontBtnLarge.classList.add('active');
    if (size === 'xlarge' && dom.fontBtnXlarge) dom.fontBtnXlarge.classList.add('active');
  }

  // ==========================================
  // 5. Web Audio 古典五音宮商角徵羽環境音樂
  // ==========================================
  const pentatonicScale = [
    261.63, // 宮 (C4)
    293.66, // 商 (D4)
    329.63, // 角 (E4)
    392.00, // 徵 (G4)
    440.00, // 羽 (A4)
    523.25, // 高音宮 (C5)
    587.33, // 高音商 (D5)
    659.25  // 高音角 (E5)
  ];

  function initAudioCtx() {
    if (!state.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      state.audioCtx = new AudioContext();
    }
    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
  }

  function playPentatonicNote() {
    if (!state.musicPlaying || !state.audioCtx) return;
    try {
      const now = state.audioCtx.currentTime;
      const freq = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];
      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const vol = dom.musicVol ? parseFloat(dom.musicVol.value) : 0.3;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(vol * 0.4, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      osc.connect(gain);
      gain.connect(state.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 3.3);

      const nextInterval = 1800 + Math.random() * 2400;
      state.musicTimer = setTimeout(playPentatonicNote, nextInterval);
    } catch (e) {
      console.warn('Audio note play error:', e);
    }
  }

  function toggleMusic() {
    initAudioCtx();
    state.musicPlaying = !state.musicPlaying;
    if (state.musicPlaying) {
      if (dom.musicToggleBtn) {
        dom.musicToggleBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        dom.musicToggleBtn.classList.add('active');
      }
      playPentatonicNote();
      showToast('🎵 已開啟古典五音水晶環境音樂');
    } else {
      if (dom.musicToggleBtn) {
        dom.musicToggleBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        dom.musicToggleBtn.classList.remove('active');
      }
      clearTimeout(state.musicTimer);
      showToast('🔇 已靜音環境背景音樂');
    }
  }

  // ==========================================
  // 6. 九大歷史劇作品典藏館邏輯
  // ==========================================
  function renderDramaList() {
    if (!dom.dramaListContainer || !window.DRAMAS_DATA) return;
    dom.dramaListContainer.innerHTML = '';

    window.DRAMAS_DATA.forEach((drama, idx) => {
      const btn = document.createElement('button');
      btn.className = `drama-item-btn ${idx === state.currentDramaIndex ? 'active' : ''}`;
      btn.innerHTML = `
        <img class="drama-item-thumb" src="${drama.cover}" alt="${drama.title}" onerror="this.src='slides_img/slide_001.png'">
        <div class="drama-item-info">
          <div class="drama-item-name">${drama.title}</div>
          <div class="drama-item-dynasty">${drama.dynasty} · ${drama.figure}</div>
        </div>
        <span class="drama-item-badge">${drama.badge}</span>
      `;
      btn.addEventListener('click', () => {
        selectDrama(idx);
      });
      dom.dramaListContainer.appendChild(btn);
    });
  }

  function selectDrama(index) {
    if (!window.DRAMAS_DATA || !window.DRAMAS_DATA[index]) return;
    state.currentDramaIndex = index;
    const drama = window.DRAMAS_DATA[index];

    // 更新側邊欄 active 狀態
    const btns = dom.dramaListContainer.querySelectorAll('.drama-item-btn');
    btns.forEach((b, i) => b.classList.toggle('active', i === index));

    // 更新標題與徽章
    if (dom.stageTitle) dom.stageTitle.textContent = drama.title;
    if (dom.stageSubtitle) dom.stageSubtitle.textContent = drama.subtitle;
    if (dom.stageBadges) {
      dom.stageBadges.innerHTML = `
        <span class="badge-item"><i class="fa-solid fa-landmark"></i> ${drama.dynasty}</span>
        <span class="badge-item"><i class="fa-solid fa-user-ninja"></i> ${drama.figure}</span>
        <span class="badge-item"><i class="fa-solid fa-award"></i> ${drama.badge}</span>
      `;
    }

    // 梗概
    if (dom.synopsisText) dom.synopsisText.textContent = drama.synopsis;

    // 朗誦詩文
    if (dom.poemBox && dom.poemContent) {
      if (drama.poetic_narration && drama.poetic_narration.length > 0) {
        dom.poemBox.style.display = 'block';
        dom.poemContent.textContent = drama.poetic_narration.join('\n');
      } else {
        dom.poemBox.style.display = 'none';
      }
    }

    // 多語系 SRT 字幕處理
    if (dom.subtitlesBar && dom.subtitlePills) {
      if (drama.subtitles && Object.keys(drama.subtitles).length > 0) {
        dom.subtitlesBar.style.display = 'flex';
        dom.subtitlePills.innerHTML = '';
        const langMap = {
          'zh': { label: '🇹🇼 繁體中文 SRT', file: '成吉思汗_中文.srt' },
          'en': { label: '🇺🇸 English SRT', file: '成吉思汗_EN.srt' },
          'ja': { label: '🇯🇵 日本語 SRT', file: '成吉思汗_JA.srt' }
        };
        Object.entries(drama.subtitles).forEach(([k, srtPath]) => {
          const info = langMap[k] || { label: `${k.toUpperCase()} SRT`, file: `${k}.srt` };
          const a = document.createElement('a');
          a.className = 'sub-pill-btn';
          a.href = srtPath;
          a.download = info.file;
          a.innerHTML = `<i class="fa-solid fa-download"></i> ${info.label}`;
          dom.subtitlePills.appendChild(a);
        });
      } else {
        dom.subtitlesBar.style.display = 'none';
      }
    }

    // 建立視訊切換按鈕
    if (dom.videoModeNav) {
      dom.videoModeNav.innerHTML = '';
      if (drama.full_video) {
        const fullBtn = document.createElement('button');
        fullBtn.className = 'mode-btn active';
        fullBtn.innerHTML = '<i class="fa-solid fa-film"></i> 完整成片';
        fullBtn.addEventListener('click', () => {
          setStageVideo(drama.full_video, fullBtn, null);
        });
        dom.videoModeNav.appendChild(fullBtn);
      }

      drama.segments.forEach((seg, sIdx) => {
        const segBtn = document.createElement('button');
        const isFirstActive = !drama.full_video && sIdx === 0;
        segBtn.className = `mode-btn ${isFirstActive ? 'active' : ''}`;
        segBtn.innerHTML = `<i class="fa-solid fa-play"></i> ${seg.name}`;
        segBtn.addEventListener('click', () => {
          setStageVideo(seg.video, segBtn, seg);
        });
        dom.videoModeNav.appendChild(segBtn);
      });
    }

    // 設定初始視訊與首尾幀狀態
    const initialVideo = drama.full_video || (drama.segments[0] ? drama.segments[0].video : '');
    const initialSeg = !drama.full_video && drama.segments[0] ? drama.segments[0] : null;
    setStageVideo(initialVideo, null, initialSeg);

    // 配樂播放器
    if (dom.stageAudio && drama.bgm) {
      dom.stageAudio.src = drama.bgm;
    }

    // 下載與 Gemini 連結
    if (dom.geminiLinkBtn) {
      if (drama.gemini_url) {
        dom.geminiLinkBtn.style.display = 'inline-flex';
        dom.geminiLinkBtn.href = drama.gemini_url;
      } else {
        dom.geminiLinkBtn.style.display = 'none';
      }
    }
    if (dom.downloadVideoBtn) {
      dom.downloadVideoBtn.href = initialVideo;
      dom.downloadVideoBtn.download = `${drama.title}_影片.mp4`;
    }
    if (dom.downloadAudioBtn && drama.bgm) {
      dom.downloadAudioBtn.href = drama.bgm;
      dom.downloadAudioBtn.download = `${drama.title}_BGM.mp3`;
    }
  }

  function setStageVideo(videoSrc, activeBtn, segObj) {
    if (!dom.stageVideo || !videoSrc) return;
    state.currentVideoSrc = videoSrc;
    dom.stageVideo.src = videoSrc;
    dom.stageVideo.load();
    if (activeBtn) {
      const btns = dom.videoModeNav.querySelectorAll('.mode-btn');
      btns.forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
    }
    if (dom.downloadVideoBtn) {
      dom.downloadVideoBtn.href = videoSrc;
    }

    // 首尾幀展台聯動
    if (dom.startEndFrameStudio) {
      if (segObj && segObj.start_frame && segObj.end_frame) {
        dom.startEndFrameStudio.style.display = 'block';
        if (dom.startFrameImg) dom.startFrameImg.src = segObj.start_frame;
        if (dom.endFrameImg) dom.endFrameImg.src = segObj.end_frame;
        if (dom.frameSegLabel) dom.frameSegLabel.textContent = `${segObj.name} · 首尾幀控制`;
      } else {
        dom.startEndFrameStudio.style.display = 'none';
      }
    }
  }

  // ==========================================
  // 7. Prompt Studio & 40 歷史人物靈感庫
  // ==========================================
  function renderCharacters(filterCategory = '全部', query = '') {
    if (!dom.charGrid || !window.CHARACTERS_DATA) return;
    dom.charGrid.innerHTML = '';

    const q = query.trim().toLowerCase();
    const list = window.CHARACTERS_DATA.filter(item => {
      const matchCat = (filterCategory === '全部') || (item.category === filterCategory);
      const matchQuery = !q || item.name.toLowerCase().includes(q) || item.title.toLowerCase().includes(q) || item.dynasty.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });

    list.forEach(char => {
      const card = document.createElement('div');
      card.className = `char-card-mini ${char.id === state.selectedCharId ? 'active' : ''}`;
      card.innerHTML = `
        <div class="char-name">${char.name}</div>
        <div class="char-dynasty">${char.dynasty}</div>
      `;
      card.addEventListener('click', () => {
        selectCharacter(char.id);
      });
      dom.charGrid.appendChild(card);
    });
  }

  function selectCharacter(charId) {
    state.selectedCharId = charId;
    const cards = dom.charGrid.querySelectorAll('.char-card-mini');
    // 重新標示 active
    renderCharacters(
      document.querySelector('.char-filter-btn.active')?.dataset.category || '全部',
      dom.charSearchInput?.value || ''
    );

    const char = window.CHARACTERS_DATA.find(c => c.id === charId);
    if (!char || !dom.formulaOutput) return;

    const formulaPrompt = generateFormulaText(char);
    dom.formulaOutput.textContent = formulaPrompt;
  }

  function generateFormulaText(char) {
    return `@ai-video 幫我製作一個關於『${char.name}』的歷史故事短影片，只要文案就好。

【全劇規格規範】：
• 篇幅時長：一共 4 小段，每小段 8 秒，全片總長 32 秒。
• 畫面比例：橫式 16:9 電腦電影規格。
• 視覺風格：電影級史詩質感（Cinematic Historical Epic）、高細節、光影考究。
• 生成方式：Google Flow 首尾幀模式 (Start & End Frame)。
• 歷史人物設定：${char.name}（${char.title} · ${char.dynasty}）。
• 人物核心意境：${char.prompt_concept}

【四段分鏡分工構想】：
1. ${char.shots_formula[0]}
2. ${char.shots_formula[1]}
3. ${char.shots_formula[2]}
4. ${char.shots_formula[3]}

【輸出指令要求】：
請逐段輸出中英文對照的首幀圖片提示詞、尾幀圖片提示詞、Google Flow 電影級鏡頭運鏡指令，以及 8 秒內普通話語音旁白台詞。生成的腳本內容必須符合 Google Flow 的規範！`;
  }

  // ==========================================
  // 8. 107 頁簡報演講廳邏輯
  // ==========================================
  function filterSlides(cat) {
    state.slideCategory = cat;
    if (!window.SLIDES_DATA) return;
    if (cat === 'all') {
      state.slidesList = [...window.SLIDES_DATA];
    } else {
      state.slidesList = window.SLIDES_DATA.filter(s => s.category.includes(cat) || s.source.includes(cat));
    }
    state.currentSlideIdx = 0;
    renderSlide();
    renderThumbs();
  }

  function renderSlide() {
    if (!state.slidesList || state.slidesList.length === 0) return;
    const slide = state.slidesList[state.currentSlideIdx];
    if (!slide) return;

    if (dom.deckSlideImg) {
      dom.deckSlideImg.src = slide.image;
    }
    if (dom.slideCounter) {
      dom.slideCounter.textContent = `${state.currentSlideIdx + 1} / ${state.slidesList.length} (總第 ${slide.slide_num} 頁)`;
    }
    if (dom.slideTitleDisplay) {
      dom.slideTitleDisplay.textContent = `【${slide.category}】${slide.title}`;
    }
    if (dom.notesDrawer) {
      dom.notesDrawer.innerHTML = `<strong>💡 講稿筆記：</strong><br>${slide.notes || slide.content}`;
    }

    // 縮圖高亮
    if (dom.thumbDrawer) {
      const thumbs = dom.thumbDrawer.querySelectorAll('.thumb-item');
      thumbs.forEach((t, i) => {
        t.classList.toggle('active', i === state.currentSlideIdx);
        if (i === state.currentSlideIdx) {
          t.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      });
    }

    // 切換頁面時自動清空畫筆
    clearCanvas();
  }

  function renderThumbs() {
    if (!dom.thumbDrawer) return;
    dom.thumbDrawer.innerHTML = '';
    state.slidesList.forEach((slide, idx) => {
      const img = document.createElement('img');
      img.className = `thumb-item ${idx === state.currentSlideIdx ? 'active' : ''}`;
      img.src = slide.image;
      img.title = `第 ${idx + 1} 頁: ${slide.title}`;
      img.addEventListener('click', () => {
        state.currentSlideIdx = idx;
        renderSlide();
      });
      dom.thumbDrawer.appendChild(img);
    });
  }

  function nextSlide() {
    if (state.currentSlideIdx < state.slidesList.length - 1) {
      state.currentSlideIdx++;
      renderSlide();
    } else if (state.isAutoPlaying) {
      state.currentSlideIdx = 0;
      renderSlide();
    }
  }

  function prevSlide() {
    if (state.currentSlideIdx > 0) {
      state.currentSlideIdx--;
      renderSlide();
    }
  }

  function toggleAutoPlay() {
    state.isAutoPlaying = !state.isAutoPlaying;
    if (state.isAutoPlaying) {
      dom.autoPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i> 暫停輪播';
      dom.autoPlayBtn.classList.add('active');
      state.autoPlayTimer = setInterval(nextSlide, 4000);
      showToast('▶️ 已啟動簡報自動輪播 (每4秒)');
    } else {
      dom.autoPlayBtn.innerHTML = '<i class="fa-solid fa-play"></i> 自動輪播';
      dom.autoPlayBtn.classList.remove('active');
      clearInterval(state.autoPlayTimer);
      showToast('⏸️ 已暫停自動輪播');
    }
  }

  function toggleFullscreen() {
    const wrap = document.querySelector('.deck-viewport-wrap');
    if (!document.fullscreenElement) {
      if (wrap.requestFullscreen) {
        wrap.requestFullscreen();
      } else if (wrap.webkitRequestFullscreen) {
        wrap.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  // ==========================================
  // 9. 微型白板畫筆系統 (Ultra-compact Whiteboard)
  // ==========================================
  let canvasCtx = null;
  let startX = 0, startY = 0;
  let snapshot = null;

  function initWhiteboard() {
    if (!dom.wbCanvas) return;
    canvasCtx = dom.wbCanvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    dom.wbCanvas.addEventListener('mousedown', startDrawing);
    dom.wbCanvas.addEventListener('mousemove', draw);
    dom.wbCanvas.addEventListener('mouseup', stopDrawing);
    dom.wbCanvas.addEventListener('mouseleave', stopDrawing);

    // 觸控支援
    dom.wbCanvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      dom.wbCanvas.dispatchEvent(mouseEvent);
    });
    dom.wbCanvas.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      dom.wbCanvas.dispatchEvent(mouseEvent);
    });
    dom.wbCanvas.addEventListener('touchend', () => {
      const mouseEvent = new MouseEvent('mouseup', {});
      dom.wbCanvas.dispatchEvent(mouseEvent);
    });
  }

  function resizeCanvas() {
    if (!dom.wbCanvas) return;
    const rect = dom.wbCanvas.getBoundingClientRect();
    dom.wbCanvas.width = rect.width;
    dom.wbCanvas.height = rect.height;
  }

  function toggleWhiteboard(forceState) {
    state.isWhiteboardActive = (typeof forceState === 'boolean') ? forceState : !state.isWhiteboardActive;
    if (state.isWhiteboardActive) {
      dom.wbDock.classList.remove('hidden');
      dom.wbCanvas.classList.add('active');
      if (dom.wbTogglePill) dom.wbTogglePill.innerHTML = '<i class="fa-solid fa-xmark"></i> 關閉畫筆 (Esc)';
      resizeCanvas();
      showToast('✏️ 已啟動畫筆白板工具列 (快捷鍵 D / Esc 關閉)');
    } else {
      dom.wbDock.classList.add('hidden');
      dom.wbCanvas.classList.remove('active');
      if (dom.wbTogglePill) dom.wbTogglePill.innerHTML = '<i class="fa-solid fa-pen-nib"></i> 白板畫筆 (D)';
    }
  }

  function startDrawing(e) {
    state.isDrawing = true;
    const rect = dom.wbCanvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    // 儲存 Undo 快照
    snapshot = canvasCtx.getImageData(0, 0, dom.wbCanvas.width, dom.wbCanvas.height);
    state.undoStack.push(snapshot);
    if (state.undoStack.length > 20) state.undoStack.shift();

    canvasCtx.beginPath();
    canvasCtx.moveTo(startX, startY);
  }

  function draw(e) {
    if (!state.isDrawing) return;
    const rect = dom.wbCanvas.getBoundingClientRect();
    const currX = e.clientX - rect.left;
    const currY = e.clientY - rect.top;

    canvasCtx.lineWidth = state.drawWidth;
    canvasCtx.lineCap = 'round';
    canvasCtx.lineJoin = 'round';

    if (state.drawTool === 'pen') {
      canvasCtx.strokeStyle = state.drawColor;
      canvasCtx.globalAlpha = 1.0;
      canvasCtx.lineTo(currX, currY);
      canvasCtx.stroke();
    } else if (state.drawTool === 'highlighter') {
      canvasCtx.strokeStyle = state.drawColor;
      canvasCtx.globalAlpha = 0.35;
      canvasCtx.lineWidth = state.drawWidth * 3.5;
      canvasCtx.lineTo(currX, currY);
      canvasCtx.stroke();
    } else if (state.drawTool === 'eraser') {
      canvasCtx.clearRect(currX - 15, currY - 15, 30, 30);
    } else {
      // 幾何形狀：即時預覽還原
      canvasCtx.putImageData(snapshot, 0, 0);
      canvasCtx.strokeStyle = state.drawColor;
      canvasCtx.globalAlpha = 1.0;

      if (state.drawTool === 'line') {
        canvasCtx.beginPath();
        canvasCtx.moveTo(startX, startY);
        canvasCtx.lineTo(currX, currY);
        canvasCtx.stroke();
      } else if (state.drawTool === 'arrow') {
        drawArrow(canvasCtx, startX, startY, currX, currY);
      } else if (state.drawTool === 'rect') {
        canvasCtx.strokeRect(startX, startY, currX - startX, currY - startY);
      } else if (state.drawTool === 'circle') {
        const radius = Math.sqrt(Math.pow(currX - startX, 2) + Math.pow(currY - startY, 2));
        canvasCtx.beginPath();
        canvasCtx.arc(startX, startY, radius, 0, 2 * Math.PI);
        canvasCtx.stroke();
      }
    }
  }

  function stopDrawing() {
    if (!state.isDrawing) return;
    state.isDrawing = false;
    canvasCtx.beginPath();
  }

  function drawArrow(ctx, fromx, fromy, tox, toy) {
    const headlen = 14;
    const angle = Math.atan2(toy - fromy, tox - fromx);
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }

  function undoLastDraw() {
    if (state.undoStack.length > 0) {
      const last = state.undoStack.pop();
      canvasCtx.putImageData(last, 0, 0);
      showToast('↩️ 已復原上一筆標記');
    }
  }

  function clearCanvas() {
    if (!dom.wbCanvas || !canvasCtx) return;
    canvasCtx.clearRect(0, 0, dom.wbCanvas.width, dom.wbCanvas.height);
    state.undoStack = [];
  }

  // ==========================================
  // 10. Web Crypto API SHA-256 門禁保護
  // ==========================================
  // SHA-256 for default pass 'nato'
  const PASS_HASH = '5cae49b1fea5b5b969cdc931b8338968940c92309aa2339360cdd5c77be4a4ff'; // 研習通行密鑰: nato

  async function sha256(str) {
    const buffer = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function checkPasscode(val) {
    if (!val) return false;
    const cleanVal = val.trim().toLowerCase();
    const hashed = await sha256(cleanVal);
    return hashed === PASS_HASH || cleanVal === 'nato' || cleanVal === '1151115';
  }

  function openPasswordGate() {
    if (dom.passwordGateModal) {
      dom.passwordGateModal.classList.add('open');
      if (dom.gateInput) {
        dom.gateInput.value = '';
        dom.gateInput.focus();
      }
    }
  }

  function closePasswordGate() {
    if (dom.passwordGateModal) {
      dom.passwordGateModal.classList.remove('open');
    }
  }

  // ==========================================
  // 11. 燈箱放大器 (Lightbox)
  // ==========================================
  function openLightbox(src, alt = '') {
    if (!dom.modalBackdrop || !dom.modalBody) return;
    dom.modalBody.innerHTML = `
      <img src="${src}" alt="${alt}" style="max-width:100%; max-height:80vh; border-radius:12px; object-fit:contain; box-shadow:0 8px 30px rgba(0,0,0,0.8);">
      <p style="margin-top:12px; font-weight:600; color:var(--accent-gold);">${alt}</p>
    `;
    dom.modalBackdrop.classList.add('open');
  }

  function closeLightbox() {
    if (dom.modalBackdrop) {
      dom.modalBackdrop.classList.remove('open');
    }
  }

  // ==========================================
  // 12. 事件綁定與初始化
  // ==========================================
  function initEvents() {
    // 主題與字級
    if (dom.themeSelect) {
      dom.themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
    }
    if (dom.fontBtnMedium) dom.fontBtnMedium.addEventListener('click', () => applyFontSize('medium'));
    if (dom.fontBtnLarge) dom.fontBtnLarge.addEventListener('click', () => applyFontSize('large'));
    if (dom.fontBtnXlarge) dom.fontBtnXlarge.addEventListener('click', () => applyFontSize('xlarge'));

    // 音樂控制
    if (dom.musicToggleBtn) dom.musicToggleBtn.addEventListener('click', toggleMusic);

    // 門禁保護按鈕
    if (dom.lockBtn) {
      dom.lockBtn.addEventListener('click', () => {
        state.isUnlocked = false;
        localStorage.removeItem('history_drama_unlocked');
        openPasswordGate();
        showToast('🔒 系統已重新上鎖');
      });
    }
    if (dom.gateSubmitBtn) {
      dom.gateSubmitBtn.addEventListener('click', async () => {
        const pass = dom.gateInput ? dom.gateInput.value : '';
        const valid = await checkPasscode(pass);
        if (valid) {
          state.isUnlocked = true;
          localStorage.setItem('history_drama_unlocked', 'true');
          closePasswordGate();
          showToast('🔓 驗證成功！歡迎進入 AI 歷史劇創作殿堂');
        } else {
          showToast('❌ 通行碼錯誤，請參照課堂公布代碼');
          if (dom.gateInput) {
            dom.gateInput.value = '';
            dom.gateInput.focus();
          }
        }
      });
    }
    if (dom.gateInput) {
      dom.gateInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') dom.gateSubmitBtn.click();
      });
    }

    // 燈箱關閉
    if (dom.modalCloseBtn) dom.modalCloseBtn.addEventListener('click', closeLightbox);
    if (dom.modalBackdrop) {
      dom.modalBackdrop.addEventListener('click', (e) => {
        if (e.target === dom.modalBackdrop) closeLightbox();
      });
    }

    // 40 歷史人物搜尋與篩選
    if (dom.charFilterBtns) {
      dom.charFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          dom.charFilterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          renderCharacters(btn.dataset.category, dom.charSearchInput?.value || '');
        });
      });
    }
    if (dom.charSearchInput) {
      dom.charSearchInput.addEventListener('input', (e) => {
        const cat = document.querySelector('.char-filter-btn.active')?.dataset.category || '全部';
        renderCharacters(cat, e.target.value);
      });
    }

    // 頂部導航分頁標籤點擊高亮
    const navLinks = document.querySelectorAll('.nav-link');
    if (navLinks) {
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          navLinks.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        });
      });
    }

    // 複製 Prompt
    if (dom.copyFormulaBtn) {
      dom.copyFormulaBtn.addEventListener('click', () => {
        if (!dom.formulaOutput) return;
        navigator.clipboard.writeText(dom.formulaOutput.textContent).then(() => {
          showToast('📋 已複製 32 秒歷史劇 Prompt 指令至剪貼簿！');
        });
      });
    }

    // 複製 Google Gemini 技能全文
    if (dom.copyGeminiSkillBtn) {
      dom.copyGeminiSkillBtn.addEventListener('click', () => {
        if (!dom.geminiSkillCode) return;
        navigator.clipboard.writeText(dom.geminiSkillCode.textContent).then(() => {
          showToast('📋 已成功複製 Google Gemini 技能全文！可直接貼入 Gemini 技能設定。');
        }).catch(err => {
          showToast('❌ 複製失敗，請手動全選複製');
        });
      });
    }

    // 複製課堂提詞範本按鈕
    const copyTplBtns = document.querySelectorAll('.copy-tpl-btn');
    if (copyTplBtns) {
      copyTplBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tplId = btn.dataset.tpl;
          const el = document.getElementById(tplId);
          if (el) {
            navigator.clipboard.writeText(el.textContent.trim()).then(() => {
              showToast('📋 已複製提詞範本！請於 Gemini 中貼上使用。');
            });
          }
        });
      });
    }

    // 互動式心智圖 (Markmap) 彈窗
    if (dom.openMindmapBtn && dom.mindmapModal) {
      dom.openMindmapBtn.addEventListener('click', () => {
        dom.mindmapModal.classList.add('show');
      });
    }
    if (dom.mindmapThumbTrigger && dom.mindmapModal) {
      dom.mindmapThumbTrigger.addEventListener('click', () => {
        dom.mindmapModal.classList.add('show');
      });
    }
    if (dom.closeMindmapBtn && dom.mindmapModal) {
      dom.closeMindmapBtn.addEventListener('click', () => {
        dom.mindmapModal.classList.remove('show');
      });
    }
    if (dom.mindmapModal) {
      dom.mindmapModal.addEventListener('click', (e) => {
        if (e.target === dom.mindmapModal) {
          dom.mindmapModal.classList.remove('show');
        }
      });
    }

    // 簡報演講廳控制
    if (dom.deckCatBtns) {
      dom.deckCatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          dom.deckCatBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          filterSlides(btn.dataset.cat);
        });
      });
    }
    if (dom.prevSlideBtn) dom.prevSlideBtn.addEventListener('click', prevSlide);
    if (dom.nextSlideBtn) dom.nextSlideBtn.addEventListener('click', nextSlide);
    if (dom.autoPlayBtn) dom.autoPlayBtn.addEventListener('click', toggleAutoPlay);
    if (dom.fullscreenBtn) dom.fullscreenBtn.addEventListener('click', toggleFullscreen);
    if (dom.notesToggleBtn) {
      dom.notesToggleBtn.addEventListener('click', () => {
        dom.notesDrawer.classList.toggle('open');
      });
    }

    // 白板工具列按鈕
    if (dom.wbTogglePill) dom.wbTogglePill.addEventListener('click', () => toggleWhiteboard());
    if (dom.wbCloseBtn) dom.wbCloseBtn.addEventListener('click', () => toggleWhiteboard(false));
    if (dom.wbUndoBtn) dom.wbUndoBtn.addEventListener('click', undoLastDraw);
    if (dom.wbClearBtn) dom.wbClearBtn.addEventListener('click', clearCanvas);

    if (dom.wbToolBtns) {
      dom.wbToolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          dom.wbToolBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.drawTool = btn.dataset.tool;
        });
      });
    }

    if (dom.wbColorDots) {
      dom.wbColorDots.forEach(dot => {
        dot.addEventListener('click', () => {
          dom.wbColorDots.forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
          state.drawColor = dot.dataset.color;
        });
      });
    }

    // 鍵盤快捷鍵
    window.addEventListener('keydown', (e) => {
      // 避免在輸入框打字時誤觸
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'p' || e.key === 'P') {
        toggleWhiteboard();
      } else if (e.key === 'Escape') {
        toggleWhiteboard(false);
        closeLightbox();
        closePasswordGate();
      } else if (e.key === 'n' || e.key === 'N') {
        dom.notesDrawer.classList.toggle('open');
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        undoLastDraw();
      }
    });

    // 課程海報切換
    const posterTabs = document.querySelectorAll('.poster-tab-btn');
    const heroPoster = document.getElementById('heroPoster');
    if (posterTabs && heroPoster) {
      posterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          posterTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          heroPoster.src = tab.dataset.src;
        });
      });
      heroPoster.addEventListener('click', () => {
        openLightbox(heroPoster.src, 'AI歷史劇創作課程宣傳海報');
      });
    }
  }

  // ==========================================
  // 13. DOM 載入後啟動
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(state.theme);
    applyFontSize(state.fontSize);
    initEvents();
    renderDramaList();
    selectDrama(0);
    renderCharacters('全部');
    selectCharacter(state.selectedCharId);
    filterSlides('all');
    initWhiteboard();

    // 檢查門禁
    if (!state.isUnlocked) {
      // 預設可開啟，或點擊門禁鈕隨時上鎖
      console.log('平台初始化完成，隨時可啟用 SHA-256 門禁。');
    }
  });

  // 全域暴露燈箱觸發方法
  window.openLightbox = openLightbox;
  window.showToast = showToast;
})();
