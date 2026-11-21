/* ============================================================
   闯关逻辑 —— 铁碳相图课后巩固
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'fec-phase-game-v1';
  const SOUND_KEY = 'fec-phase-sound';
  const QUESTION_TIME = 25;

  const state = {
    levelIndex: 0,
    level: null,
    qIndex: 0,
    hearts: 3,
    mistakes: 0,
    combo: 0,
    maxCombo: 0,
    score: 0,
    correctCount: 0,
    answered: false,
    selected: -1,
    orderItems: [],
    picks: [],
    timer: null,
    timeLeft: QUESTION_TIME
  };

  let progress = loadProgress();
  let soundOn = true;
  let audioCtx = null;
  let toastTimer = null;
  let diagramReady = false;

  const $ = (id) => document.getElementById(id);
  const currentQ = () => (state.level ? state.level.questions[state.qIndex] : null);

  /* ---------------- 存储 ---------------- */
  function defaultProgress() {
    return { stars: {}, cleared: [], xp: 0, stats: { answered: 0, correct: 0 } };
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProgress();
      const data = JSON.parse(raw);
      const base = defaultProgress();
      return {
        stars: data.stars || base.stars,
        cleared: Array.isArray(data.cleared) ? data.cleared : [],
        xp: Number(data.xp) || 0,
        stats: {
          answered: Number(data.stats && data.stats.answered) || 0,
          correct: Number(data.stats && data.stats.correct) || 0
        }
      };
    } catch (err) {
      return defaultProgress();
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (err) {
      /* 忽略隐私模式下的存储异常 */
    }
  }

  function totalStars() {
    return Object.keys(progress.stars).reduce((sum, k) => sum + (Number(progress.stars[k]) || 0), 0);
  }

  /* ---------------- 音效 ---------------- */
  try {
    soundOn = localStorage.getItem(SOUND_KEY) !== 'off';
  } catch (err) {
    soundOn = true;
  }

  function ensureAudio() {
    if (!soundOn) return null;
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, dur, type, vol, delay) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const start = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(vol || 0.05, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  function sfxClick() { tone(540, 0.05, 'square', 0.018); }
  function sfxCorrect() {
    tone(680, 0.09, 'triangle', 0.05);
    tone(900, 0.13, 'triangle', 0.045, 0.09);
  }
  function sfxWrong() {
    tone(220, 0.18, 'sawtooth', 0.04);
    tone(160, 0.24, 'sawtooth', 0.035, 0.12);
  }
  function sfxWin() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'triangle', 0.05, i * 0.11));
  }
  function sfxFail() {
    [330, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.045, i * 0.14));
  }

  function updateSoundBtn() {
    const btn = $('btn-sound');
    btn.textContent = soundOn ? '音效：开' : '音效：关';
    btn.classList.toggle('off', !soundOn);
  }

  /* ---------------- 基础 UI ---------------- */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openModal(id) {
    $(id).classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(id) {
    $(id).classList.remove('open');
    if (!document.querySelector('.modal.open')) document.body.style.overflow = '';
  }

  function closeAllModals() {
    document.querySelectorAll('.modal.open').forEach((m) => m.classList.remove('open'));
    document.body.style.overflow = '';
  }

  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }

  function starHTML(n, total) {
    const count = total || 3;
    let html = '';
    for (let i = 0; i < count; i++) html += `<span class="${i < n ? 'on' : ''}">★</span>`;
    return html;
  }

  /* ---------------- 首页 / 地图 ---------------- */
  function updateHomeStats() {
    $('stat-stars').textContent = totalStars();
  }

  function renderMap() {
    const list = $('level-list');
    list.innerHTML = LEVELS.map((lv, i) => {
      const unlocked = i === 0 || progress.cleared.includes(LEVELS[i - 1].id);
      const done = progress.cleared.includes(lv.id);
      const stars = Number(progress.stars[lv.id]) || 0;
      const status = done ? `已通关 · ${stars}/3 星` : unlocked ? '可挑战' : '未解锁';
      return `
        <div class="level-item ${unlocked ? '' : 'locked'} ${done ? 'done' : ''}"
             data-i="${i}" role="button" tabindex="${unlocked ? '0' : '-1'}"
             aria-disabled="${unlocked ? 'false' : 'true'}">
          <span class="level-node">${String(i + 1).padStart(2, '0')}</span>
          <div class="level-info">
            <h3>${lv.name}<span class="tag">${lv.tag}</span></h3>
            <p>${lv.subtitle} · ${lv.desc}</p>
            <span class="stars">${starHTML(stars)}</span>
          </div>
          <div class="level-side">
            <span class="status ${unlocked ? '' : 'lock'}">${status}</span>
            <span class="go">${done ? '再练一次 →' : unlocked ? '开始 →' : '锁定'}</span>
          </div>
        </div>`;
    }).join('');

    const pct = Math.round((progress.cleared.length / LEVELS.length) * 100);
    $('map-ring').style.setProperty('--p', pct);
    $('map-ring-txt').textContent = pct + '%';
    $('map-cleared').textContent = `${progress.cleared.length} / ${LEVELS.length}`;
    updateHomeStats();
  }

  /* ---------------- 关卡流程 ---------------- */
  function startLevel(index) {
    const lv = LEVELS[index];
    if (!lv) return;
    if (index > 0 && !progress.cleared.includes(LEVELS[index - 1].id)) {
      toast('先通关上一关才能解锁哦');
      return;
    }
    closeAllModals();
    stopTimer();
    state.levelIndex = index;
    state.level = lv;
    state.qIndex = 0;
    state.hearts = 3;
    state.mistakes = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.score = 0;
    state.correctCount = 0;
    state.answered = false;
    state.selected = -1;
    state.orderItems = [];
    state.picks = [];
    showScreen('screen-quiz');
    renderQuestion();
  }

  function exitLevel() {
    stopTimer();
    state.level = null;
    showScreen('screen-map');
    renderMap();
    toast('已退出本关，本关进度未保存');
  }

  function renderQuestion() {
    stopTimer();
    const q = currentQ();
    if (!q) return;

    state.answered = false;
    state.selected = -1;
    state.orderItems = [];
    state.picks = [];

    $('q-tag').textContent = q.type === 'order' ? '排序题' : '单选题';
    $('q-hint').textContent = state.level.timed
      ? `限时 ${QUESTION_TIME} 秒 · 答错或超时会失去 1 颗生命`
      : '答错会失去 1 颗生命，但可以看解析';
    $('q-text').textContent = q.q;
    $('feedback').hidden = true;
    $('feedback').className = 'feedback';
    $('combo').hidden = true;
    $('btn-next').disabled = true;
    $('btn-next').textContent = '继续';
    $('timer').hidden = !state.level.timed;

    const body = $('q-body');
    body.innerHTML = '';

    if (q.type === 'order') {
      renderOrderQuestion(q);
    } else {
      renderChoiceQuestion(q);
    }

    updateHUD();
    if (state.level.timed) startTimer();
  }

  function renderChoiceQuestion(q) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const body = $('q-body');
    q.options.forEach((text, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      btn.innerHTML = `<span class="key">${letters[idx]}</span><span class="txt">${text}</span>`;
      btn.addEventListener('click', () => selectOption(idx));
      body.appendChild(btn);
    });
  }

  function selectOption(idx) {
    if (state.answered) return;
    const q = currentQ();
    const buttons = Array.from(document.querySelectorAll('#q-body .option'));
    const correct = idx === q.answer;

    state.answered = true;
    state.selected = idx;
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.answer) btn.classList.add('correct');
      else if (i === idx) btn.classList.add('wrong');
      else btn.classList.add('dim');
    });

    stopTimer();
    if (correct) onCorrect();
    else onWrong(false);
    showFeedback(correct, q, idx, false);
    finishAnswer();
  }

  function finishAnswer() {
    $('btn-next').disabled = false;
    if (state.hearts <= 0) $('btn-next').textContent = '查看结果';
    $('quiz-progress').style.width = `${((state.qIndex + 1) / state.level.questions.length) * 100}%`;
  }

  function onCorrect() {
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    const gain = 100 + (state.combo - 1) * 25;
    state.score += gain;
    state.correctCount += 1;
    progress.stats.answered += 1;
    progress.stats.correct += 1;
    saveProgress();
    sfxCorrect();
    updateHUD();
    updateCombo();
  }

  function onWrong() {
    state.combo = 0;
    state.mistakes += 1;
    state.hearts = Math.max(0, state.hearts - 1);
    progress.stats.answered += 1;
    saveProgress();
    sfxWrong();
    updateHUD();
    $('combo').hidden = true;
  }

  function updateCombo() {
    const combo = $('combo');
    if (state.combo >= 2) {
      $('combo-num').textContent = state.combo;
      combo.hidden = false;
      combo.style.animation = 'none';
      void combo.offsetWidth;
      combo.style.animation = '';
    } else {
      combo.hidden = true;
    }
  }

  function updateHUD() {
    let hearts = '';
    for (let i = 0; i < 3; i++) {
      hearts += `<span class="h ${i < state.hearts ? '' : 'lost'}">♥</span>`;
    }
    $('quiz-hearts').innerHTML = hearts;
    $('quiz-score').textContent = state.score;
    if (state.level) {
      $('quiz-level-name').textContent =
        `${String(state.levelIndex + 1).padStart(2, '0')} · ${state.level.name}`;
      $('quiz-q-index').textContent = `${state.qIndex + 1} / ${state.level.questions.length}`;
    }
  }

  function showFeedback(correct, q, chosen, timeout) {
    const fb = $('feedback');
    fb.hidden = false;
    fb.className = 'feedback' + (correct ? '' : ' bad');
    $('fb-icon').textContent = correct ? '✓' : '✕';
    $('fb-title').textContent = correct
      ? (q.type === 'order' ? '排序完全正确' : '回答正确')
      : timeout
        ? '时间到，失去 1 颗生命'
        : '回答错误，失去 1 颗生命';

    let html = '';
    if (!correct && q.type === 'choice') {
      html += `<b>正确答案：${'ABCD'[q.answer]}. ${q.options[q.answer]}</b><br>`;
    }
    if (!correct && q.type === 'order') {
      html += `<b>正确顺序：</b><br>${q.items.map((t, i) => `${i + 1}. ${t}`).join('<br>')}<br><br>`;
    }
    html += q.explain;
    $('fb-explain').innerHTML = html;
  }

  function nextStep() {
    if (!state.answered) return;
    if (state.hearts <= 0) {
      finishLevel(true);
      return;
    }
    if (state.qIndex + 1 >= state.level.questions.length) {
      finishLevel(false);
      return;
    }
    state.qIndex += 1;
    renderQuestion();
  }

  /* ---------------- 排序题 ---------------- */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function renderOrderQuestion(q) {
    const items = q.items.map((text, idx) => ({ text, idx }));
    shuffle(items);
    if (items.every((it, i) => it.idx === i)) items.push(items.shift());
    state.orderItems = items;

    const body = $('q-body');
    body.innerHTML = `
      <div class="order-zone-head">点击下方步骤，按正确的结晶先后顺序放入答题区（再点一次可撤回）</div>
      <div class="order-pool" id="order-pool"></div>
      <div class="order-zone" id="order-zone">
        <div class="order-slots" id="order-slots"></div>
      </div>
      <button class="btn ghost order-submit" id="order-submit" type="button" disabled>确认排序</button>
    `;
    $('order-submit').addEventListener('click', submitOrder);
    renderOrderState();
  }

  function renderOrderState() {
    if (!state.orderItems.length) return;
    const pool = $('order-pool');
    const slots = $('order-slots');
    const submit = $('order-submit');
    if (!pool || !slots || !submit) return;

    pool.innerHTML = '';
    state.orderItems.forEach((item, pos) => {
      if (state.picks.includes(pos)) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'order-chip';
      btn.innerHTML = `<span class="idx">+</span><span>${item.text}</span>`;
      btn.addEventListener('click', () => {
        if (state.answered) return;
        state.picks.push(pos);
        sfxClick();
        renderOrderState();
      });
      pool.appendChild(btn);
    });

    slots.innerHTML = '';
    if (!state.picks.length) {
      slots.innerHTML = '<div class="order-empty">尚未选择步骤</div>';
    }
    state.picks.forEach((pos, i) => {
      const item = state.orderItems[pos];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'order-slot';
      btn.innerHTML = `<span class="num">${i + 1}</span><span>${item.text}</span>`;
      btn.addEventListener('click', () => {
        if (state.answered) return;
        state.picks.splice(i, 1);
        sfxClick();
        renderOrderState();
      });
      slots.appendChild(btn);
    });

    submit.disabled = state.picks.length !== state.orderItems.length;
  }

  function submitOrder() {
    if (state.answered) return;
    const q = currentQ();
    if (state.picks.length !== state.orderItems.length) return;

    state.answered = true;
    const chosen = state.picks.map((pos) => state.orderItems[pos].idx);
    const correct = chosen.every((v, i) => v === i);

    const zone = $('order-zone');
    zone.classList.add(correct ? 'ok' : 'bad');
    document.querySelectorAll('#q-body .order-chip').forEach((b) => { b.disabled = true; });
    const submit = $('order-submit');
    submit.disabled = true;
    submit.textContent = '已提交';

    stopTimer();
    if (correct) onCorrect();
    else onWrong();
    showFeedback(correct, q, -1, false);
    finishAnswer();
  }

  /* ---------------- 计时 ---------------- */
  function startTimer() {
    state.timeLeft = QUESTION_TIME;
    $('timer').hidden = false;
    updateTimerUI();
    state.timer = setInterval(() => {
      state.timeLeft -= 0.1;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        updateTimerUI();
        stopTimer();
        handleTimeout();
        return;
      }
      updateTimerUI();
    }, 100);
  }

  function updateTimerUI() {
    const pct = Math.max(0, (state.timeLeft / QUESTION_TIME) * 100);
    $('timer-fill').style.width = pct + '%';
    $('timer-txt').textContent = Math.ceil(state.timeLeft) + 's';
  }

  function stopTimer() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  function handleTimeout() {
    if (state.answered || !state.level) return;
    const q = currentQ();
    state.answered = true;

    document.querySelectorAll('#q-body .option').forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.answer) btn.classList.add('correct');
      else btn.classList.add('dim');
    });

    onWrong();
    showFeedback(false, q, -1, true);
    finishAnswer();
  }

  /* ---------------- 结算 ---------------- */
  function finishLevel(failed) {
    stopTimer();
    const lv = state.level;
    const total = lv.questions.length;

    if (failed) {
      $('modal-levelup').querySelector('.levelup-card').classList.add('fail');
      $('lu-badge').textContent = '挑战失败';
      $('lu-title').textContent = `${lv.name} · 未通过`;
      $('lu-stars').innerHTML = starHTML(0);
      $('lu-sub').textContent = '生命值耗尽。别急着跳过解析，弄懂每一步转变再来一次。';
      $('lu-correct').textContent = `${state.correctCount} / ${total}`;
      $('lu-score').textContent = state.score;
      $('lu-xp').textContent = '+0';
      $('lu-next').hidden = true;
      sfxFail();
      openModal('modal-levelup');
      return;
    }

    const stars = state.mistakes === 0 ? 3 : state.mistakes === 1 ? 2 : 1;
    const firstClear = !progress.cleared.includes(lv.id);
    progress.stars[lv.id] = Math.max(Number(progress.stars[lv.id]) || 0, stars);
    if (firstClear) progress.cleared.push(lv.id);
    const gainedXp = stars * 100 + (firstClear ? 50 : 0);
    progress.xp += gainedXp;
    saveProgress();

    const card = $('modal-levelup').querySelector('.levelup-card');
    card.classList.remove('fail');
    $('lu-badge').textContent = firstClear ? '首次通关' : '再次通关';
    $('lu-title').textContent = `${lv.name} · 通关`;
    $('lu-stars').innerHTML = starHTML(stars);
    $('lu-sub').textContent =
      stars === 3
        ? '零失误通关，相图的关键脉络已经掌握。'
        : stars === 2
          ? '只错了一题，把解析再过一遍就更稳了。'
          : '顺利过关，但还有两处知识点需要回顾。';
    $('lu-correct').textContent = `${state.correctCount} / ${total}`;
    $('lu-score').textContent = state.score;
    $('lu-xp').textContent = '+' + gainedXp;
    $('lu-next').hidden = false;
    $('lu-next').textContent = state.levelIndex >= LEVELS.length - 1 ? '查看总成绩' : '下一关';

    sfxWin();
    openModal('modal-levelup');
    renderMap();
  }

  function showFinal() {
    closeAllModals();
    const stars = totalStars();
    const maxStars = LEVELS.length * 3;
    const pct = Math.round((stars / maxStars) * 100);
    const badge =
      stars >= 17 ? '相图大师' :
      stars >= 13 ? '冶金工程师' :
      stars >= 9 ? '资深学徒' : '见习炼金师';

    $('final-ring').style.setProperty('--p', pct);
    $('final-pct').textContent = pct + '%';
    $('final-stars').textContent = `${stars} / ${maxStars}`;
    $('final-xp').textContent = progress.xp;
    $('final-badge').textContent = badge;
    const answered = progress.stats.answered;
    $('final-acc').textContent = answered
      ? Math.round((progress.stats.correct / answered) * 100) + '%'
      : '0%';
    openModal('modal-final');
  }

  /* ---------------- 知识手册 ---------------- */
  function renderHandbook() {
    const html = `
      <section class="hb-sec">
        <h3>基本相与组织</h3>
        <div class="hb-grid">
          <div class="hb-item"><b><span class="key-color" style="background:#3ddc97"></span>铁素体 F</b>
            <span>碳溶于 α-Fe 的间隙固溶体，体心立方；室温溶碳仅约 0.0008%，软、塑性好。</span></div>
          <div class="hb-item"><b><span class="key-color" style="background:#43dcff"></span>奥氏体 A</b>
            <span>碳溶于 γ-Fe 的间隙固溶体，面心立方；1148℃ 最大溶碳 2.11%，高温塑性好。</span></div>
          <div class="hb-item"><b><span class="key-color" style="background:#ffd166"></span>渗碳体 Fe₃C</b>
            <span>铁碳金属化合物，含碳 6.69%，复杂斜方晶格，硬而脆，是钢中的强化相。</span></div>
          <div class="hb-item"><b><span class="key-color" style="background:#9fb4d0"></span>珠光体 P</b>
            <span>F 与 Fe₃C 片层相间的共析组织，0.77% C，由奥氏体在 727℃ 共析转变形成。</span></div>
          <div class="hb-item"><b><span class="key-color" style="background:#ff5f6d"></span>莱氏体 Ld</b>
            <span>A 与 Fe₃C 的共晶组织，4.3% C，1148℃ 共晶转变形成；室温为变态莱氏体 Ld′。</span></div>
        </div>
        <div class="hb-note">相组成物只有 F、A、Fe₃C 三种；珠光体与莱氏体属于“组织组成物”。</div>
      </section>

      <section class="hb-sec">
        <h3>关键点一览</h3>
        <div class="table-wrap">
          <table class="hb-table">
            <thead><tr><th>点</th><th>含碳量 / %</th><th>温度 / ℃</th><th>意义</th></tr></thead>
            <tbody>
              <tr><td>S</td><td>0.77</td><td>727</td><td>共析点，A → F + Fe₃C（珠光体）</td></tr>
              <tr><td>C</td><td>4.3</td><td>1148</td><td>共晶点，L → A + Fe₃C（莱氏体）</td></tr>
              <tr><td>E</td><td>2.11</td><td>1148</td><td>奥氏体最大溶碳量，钢与白口铸铁分界</td></tr>
              <tr><td>P</td><td>0.0218</td><td>727</td><td>室温铁素体最大溶碳量</td></tr>
              <tr><td>K / F</td><td>6.69</td><td>727 / 1148</td><td>渗碳体成分点</td></tr>
              <tr><td>G</td><td>0</td><td>912</td><td>γ-Fe ↔ α-Fe 同素异晶转变</td></tr>
              <tr><td>A</td><td>0</td><td>1538</td><td>纯铁熔点</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="hb-sec">
        <h3>铁碳合金分类与室温组织</h3>
        <div class="table-wrap">
          <table class="hb-table">
            <thead><tr><th>类别</th><th>含碳量 / %</th><th>室温组织</th></tr></thead>
            <tbody>
              <tr><td>工业纯铁</td><td>≤ 0.0218</td><td>F（+ 极少量 Fe₃C_III）</td></tr>
              <tr><td>亚共析钢</td><td>0.0218 ~ 0.77</td><td>F + P</td></tr>
              <tr><td>共析钢</td><td>0.77</td><td>P</td></tr>
              <tr><td>过共析钢</td><td>0.77 ~ 2.11</td><td>P + Fe₃C_II</td></tr>
              <tr><td>亚共晶白口铸铁</td><td>2.11 ~ 4.3</td><td>P + Fe₃C_II + Ld′</td></tr>
              <tr><td>共晶白口铸铁</td><td>4.3</td><td>Ld′</td></tr>
              <tr><td>过共晶白口铸铁</td><td>4.3 ~ 6.69</td><td>Fe₃C_I + Ld′</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="hb-sec">
        <h3>杠杆定律</h3>
        <p class="hb-sub">两相区中，某相的含量 = 对边线段 ÷ 两相区总宽度。</p>
        <div class="formula">Q<sub>α</sub> = (x<sub>β</sub> − x) / (x<sub>β</sub> − x<sub>α</sub>) × 100%<br>
          Q<sub>β</sub> = (x − x<sub>α</sub>) / (x<sub>β</sub> − x<sub>α</sub>) × 100%</div>
        <ul>
          <li><b>组织组成物</b>：杠杆端点取组织成分（如 P 用 0.77 与 0.0218）。</li>
          <li><b>相组成物</b>：杠杆端点取相成分（F 用 0.0008 / 0.0218，Fe₃C 用 6.69）。</li>
          <li>0.45% C 钢：组织 P ≈ 57.2%、F ≈ 42.8%；相 F ≈ 93.6%、Fe₃C ≈ 6.4%。</li>
          <li>1.2% C 钢：P ≈ 92.7%、Fe₃C_II ≈ 7.3%。</li>
        </ul>
      </section>

      <section class="hb-sec">
        <h3>结晶过程主线</h3>
        <ul>
          <li><b>亚共析钢</b>：L → A，沿 GS 析出 F，727℃ A → P，室温 F + P。</li>
          <li><b>共析钢</b>：L → A，727℃ A → P，室温全部为 P。</li>
          <li><b>过共析钢</b>：L → A，沿 ES（Acm）析出 Fe₃C_II，727℃ A → P，室温 P + 网状 Fe₃C_II。</li>
          <li><b>亚共晶白口铸铁</b>：L → 初晶 A，1148℃ L → Ld，奥氏体析出 Fe₃C_II 后 727℃ 共析，室温 P + Fe₃C_II + Ld′。</li>
          <li><b>共晶白口铸铁</b>：1148℃ L → Ld，奥氏体继续析出 Fe₃C_II 并共析，室温 Ld′。</li>
          <li><b>过共晶白口铸铁</b>：L → 初晶 Fe₃C_I，1148℃ L → Ld，室温 Fe₃C_I + Ld′。</li>
        </ul>
        <div class="hb-note">记忆顺序：先看有没有“先共晶 / 先共析”，再看有没有“共晶 / 共析”，最后写出室温组织。</div>
      </section>
    `;
    $('handbook-body').innerHTML = html;
  }

  function openDiagram() {
    if (!diagramReady) {
      window.renderPhaseDiagram($('diagram-host'));
      window.renderPhaseLegend($('diagram-legend'));
      diagramReady = true;
    }
    openModal('modal-diagram');
  }

  /* ---------------- 事件绑定 ---------------- */
  function bindEvents() {
    $('btn-start').addEventListener('click', () => {
      sfxClick();
      renderMap();
      showScreen('screen-map');
    });

    $('btn-handbook').addEventListener('click', () => { sfxClick(); openModal('modal-handbook'); });
    $('btn-handbook-2').addEventListener('click', () => { sfxClick(); openModal('modal-handbook'); });
    $('btn-diagram').addEventListener('click', () => { sfxClick(); openDiagram(); });
    $('btn-quit').addEventListener('click', exitLevel);
    $('btn-next').addEventListener('click', nextStep);

    $('btn-sound').addEventListener('click', () => {
      soundOn = !soundOn;
      try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch (err) { /* ignore */ }
      updateSoundBtn();
      if (soundOn) sfxClick();
      toast(soundOn ? '音效已开启' : '音效已关闭');
    });

    const list = $('level-list');
    list.addEventListener('click', (e) => {
      const item = e.target.closest('.level-item');
      if (!item || item.classList.contains('locked')) return;
      sfxClick();
      startLevel(Number(item.dataset.i));
    });
    list.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const item = e.target.closest('.level-item');
      if (!item || item.classList.contains('locked')) return;
      e.preventDefault();
      startLevel(Number(item.dataset.i));
    });

    $('lu-map').addEventListener('click', () => {
      closeAllModals();
      renderMap();
      showScreen('screen-map');
    });
    $('lu-retry').addEventListener('click', () => {
      const index = state.levelIndex;
      closeAllModals();
      startLevel(index);
    });
    $('lu-next').addEventListener('click', () => {
      if (state.levelIndex >= LEVELS.length - 1) {
        closeAllModals();
        showFinal();
      } else {
        const next = state.levelIndex + 1;
        closeAllModals();
        startLevel(next);
      }
    });

    $('final-map').addEventListener('click', () => {
      closeAllModals();
      renderMap();
      showScreen('screen-map');
    });
    $('final-restart').addEventListener('click', () => {
      const ok = window.confirm('确定要清空全部闯关记录，重新开始吗？');
      if (!ok) return;
      progress = defaultProgress();
      saveProgress();
      closeAllModals();
      renderMap();
      showScreen('screen-home');
      toast('进度已重置，重新出发');
    });

    document.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });

    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal.id);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const open = document.querySelector('.modal.open');
        if (open) closeModal(open.id);
        return;
      }
      if (document.querySelector('.modal.open')) return;
      if (!$('screen-quiz').classList.contains('active') || !state.level) return;

      if (!state.answered && /^[1-6]$/.test(e.key)) {
        const buttons = document.querySelectorAll('#q-body .option');
        const btn = buttons[Number(e.key) - 1];
        if (btn) btn.click();
      }
      if (e.key === 'Enter') {
        if (!$('btn-next').disabled) {
          $('btn-next').click();
        } else {
          const submit = $('order-submit');
          if (submit && !submit.disabled) submit.click();
        }
      }
    });
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    updateSoundBtn();
    renderHandbook();
    renderMap();
    bindEvents();
  }

  init();
})();
