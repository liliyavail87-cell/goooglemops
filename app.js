/* GooogleMops — логика. Часть 1: утилиты и звук */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const fmt = (n) => Number(n).toLocaleString('ru-RU');

  const lastPick = {};
  function pick(arr, key = 'default') {
    if (!arr || !arr.length) return '';
    let item = arr[Math.floor(Math.random() * arr.length)];
    if (arr.length > 1 && item === lastPick[key]) {
      item = arr[(arr.indexOf(item) + 1) % arr.length];
    }
    lastPick[key] = item;
    return item;
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const PUG = $('#pug');
  const PUG_WRAP = $('#pugWrap');
  const BUBBLE = $('#bubble');
  const FX = $('#fx');
  const PUG_COL = $('.pug-col');
  const STAGE = $('#stage');
  const TOASTS = $('#toasts');

  /* ── Звук: пуки, слюни и сопение из файлов ─────────────── */

  const FART_FILES = [
    'assets/sounds/farts.mp3',
    'assets/sounds/farts-3.mp3',
    'assets/sounds/farts-4.mp3',
    'assets/sounds/farts-5.mp3',
    'assets/sounds/farts-6.mp3',
    'assets/sounds/farts-7.mp3',
    'assets/sounds/farts-8.mp3',
    'assets/sounds/farts-10.mp3',
    'assets/sounds/farts-11.mp3',
    'assets/sounds/farts-16.mp3',
    'assets/sounds/farts-18.mp3',
    'assets/sounds/farts-24.mp3',
    'assets/sounds/farts-26.mp3',
    'assets/sounds/simple-fart.mp3',
    'assets/sounds/long-fart.mp3'
  ];

  const DROOL_FILES = [
    'assets/sounds/drool-dribble.mp3',
    'assets/sounds/drool-squelch-3.mp3',
    'assets/sounds/drool-squelch-4.mp3',
    'assets/sounds/drool-squelch-wet-2.mp3',
    'assets/sounds/drool-saliva.mp3',
    'assets/sounds/drool-bite.mp3'
  ];

  const SNORT_FILES = [
    'assets/sounds/snort-1.mp3',
    'assets/sounds/snort-4.mp3',
    'assets/sounds/snort-5.mp3',
    'assets/sounds/snort-6.mp3',
    'assets/sounds/snort-7.mp3',
    'assets/sounds/snort-10.mp3',
    'assets/sounds/snort-multi-1.mp3',
    'assets/sounds/snort-multi-2.mp3'
  ];

  const Sound = {
    ctx: null,
    master: null,
    muted: false,
    volume: 0.9,
    playingFiles: new Set(),

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;

      this.ctx = new AC();

      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -11;
      compressor.knee.value = 12;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.22;

      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(compressor);
      compressor.connect(this.ctx.destination);

      // крошечная «комната»: синтетическая реверберация для реализма
      const convolver = this.ctx.createConvolver();
      const seconds = 0.32;
      const rate = this.ctx.sampleRate;
      const length = Math.floor(rate * seconds);
      const impulse = this.ctx.createBuffer(2, length, rate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          const decay = Math.pow(1 - i / length, 3.2);
          data[i] = (Math.random() * 2 - 1) * decay * 0.55;
        }
      }
      convolver.buffer = impulse;
      const room = this.ctx.createGain();
      room.gain.value = 0.15;
      this.master.connect(convolver);
      convolver.connect(room);
      room.connect(this.ctx.destination);
    },

    noise(duration = 0.5) {
      const ctx = this.ctx;
      const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      return src;
    },

    fart() {
      this.playFile(FART_FILES, 1);
      // иногда — второй, короткий и обиженный
      if (Math.random() < 0.22) {
        setTimeout(() => {
          if (this.muted) return;
          this.playFile(FART_FILES, 0.55);
        }, rand(260, 620));
      }
    },

    playFile(files, level = 1) {
      const src = files[Math.floor(Math.random() * files.length)];
      const audio = new Audio(src);
      audio._level = level;
      audio.volume = Math.max(0, Math.min(1, this.volume * level));
      audio.muted = this.muted;
      audio.preload = 'auto';
      this.playingFiles.add(audio);

      const done = () => {
        this.playingFiles.delete(audio);
        audio.src = '';
      };
      audio.addEventListener('ended', done, { once: true });
      audio.addEventListener('error', done, { once: true });

      audio.play().catch(done);
    },

    snort() {
      this.playFile(SNORT_FILES, 1.15);
      // иногда мопс сопит ещё раз, уже тише и как будто извиняясь
      if (Math.random() < 0.25) {
        setTimeout(() => {
          if (this.muted) return;
          this.playFile(SNORT_FILES, 0.65);
        }, rand(240, 520));
      }
    },

    drool() {
      this.playFile(DROOL_FILES, 1);
      // иногда слюна тянется вторым чавком
      if (Math.random() < 0.3) {
        setTimeout(() => {
          if (this.muted) return;
          this.playFile(DROOL_FILES, 0.6);
        }, rand(300, 700));
      }
    },

    nothing() {
      this.init();
      if (!this.ctx) return;
      const ctx = this.ctx;
      const t = ctx.currentTime;

      const blip = ctx.createOscillator();
      blip.type = 'sine';
      blip.frequency.setValueAtTime(520, t);
      blip.frequency.exponentialRampToValueAtTime(258, t + 0.5);
      const bg = ctx.createGain();
      bg.gain.value = 0.0001;
      bg.gain.exponentialRampToValueAtTime(0.05, t + 0.05);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
      blip.connect(bg);
      bg.connect(this.master);
      blip.start(t);
      blip.stop(t + 0.64);

      const air = this.noise(0.85);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 4200;
      const ag = ctx.createGain();
      ag.gain.value = 0.0001;
      ag.gain.exponentialRampToValueAtTime(0.028, t + 0.22);
      ag.gain.exponentialRampToValueAtTime(0.0001, t + 0.88);
      air.connect(hp);
      hp.connect(ag);
      ag.connect(this.master);
      air.start(t);
      air.stop(t + 0.9);
    },

    toggleMute() {
      this.muted = !this.muted;
      this.init();
      if (this.ctx && this.master) {
        this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.02);
      }
      this.playingFiles.forEach((audio) => { audio.muted = this.muted; });
      try { localStorage.setItem('gm-muted', this.muted ? '1' : '0'); } catch (e) { /* пусто */ }
      return this.muted;
    },

    setVolume(value) {
      this.volume = Math.max(0, Math.min(1, value));
      this.init();
      if (this.ctx && this.master) {
        this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.04);
      }
      this.playingFiles.forEach((audio) => {
        audio.volume = Math.max(0, Math.min(1, this.volume * (audio._level || 1)));
      });
      try { localStorage.setItem('gm-volume', String(Math.round(this.volume * 100))); } catch (e) { /* пусто */ }
    }
  };

  try {
    if (localStorage.getItem('gm-muted') === '1') Sound.muted = true;
    const savedVolume = localStorage.getItem('gm-volume');
    if (savedVolume !== null) {
      const value = Number(savedVolume);
      if (Number.isFinite(value) && value >= 0 && value <= 100) Sound.volume = value / 100;
    }
  } catch (e) { /* пусто */ }

  /* ── Статистика и мелкий UI ───────────────────────────── */

  const counters = { farts: 0, snorts: 0, drool: 0, nothing: 0 };
  const statEls = {
    farts: $('#statFarts'),
    snorts: $('#statSnorts'),
    drool: $('#statDrool'),
    nothing: $('#statNothing')
  };

  try {
    const savedStats = JSON.parse(localStorage.getItem('gm-stats') || 'null');
    if (savedStats && typeof savedStats === 'object') {
      Object.keys(counters).forEach((key) => {
        const value = Number(savedStats[key]);
        if (Number.isFinite(value) && value >= 0) counters[key] = Math.floor(value);
      });
    }
  } catch (e) { /* пусто */ }

  Object.entries(statEls).forEach(([key, el]) => {
    if (el) el.textContent = fmt(counters[key]);
  });

  function saveCounters() {
    try { localStorage.setItem('gm-stats', JSON.stringify(counters)); } catch (e) { /* пусто */ }
  }

  function addCounter(key, amount = 1) {
    counters[key] += amount;
    const el = statEls[key];
    if (el) {
      el.textContent = fmt(counters[key]);
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    }
    saveCounters();
    checkAchievements(key);
  }

  function checkAchievements(key) {
    const value = counters[key];
    if (key === 'farts' && value === 1) toast('Достижение: первый газ. Уже что-то. Хотя нет.', '🏆');
    if (key === 'farts' && value === 10) toast('Достижение: газовик. Соседи в курсе.', '🏆');
    if (key === 'snorts' && value === 1) toast('Достижение: первый всхрап. Мопс одобряет.', '🏆');
    if (key === 'snorts' && value === 10) toast('Достижение: профессиональный сопун.', '🏆');
    if (key === 'drool' && value >= 10 && value - 3 < 10) toast('Достижение: 10 мл слюней. Клавиатура в опасности.', '🏆');
    if (key === 'nothing' && value === 1) toast('Достижение: ничего сделано идеально.', '🏆');
    if (key === 'nothing' && value === 5) toast('Достижение: мастер ничего.', '🏆');
  }

  function toast(message) {
    TOASTS.textContent = '';

    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    TOASTS.appendChild(el);

    const life = 3600;
    const remove = () => {
      el.classList.add('is-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 500);
    };
    setTimeout(remove, life);
  }

  let bubbleTimer = null;
  function say(text, duration = 3400) {
    if (!text) return;
    BUBBLE.textContent = text;
    BUBBLE.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => BUBBLE.classList.remove('show'), duration);
  }

  function retriggerAnimation(el, className, duration = 1700) {
    el.classList.remove('farting', 'snorting', 'drooling', 'doing-nothing');
    void el.getBoundingClientRect();
    el.classList.add(className);
    clearTimeout(retriggerAnimation.timer);
    retriggerAnimation.timer = setTimeout(() => el.classList.remove(className), duration);
  }

  /* ── Частицы вокруг мопса ─────────────────────────────── */

  function pointInPug(fx, fy) {
    const box = PUG.getBoundingClientRect();
    const col = PUG_COL.getBoundingClientRect();
    return {
      x: box.left - col.left + box.width * fx,
      y: box.top - col.top + box.height * fy
    };
  }

  function spawnPuffs(kind, count) {
    const base = kind === 'snort' ? pointInPug(0.63, 0.62) : pointInPug(0.5, 0.98);
    const total = reduceMotion ? Math.max(3, Math.ceil(count / 2)) : count;

    for (let i = 0; i < total; i++) {
      const size = kind === 'snort' ? rand(16, 34) : rand(30, 72);
      const puff = document.createElement('div');
      puff.className = 'puff' + (kind === 'snort' ? ' puff--snort' : '');
      puff.style.width = size + 'px';
      puff.style.height = size + 'px';
      puff.style.left = base.x + rand(-34, 34) + 'px';
      puff.style.top = base.y + rand(-16, 16) + 'px';
      FX.appendChild(puff);

      const side = Math.random() > 0.5 ? 1 : -1;
      const dx = kind === 'snort' ? side * rand(35, 110) : rand(-70, 70);
      const dy = kind === 'snort' ? rand(-30, 30) : -rand(70, 190);
      const duration = kind === 'snort' ? rand(450, 750) : rand(1000, 1900);

      puff.animate([
        { transform: 'translate(-50%, -50%) scale(.4)', opacity: 0 },
        { opacity: kind === 'snort' ? 0.75 : 0.85, offset: 0.22 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${kind === 'snort' ? 1.5 : 1.7})`, opacity: 0 }
      ], {
        duration,
        delay: i * (kind === 'snort' ? 40 : 55),
        easing: kind === 'snort' ? 'ease-out' : 'cubic-bezier(.25, .6, .35, 1)',
        fill: 'both'
      }).onfinish = () => puff.remove();
    }
  }

  function spawnDroplets(count) {
    const base = pointInPug(0.42, 0.75);
    const total = reduceMotion ? Math.max(3, Math.ceil(count / 2)) : count;

    for (let i = 0; i < total; i++) {
      const drop = document.createElement('div');
      drop.className = 'drop';
      drop.style.left = base.x + rand(-10, 10) + 'px';
      drop.style.top = base.y + rand(-6, 6) + 'px';
      drop.style.width = rand(7, 12) + 'px';
      drop.style.height = rand(11, 18) + 'px';
      FX.appendChild(drop);

      drop.animate([
        { transform: 'translate(-50%, -50%) translateY(0) scale(.7)', opacity: 0 },
        { opacity: 1, offset: 0.18 },
        { transform: `translate(-50%, -50%) translate(${rand(-22, 22)}px, ${rand(80, 150)}px) scale(1)`, opacity: 0 }
      ], {
        duration: rand(650, 1000),
        delay: i * 80,
        easing: 'cubic-bezier(.35, .05, .8, .6)',
        fill: 'both'
      }).onfinish = () => drop.remove();
    }
  }

  function fartEffects() {
    spawnPuffs('stink', randInt(7, 10));
    PUG_COL.classList.remove('stink');
    void PUG_COL.offsetWidth;
    PUG_COL.classList.add('stink');
    setTimeout(() => PUG_COL.classList.remove('stink'), 1600);
  }

  /* ── Действия мопса ───────────────────────────────────── */

  const ACTIONS = {
    fart: {
      cls: 'farting',
      sound: 'fart',
      lines: [
        'Это не я. Это диван.',
        'Простите. Я мопс.',
        'Газ! Газ! Газ!',
        'Так пахнет польза. Наверное.',
        'Было громко. Толку ноль.',
        'Я предупреждал.',
        'Ой.',
        'Это всё слюни виноваты.'
      ],
      run() {
        Sound.fart();
        fartEffects();
        addCounter('farts');
      }
    },
    snort: {
      cls: 'snorting',
      sound: 'snort',
      lines: [
        'Хррр. Что?',
        'Я не спал. Я думал.',
        'Сопение — тоже язык.',
        'Продолжайте, я всхрапну.',
        'Нос работает. Мозг — нет.',
        'Это был вдох вдохновения.',
        'Не мешайте носу.'
      ],
      run() {
        Sound.snort();
        spawnPuffs('snort', randInt(4, 7));
        addCounter('snorts');
      }
    },
    drool: {
      cls: 'drooling',
      sound: 'drool',
      lines: [
        'Слюни — это тоже результат.',
        'Осторожно, клавиатура.',
        'Я пустил слюну. И что?',
        'Мокро. Полезно? Нет.',
        'Это не слюни, это идеи.',
        'Польза вытекла. Извините.',
        'Ещё чуть-чуть и будет лужа.'
      ],
      run() {
        Sound.drool();
        spawnDroplets(randInt(6, 9));
        addCounter('drool', randInt(2, 6));
      }
    },
    nothing: {
      cls: 'doing-nothing',
      sound: 'nothing',
      lines: [
        '…',
        'Я ничего не сделал. Идеально.',
        'Работаю. Мысленно.',
        'Не мешайте. Я занят ничем.',
        'Готово. Ничего.',
        'Результат: ноль. Стабильность: сто.',
        'Я в процессе. Процесс — это тоже ничего.'
      ],
      run() {
        Sound.nothing();
        addCounter('nothing');
      }
    }
  };

  function perform(name) {
    const action = ACTIONS[name];
    if (!action) return;
    retriggerAnimation(PUG, action.cls, action.cls === 'doing-nothing' ? 1700 : 1500);
    say(pick(action.lines, name));
    action.run();
  }

  /* ── «Сделать ничего» ─────────────────────────────────── */

  let nothingBusy = false;

  function doNothingMachine() {
    if (nothingBusy) return;
    nothingBusy = true;

    Sound.nothing();
    retriggerAnimation(PUG, 'doing-nothing', 2600);
    say(pick(ACTIONS.nothing.lines, 'nothing'));

    setTimeout(() => {
      addCounter('nothing');
      toast('Ничего выполнено. Результат: 0 пользы.', '🫥');
      nothingBusy = false;
    }, 2100);
  }

  /* ── Фейковый поиск и мудрости Стэтхэма ──────────────── */

  const SEARCH_LINES = [
    'Мопс обыскал диван. Ничего.',
    'Я нашёл 0 полезного. Как всегда.',
    'Носом чую: это не поможет.',
    'Результаты есть. Толку нет.',
    'Искал старательно. Нашёл слюни.',
    'Запрос принят. Польза отклонена.',
    'Мопс кивнул. Это не значит «да».'
  ];

  const RESULT_TEMPLATES = [
    {
      title: 'Почему «{q}» не работает: 12 версий мопса',
      snippet: 'Мопс проверил всё носом. Нос устал. Вывод: дело не в вас, а в слюнях.'
    },
    {
      title: '«{q}»: пошаговая инструкция',
      snippet: 'Шаг 1. Лягте. Шаг 2. Всхрапните. Шаг 3. Ничего не делайте. Готово.'
    },
    {
      title: 'Мопс объясняет: «{q}» — это когда сопишь',
      snippet: 'Эксперт с 0 лет опыта отвечает на вопросы, лёжа на диване и не открывая глаз.'
    },
    {
      title: '10 газов, которые изменили мою жизнь',
      snippet: 'Спойлер: ни один из них не изменил. Но было громко и с душой.'
    },
    {
      title: 'Слюнявый лайфхак: намочить клавиатуру за 3 секунды',
      snippet: 'Просто тряхните головой. Работает безотказно. Гарантия — никакой.'
    },
    {
      title: 'Мопс против продуктивности: кто победил?',
      snippet: 'Победил диван. Диван побеждает всегда. Мопс даже не расстроился.'
    },
    {
      title: 'Официальный ответ GooogleMops на запрос «{q}»',
      snippet: 'Мы не знаем. Мы даже не искали. Но звук был убедительный.'
    },
    {
      title: 'Всё про «{q}» в одном предложении',
      snippet: 'Предложение не поместилось, потому что мопс на него лёг и уснул.'
    },
    {
      title: 'Срочно: мопс нашёл «{q}» и съел',
      snippet: 'Полезной информации не обнаружено. Обнаружены крошки и одна слюна.'
    },
    {
      title: 'Лучшие сорта слюней 2026',
      snippet: 'Рейтинг составлен носом. Первое место: ваша клавиатура. Второе: ваш рукав.'
    },
    {
      title: 'Как сопеть в общественном транспорте',
      snippet: 'Пособие для начинающих мопсов. Прилагается нос, диван и полное отсутствие плана.'
    },
    {
      title: '«{q}» — правда или вымысел?',
      snippet: 'Мопс посмотрел вдаль, пустил слюну и уснул. Считаем это ответом «нет».'
    },
    {
      title: 'Учёные выяснили, зачем мопс пердит',
      snippet: 'Затем же, зачем всё остальное: чтобы вы не получили никакой пользы.'
    }
  ];

  const AD = {
    title: 'Слюни премиум-класса — доставка носом',
    snippet: 'Первый слюнявый маркетплейс. Оплата газами. Возврат не предусмотрен. Мопс не умеет продавать.'
  };

  const STATHAM_WISDOMS = [
    'Если не знаешь, что делать, — сядь. Диван знает больше, чем кажется.',
    'Мопс не лает. Мопс запоминает.',
    'Никогда не беги за автобусом. Автобус сам приедет. Или это уже его проблемы.',
    'Настоящий мужчина не ищет пользы. Настоящий мужчина ищет, где сесть.',
    'Если проблема не решается — значит, она ещё не знает, с кем имеет дело.',
    'Слюни — не признак слабости. Слюни — признак того, что ты не держишь всё в себе.',
    'Я не опаздываю. Я прихожу тогда, когда надо. Обычно это позже.',
    'Хочешь изменить мир — начни с носков. Они всё равно пропали.',
    'Тишина — золото. Особенно когда ты ничего не сделал.',
    'Не спорь с холодильником. Он всё равно откроется.',
    'План — это когда ты знаешь, куда идёшь. Мопс — это когда ты уже там.',
    'Если тебя никто не понимает, возможно, ты просто сопишь слишком тихо.',
    'Успех — это не когда всё получилось. Успех — это когда ты успел лечь.',
    'Никогда не показывай, что тебе нечего сказать. Скажи это очень уверенно.',
    'Настоящая сила — вовремя промолчать. И вовремя пернуть.',
    'Не бойся ошибок. Бойся, что тебя попросят повторить.',
    'Кто рано встаёт, тот рано жалеет.',
    'Мудрость не приходит с возрастом. Она приходит с диваном.',
    'Если сомневаешься — ничего не делай. Потом сомневайся ещё раз.',
    'У каждого свой путь. Мой лежит через кухню.',
    'Не все герои носят плащи. Некоторые носят свитер и пускают слюни.',
    'Слово — серебро. Молчание — золото. Всхрап — платина.',
    'Ты не проиграл. Ты просто ещё не закончил ничего делать.',
    'Порядок в голове начинается с порядка в миске.',
    'Если жизнь дала тебе лимон — проверь, не украли ли апельсин.',
    'Никогда не объясняй дважды. Второй раз — это уже для соседей.',
    'Я не ленивый. Я энергоэффективный.',
    'Настоящий мопс не бежит за мячом. Мяч знает своё место.',
    'Не важно, как ты выглядишь. Важно, как ты выглядишь, когда никто не смотрит.',
    'Иногда лучший план — это отсутствие плана. И отсутствие пользы.',
    'Если тебе сказали „не принимай на свой счёт“ — принимай дважды.',
    'Дисциплина — это когда делаешь то, что не хочешь. Мопс — когда не делаешь.',
    'Не нужен повод, чтобы ничего не сделать. Нужно вдохновение.',
    'Хороший пёс не тот, кто слушается. А тот, кто делает вид.',
    'Мир несправедлив. Но диван мягкий. Начни с малого.',
    'Когда ты на вершине, не забудь, кто тебя туда нёс. Скорее всего, никто.',
    'Твои слюни — твоё дело. Чужие слюни — уже искусство.',
    'Если не можешь победить систему — ляг рядом с ней.',
    'Не ищи смысл там, где ищут носки.',
    'Настоящая дружба — это когда тебе разрешают пернуть и не меняют тему.',
    'Я не сплю. Я перезагружаюсь.',
    'Если кто-то говорит, что всё под контролем, — спроси, где его поводок.',
    'Не важно, сколько ты сделал. Важно, сколько ты собирался.',
    'Иногда шаг вперёд — это шаг к холодильнику.',
    'Скромность украшает. Но свитер греет лучше.',
    'Настоящее спокойствие — это когда прогресс доходит до 99% и висит.',
    'Если тебе нечего добавить — добавь паузу.',
    'Кто ищет, тот всегда найдёт. Обычно не то.',
    'Не бойся выглядеть смешно. Бойся, что поймут, что ты серьёзен.',
    'Польза — это миф. Но слухи о ней упорны.',
    'Настоящий мужчина, как ковёр тёти Зины — с каждым годом лысеет.',
    'Мама учила не ругаться матом, но жизнь научила не ругаться матом при маме.',
    'Если тебе где-то не рады в рваных носках, то и в целых туда идти не стоит.',
    'Тут — это вам не там.',
    'Кто рано встаёт — тому весь день спать хочется.',
    'Если ты смелый, ловкий и очень сексуальный — иди домой, ты пьян.',
    'Сниму квартиру. Порядок на районе гарантирую.',
    'Я живу, как карта ляжет. Ты живёшь, как мамка скажет.',
    'Взял нож — режь, взял дошик — ешь.',
    'Если заблудился в лесу, иди домой.',
    'Сила — не в бабках. Ведь бабки — уже старые.',
    'В жизни всегда есть две дороги: одна — первая, а другая — вторая.',
    'Я вообще делаю что хочу. Хочу импланты — звоню врачу.',
    'Из проведённых 64-х боёв у меня 64 победы. Все бои были с тенью.',
    'Никогда не сдавайтесь, идите к своей цели! А если будет сложно — сдавайтесь.',
    'Запомни: всего одна ошибка — и ты ошибся.',
    'Делай, как надо. Как не надо, не делай.',
    'Работа — это не волк. Работа — ворк. А волк — это ходить.',
    'Не будьте эгоистами, в первую очередь думайте о себе!',
    'Мы должны оставаться мыми, а они — оними.',
    'Как говорил мой дед, «Я твой дед».',
    'Жи-ши пиши от души.',
    'Без подошвы тапочки — это просто тряпочки.',
    'Слово — не воробей. Вообще ничто не воробей, кроме самого воробья.',
    'Работа не волк. Никто не волк. Только волк волк.',
    'Если закрыть глаза, становится темно.',
    '«Не спешите вытаскивать людей из дерьма. Возможно, это их естественная среда обитания.»'
  ];

  const WISDOM_CLICK_LINES = [
    'Мудрость обновлена. Пользы не прибавилось.',
    'Стэтхэм бы одобрил. Наверное.',
    'Мысль глубокая. Лужа тоже.',
    'Записал. Выбросил.',
    'Теперь ты знаешь больше. Толку ноль.'
  ];

  const RESULT_CLICK_LINES = [
    'Это не помогло.',
    'Пользы: по-прежнему 0.',
    'Мопс лизнул ссылку. Ничего.',
    'Тупик. Как и всё здесь.',
    'Страница открылась. Мопс закрыл.',
    'Информация съедена. Спасибо за визит.'
  ];

  const queryInput = $('#q');
  const searchForm = $('#searchForm');
  const resultsSection = $('#results');
  const resultsList = $('#resultsList');
  const resultsCount = $('#resultsCount');
  const luckyButton = $('#lucky');

  function slug(text) {
    return text.toLowerCase().replace(/\s+/g, '-').slice(0, 24) || 'nichego';
  }

  function withQuery(text, q) {
    return text.split('{q}').join(q);
  }

  function createResultCard(tpl, q) {
    const card = document.createElement('a');
    card.className = 'result';
    card.href = '#';

    const url = document.createElement('div');
    url.className = 'result__url';
    url.textContent = 'mops.example › ' + slug(q);

    const title = document.createElement('h3');
    title.className = 'result__title';
    title.textContent = withQuery(tpl.title, q);

    const snippet = document.createElement('p');
    snippet.className = 'result__snippet';
    snippet.textContent = withQuery(tpl.snippet, q);

    card.append(url, title, snippet);
    card.addEventListener('click', (event) => {
      event.preventDefault();
      toast(pick(RESULT_CLICK_LINES, 'result'), '🕳️');
    });
    return card;
  }

  function createAdCard() {
    const card = document.createElement('a');
    card.className = 'result result--ad';
    card.href = '#';

    const tag = document.createElement('span');
    tag.className = 'result__tag';
    tag.textContent = 'Реклама';

    const url = document.createElement('div');
    url.className = 'result__url';
    url.textContent = 'mops-market.example › sluni-premium';

    const title = document.createElement('h3');
    title.className = 'result__title';
    title.textContent = AD.title;

    const snippet = document.createElement('p');
    snippet.className = 'result__snippet';
    snippet.textContent = AD.snippet;

    card.append(tag, url, title, snippet);
    card.addEventListener('click', (event) => {
      event.preventDefault();
      toast('Мопс не умеет продавать. И не будет.', '🛒');
    });
    return card;
  }

  function createWisdomCard(quote) {
    const card = document.createElement('a');
    card.className = 'result result--wisdom';
    card.href = '#';

    const tag = document.createElement('span');
    tag.className = 'result__tag result__tag--gold';
    tag.textContent = 'Мудрость';

    const text = document.createElement('blockquote');
    text.className = 'wisdom';
    text.textContent = '«' + (quote || pick(STATHAM_WISDOMS, 'wisdom')) + '»';

    const author = document.createElement('p');
    author.className = 'wisdom__author';
    const name = document.createElement('b');
    name.textContent = 'Джейсон Стэтхэм';
    author.append(name, document.createTextNode(' · цитата выдумана · пользы нет'));

    card.append(tag, text, author);
    card.addEventListener('click', (event) => {
      event.preventDefault();
      text.textContent = '«' + pick(STATHAM_WISDOMS, 'wisdom') + '»';
      toast(pick(WISDOM_CLICK_LINES, 'wisdomClick'), '🕶️');
    });
    return card;
  }

  function createPhotoCard() {
    const card = document.createElement('a');
    card.className = 'result result--photo';
    card.href = '#';

    const thumb = document.createElement('img');
    thumb.className = 'result__thumb';
    thumb.src = 'assets/pug.png';
    thumb.alt = 'Настоящий мопс крупным планом';
    thumb.loading = 'lazy';
    thumb.width = 96;
    thumb.height = 96;

    const body = document.createElement('div');
    body.className = 'result__body';

    const tag = document.createElement('span');
    tag.className = 'result__tag';
    tag.textContent = 'Фото';

    const url = document.createElement('div');
    url.className = 'result__url';
    url.textContent = 'photos.mops.example › mops';

    const title = document.createElement('h3');
    title.className = 'result__title';
    title.textContent = 'Фото дня: мопс, который ничего не нашёл';

    const snippet = document.createElement('p');
    snippet.className = 'result__snippet';
    snippet.textContent = 'Настоящий мопс крупным планом. Смотреть красиво, пользы ноль. Фото — из архива проекта.';

    body.append(tag, url, title, snippet);
    card.append(thumb, body);
    card.addEventListener('click', (event) => {
      event.preventDefault();
      toast('Красиво. Но не помогло.', '📸');
    });
    return card;
  }

  function renderResults(q) {
    resultsList.textContent = '';
    resultsList.scrollTop = 0;
    const wisdomMode = /стэтхэм|стетхэм|statham|мудрост/i.test(q);
    const templates = shuffle(RESULT_TEMPLATES);
    const regularCount = wisdomMode ? 0 : 3;

    templates.slice(0, regularCount).forEach((tpl) => {
      resultsList.appendChild(createResultCard(tpl, q));
    });

    if (!wisdomMode) {
      resultsList.insertBefore(createAdCard(), resultsList.children[1] || null);
      resultsList.insertBefore(createWisdomCard(), resultsList.children[2] || null);
      resultsList.appendChild(createPhotoCard());
    } else {
      for (let i = 0; i < 4; i++) {
        resultsList.appendChild(createWisdomCard());
      }
    }

    const total = resultsList.children.length;
    resultsCount.textContent = wisdomMode
      ? 'Мудростей: ' + total + ' · полезных: 0 · Стэтхэм молчит'
      : 'Найдено: ' + total + ' · полезных: 0 · мопс устал';
  }

  function runSearch(raw) {
    const q = (raw || '').trim() || 'ничего';
    renderResults(q);
    say(pick(SEARCH_LINES, 'search'), 3600);
    resultsSection.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });

    if (/польз/i.test(q)) {
      toast('Польза не найдена. Возможно, её никогда не было.', '💧');
      setTimeout(() => {
        Sound.drool();
        spawnDroplets(6);
        retriggerAnimation(PUG, 'drooling', 1500);
        addCounter('drool', 3);
      }, 700);
    }

    if (/стэтхэм|стетхэм|statham/i.test(q)) {
      toast('Стэтхэм передал мудрость. Мопс передал слюни.', '🕶️');
      setTimeout(() => {
        spawnDroplets(5);
        retriggerAnimation(PUG, 'drooling', 1400);
        addCounter('drool', 2);
      }, 600);
    }
  }

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    runSearch(queryInput.value);
  });

  luckyButton.addEventListener('click', () => {
    const name = pick(['fart', 'snort', 'drool', 'nothing'], 'lucky');
    perform(name);
    const labels = { fart: '«Пердеть»', snort: '«Сопеть»', drool: '«Слюни»', nothing: '«Ничего»' };
    toast('Повезло! Мопс выбрал: ' + labels[name], '🎲');
  });

  $$('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      queryInput.value = chip.textContent;
      runSearch(chip.textContent);
    });
  });

  $$('.filter').forEach((filter) => {
    filter.addEventListener('click', () => {
      $$('.filter').forEach((f) => f.classList.remove('is-active'));
      filter.classList.add('is-active');
      if (filter.textContent === 'Мудрости') {
        queryInput.value = 'мудрость Стэтхэма';
        runSearch('мудрость Стэтхэма');
      } else {
        toast('Фильтр ничего не изменил. Как и всё остальное.', '🧹');
      }
    });
  });

  /* ── Кнопки и мопс ────────────────────────────────────── */

  $$('.ctrl').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'nothing') {
        doNothingMachine();
      } else {
        perform(action);
      }
    });
  });

  function petPug() {
    const name = pick(['fart', 'snort', 'drool', 'nothing'], 'pet');
    perform(name);
  }

  PUG_WRAP.addEventListener('click', petPug);
  PUG_WRAP.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      petPug();
    }
  });

  /* ── Звук вкл/выкл ────────────────────────────────────── */

  const soundButton = $('#soundToggle');

  function syncSoundButton() {
    soundButton.textContent = Sound.muted ? '🔇' : '🔊';
    soundButton.setAttribute('aria-pressed', String(!Sound.muted));
    soundButton.setAttribute('aria-label', Sound.muted ? 'Включить звук' : 'Выключить звук');
  }
  syncSoundButton();

  soundButton.addEventListener('click', () => {
    const muted = Sound.toggleMute();
    syncSoundButton();
    if (!muted) Sound.snort();
    toast(
      muted ? 'Звук выключен. Тишина тоже бесполезна.' : 'Звук включён. Слышите? Это не польза.',
      muted ? '🔇' : '🔊'
    );
  });

  const volumeSlider = $('#volume');
  const volumeValue = $('#volumeVal');

  function syncVolume(value) {
    const percent = Math.round(value * 100);
    volumeSlider.value = String(percent);
    volumeValue.textContent = percent + '%';
  }
  syncVolume(Sound.volume);

  volumeSlider.addEventListener('input', () => {
    const percent = Number(volumeSlider.value);
    if (Sound.muted && percent > 0) {
      Sound.muted = false;
      try { localStorage.setItem('gm-muted', '0'); } catch (e) { /* пусто */ }
      syncSoundButton();
    }
    Sound.setVolume(percent / 100);
    volumeValue.textContent = percent + '%';
  });

  const resetButton = $('#resetStats');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      Object.keys(counters).forEach((key) => { counters[key] = 0; });
      Object.entries(statEls).forEach(([, el]) => {
        if (el) el.textContent = '0';
      });
      saveCounters();
      toast('Счётчики сброшены. Польза осталась на месте.', '🧽');
    });
  }

  /* ── Подсказка-плейсхолдер ────────────────────────────── */

  const placeholders = [
    'Что бесполезного вы ищете?',
    'Например: как перестать сопеть',
    'Введите запрос. Мопс всё равно не поможет',
    'Куда деваются носки?',
    'Почему клавиатура мокрая?',
    'Как стать продуктивным (не обязательно)'
  ];
  let placeholderIndex = 0;
  setInterval(() => {
    if (document.activeElement === queryInput || queryInput.value) return;
    placeholderIndex = (placeholderIndex + 1) % placeholders.length;
    queryInput.placeholder = placeholders[placeholderIndex];
  }, 4200);

  /* ── Пасхалки и горячие клавиши ───────────────────────── */

  const shortcuts = { f: 'fart', s: 'snort', d: 'drool', n: 'nothing' };
  const konami = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright'];
  let arrowBuffer = [];
  let wordBuffer = '';

  function rainPugs() {
    const total = reduceMotion ? 5 : 14;
    for (let i = 0; i < total; i++) {
      const pug = document.createElement('div');
      pug.textContent = '🐶';
      pug.style.cssText = 'position:fixed;top:-50px;z-index:70;pointer-events:none;' +
        'left:' + rand(0, 100) + 'vw;font-size:' + rand(20, 46) + 'px;';
      document.body.appendChild(pug);
      pug.animate([
        { transform: 'translateY(0) rotate(-12deg)' },
        { transform: 'translateY(' + (window.innerHeight + 90) + 'px) rotate(' + rand(-320, 320) + 'deg)' }
      ], {
        duration: rand(2400, 4200),
        delay: i * 70,
        easing: 'cubic-bezier(.3, .1, .6, 1)'
      }).onfinish = () => pug.remove();
    }
  }

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const tag = (target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || target.isContentEditable;
    const key = (event.key || '').toLowerCase();

    wordBuffer = (wordBuffer + key).slice(-12);
    if (wordBuffer.endsWith('польза') && !event.repeat) {
      wordBuffer = '';
      toast('Польза не найдена. Попробуйте слюни.', '🔎');
      setTimeout(() => perform('drool'), 250);
    }

    if (typing) return;

    if (shortcuts[key]) {
      event.preventDefault();
      if (shortcuts[key] === 'nothing') {
        doNothingMachine();
      } else {
        perform(shortcuts[key]);
      }
      return;
    }

    if (key.startsWith('arrow')) {
      arrowBuffer.push(key);
      arrowBuffer = arrowBuffer.slice(-konami.length);
      if (arrowBuffer.join(',') === konami.join(',')) {
        arrowBuffer = [];
        rainPugs();
        toast('МОПС-РЕЖИМ активирован. Польза: всё ещё 0.', '🐶');
        setTimeout(() => perform('fart'), 500);
      }
    }
  });

  /* ── Старт ────────────────────────────────────────────── */

  say('Я GooogleMops. Я не помогу.', 4200);

  console.log('%cGooogleMops', 'font-size:20px;font-weight:800;color:#4285f4', '— польза не обнаружена. И не будет.');
  console.log('Подсказка: F — пердеть, S — сопеть, D — слюни, N — ничего. Секретов больше нет. Наверное.');



})();

