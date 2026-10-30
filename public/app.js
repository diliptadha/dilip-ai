/**
 * Landing page interactions.
 * 1. Mobile navigation toggle.
 * 2. Live text-to-speech demo that calls the existing API route.
 */

// ----------------------------- Navigation -----------------------------

const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.getElementById("nav-links");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Close the menu after following an in-page link
  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

// --------------------------- TTS demo form ---------------------------

const form = document.getElementById("tts-form");
const textInput = document.getElementById("tts-text");
const langSelect = document.getElementById("tts-lang");
const speakerSelect = document.getElementById("tts-speaker");
const submitButton = document.getElementById("tts-submit");
const statusEl = document.getElementById("tts-status");
const playersEl = document.getElementById("tts-players");
const hintEl = document.getElementById("tts-hint");

function setStatus(message, state = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.remove("is-error", "is-success");
  if (state) statusEl.classList.add(`is-${state}`);
}

function renderPlayers(downloadUrls) {
  if (!playersEl) return;
  playersEl.replaceChildren();

  downloadUrls.forEach(({ url, filename }, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "player";

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "metadata";
    audio.src = url;

    const meta = document.createElement("div");
    meta.className = "player-meta";

    const label = document.createElement("span");
    label.textContent = `Clip ${index + 1} · ${filename}`;

    const download = document.createElement("a");
    download.href = url;
    download.download = filename;
    download.textContent = "Download WAV";

    meta.append(label, download);
    wrapper.append(audio, meta);
    playersEl.append(wrapper);
  });
}

async function generateSpeech(event) {
  event.preventDefault();
  const text = textInput?.value.trim() ?? "";

  if (!text) {
    setStatus("Please enter some text first.", "error");
    textInput?.focus();
    return;
  }

  submitButton?.setAttribute("disabled", "true");
  playersEl?.classList.add("is-loading");
  if (hintEl) hintEl.hidden = true;
  setStatus("Generating audio…");

  try {
    const response = await fetch("/api/text-to-speech/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        target_language_code: langSelect?.value ?? "hi-IN",
        speaker: speakerSelect?.value ?? "shubh",
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || `Request failed with status ${response.status}`);
    }

    const downloadUrls = payload.data?.downloadUrls ?? [];

    if (downloadUrls.length === 0) {
      throw new Error("The API returned no audio files.");
    }

    renderPlayers(downloadUrls);
    setStatus(`Generated ${downloadUrls.length} audio clip(s).`, "success");
  } catch (error) {
    console.error("Text-to-speech demo failed:", error);
    setStatus(error.message ?? "Something went wrong. Please try again.", "error");
  } finally {
    submitButton?.removeAttribute("disabled");
    playersEl?.classList.remove("is-loading");
  }
}

if (form) {
  form.addEventListener("submit", generateSpeech);
}
