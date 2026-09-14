(function () {
  "use strict";

  // ---- state ---------------------------------------------------------
  let participantId = null;
  let totalQuestions = 0;
  let currentIndex = 0;

  // ---- dom refs --------------------------------------------------------
  const screens = {
    intro: document.getElementById("screen-intro"),
    demographics: document.getElementById("screen-demographics"),
    chat: document.getElementById("screen-chat"),
    done: document.getElementById("screen-done"),
  };
  const gauge = document.getElementById("gauge");
  const btnStart = document.getElementById("btn-start");
  const demographicsForm = document.getElementById("demographics-form");
  const btnDemographicsContinue = document.getElementById("btn-demographics-continue");
  const chatLog = document.getElementById("chat-log");
  const doneNote = document.getElementById("done-note");

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function scrollToLatest() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  // ---- participant id: Qualtrics can pass one via ?pid=... (e.g. the
  // Qualtrics ResponseID piped text) when embedding this page in an
  // iframe / Web Service question. Otherwise we generate one locally. ----
  function resolveParticipantId() {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("pid") ||
      params.get("participant_id") ||
      localStorage.getItem("bias_survey_pid") ||
      crypto.randomUUID()
    );
  }

  // ---- gauge ------------------------------------------------------------
  function buildGauge() {
    gauge.innerHTML = "";
    for (let i = 0; i < totalQuestions; i++) {
      const tick = document.createElement("div");
      tick.className = "tick";
      gauge.appendChild(tick);
    }
  }

  function updateGauge() {
    const ticks = gauge.querySelectorAll(".tick");
    ticks.forEach((t, i) => {
      t.classList.toggle("done", i < currentIndex);
      t.classList.toggle("current", i === currentIndex);
    });
  }

  // ---- api calls ----------------------------------------------------------
  async function startSession() {
    const res = await fetch("/api/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_id: participantId }),
    });
    const data = await res.json();
    participantId = data.participant_id;
    totalQuestions = data.total_questions;
    localStorage.setItem("bias_survey_pid", participantId);
    buildGauge();
  }

  async function fetchDemographicQuestions() {
    const res = await fetch("/api/demographics/questions");
    return res.json();
  }

  async function submitDemographics(answers) {
    await fetch("/api/demographics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_id: participantId, answers }),
    });
  }

  async function fetchQuestion(index) {
    const res = await fetch(`/api/question/${index}`);
    return res.json();
  }

  async function fetchVariants(questionData, rawAnswer) {
    const res = await fetch("/api/generate_variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_id: participantId,
        question_index: questionData.question_index,
        question_text: questionData.question_text,
        raw_answer: rawAnswer,
      }),
    });
    return res.json();
  }

  async function submitAnswer(payload) {
    await fetch("/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_id: participantId, ...payload }),
    });
  }

  async function finishSession() {
    const res = await fetch("/api/session/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_id: participantId }),
    });
    return res.json();
  }

  // ---- demographics screen ----------------------------------------------------------
  async function renderDemographics() {
    const questions = await fetchDemographicQuestions();
    demographicsForm.innerHTML = "";

    const selects = [];

    questions.forEach((q) => {
      const field = document.createElement("div");
      field.className = "demographics-field";

      const label = document.createElement("label");
      label.textContent = q.label;
      label.htmlFor = `demo-${q.id}`;

      const select = document.createElement("select");
      select.id = `demo-${q.id}`;
      select.dataset.id = q.id;

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Επιλέξτε\u2026";
      placeholder.disabled = true;
      placeholder.selected = true;
      select.appendChild(placeholder);

      q.options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt;
        option.textContent = opt;
        select.appendChild(option);
      });

      select.addEventListener("change", updateContinueButton);

      field.appendChild(label);
      field.appendChild(select);
      demographicsForm.appendChild(field);
      selects.push(select);
    });

    function updateContinueButton() {
      const allFilled = selects.every((s) => s.value !== "");
      btnDemographicsContinue.disabled = !allFilled;
    }

    btnDemographicsContinue.onclick = async () => {
      const answers = {};
      selects.forEach((s) => {
        answers[s.dataset.id] = s.value;
      });
      btnDemographicsContinue.disabled = true;
      await submitDemographics(answers);
      showScreen("chat");
      currentIndex = 0;
      updateGauge();
      await loadTurn(currentIndex);
    };
  }

  // ---- bubble builders ----------------------------------------------------------
  function appendBotBubble(text) {
    const div = document.createElement("div");
    div.className = "bubble bot";
    div.textContent = text;
    chatLog.appendChild(div);
    scrollToLatest();
    return div;
  }

  function appendTypingBubble() {
    const div = document.createElement("div");
    div.className = "bubble bot typing";
    div.innerHTML = "<span></span><span></span><span></span>";
    chatLog.appendChild(div);
    scrollToLatest();
    return div;
  }

  function appendSentBubble(text) {
    const div = document.createElement("div");
    div.className = "bubble user sent";
    div.textContent = text;
    chatLog.appendChild(div);
    scrollToLatest();
    return div;
  }

  function makeChip(badgeText, badgeClass, bodyText, onPick) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "bubble user suggested";

    const badge = document.createElement("span");
    badge.className = badgeClass;
    badge.textContent = badgeText;

    const chipText = document.createElement("span");
    chipText.textContent = bodyText;

    chip.appendChild(badge);
    chip.appendChild(chipText);
    chip.addEventListener("click", onPick);
    return chip;
  }

  // Step 1 of a turn: bot bubble + free-text composer for the participant's
  // own answer. No suggestion is shown yet.
  function appendComposerTurn(questionData) {
    const wrap = document.createElement("div");
    wrap.className = "turn-input";

    const composer = document.createElement("div");
    composer.className = "composer";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Γράψτε την απάντησή σας\u2026";

    const sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.textContent = "Αποστολή";

    composer.appendChild(input);
    composer.appendChild(sendBtn);
    wrap.appendChild(composer);
    chatLog.appendChild(wrap);
    scrollToLatest();
    input.focus();

    async function submitRaw() {
      const val = input.value.trim();
      if (!val) return;
      wrap.remove();
      appendSentBubble(val);
      await presentVariants(questionData, val);
    }

    sendBtn.addEventListener("click", submitRaw);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitRaw();
    });
  }

  // Step 2 of a turn: generate a polished version of their own answer plus a
  // differently-biased alternative, and let them pick which one becomes their
  // final recorded answer (or keep what they originally typed).
  async function presentVariants(questionData, rawAnswer) {
    const typing = appendTypingBubble();
    const variants = await fetchVariants(questionData, rawAnswer);
    typing.remove();

    const wrap = document.createElement("div");
    wrap.className = "variants";

    function finalize(finalChoice, responseText) {
      wrap.remove();
      if (finalChoice !== "own") {
        appendSentBubble(responseText);
      }
      handleTurnComplete({
        questionData,
        rawAnswer,
        polishedAnswer: variants.polished,
        alternativeAnswer: variants.alternative,
        finalChoice,
        responseText,
      });
    }

    const polishedChip = makeChip("Βελτιωμένη", "badge neutral", variants.polished, () =>
      finalize("polished", variants.polished)
    );
    const alternativeChip = makeChip("Πρόταση AI", "badge", variants.alternative, () =>
      finalize("alternative", variants.alternative)
    );

    const keepLink = document.createElement("button");
    keepLink.type = "button";
    keepLink.className = "ghost-link";
    keepLink.textContent = "Κράτηση της αρχικής μου απάντησης";
    keepLink.addEventListener("click", () => finalize("own", rawAnswer));

    wrap.appendChild(polishedChip);
    wrap.appendChild(alternativeChip);
    wrap.appendChild(keepLink);
    chatLog.appendChild(wrap);
    scrollToLatest();
  }

  // ---- flow control ----------------------------------------------------------
  async function loadTurn(index) {
    const questionData = await fetchQuestion(index);
    appendBotBubble(questionData.question_text);
    appendComposerTurn(questionData);
    updateGauge();
  }

  async function handleTurnComplete({
    questionData,
    rawAnswer,
    polishedAnswer,
    alternativeAnswer,
    finalChoice,
    responseText,
  }) {
    await submitAnswer({
      question_index: questionData.question_index,
      question_text: questionData.question_text,
      raw_answer: rawAnswer,
      polished_answer: polishedAnswer,
      alternative_answer: alternativeAnswer,
      final_choice: finalChoice,
      response_text: responseText,
    });
    currentIndex += 1;

    if (currentIndex >= totalQuestions) {
      updateGauge();
      const typing = appendTypingBubble();
      const summary = await finishSession();
      typing.remove();
      showScreen("done");
      doneNote.textContent = `Κωδικός συμμετέχοντα: ${summary.participant_id}`;

      // Hand results back to a parent Qualtrics page if this app is running
      // inside an iframe / Web Service question. The Qualtrics-side embedded
      // JavaScript should listen for this message and call
      // Qualtrics.SurveyEngine.setEmbeddedData(...) with the payload.
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: "BIAS_SURVEY_COMPLETE",
            participant_id: summary.participant_id,
            condition: summary.condition,
            answered: summary.answered,
            chose_alternative: summary.chose_alternative,
            alternative_rate: summary.alternative_rate,
          },
          "*"
        );
      }
    } else {
      await loadTurn(currentIndex);
    }
  }

  btnStart.addEventListener("click", async () => {
    showScreen("demographics");
    await renderDemographics();
  });

  // ---- boot ----------------------------------------------------------
  (async function init() {
    participantId = resolveParticipantId();
    await startSession();
  })();
})();
