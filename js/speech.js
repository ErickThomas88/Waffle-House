// =====================================================================
// Microphone dictation via the Web Speech API.
// Works in Chrome (desktop/Android) and iOS/macOS Safari over HTTPS.
// Finalized speech is appended to the order textbox so you can fix any
// mis-heard words before parsing.
// =====================================================================
(function (root) {
  "use strict";

  function setup(micBtn, textarea, onStateChange) {
    const SR = root.SpeechRecognition || root.webkitSpeechRecognition;
    if (!SR) {
      micBtn.style.display = "none";
      return null;
    }

    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    let listening = false;
    let baseText = "";

    rec.onresult = (ev) => {
      let finals = "", interim = "";
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finals += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      const sep = baseText && !/\s$/.test(baseText) ? " " : "";
      textarea.value = baseText + sep + finals + interim;
    };

    const stop = () => {
      listening = false;
      micBtn.classList.remove("listening");
      micBtn.setAttribute("aria-label", "Start dictation");
      if (onStateChange) onStateChange(false);
      try { rec.stop(); } catch (e) { /* already stopped */ }
    };

    rec.onend = () => { if (listening) stop(); };
    rec.onerror = (ev) => {
      stop();
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        alert("Microphone permission was blocked. Allow mic access for this site in your browser settings, then try again.");
      }
    };

    micBtn.addEventListener("click", () => {
      if (listening) { stop(); return; }
      baseText = textarea.value;
      listening = true;
      micBtn.classList.add("listening");
      micBtn.setAttribute("aria-label", "Stop dictation");
      if (onStateChange) onStateChange(true);
      try { rec.start(); } catch (e) { stop(); }
    });

    return { stop };
  }

  root.WHSpeech = { setup };
})(typeof window !== "undefined" ? window : globalThis);
