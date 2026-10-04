(function () {
  "use strict";

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const TranslatorAPI = window.Translator;
  const STORAGE_KEY = "terjemah-live-settings-v1";

  const DIRECTIONS = {
    "id-en": {
      sourceLanguage: "id",
      targetLanguage: "en",
      recognitionLanguage: "id-ID",
      sourceName: "Indonesia",
      targetName: "English",
      demoSource: "Selamat datang, semoga acara hari ini berjalan dengan lancar.",
      demoTarget: "Welcome, we hope today's event goes smoothly.",
    },
    "en-id": {
      sourceLanguage: "en",
      targetLanguage: "id",
      recognitionLanguage: "en-US",
      sourceName: "English",
      targetName: "Indonesia",
      demoSource: "Thank you for joining us today. The event will begin shortly.",
      demoTarget: "Terima kasih telah bergabung hari ini. Acara akan segera dimulai.",
    },
  };

  const DEFAULT_SETTINGS = {
    direction: "id-en",
    fontSize: 58,
    captionPosition: "bottom",
    keyColor: "green",
    textColor: "white",
    clearDelay: 8,
    showOriginal: true,
  };

  const dom = {
    liveStatus: document.getElementById("liveStatus"),
    liveStatusText: document.getElementById("liveStatusText"),
    startButton: document.getElementById("startButton"),
    startButtonText: document.getElementById("startButtonText"),
    demoButton: document.getElementById("demoButton"),
    swapButton: document.getElementById("swapButton"),
    obsButton: document.getElementById("obsButton"),
    settingsPanel: document.getElementById("settingsPanel"),
    directionOptions: Array.from(document.querySelectorAll("[data-direction]")),
    directionSummary: document.getElementById("directionSummary"),
    speechIcon: document.getElementById("speechIcon"),
    speechSupport: document.getElementById("speechSupport"),
    translatorIcon: document.getElementById("translatorIcon"),
    translatorSupport: document.getElementById("translatorSupport"),
    fontSize: document.getElementById("fontSize"),
    fontSizeValue: document.getElementById("fontSizeValue"),
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
  };

  const state = {
    settings: loadSettings(),
    recognition: null,
    translator: null,
    translatorKey: "",
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
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const merged = { ...DEFAULT_SETTINGS, ...saved };
      const allowedPositions = ["bottom", "middle", "top"];
      const allowedKeyColors = ["green", "blue", "black"];
      const allowedTextColors = ["white", "yellow", "magenta"];
      return {
        direction: DIRECTIONS[merged.direction] ? merged.direction : DEFAULT_SETTINGS.direction,
        fontSize: Math.max(34, Math.min(88, Number(merged.fontSize) || DEFAULT_SETTINGS.fontSize)),
        captionPosition: allowedPositions.includes(merged.captionPosition) ? merged.captionPosition : DEFAULT_SETTINGS.captionPosition,
        keyColor: allowedKeyColors.includes(merged.keyColor) ? merged.keyColor : DEFAULT_SETTINGS.keyColor,
        textColor: allowedTextColors.includes(merged.textColor) ? merged.textColor : DEFAULT_SETTINGS.textColor,
        clearDelay: Math.max(3, Math.min(20, Number(merged.clearDelay) || DEFAULT_SETTINGS.clearDelay)),
        showOriginal: merged.showOriginal !== false,
      };
    } catch (_error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    } catch (_error) {
      // The app remains usable when browser storage is unavailable.
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
    }, 2400);
  }

  function directionConfig() {
    return DIRECTIONS[state.settings.direction];
  }

  function isMobileDevice() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.matchMedia("(max-width: 640px)").matches;
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
    const { fontSize, captionPosition, keyColor, textColor, clearDelay, showOriginal } = state.settings;
    dom.fontSize.value = String(fontSize);
    dom.fontSizeValue.value = `${fontSize} px`;
    dom.captionPosition.value = captionPosition;
    dom.keyColor.value = keyColor;
    dom.textColor.value = textColor;
    dom.clearDelay.value = String(clearDelay);
    dom.clearDelayValue.value = `${clearDelay} detik`;
    dom.showOriginal.checked = Boolean(showOriginal);

    document.documentElement.style.setProperty("--caption-size", `${fontSize}px`);
    const colors = { white: "#ffffff", yellow: "#ffe866", magenta: "#ff72b6" };
    document.documentElement.style.setProperty("--caption-color", colors[textColor] || colors.white);

    dom.overlayStage.classList.remove("position-bottom", "position-middle", "position-top");
    dom.overlayStage.classList.add(`position-${captionPosition}`);
    dom.overlayStage.classList.remove("key-green", "key-blue", "key-black");
    dom.overlayStage.classList.add(`key-${keyColor}`);
    dom.overlayStage.classList.toggle("hide-original", !showOriginal);

    document.body.classList.remove("key-blue-body", "key-black-body");
    if (keyColor === "blue") document.body.classList.add("key-blue-body");
    if (keyColor === "black") document.body.classList.add("key-black-body");
  }

  function updateStartButton() {
    const active = state.isListening || state.wantsListening || state.isStarting;
    dom.startButton.classList.toggle("is-listening", active && !state.isStarting);
    dom.startButton.disabled = state.isStarting;
    if (state.isStarting) {
      dom.startButtonText.textContent = "Menyiapkan…";
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

  function setSourceCaption(text, isFinal) {
    const source = normalizeCaption(text);
    if (!source) return;
    window.clearTimeout(state.clearTimer);
    state.captionRevision += 1;
    const revision = state.captionRevision;
    renderCaption(source, dom.translationCaption.textContent, !isFinal);
    requestTranslation(source, revision, isFinal);
    if (isFinal) scheduleCaptionClear(revision);
  }

  function requestTranslation(text, captionRevision, isFinal) {
    if (!state.translator) return;
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
        const translated = await state.translator.translate(job.text);
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
            "Coba berhenti lalu mulai kembali. Pastikan Chrome terbaru dan koneksi tersedia untuk unduhan awal.",
          );
        }
      }
    }

    state.translationBusy = false;
  }

  function disposeTranslator() {
    if (state.translator && typeof state.translator.destroy === "function") {
      state.translator.destroy();
    }
    state.translator = null;
    state.translatorKey = "";
    state.pendingTranslation = null;
    state.translationRevision += 1;
  }

  async function prepareTranslator() {
    const config = directionConfig();
    const pairKey = `${config.sourceLanguage}-${config.targetLanguage}`;
    if (state.translator && state.translatorKey === pairKey) return state.translator;

    if (!TranslatorAPI || typeof TranslatorAPI.create !== "function") {
      throw new Error("translator-unsupported");
    }

    disposeTranslator();
    setSupport(dom.translatorIcon, dom.translatorSupport, "waiting", "Menyiapkan paket bahasa…");

    const translatorPromise = TranslatorAPI.create({
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

    const translator = await translatorPromise;
    state.translator = translator;
    state.translatorKey = pairKey;
    setSupport(dom.translatorIcon, dom.translatorSupport, "ready", "Siap digunakan");
    return translator;
  }

  function createRecognition() {
    if (!SpeechRecognition) throw new Error("speech-unsupported");
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = directionConfig().recognitionLanguage;

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
        "not-allowed": "Izin mikrofon ditolak. Klik ikon gembok di address bar Chrome, izinkan mikrofon, lalu muat ulang halaman.",
        "service-not-allowed": "Layanan pengenalan suara diblokir oleh Chrome atau kebijakan perangkat.",
        "audio-capture": "Mikrofon tidak ditemukan atau sedang tidak tersedia.",
        network: "Pengenalan suara kehilangan koneksi. Aplikasi akan mencoba menyambung kembali.",
        "language-not-supported": "Paket bahasa untuk pengenalan suara belum tersedia di perangkat ini.",
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
      showNotice("Mikrofon gagal dimulai", "Muat ulang halaman di Chrome, lalu izinkan akses mikrofon saat diminta.");
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
      showNotice("Chrome belum mendukung mikrofon", "Gunakan Google Chrome desktop versi terbaru, bukan browser internal OBS.");
      setStatus("error", "Browser tidak didukung");
      return;
    }

    if (!TranslatorAPI || typeof TranslatorAPI.create !== "function") {
      showNotice(
        "Penerjemah belum tersedia",
        isMobileDevice()
          ? "Penerjemahan langsung saat ini memerlukan Google Chrome desktop. Tampilan dan Uji Subtitle tetap dapat digunakan di ponsel."
          : "Perbarui Google Chrome desktop ke versi terbaru, lalu buka ulang halaman ini.",
      );
      setStatus("error", "Penerjemah tidak tersedia");
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
    } catch (error) {
      state.isStarting = false;
      state.wantsListening = false;
      updateStartButton();
      setStatus("error", "Penerjemah gagal disiapkan");
      setSupport(dom.translatorIcon, dom.translatorSupport, "error", "Tidak tersedia");
      const unsupported = error?.message === "translator-unsupported";
      showNotice(
        "Penerjemah belum siap",
        unsupported
          ? "Gunakan Google Chrome desktop versi terbaru. Translator bawaan tidak tersedia pada browser ini."
          : "Pastikan internet aktif untuk unduhan paket bahasa pertama, lalu coba kembali.",
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
    setSupport(dom.speechIcon, dom.speechSupport, "ready", "Siap meminta mikrofon");
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

  function showDemo() {
    const config = directionConfig();
    window.clearTimeout(state.clearTimer);
    state.captionRevision += 1;
    const revision = state.captionRevision;
    renderCaption(config.demoSource, config.demoTarget, false);
    scheduleCaptionClear(revision);
    showToast("Contoh subtitle ditampilkan");
  }

  async function checkTranslatorAvailability() {
    if (!TranslatorAPI || typeof TranslatorAPI.availability !== "function") {
      setSupport(
        dom.translatorIcon,
        dom.translatorSupport,
        "error",
        isMobileDevice() ? "Mode live perlu Chrome desktop" : "Perlu Chrome terbaru",
      );
      return;
    }
    const config = directionConfig();
    try {
      const availability = await TranslatorAPI.availability({
        sourceLanguage: config.sourceLanguage,
        targetLanguage: config.targetLanguage,
      });
      if (["available", "readily"].includes(availability)) {
        setSupport(dom.translatorIcon, dom.translatorSupport, "ready", "Paket bahasa tersedia");
      } else if (["downloadable", "downloading", "after-download"].includes(availability)) {
        setSupport(dom.translatorIcon, dom.translatorSupport, "waiting", "Diunduh saat mulai");
      } else {
        setSupport(dom.translatorIcon, dom.translatorSupport, "error", "Pasangan bahasa tidak tersedia");
      }
    } catch (_error) {
      setSupport(dom.translatorIcon, dom.translatorSupport, "waiting", "Diperiksa saat mulai");
    }
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
    dom.fontSize.addEventListener("input", () => {
      state.settings.fontSize = Number(dom.fontSize.value);
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
    });
    dom.showOriginal.addEventListener("change", () => {
      state.settings.showOriginal = dom.showOriginal.checked;
      applySettingsUI();
      saveSettings();
    });
  }

  function bindEvents() {
    dom.startButton.addEventListener("click", () => void toggleListening());
    dom.demoButton.addEventListener("click", showDemo);
    dom.swapButton.addEventListener("click", swapDirection);
    dom.obsButton.addEventListener("click", enterOverlayMode);
    dom.directionOptions.forEach((button) => {
      button.addEventListener("click", () => void changeDirection(button.dataset.direction));
    });

    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const interactive =
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement ||
        target?.closest?.("button, a, summary");
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
    });
  }

  async function initialize() {
    applyDirectionUI();
    applySettingsUI();
    bindSettings();
    bindEvents();
    renderCaption("", "", false);

    if (isMobileDevice()) {
      dom.settingsPanel.open = false;
    }

    if (SpeechRecognition) {
      setSupport(dom.speechIcon, dom.speechSupport, "ready", "Siap meminta mikrofon");
    } else {
      setSupport(dom.speechIcon, dom.speechSupport, "error", "Perlu Chrome desktop");
      showNotice("Browser belum kompatibel", "Buka aplikasi menggunakan Google Chrome desktop versi terbaru.");
    }

    if (isMobileDevice() && (!TranslatorAPI || typeof TranslatorAPI.create !== "function") && SpeechRecognition) {
      showNotice(
        "Mode mobile untuk pratinjau",
        "Tampilan, pengaturan, dan Uji Subtitle dapat digunakan di ponsel. Penerjemahan suara langsung saat ini perlu dijalankan di Chrome desktop bersama OBS.",
      );
    }

    await checkTranslatorAvailability();
  }

  void initialize();
})();
