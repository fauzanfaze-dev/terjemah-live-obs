(function () {
  "use strict";

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const SpeechRecognitionPhrase = window.SpeechRecognitionPhrase;
  const TranslatorAPI = window.Translator;
  const STORAGE_KEY = "terjemah-live-settings-v1";
  const NAME_DICTIONARY_KEY = "terjemah-live-name-dictionary-v1";
  const TRANSFORMERS_CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";
  const MAX_NAMES = 500;
  const MAX_ALIASES_PER_NAME = 20;

  const DIRECTIONS = {
    "id-en": {
      sourceLanguage: "id",
      targetLanguage: "en",
      recognitionLanguage: "id-ID",
      sourceName: "Indonesia",
      targetName: "English",
      localModel: "Xenova/opus-mt-id-en",
      demoSource: "Selamat datang, semoga acara hari ini berjalan dengan lancar.",
      demoTarget: "Welcome, we hope today's event goes smoothly.",
    },
    "en-id": {
      sourceLanguage: "en",
      targetLanguage: "id",
      recognitionLanguage: "en-US",
      sourceName: "English",
      targetName: "Indonesia",
      localModel: "Xenova/opus-mt-en-id",
      demoSource: "Thank you for joining us today. The event will begin shortly.",
      demoTarget: "Terima kasih telah bergabung hari ini. Acara akan segera dimulai.",
    },
  };

  const DEFAULT_SETTINGS = {
    direction: "id-en",
    translatorMode: "auto",
    fontSize: 58,
    fontFamily: "default",
    maxLines: 2,
    captionPosition: "bottom",
    keyColor: "green",
    textColor: "white",
    clearDelay: 8,
    showOriginal: true,
    controlsCollapsed: false,
  };

  const dom = {
    liveStatus: document.getElementById("liveStatus"),
    liveStatusText: document.getElementById("liveStatusText"),
    startButton: document.getElementById("startButton"),
    startButtonText: document.getElementById("startButtonText"),
    demoButton: document.getElementById("demoButton"),
    swapButton: document.getElementById("swapButton"),
    obsButton: document.getElementById("obsButton"),
    installButton: document.getElementById("installButton"),
    toggleControlsButton: document.getElementById("toggleControlsButton"),
    toggleControlsText: document.getElementById("toggleControlsText"),
    settingsPanel: document.getElementById("settingsPanel"),
    dictionaryPanel: document.getElementById("dictionaryPanel"),
    directionOptions: Array.from(document.querySelectorAll("[data-direction]")),
    directionSummary: document.getElementById("directionSummary"),
    speechIcon: document.getElementById("speechIcon"),
    speechSupport: document.getElementById("speechSupport"),
    translatorIcon: document.getElementById("translatorIcon"),
    translatorSupport: document.getElementById("translatorSupport"),
    engineIcon: document.getElementById("engineIcon"),
    engineSupport: document.getElementById("engineSupport"),
    translatorMode: document.getElementById("translatorMode"),
    fontSize: document.getElementById("fontSize"),
    fontSizeValue: document.getElementById("fontSizeValue"),
    fontFamily: document.getElementById("fontFamily"),
    maxLines: document.getElementById("maxLines"),
    captionPosition: document.getElementById("captionPosition"),
    keyColor: document.getElementById("keyColor"),
    textColor: document.getElementById("textColor"),
    clearDelay: document.getElementById("clearDelay"),
    clearDelayValue: document.getElementById("clearDelayValue"),
    showOriginal: document.getElementById("showOriginal"),
    overlayStage: document.getElementById("overlayStage"),
    captionWrap: document.getElementById("captionWrap"),
    sourceCaption: document.getElementById("sourceCaption"),
    translationCaption: document.getElementById("translationCaption"),
    emptyPreview: document.getElementById("emptyPreview"),
    sourceLanguageLabel: document.getElementById("sourceLanguageLabel"),
    targetLanguageLabel: document.getElementById("targetLanguageLabel"),
    notice: document.getElementById("notice"),
    noticeTitle: document.getElementById("noticeTitle"),
    noticeText: document.getElementById("noticeText"),
    toast: document.getElementById("toast"),
    dictionaryCount: document.getElementById("dictionaryCount"),
    dictionaryEmpty: document.getElementById("dictionaryEmpty"),
    nameList: document.getElementById("nameList"),
    nameAddForm: document.getElementById("nameAddForm"),
    nameInput: document.getElementById("nameInput"),
    nameBulkInput: document.getElementById("nameBulkInput"),
    addBulkNamesButton: document.getElementById("addBulkNamesButton"),
    nameFileInput: document.getElementById("nameFileInput"),
    exportNamesButton: document.getElementById("exportNamesButton"),
    clearNamesButton: document.getElementById("clearNamesButton"),
    calibrationStatus: document.getElementById("calibrationStatus"),
    nameEditorDialog: document.getElementById("nameEditorDialog"),
    nameEditorForm: document.getElementById("nameEditorForm"),
    nameEditorId: document.getElementById("nameEditorId"),
    nameEditorInput: document.getElementById("nameEditorInput"),
    nameAliasInput: document.getElementById("nameAliasInput"),
    closeNameEditorButton: document.getElementById("closeNameEditorButton"),
    cancelNameEditorButton: document.getElementById("cancelNameEditorButton"),
  };

  const state = {
    settings: loadSettings(),
    nameDictionary: loadNameDictionary(),
    nameMatcherRecords: null,
    recognition: null,
    calibrationRecognition: null,
    translator: null,
    translatorKey: "",
    translatorBackend: "",
    nativeUnavailable: false,
    enginePlan: null,
    transformersModulePromise: null,
    wantsListening: false,
    isListening: false,
    isStarting: false,
    restartTimer: null,
    clearTimer: null,
    toastTimer: null,
    captionRevision: 0,
    translationRevision: 0,
    pendingTranslation: null,
    translationBusy: false,
    overlayMode: false,
    requestedFullscreen: false,
    fatalRecognitionError: false,
    installPrompt: null,
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const merged = { ...DEFAULT_SETTINGS, ...saved };
      const allowedPositions = ["bottom", "middle", "top"];
      const allowedKeyColors = ["green", "blue", "black"];
      const allowedTextColors = ["white", "yellow", "magenta"];
      const allowedFonts = ["default", "times", "poppins", "arial"];
      const allowedTranslatorModes = ["auto", "economy", "maximum"];
      return {
        direction: DIRECTIONS[merged.direction] ? merged.direction : DEFAULT_SETTINGS.direction,
        translatorMode: allowedTranslatorModes.includes(merged.translatorMode)
          ? merged.translatorMode
          : DEFAULT_SETTINGS.translatorMode,
        fontSize: Math.max(34, Math.min(88, Number(merged.fontSize) || DEFAULT_SETTINGS.fontSize)),
        fontFamily: allowedFonts.includes(merged.fontFamily) ? merged.fontFamily : DEFAULT_SETTINGS.fontFamily,
        maxLines: Math.max(1, Math.min(4, Math.round(Number(merged.maxLines)) || DEFAULT_SETTINGS.maxLines)),
        captionPosition: allowedPositions.includes(merged.captionPosition)
          ? merged.captionPosition
          : DEFAULT_SETTINGS.captionPosition,
        keyColor: allowedKeyColors.includes(merged.keyColor) ? merged.keyColor : DEFAULT_SETTINGS.keyColor,
        textColor: allowedTextColors.includes(merged.textColor) ? merged.textColor : DEFAULT_SETTINGS.textColor,
        clearDelay: Math.max(2, Math.min(30, Number(merged.clearDelay) || DEFAULT_SETTINGS.clearDelay)),
        showOriginal: merged.showOriginal !== false,
        controlsCollapsed: merged.controlsCollapsed === true,
      };
    } catch (_error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `name-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function sanitizeName(value) {
    return String(value || "")
      .replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  function normalizeComparable(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("id")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeAliases(aliases, officialName) {
    const official = normalizeComparable(officialName);
    const seen = new Set();
    return (Array.isArray(aliases) ? aliases : [])
      .flatMap((alias) => String(alias || "").split(/[,;|]/))
      .map(sanitizeName)
      .filter((alias) => {
        const normalized = normalizeComparable(alias);
        if (!normalized || normalized === official || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      })
      .slice(0, MAX_ALIASES_PER_NAME);
  }

  function normalizeNameEntry(entry) {
    const name = sanitizeName(typeof entry === "string" ? entry : entry?.name);
    if (!name) return null;
    return {
      id: typeof entry === "object" && entry?.id ? String(entry.id) : makeId(),
      name,
      aliases: normalizeAliases(typeof entry === "object" ? entry.aliases : [], name),
      updatedAt: typeof entry === "object" && entry?.updatedAt ? String(entry.updatedAt) : new Date().toISOString(),
    };
  }

  function loadNameDictionary() {
    try {
      const saved = JSON.parse(localStorage.getItem(NAME_DICTIONARY_KEY) || "[]");
      const source = Array.isArray(saved) ? saved : saved?.names;
      if (!Array.isArray(source)) return [];
      const seen = new Set();
      return source
        .map(normalizeNameEntry)
        .filter((entry) => {
          if (!entry) return false;
          const key = normalizeComparable(entry.name);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, MAX_NAMES);
    } catch (_error) {
      return [];
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    } catch (_error) {
      // The app remains usable when browser storage is unavailable.
    }
  }

  function saveNameDictionary() {
    state.nameMatcherRecords = null;
    try {
      localStorage.setItem(NAME_DICTIONARY_KEY, JSON.stringify(state.nameDictionary));
    } catch (_error) {
      showNotice("Kamus belum tersimpan", "Penyimpanan browser tidak tersedia atau kapasitasnya penuh.");
    }
  }

  function setStatus(kind, message) {
    dom.liveStatus.dataset.state = kind;
    dom.liveStatusText.textContent = message;
  }

  function setSupport(icon, label, kind, message) {
    icon.dataset.state = kind;
    label.textContent = message;
  }

  function showNotice(title, message) {
    dom.noticeTitle.textContent = title;
    dom.noticeText.textContent = message;
    dom.notice.hidden = false;
  }

  function hideNotice() {
    dom.notice.hidden = true;
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => {
      dom.toast.classList.remove("is-visible");
    }, 2600);
  }

  function directionConfig() {
    return DIRECTIONS[state.settings.direction];
  }

  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.matchMedia("(max-width: 640px)").matches;
  }

  function deviceProfile() {
    return {
      mobile: isMobileDevice(),
      webgpu: Boolean(navigator.gpu),
      memory: Number(navigator.deviceMemory || 0),
      cores: Number(navigator.hardwareConcurrency || 0),
    };
  }

  function chooseEnginePlan(options = {}) {
    const { ignoreNative = false } = options;
    const profile = deviceProfile();
    if (!ignoreNative && !state.nativeUnavailable && TranslatorAPI && typeof TranslatorAPI.create === "function") {
      return {
        kind: "native",
        label: "Chrome bawaan",
        detail: "Native · paling ringan",
        finalOnly: state.settings.translatorMode === "economy",
      };
    }

    if (state.settings.translatorMode === "maximum" && profile.webgpu) {
      return {
        kind: "local-webgpu",
        label: "Lokal WebGPU",
        detail: "WebGPU · kualitas maksimum",
        device: "webgpu",
        dtype: "fp16",
        finalOnly: false,
        estimatedDownload: "sekitar 210 MB",
      };
    }

    const webgpuReady =
      profile.webgpu &&
      state.settings.translatorMode === "auto" &&
      (!profile.memory || profile.memory >= 4) &&
      (!profile.cores || profile.cores >= 4);
    if (webgpuReady) {
      return {
        kind: "local-webgpu",
        label: "Lokal WebGPU",
        detail: "WebGPU adaptif · kalimat final",
        device: "webgpu",
        dtype: "q4f16",
        finalOnly: true,
        estimatedDownload: "sekitar 150 MB",
      };
    }

    return {
      kind: "local-wasm",
      label: "Lokal Hemat",
      detail: "CPU/WASM · kalimat final",
      device: "wasm",
      dtype: "q8",
      finalOnly: true,
      estimatedDownload: "sekitar 115 MB",
    };
  }

  function applyDirectionUI() {
    const config = directionConfig();
    dom.directionOptions.forEach((button) => {
      const active = button.dataset.direction === state.settings.direction;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    dom.directionSummary.textContent = `${config.sourceName} didengar, ${config.targetName} ditampilkan.`;
    dom.sourceLanguageLabel.textContent = `Mendengar ${config.sourceName}`;
    dom.targetLanguageLabel.textContent = `Menampilkan ${config.targetName}`;
    dom.startButton.setAttribute("aria-label", `Mulai mendengar bahasa ${config.sourceName}`);
  }

  function applySettingsUI() {
    const {
      translatorMode,
      fontSize,
      fontFamily,
      maxLines,
      captionPosition,
      keyColor,
      textColor,
      clearDelay,
      showOriginal,
    } = state.settings;
    dom.translatorMode.value = translatorMode;
    dom.fontSize.value = String(fontSize);
    dom.fontSizeValue.value = `${fontSize} px`;
    dom.fontFamily.value = fontFamily;
    dom.maxLines.value = String(maxLines);
    dom.captionPosition.value = captionPosition;
    dom.keyColor.value = keyColor;
    dom.textColor.value = textColor;
    dom.clearDelay.value = String(clearDelay);
    dom.clearDelayValue.value = `${clearDelay} detik`;
    dom.showOriginal.checked = Boolean(showOriginal);

    document.documentElement.style.setProperty("--caption-size", `${fontSize}px`);
    const colors = { white: "#ffffff", yellow: "#ffe866", magenta: "#ff72b6" };
    const fonts = {
      default: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      times: '"Times New Roman", Times, serif',
      poppins: "Poppins, Arial, sans-serif",
      arial: "Arial, Helvetica, sans-serif",
    };
    document.documentElement.style.setProperty("--caption-color", colors[textColor] || colors.white);
    document.documentElement.style.setProperty("--caption-font", fonts[fontFamily] || fonts.default);

    dom.overlayStage.classList.remove("position-bottom", "position-middle", "position-top");
    dom.overlayStage.classList.add(`position-${captionPosition}`);
    dom.overlayStage.classList.remove("key-green", "key-blue", "key-black");
    dom.overlayStage.classList.add(`key-${keyColor}`);
    dom.overlayStage.classList.remove("lines-1", "lines-2", "lines-3", "lines-4");
    dom.overlayStage.classList.add(`lines-${maxLines}`);
    dom.overlayStage.classList.toggle("hide-original", !showOriginal);

    document.body.classList.remove("key-blue-body", "key-black-body");
    if (keyColor === "blue") document.body.classList.add("key-blue-body");
    if (keyColor === "black") document.body.classList.add("key-black-body");
    applyControlsUI();
  }

  function applyControlsUI() {
    const collapsed = state.settings.controlsCollapsed;
    document.body.classList.toggle("controls-collapsed", collapsed);
    dom.toggleControlsText.textContent = collapsed ? "Tampilkan kontrol" : "Sembunyikan kontrol";
    dom.toggleControlsButton.setAttribute("aria-expanded", String(!collapsed));
  }

  function updateStartButton() {
    const active = state.isListening || state.wantsListening || state.isStarting;
    dom.startButton.classList.toggle("is-listening", active && !state.isStarting);
    dom.startButton.disabled = false;
    if (state.isStarting) {
      dom.startButtonText.textContent = "Batalkan persiapan";
    } else if (state.isListening || state.wantsListening) {
      dom.startButtonText.textContent = "Berhenti";
    } else {
      dom.startButtonText.textContent = "Mulai mikrofon";
    }
  }

  function normalizeCaption(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function renderCaption(sourceText, translatedText, interim) {
    const source = normalizeCaption(sourceText);
    const translation = normalizeCaption(translatedText);
    dom.sourceCaption.textContent = source;
    dom.translationCaption.textContent = translation;
    const hasText = Boolean(source || translation);
    dom.captionWrap.classList.toggle("has-text", hasText);
    dom.captionWrap.classList.toggle("is-interim", Boolean(interim));
    dom.emptyPreview.hidden = hasText || state.overlayMode;
  }

  function clearCaption(expectedRevision) {
    if (typeof expectedRevision === "number" && expectedRevision !== state.captionRevision) return;
    state.captionRevision += 1;
    state.translationRevision += 1;
    state.pendingTranslation = null;
    renderCaption("", "", false);
  }

  function scheduleCaptionClear(revision) {
    window.clearTimeout(state.clearTimer);
    state.clearTimer = window.setTimeout(() => {
      clearCaption(revision);
    }, Number(state.settings.clearDelay) * 1000);
  }

  function levenshteinDistance(first, second) {
    const a = String(first || "");
    const b = String(second || "");
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const previous = Array.from({ length: b.length + 1 }, (_value, index) => index);
    const current = new Array(b.length + 1);
    for (let row = 1; row <= a.length; row += 1) {
      current[0] = row;
      for (let column = 1; column <= b.length; column += 1) {
        const cost = a[row - 1] === b[column - 1] ? 0 : 1;
        current[column] = Math.min(previous[column] + 1, current[column - 1] + 1, previous[column - 1] + cost);
      }
      for (let column = 0; column <= b.length; column += 1) previous[column] = current[column];
    }
    return previous[b.length];
  }

  function similarity(first, second) {
    const a = String(first || "");
    const b = String(second || "");
    const longest = Math.max(a.length, b.length);
    if (!longest) return 1;
    return 1 - levenshteinDistance(a, b) / longest;
  }

  function phoneticKey(value) {
    return normalizeComparable(value)
      .replace(/ph/g, "f")
      .replace(/sy|sh/g, "s")
      .replace(/kh/g, "h")
      .replace(/dj/g, "j")
      .replace(/tj/g, "c")
      .replace(/q/g, "k")
      .replace(/ck/g, "k")
      .replace(/z/g, "s")
      .replace(/y/g, "i")
      .replace(/ee/g, "i")
      .replace(/oo/g, "u")
      .replace(/(.)\1+/g, "$1")
      .replace(/\s+/g, "");
  }

  function tokenizeWords(text) {
    const tokens = [];
    const expression = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
    for (const match of String(text || "").matchAll(expression)) {
      tokens.push({ value: match[0], start: match.index, end: match.index + match[0].length });
    }
    return tokens;
  }

  function phraseRecords() {
    if (state.nameMatcherRecords) return state.nameMatcherRecords;
    state.nameMatcherRecords = state.nameDictionary.flatMap((entry) =>
      [entry.name, ...entry.aliases].map((phrase) => ({
        entry,
        phrase,
        normalized: normalizeComparable(phrase),
        phonetic: phoneticKey(phrase),
        words: normalizeComparable(phrase).split(" ").filter(Boolean).length,
      })),
    );
    return state.nameMatcherRecords;
  }

  function learnAlias(entry, alias) {
    const cleaned = sanitizeName(alias);
    const normalized = normalizeComparable(cleaned);
    if (!cleaned || !normalized || normalized === normalizeComparable(entry.name)) return false;
    if (entry.aliases.some((savedAlias) => normalizeComparable(savedAlias) === normalized)) return false;
    if (entry.aliases.length >= MAX_ALIASES_PER_NAME) return false;
    entry.aliases.push(cleaned);
    entry.updatedAt = new Date().toISOString();
    return true;
  }

  function correctNamesInText(text, options = {}) {
    const source = normalizeCaption(text);
    if (!source || !state.nameDictionary.length) return source;
    const tokens = tokenizeWords(source);
    if (!tokens.length) return source;
    const records = phraseRecords();
    const replacements = [];
    let learned = false;

    for (let start = 0; start < tokens.length; start += 1) {
      let accepted = null;
      const maximumLength = Math.min(6, tokens.length - start);
      for (let length = maximumLength; length >= 1 && !accepted; length -= 1) {
        const matchingRecords = records.filter((record) => record.words === length);
        if (!matchingRecords.length) continue;
        const candidate = source.slice(tokens[start].start, tokens[start + length - 1].end);
        const normalizedCandidate = normalizeComparable(candidate);
        const phoneticCandidate = phoneticKey(candidate);
        const scored = matchingRecords
          .map((record) => {
            const exact = normalizedCandidate === record.normalized;
            const lexicalScore = similarity(normalizedCandidate.replace(/\s/g, ""), record.normalized.replace(/\s/g, ""));
            const phoneticScore = similarity(phoneticCandidate, record.phonetic);
            const phoneticExact = Boolean(phoneticCandidate && phoneticCandidate === record.phonetic);
            const score = exact ? 1 : phoneticExact ? 0.965 : Math.max(lexicalScore, phoneticScore * 0.95);
            return { ...record, score, exact, phoneticExact };
          })
          .sort((a, b) => b.score - a.score || b.phrase.length - a.phrase.length);
        const best = scored[0];
        const secondDifferentName = scored.find(
          (item) => normalizeComparable(item.entry.name) !== normalizeComparable(best.entry.name),
        );
        const threshold = normalizedCandidate.length <= 4 ? 0.985 : 0.92;
        const uniqueEnough = !secondDifferentName || best.score - secondDifferentName.score >= 0.055;
        if ((best.exact || best.score >= threshold) && uniqueEnough) {
          accepted = {
            start: tokens[start].start,
            end: tokens[start + length - 1].end,
            candidate,
            entry: best.entry,
            exact: best.exact,
            score: best.score,
            length,
          };
        }
      }

      if (!accepted) continue;
      replacements.push(accepted);
      if (options.learn && !accepted.exact && accepted.score >= 0.95) {
        learned = learnAlias(accepted.entry, accepted.candidate) || learned;
      }
      start += accepted.length - 1;
    }

    if (!replacements.length) return source;
    let corrected = source;
    replacements
      .sort((a, b) => b.start - a.start)
      .forEach((replacement) => {
        corrected = `${corrected.slice(0, replacement.start)}${replacement.entry.name}${corrected.slice(replacement.end)}`;
      });
    if (learned) {
      saveNameDictionary();
      renderDictionary();
    }
    return corrected;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function protectNames(text) {
    let protectedText = String(text || "");
    const map = [];
    const entries = [...state.nameDictionary].sort((a, b) => b.name.length - a.name.length);
    entries.forEach((entry) => {
      const flexibleName = escapeRegExp(entry.name).replace(/\s+/g, "\\s+");
      const expression = new RegExp(`(^|[^\\p{L}\\p{N}])(${flexibleName})(?=$|[^\\p{L}\\p{N}])`, "giu");
      if (!expression.test(protectedText)) return;
      expression.lastIndex = 0;
      const token = `TLNAMETOKEN${map.length}ZXQ`;
      protectedText = protectedText.replace(expression, (_match, prefix) => `${prefix}${token}`);
      map.push({ token, name: entry.name });
    });
    return { text: protectedText, map };
  }

  function restoreNames(text, map) {
    let restored = String(text || "");
    map.forEach(({ token, name }, index) => {
      restored = restored.replace(new RegExp(escapeRegExp(token), "gi"), name);
      restored = restored.replace(new RegExp(`TL\\s*NAME\\s*TOKEN\\s*${index}\\s*ZXQ`, "gi"), name);
    });
    return restored;
  }

  function setSourceCaption(text, isFinal) {
    const source = correctNamesInText(text, { learn: Boolean(isFinal) });
    if (!source) return;
    window.clearTimeout(state.clearTimer);
    state.captionRevision += 1;
    const revision = state.captionRevision;
    renderCaption(source, dom.translationCaption.textContent, !isFinal);
    requestTranslation(source, revision, isFinal);
    scheduleCaptionClear(revision);
  }

  function shouldTranslateInterim() {
    if (!state.translator) return false;
    if (state.settings.translatorMode === "economy") return false;
    if (state.translatorBackend === "native") return true;
    return state.settings.translatorMode === "maximum" && state.translatorBackend === "local-webgpu";
  }

  function requestTranslation(text, captionRevision, isFinal) {
    if (!state.translator || (!isFinal && !shouldTranslateInterim())) return;
    state.translationRevision += 1;
    state.pendingTranslation = {
      id: state.translationRevision,
      captionRevision,
      text,
      isFinal,
    };
    void drainTranslations();
  }

  async function drainTranslations() {
    if (state.translationBusy) return;
    state.translationBusy = true;

    while (state.pendingTranslation && state.translator) {
      const job = state.pendingTranslation;
      state.pendingTranslation = null;
      try {
        const protectedNames = protectNames(job.text);
        const rawTranslation = await state.translator.translate(protectedNames.text);
        const translated = restoreNames(rawTranslation, protectedNames.map);
        const isLatest = job.id === state.translationRevision;
        const isCurrentCaption = job.captionRevision === state.captionRevision;
        if (isLatest && isCurrentCaption) {
          renderCaption(job.text, translated, !job.isFinal);
        }
      } catch (_error) {
        if (job.captionRevision === state.captionRevision) {
          renderCaption(job.text, "Terjemahan tidak tersedia", false);
          showNotice(
            "Penerjemahan terhenti",
            "Coba berhenti lalu mulai kembali. Pastikan koneksi tersedia untuk unduhan awal mesin penerjemah.",
          );
        }
      }
    }

    state.translationBusy = false;
  }

  function disposeTranslator() {
    if (state.translator && typeof state.translator.destroy === "function") {
      try {
        const disposing = state.translator.destroy();
        if (disposing && typeof disposing.catch === "function") disposing.catch(() => {});
      } catch (_error) {
        // A partially initialized local model may not expose a working disposer.
      }
    }
    state.translator = null;
    state.translatorKey = "";
    state.translatorBackend = "";
    state.pendingTranslation = null;
    state.translationRevision += 1;
  }

  async function prepareNativeTranslator(plan) {
    const config = directionConfig();
    setSupport(dom.translatorIcon, dom.translatorSupport, "waiting", "Menyiapkan Chrome…");
    const translator = await TranslatorAPI.create({
      sourceLanguage: config.sourceLanguage,
      targetLanguage: config.targetLanguage,
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", (event) => {
          const percentage = Math.max(0, Math.min(100, Math.round(Number(event.loaded || 0) * 100)));
          setSupport(dom.translatorIcon, dom.translatorSupport, "waiting", `Mengunduh ${percentage}%`);
          setStatus("preparing", `Mengunduh penerjemah ${percentage}%`);
        });
      },
    });
    state.translator = translator;
    state.translatorBackend = plan.kind;
    state.enginePlan = plan;
    setSupport(dom.translatorIcon, dom.translatorSupport, "ready", "Siap digunakan");
    setSupport(dom.engineIcon, dom.engineSupport, "ready", plan.detail);
    return translator;
  }

  async function loadTransformersModule() {
    if (!state.transformersModulePromise) {
      const loader =
        typeof window.__terjemahLoadTransformers === "function"
          ? window.__terjemahLoadTransformers
          : () => import(TRANSFORMERS_CDN);
      state.transformersModulePromise = Promise.resolve().then(loader).catch((error) => {
        state.transformersModulePromise = null;
        throw error;
      });
    }
    return state.transformersModulePromise;
  }

  function localDownloadProgress(progress) {
    if (!progress || typeof progress !== "object") return;
    if (progress.status === "progress") {
      let percentage = Number(progress.progress);
      if (!Number.isFinite(percentage) && Number(progress.total) > 0) {
        percentage = (Number(progress.loaded) / Number(progress.total)) * 100;
      }
      if (Number.isFinite(percentage)) {
        if (percentage <= 1) percentage *= 100;
        const rounded = Math.max(0, Math.min(100, Math.round(percentage)));
        setSupport(dom.translatorIcon, dom.translatorSupport, "waiting", `Mengunduh model ${rounded}%`);
        setStatus("preparing", `Mengunduh model lokal ${rounded}%`);
      }
    }
  }

  async function prepareLocalTranslator(plan) {
    const config = directionConfig();
    setSupport(dom.engineIcon, dom.engineSupport, "waiting", `${plan.detail} · menyiapkan`);
    setSupport(dom.translatorIcon, dom.translatorSupport, "waiting", "Memuat model lokal…");
    showNotice(
      "Menyiapkan penerjemah gratis",
      `Unduhan pertama ${plan.estimatedDownload}. Model akan disimpan oleh browser agar penggunaan berikutnya lebih cepat.`,
    );

    const transformers = await loadTransformersModule();
    if (transformers.env) {
      transformers.env.allowLocalModels = false;
      transformers.env.useBrowserCache = true;
    }
    const pipelineInstance = await transformers.pipeline("translation", config.localModel, {
      device: plan.device,
      dtype: plan.dtype,
      progress_callback: localDownloadProgress,
    });
    const wrapped = {
      async translate(text) {
        const result = await pipelineInstance(text, { max_new_tokens: 160 });
        const first = Array.isArray(result) ? result[0] : result;
        const translated = first?.translation_text ?? first?.generated_text ?? first?.text;
        if (!translated) throw new Error("empty-local-translation");
        return String(translated);
      },
      destroy() {
        if (typeof pipelineInstance.dispose === "function") return pipelineInstance.dispose();
        return undefined;
      },
    };
    state.translator = wrapped;
    state.translatorBackend = plan.kind;
    state.enginePlan = plan;
    setSupport(dom.translatorIcon, dom.translatorSupport, "ready", "Model lokal siap");
    setSupport(dom.engineIcon, dom.engineSupport, "ready", plan.detail);
    hideNotice();
    return wrapped;
  }

  async function prepareTranslator() {
    const config = directionConfig();
    const intendedPlan = chooseEnginePlan();
    const intendedKey = `${config.sourceLanguage}-${config.targetLanguage}-${intendedPlan.kind}-${intendedPlan.dtype || "native"}-${state.settings.translatorMode}`;
    if (state.translator && state.translatorKey === intendedKey) return state.translator;

    disposeTranslator();
    if (intendedPlan.kind === "native") {
      try {
        const translator = await prepareNativeTranslator(intendedPlan);
        state.translatorKey = intendedKey;
        return translator;
      } catch (_nativeError) {
        state.nativeUnavailable = true;
        setSupport(dom.translatorIcon, dom.translatorSupport, "waiting", "Beralih ke model lokal…");
      }
    }

    let localPlan = chooseEnginePlan({ ignoreNative: true });
    try {
      const translator = await prepareLocalTranslator(localPlan);
      state.translatorKey = `${config.sourceLanguage}-${config.targetLanguage}-${localPlan.kind}-${localPlan.dtype}-${state.settings.translatorMode}`;
      return translator;
    } catch (error) {
      if (localPlan.kind === "local-webgpu") {
        localPlan = {
          kind: "local-wasm",
          label: "Lokal Hemat",
          detail: "CPU/WASM · fallback aman",
          device: "wasm",
          dtype: "q8",
          finalOnly: true,
          estimatedDownload: "sekitar 115 MB",
        };
        setSupport(dom.engineIcon, dom.engineSupport, "waiting", "WebGPU gagal · mencoba CPU/WASM");
        const translator = await prepareLocalTranslator(localPlan);
        state.translatorKey = `${config.sourceLanguage}-${config.targetLanguage}-${localPlan.kind}-${localPlan.dtype}-${state.settings.translatorMode}`;
        return translator;
      }
      throw error;
    }
  }

  function applyRecognitionPhrases(recognition, focusedEntry) {
    if (!recognition || !("phrases" in recognition) || typeof SpeechRecognitionPhrase !== "function") return;
    try {
      const source = focusedEntry
        ? [focusedEntry.name, ...focusedEntry.aliases]
        : state.nameDictionary.flatMap((entry) => [entry.name, ...entry.aliases.slice(0, 2)]);
      const phrases = [];
      const seen = new Set();
      source.slice(0, 120).forEach((phrase) => {
        const cleaned = sanitizeName(phrase);
        const normalized = normalizeComparable(cleaned);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        phrases.push(new SpeechRecognitionPhrase(cleaned, focusedEntry ? 10 : 7));
      });
      recognition.phrases = phrases;
    } catch (_error) {
      // Contextual biasing is experimental; name correction still works without it.
    }
  }

  function createRecognition() {
    if (!SpeechRecognition) throw new Error("speech-unsupported");
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = directionConfig().recognitionLanguage;
    applyRecognitionPhrases(recognition);

    recognition.onstart = () => {
      state.isListening = true;
      state.isStarting = false;
      state.fatalRecognitionError = false;
      setStatus("listening", `Mendengar ${directionConfig().sourceName}`);
      setSupport(dom.speechIcon, dom.speechSupport, "ready", "Mikrofon aktif");
      updateStartButton();
      hideNotice();
    };

    recognition.onresult = (event) => {
      let interimText = "";
      let finalText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";
        if (event.results[index].isFinal) finalText += ` ${transcript}`;
        else interimText += ` ${transcript}`;
      }

      if (finalText.trim()) setSourceCaption(finalText, true);
      else if (interimText.trim()) setSourceCaption(interimText, false);
    };

    recognition.onerror = (event) => {
      const code = event.error || "unknown";
      const fatalErrors = ["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"];
      if (code === "aborted" && !state.wantsListening) return;
      if (code === "no-speech") {
        setStatus("preparing", "Menunggu suara…");
        return;
      }

      if (fatalErrors.includes(code)) {
        state.fatalRecognitionError = true;
        state.wantsListening = false;
      }

      const messages = {
        "not-allowed": "Izin mikrofon ditolak. Klik ikon pengaturan situs di Chrome, izinkan mikrofon, lalu muat ulang halaman.",
        "service-not-allowed": "Layanan pengenalan suara diblokir oleh browser atau kebijakan perangkat.",
        "audio-capture": "Mikrofon tidak ditemukan atau sedang tidak tersedia.",
        network: "Pengenalan suara kehilangan koneksi. Aplikasi akan mencoba menyambung kembali.",
        "language-not-supported": "Bahasa pengenalan suara belum tersedia di perangkat ini.",
      };
      showNotice("Mikrofon belum dapat digunakan", messages[code] || `Pengenalan suara berhenti (${code}).`);
      setStatus("error", "Pengenalan suara bermasalah");
      updateStartButton();
    };

    recognition.onend = () => {
      state.isListening = false;
      updateStartButton();
      if (state.wantsListening && !state.fatalRecognitionError) {
        setStatus("preparing", "Menyambungkan kembali…");
        window.clearTimeout(state.restartTimer);
        state.restartTimer = window.setTimeout(() => {
          if (state.wantsListening) startRecognitionEngine();
        }, 450);
      } else if (!state.isStarting) {
        setStatus("idle", "Belum aktif");
        setSupport(dom.speechIcon, dom.speechSupport, "ready", "Siap meminta mikrofon");
      }
    };

    return recognition;
  }

  function startRecognitionEngine() {
    if (!state.wantsListening || state.isListening) return;
    try {
      state.recognition = createRecognition();
      state.recognition.start();
    } catch (error) {
      if (error?.name === "InvalidStateError") return;
      state.isStarting = false;
      state.wantsListening = false;
      setStatus("error", "Mikrofon gagal dimulai");
      updateStartButton();
      showNotice("Mikrofon gagal dimulai", "Muat ulang halaman, lalu izinkan akses mikrofon saat diminta.");
    }
  }

  async function startListening() {
    if (state.isStarting || state.isListening) return;
    hideNotice();

    if (!window.isSecureContext) {
      showNotice("Halaman harus aman", "Buka aplikasi dari alamat HTTPS GitHub Pages atau localhost agar mikrofon dapat digunakan.");
      setStatus("error", "HTTPS diperlukan");
      return;
    }

    if (!SpeechRecognition) {
      showNotice(
        "Pengenalan suara belum didukung",
        "Gunakan Google Chrome versi terbaru. Perangkat ini tetap dapat membuka pengaturan dan Uji Subtitle.",
      );
      setStatus("error", "Mikrofon tidak didukung");
      return;
    }

    state.isStarting = true;
    state.wantsListening = true;
    state.fatalRecognitionError = false;
    setStatus("preparing", "Menyiapkan penerjemah…");
    updateStartButton();

    try {
      await prepareTranslator();
      if (!state.wantsListening) return;
      setStatus("preparing", "Meminta akses mikrofon…");
      startRecognitionEngine();
    } catch (_error) {
      state.isStarting = false;
      state.wantsListening = false;
      updateStartButton();
      setStatus("error", "Penerjemah gagal disiapkan");
      setSupport(dom.translatorIcon, dom.translatorSupport, "error", "Belum dapat dimuat");
      setSupport(dom.engineIcon, dom.engineSupport, "error", "Periksa koneksi dan ruang perangkat");
      showNotice(
        "Penerjemah belum siap",
        "Pastikan internet aktif untuk unduhan pertama, ruang penyimpanan browser cukup, lalu coba kembali. Tidak ada API berbayar yang digunakan.",
      );
    }
  }

  function stopListening(options = {}) {
    const { quiet = false } = options;
    state.wantsListening = false;
    state.isStarting = false;
    state.fatalRecognitionError = false;
    window.clearTimeout(state.restartTimer);
    if (state.recognition) {
      try {
        state.recognition.abort();
      } catch (_error) {
        // Recognition may already be stopped.
      }
    }
    state.recognition = null;
    state.isListening = false;
    setStatus("idle", "Belum aktif");
    if (SpeechRecognition) setSupport(dom.speechIcon, dom.speechSupport, "ready", "Siap meminta mikrofon");
    updateStartButton();
    if (!quiet) showToast("Mikrofon dihentikan");
  }

  async function toggleListening() {
    if (state.isListening || state.wantsListening || state.isStarting) stopListening();
    else await startListening();
  }

  async function changeDirection(nextDirection) {
    if (!DIRECTIONS[nextDirection] || nextDirection === state.settings.direction) return;
    const resumeAfterChange = state.isListening || state.wantsListening || state.isStarting;
    stopListening({ quiet: true });
    disposeTranslator();
    state.nativeUnavailable = false;
    state.settings.direction = nextDirection;
    saveSettings();
    applyDirectionUI();
    clearCaption();
    showToast(`${directionConfig().sourceName} → ${directionConfig().targetName}`);
    if (resumeAfterChange) await startListening();
    else await checkTranslatorAvailability();
  }

  function swapDirection() {
    const next = state.settings.direction === "id-en" ? "en-id" : "id-en";
    void changeDirection(next);
  }

  async function changeTranslatorMode(mode) {
    if (!["auto", "economy", "maximum"].includes(mode) || mode === state.settings.translatorMode) return;
    const resumeAfterChange = state.isListening || state.wantsListening || state.isStarting;
    stopListening({ quiet: true });
    disposeTranslator();
    state.settings.translatorMode = mode;
    saveSettings();
    applySettingsUI();
    await checkTranslatorAvailability();
    showToast(`Mode penerjemah: ${dom.translatorMode.options[dom.translatorMode.selectedIndex].text}`);
    if (resumeAfterChange) await startListening();
  }

  function showDemo() {
    const config = directionConfig();
    window.clearTimeout(state.clearTimer);
    state.captionRevision += 1;
    const revision = state.captionRevision;
    renderCaption(config.demoSource, config.demoTarget, false);
    scheduleCaptionClear(revision);
    showToast("Contoh subtitle ditampilkan");
  }

  function showPlannedLocalEngine(plan) {
    setSupport(dom.translatorIcon, dom.translatorSupport, "waiting", "Model diunduh saat mulai");
    setSupport(dom.engineIcon, dom.engineSupport, "waiting", plan.detail);
  }

  async function checkTranslatorAvailability() {
    const planned = chooseEnginePlan();
    state.enginePlan = planned;
    if (planned.kind !== "native") {
      showPlannedLocalEngine(planned);
      return;
    }

    setSupport(dom.engineIcon, dom.engineSupport, "ready", planned.detail);
    if (typeof TranslatorAPI.availability !== "function") {
      setSupport(dom.translatorIcon, dom.translatorSupport, "waiting", "Diperiksa saat mulai");
      return;
    }
    const config = directionConfig();
    try {
      const availability = await TranslatorAPI.availability({
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
      });
      if (["available", "readily"].includes(availability)) {
        setSupport(dom.translatorIcon, dom.translatorSupport, "ready", "Paket Chrome tersedia");
      } else if (["downloadable", "downloading", "after-download"].includes(availability)) {
        setSupport(dom.translatorIcon, dom.translatorSupport, "waiting", "Paket Chrome diunduh saat mulai");
      } else {
        state.nativeUnavailable = true;
        const fallback = chooseEnginePlan({ ignoreNative: true });
        showPlannedLocalEngine(fallback);
      }
    } catch (_error) {
      setSupport(dom.translatorIcon, dom.translatorSupport, "waiting", "Diperiksa saat mulai");
    }
  }

  function renderDictionary() {
    dom.dictionaryCount.textContent = `${state.nameDictionary.length} nama`;
    dom.dictionaryEmpty.hidden = state.nameDictionary.length > 0;
    dom.nameList.replaceChildren();
    const fragment = document.createDocumentFragment();
    [...state.nameDictionary]
      .sort((a, b) => a.name.localeCompare(b.name, "id", { sensitivity: "base" }))
      .forEach((entry) => {
        const item = document.createElement("li");
        item.className = "name-item";
        item.dataset.nameId = entry.id;

        const copy = document.createElement("div");
        copy.className = "name-item-copy";
        const name = document.createElement("strong");
        name.textContent = entry.name;
        const aliases = document.createElement("small");
        aliases.textContent = entry.aliases.length
          ? `${entry.aliases.length} variasi: ${entry.aliases.slice(0, 3).join(", ")}${entry.aliases.length > 3 ? "…" : ""}`
          : "Belum dikalibrasi";
        copy.append(name, aliases);

        const actions = document.createElement("div");
        actions.className = "name-item-actions";
        [
          ["calibrate", "Latih"],
          ["edit", "Edit"],
          ["delete", "Hapus"],
        ].forEach(([action, label]) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "name-action";
          button.dataset.action = action;
          button.dataset.nameId = entry.id;
          button.textContent = label;
          button.setAttribute("aria-label", `${label} ${entry.name}`);
          actions.append(button);
        });

        item.append(copy, actions);
        fragment.append(item);
      });
    dom.nameList.append(fragment);
  }

  function mergeNameEntries(entries) {
    let added = 0;
    let merged = 0;
    for (const rawEntry of entries) {
      const incoming = normalizeNameEntry(rawEntry);
      if (!incoming) continue;
      const key = normalizeComparable(incoming.name);
      const existing = state.nameDictionary.find((entry) => normalizeComparable(entry.name) === key);
      if (existing) {
        const before = existing.aliases.length;
        incoming.aliases.forEach((alias) => learnAlias(existing, alias));
        if (existing.aliases.length !== before) merged += 1;
        continue;
      }
      if (state.nameDictionary.length >= MAX_NAMES) break;
      state.nameDictionary.push(incoming);
      added += 1;
    }
    if (added || merged) {
      saveNameDictionary();
      renderDictionary();
    }
    return { added, merged };
  }

  function parseCSVLine(line) {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === "," && !quoted) {
        cells.push(current.trim());
        current = "";
      } else {
        current += character;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  function entriesFromCSV(text) {
    const rows = String(text || "")
      .split(/\r?\n/)
      .map((line) => parseCSVLine(line))
      .filter((row) => row.some(Boolean));
    if (!rows.length) return [];
    const header = rows[0].map(normalizeComparable);
    const nameIndex = header.findIndex((cell) => ["name", "nama", "nama resmi", "official name"].includes(cell));
    const aliasIndex = header.findIndex((cell) => ["alias", "aliases", "variasi", "pengucapan"].includes(cell));
    if (nameIndex >= 0) {
      return rows.slice(1).map((row) => ({
        name: row[nameIndex],
        aliases: aliasIndex >= 0 ? String(row[aliasIndex] || "").split(/[;|]/) : [],
      }));
    }
    if (rows.length === 1 && rows[0].length > 1) return rows[0].map((name) => ({ name, aliases: [] }));
    return rows.map((row) => ({ name: row[0], aliases: row.slice(1).flatMap((cell) => String(cell || "").split(/[;|]/)) }));
  }

  function entriesFromText(text, extension = "txt") {
    const source = String(text || "").trim();
    if (!source) return [];
    if (extension === "json") {
      const parsed = JSON.parse(source);
      const list = Array.isArray(parsed) ? parsed : parsed?.names;
      if (!Array.isArray(list)) throw new Error("invalid-name-json");
      return list.map((entry) => (typeof entry === "string" ? { name: entry, aliases: [] } : entry));
    }
    if (extension === "csv") return entriesFromCSV(source);

    let lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 1 && lines[0].includes(";")) lines = lines[0].split(";").map((line) => line.trim()).filter(Boolean);
    return lines
      .map((line) => {
        const cleaned = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "");
        const [name, ...aliasParts] = cleaned.split("|");
        return { name, aliases: aliasParts.join("|").split(/[,;]/) };
      })
      .filter((entry) => {
        const normalized = normalizeComparable(entry.name);
        return normalized && !["nama", "name", "nama resmi", "official name"].includes(normalized);
      });
  }

  async function extractDocxText(file) {
    if (!window.JSZip) throw new Error("docx-reader-unavailable");
    const archive = await window.JSZip.loadAsync(await file.arrayBuffer());
    const documentFile = archive.file("word/document.xml");
    if (!documentFile) throw new Error("invalid-docx");
    const xml = new DOMParser().parseFromString(await documentFile.async("string"), "application/xml");
    return Array.from(xml.getElementsByTagNameNS("*", "p"))
      .map((paragraph) =>
        Array.from(paragraph.getElementsByTagNameNS("*", "t"))
          .map((node) => node.textContent || "")
          .join(""),
      )
      .filter(Boolean)
      .join("\n");
  }

  async function extractPDFText(file) {
    const pdfjs = await import("./vendor/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.min.mjs", document.baseURI).href;
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const lines = [];
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 100); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let currentLine = "";
      content.items.forEach((item) => {
        const fragment = String(item.str || "").trim();
        if (fragment) currentLine += `${currentLine ? " " : ""}${fragment}`;
        if (item.hasEOL && currentLine) {
          lines.push(currentLine);
          currentLine = "";
        }
      });
      if (currentLine) lines.push(currentLine);
    }
    return lines.join("\n");
  }

  async function importNamesFile(file) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      showNotice("Berkas terlalu besar", "Gunakan berkas daftar nama maksimal 15 MB.");
      return;
    }
    const extension = file.name.split(".").pop()?.toLowerCase() || "txt";
    setCalibrationStatus(`Membaca ${file.name}…`, true);
    try {
      let text = "";
      if (["txt", "csv", "json"].includes(extension)) text = await file.text();
      else if (extension === "docx") text = await extractDocxText(file);
      else if (extension === "pdf") text = await extractPDFText(file);
      else throw new Error("unsupported-file");
      const result = mergeNameEntries(entriesFromText(text, extension));
      dom.dictionaryPanel.open = true;
      setCalibrationStatus(`${result.added} nama ditambahkan${result.merged ? `, ${result.merged} data digabung` : ""}.`, false);
      if (!result.added && !result.merged) showToast("Tidak ada nama baru yang ditemukan");
    } catch (error) {
      const scannedPDF = extension === "pdf";
      setCalibrationStatus("Impor gagal. Periksa format berkas dan coba kembali.", false);
      showNotice(
        "Daftar nama belum dapat dibaca",
        scannedPDF
          ? "PDF harus berisi teks yang dapat diseleksi. PDF hasil scan atau foto belum didukung."
          : "Gunakan TXT, CSV, JSON, DOCX, atau PDF berbasis teks.",
      );
    } finally {
      dom.nameFileInput.value = "";
    }
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function exportNameDictionary() {
    if (!state.nameDictionary.length) {
      showToast("Kamus masih kosong");
      return;
    }
    const payload = {
      app: "Terjemah Live",
      version: 1,
      exportedAt: new Date().toISOString(),
      names: state.nameDictionary.map(({ name, aliases, updatedAt }) => ({ name, aliases, updatedAt })),
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
      `terjemah-live-kamus-nama-${new Date().toISOString().slice(0, 10)}.json`,
    );
    showToast("Cadangan kamus diunduh");
  }

  function setCalibrationStatus(message, active) {
    dom.calibrationStatus.textContent = message;
    dom.calibrationStatus.hidden = !message;
    dom.calibrationStatus.dataset.active = String(Boolean(active));
  }

  function calibrateName(entryId) {
    const entry = state.nameDictionary.find((item) => item.id === entryId);
    if (!entry) return;
    if (!SpeechRecognition) {
      showNotice("Kalibrasi tidak tersedia", "Gunakan Chrome terbaru pada perangkat yang mendukung pengenalan suara.");
      return;
    }
    if (state.isListening || state.wantsListening || state.isStarting) {
      showNotice("Hentikan mikrofon utama", "Berhentikan subtitle live terlebih dahulu, lalu ulangi kalibrasi nama.");
      return;
    }
    if (state.calibrationRecognition) {
      try {
        state.calibrationRecognition.abort();
      } catch (_error) {
        // Ignore a calibration session that has already ended.
      }
    }

    const recognition = new SpeechRecognition();
    state.calibrationRecognition = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;
    recognition.lang = directionConfig().recognitionLanguage;
    applyRecognitionPhrases(recognition, entry);
    let receivedResult = false;

    recognition.onstart = () => {
      setCalibrationStatus(`Sebutkan “${entry.name}” dengan jelas…`, true);
    };
    recognition.onresult = (event) => {
      receivedResult = true;
      const heard = [];
      for (let resultIndex = 0; resultIndex < event.results.length; resultIndex += 1) {
        const result = event.results[resultIndex];
        for (let alternativeIndex = 0; alternativeIndex < result.length; alternativeIndex += 1) {
          const transcript = sanitizeName(result[alternativeIndex]?.transcript);
          if (transcript) heard.push(transcript);
        }
      }
      let learned = 0;
      heard.forEach((alias) => {
        if (learnAlias(entry, alias)) learned += 1;
      });
      if (learned) {
        saveNameDictionary();
        renderDictionary();
        setCalibrationStatus(`${learned} variasi pengucapan untuk “${entry.name}” berhasil dipelajari.`, false);
      } else {
        setCalibrationStatus(`Pengucapan “${entry.name}” sudah dikenali dengan benar.`, false);
      }
    };
    recognition.onerror = (event) => {
      const message = event.error === "not-allowed" ? "Izin mikrofon diperlukan untuk kalibrasi." : "Nama belum terdengar jelas. Coba kembali.";
      setCalibrationStatus(message, false);
    };
    recognition.onend = () => {
      state.calibrationRecognition = null;
      if (!receivedResult && dom.calibrationStatus.dataset.active === "true") {
        setCalibrationStatus("Tidak ada nama yang terdengar. Tekan Latih untuk mencoba kembali.", false);
      }
    };
    try {
      recognition.start();
    } catch (_error) {
      state.calibrationRecognition = null;
      setCalibrationStatus("Kalibrasi belum dapat dimulai. Muat ulang halaman lalu coba lagi.", false);
    }
  }

  function openNameEditor(entryId) {
    const entry = state.nameDictionary.find((item) => item.id === entryId);
    if (!entry) return;
    dom.nameEditorId.value = entry.id;
    dom.nameEditorInput.value = entry.name;
    dom.nameAliasInput.value = entry.aliases.join(", ");
    if (typeof dom.nameEditorDialog.showModal === "function") dom.nameEditorDialog.showModal();
    else dom.nameEditorDialog.setAttribute("open", "");
    dom.nameEditorInput.focus();
  }

  function closeNameEditor() {
    if (typeof dom.nameEditorDialog.close === "function") dom.nameEditorDialog.close();
    else dom.nameEditorDialog.removeAttribute("open");
  }

  function saveNameEditor() {
    const entry = state.nameDictionary.find((item) => item.id === dom.nameEditorId.value);
    if (!entry) return;
    const name = sanitizeName(dom.nameEditorInput.value);
    if (!name) return;
    const duplicate = state.nameDictionary.some(
      (item) => item.id !== entry.id && normalizeComparable(item.name) === normalizeComparable(name),
    );
    if (duplicate) {
      showToast("Nama tersebut sudah ada");
      return;
    }
    entry.name = name;
    entry.aliases = normalizeAliases(dom.nameAliasInput.value.split(/[,;\n]/), name);
    entry.updatedAt = new Date().toISOString();
    saveNameDictionary();
    renderDictionary();
    closeNameEditor();
    showToast("Nama diperbarui");
  }

  function deleteName(entryId) {
    const entry = state.nameDictionary.find((item) => item.id === entryId);
    if (!entry || !window.confirm(`Hapus “${entry.name}” dari Kamus Nama?`)) return;
    state.nameDictionary = state.nameDictionary.filter((item) => item.id !== entryId);
    saveNameDictionary();
    renderDictionary();
    showToast("Nama dihapus");
  }

  function enterOverlayMode() {
    state.overlayMode = true;
    state.requestedFullscreen = false;
    document.body.classList.add("overlay-mode");
    dom.emptyPreview.hidden = true;
    if (document.documentElement.requestFullscreen) {
      state.requestedFullscreen = true;
      document.documentElement.requestFullscreen().catch(() => {
        state.requestedFullscreen = false;
        showToast("Tekan F11 jika layar penuh tidak aktif");
      });
    }
  }

  function exitOverlayMode() {
    if (!state.overlayMode) return;
    state.overlayMode = false;
    document.body.classList.remove("overlay-mode");
    dom.emptyPreview.hidden = Boolean(dom.sourceCaption.textContent || dom.translationCaption.textContent);
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function bindSettings() {
    dom.translatorMode.addEventListener("change", () => void changeTranslatorMode(dom.translatorMode.value));
    dom.fontSize.addEventListener("input", () => {
      state.settings.fontSize = Number(dom.fontSize.value);
      applySettingsUI();
      saveSettings();
    });
    dom.fontFamily.addEventListener("change", () => {
      state.settings.fontFamily = dom.fontFamily.value;
      applySettingsUI();
      saveSettings();
    });
    dom.maxLines.addEventListener("change", () => {
      state.settings.maxLines = Number(dom.maxLines.value);
      applySettingsUI();
      saveSettings();
    });
    dom.captionPosition.addEventListener("change", () => {
      state.settings.captionPosition = dom.captionPosition.value;
      applySettingsUI();
      saveSettings();
    });
    dom.keyColor.addEventListener("change", () => {
      state.settings.keyColor = dom.keyColor.value;
      applySettingsUI();
      saveSettings();
    });
    dom.textColor.addEventListener("change", () => {
      state.settings.textColor = dom.textColor.value;
      applySettingsUI();
      saveSettings();
    });
    dom.clearDelay.addEventListener("input", () => {
      state.settings.clearDelay = Number(dom.clearDelay.value);
      applySettingsUI();
      saveSettings();
      if (dom.sourceCaption.textContent || dom.translationCaption.textContent) {
        scheduleCaptionClear(state.captionRevision);
      }
    });
    dom.showOriginal.addEventListener("change", () => {
      state.settings.showOriginal = dom.showOriginal.checked;
      applySettingsUI();
      saveSettings();
    });
  }

  function bindDictionary() {
    dom.nameAddForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = mergeNameEntries([{ name: dom.nameInput.value, aliases: [] }]);
      if (result.added) {
        dom.nameInput.value = "";
        dom.dictionaryPanel.open = true;
        showToast("Nama ditambahkan");
      } else showToast("Nama kosong atau sudah tersedia");
    });
    dom.addBulkNamesButton.addEventListener("click", () => {
      const result = mergeNameEntries(entriesFromText(dom.nameBulkInput.value, "txt"));
      if (result.added || result.merged) {
        dom.nameBulkInput.value = "";
        dom.dictionaryPanel.open = true;
        showToast(`${result.added} nama ditambahkan`);
      } else showToast("Tidak ada nama baru");
    });
    dom.nameFileInput.addEventListener("change", () => void importNamesFile(dom.nameFileInput.files?.[0]));
    dom.exportNamesButton.addEventListener("click", exportNameDictionary);
    dom.clearNamesButton.addEventListener("click", () => {
      if (!state.nameDictionary.length) return showToast("Kamus masih kosong");
      if (!window.confirm("Hapus seluruh Kamus Nama dari perangkat ini?")) return;
      state.nameDictionary = [];
      saveNameDictionary();
      renderDictionary();
      setCalibrationStatus("", false);
      showToast("Kamus Nama dikosongkan");
    });
    dom.nameList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action][data-name-id]");
      if (!button) return;
      const { action, nameId } = button.dataset;
      if (action === "calibrate") calibrateName(nameId);
      else if (action === "edit") openNameEditor(nameId);
      else if (action === "delete") deleteName(nameId);
    });
    dom.nameEditorForm.addEventListener("submit", (event) => {
      event.preventDefault();
      saveNameEditor();
    });
    dom.closeNameEditorButton.addEventListener("click", closeNameEditor);
    dom.cancelNameEditorButton.addEventListener("click", closeNameEditor);
    dom.nameEditorDialog.addEventListener("click", (event) => {
      if (event.target === dom.nameEditorDialog) closeNameEditor();
    });
  }

  function bindEvents() {
    dom.startButton.addEventListener("click", () => void toggleListening());
    dom.demoButton.addEventListener("click", showDemo);
    dom.swapButton.addEventListener("click", swapDirection);
    dom.obsButton.addEventListener("click", enterOverlayMode);
    dom.toggleControlsButton.addEventListener("click", () => {
      state.settings.controlsCollapsed = !state.settings.controlsCollapsed;
      applyControlsUI();
      saveSettings();
    });
    dom.installButton.addEventListener("click", () => void installApp());
    dom.directionOptions.forEach((button) => {
      button.addEventListener("click", () => void changeDirection(button.dataset.direction));
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const interactive =
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement ||
        target?.closest?.("button, a, summary, dialog");
      if (interactive) return;

      if (event.code === "Space") {
        event.preventDefault();
        swapDirection();
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void toggleListening();
      } else if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        if (state.overlayMode) exitOverlayMode();
        else enterOverlayMode();
      } else if (event.key === "Escape" && state.overlayMode) {
        exitOverlayMode();
      }
    });

    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement && state.overlayMode && state.requestedFullscreen) {
        state.requestedFullscreen = false;
        exitOverlayMode();
      }
    });

    window.addEventListener("beforeunload", () => {
      stopListening({ quiet: true });
      disposeTranslator();
      if (state.calibrationRecognition) state.calibrationRecognition.abort();
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.installPrompt = event;
      dom.installButton.classList.add("is-ready");
    });

    window.addEventListener("appinstalled", () => {
      state.installPrompt = null;
      dom.installButton.hidden = true;
      showToast("Aplikasi berhasil dipasang");
    });
  }

  async function installApp() {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (standalone) {
      showToast("Aplikasi sudah terpasang");
      return;
    }

    if (state.installPrompt) {
      state.installPrompt.prompt();
      const choice = await state.installPrompt.userChoice;
      if (choice?.outcome === "accepted") dom.installButton.hidden = true;
      state.installPrompt = null;
      return;
    }

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    showNotice(
      "Pasang Terjemah Live",
      isIOS
        ? "Di Safari, tekan Bagikan lalu pilih Tambahkan ke Layar Utama."
        : "Buka menu Chrome, lalu pilih Instal Terjemah Live atau Tambahkan ke layar utama.",
    );
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The live translator remains usable if offline support cannot register.
    });
  }

  async function initialize() {
    registerServiceWorker();
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true) {
      dom.installButton.hidden = true;
    }
    applyDirectionUI();
    applySettingsUI();
    renderDictionary();
    bindSettings();
    bindDictionary();
    bindEvents();
    renderCaption("", "", false);

    if (isMobileDevice()) {
      dom.settingsPanel.open = false;
      dom.dictionaryPanel.open = false;
    }

    if (SpeechRecognition) {
      setSupport(dom.speechIcon, dom.speechSupport, "ready", "Siap meminta mikrofon");
    } else {
      setSupport(dom.speechIcon, dom.speechSupport, "error", "Tidak tersedia di browser ini");
      showNotice("Browser belum kompatibel", "Gunakan Google Chrome versi terbaru untuk pengenalan suara langsung.");
    }

    if (isMobileDevice() && (!TranslatorAPI || typeof TranslatorAPI.create !== "function") && SpeechRecognition) {
      const plan = chooseEnginePlan({ ignoreNative: true });
      showNotice(
        "Mode mobile adaptif siap",
        `Saat pertama dimulai, aplikasi akan mengunduh model lokal gratis ${plan.estimatedDownload}. Sesudahnya model disimpan oleh browser.`,
      );
    }

    await checkTranslatorAvailability();
  }

  void initialize();
})();
