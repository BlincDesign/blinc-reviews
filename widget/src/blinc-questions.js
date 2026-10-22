// "Ask a question" (Q&A) on the reviews widget. Progressive enhancement: the form
// posts to the app proxy without JS (redirect to a thanks page); with JS it submits
// in place and shows the result. Messages come from data-msg-* attributes (Liquid t).

const ERROR_FIELDS = {
  name_required: "name",
  email_invalid: "email",
  question_required: "question",
  too_long: "question",
};

async function submit(form) {
  const status = form.querySelector("[data-blinc-qa-status]");
  const button = form.querySelector("[type=submit]");
  const say = (key, tone) => {
    status.textContent =
      form.dataset[`msg${key}`] || form.dataset.msgGeneric || "";
    status.dataset.tone = tone;
    status.hidden = false;
  };

  const data = new FormData(form);
  data.delete("_format");
  button.disabled = true;
  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: data,
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json().catch(() => ({}));
    if (result.ok) {
      form.reset();
      say("Thanks", "success");
      return;
    }
    const code = Object.values(result.errors ?? {})[0] || result.message;
    const field = ERROR_FIELDS[code];
    if (field) form.elements[field]?.focus();
    say(
      {
        name_required: "Name",
        email_invalid: "Email",
        question_required: "Question",
        too_long: "TooLong",
        rate_limited: "Rate",
      }[code] || "Generic",
      "error",
    );
  } catch {
    say("Generic", "error");
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("submit", (event) => {
  const form = event.target.closest?.("[data-blinc-qa-form]");
  if (!form) return;
  event.preventDefault();
  submit(form);
});

// Bot check: the form must be open a few seconds before it's sent.
document.addEventListener(
  "toggle",
  (event) => {
    const form = event.target.querySelector?.("[data-blinc-qa-form]");
    if (form && event.target.open)
      form.elements.started_at.value = String(Date.now());
  },
  true,
);
