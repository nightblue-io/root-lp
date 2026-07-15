/* ============================================================
 * Jennah landing page - smooth scroll, trial copy, form UX.
 * ============================================================ */
(function () {
  "use strict";

  // Single source of truth for the trial length. Dormant during early access -
  // no [data-trial-days] elements are rendered while the public trial is gated
  // in favor of the design-partner flow. Kept so the trial is easy to re-enable:
  // re-add data-trial-days spans and this fills them.
  var TRIAL_DAYS = 30;

  // --- Fill dynamic copy -----------------------------------------------------
  document.querySelectorAll("[data-trial-days]").forEach(function (el) {
    el.textContent = String(TRIAL_DAYS);
  });
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  // --- Smooth scroll for in-page anchors -------------------------------------
  // Native CSS scroll-behavior handles most of this; JS ensures focus moves
  // to the target for keyboard/AT users and works if smooth-scroll is off.
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      history.replaceState(null, "", id);
    });
  });

  // --- Netlify form validation + submission ----------------------------------
  // Enhances every data-netlify form on the page (contact + design-partner):
  // inline validation and an AJAX submit with an inline success state.
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function encode(formData) {
    return new URLSearchParams(formData).toString();
  }

  function enhanceForm(form) {
    var statusEl = form.querySelector("[data-form-status]");

    function fieldWrap(input) {
      return input.closest(".form__field");
    }
    function errorSlot(name) {
      return form.querySelector('[data-error-for="' + name + '"]');
    }

    function validateField(input) {
      var name = input.name;
      var value = (input.value || "").trim();
      var msg = "";

      if (input.required && !value) {
        msg = "This field is required.";
      } else if (name === "email" && value && !EMAIL_RE.test(value)) {
        msg = "Enter a valid email address.";
      }

      var wrap = fieldWrap(input);
      var slot = errorSlot(name);
      if (wrap) wrap.classList.toggle("form__field--invalid", !!msg);
      if (slot) slot.textContent = msg;
      return !msg;
    }

    // Clear a field's error as the user corrects it.
    form.querySelectorAll(".form__input").forEach(function (input) {
      var evt = input.tagName === "SELECT" ? "change" : "input";
      input.addEventListener(evt, function () {
        var wrap = fieldWrap(input);
        if (wrap && wrap.classList.contains("form__field--invalid")) {
          validateField(input);
        }
      });
    });

    function setStatus(text, kind) {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.classList.remove("form__status--ok", "form__status--err");
      if (kind) statusEl.classList.add("form__status--" + kind);
    }

    form.addEventListener("submit", function (e) {
      var inputs = Array.prototype.slice.call(
        form.querySelectorAll(".form__input")
      );
      var allValid = inputs.map(validateField).every(Boolean);

      if (!allValid) {
        e.preventDefault();
        var firstBad = form.querySelector(".form__field--invalid .form__input");
        if (firstBad) firstBad.focus();
        setStatus("Please fix the highlighted fields.", "err");
        return;
      }

      // Client-side AJAX submit to Netlify so we can show an inline success
      // state without a full page navigation. If fetch is unavailable, we let
      // the browser submit the form normally (graceful no-JS / old-browser path).
      if (typeof fetch !== "function") return; // native POST proceeds

      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      setStatus("Sending…", null);

      fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode(new FormData(form)),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Bad response " + res.status);
          form.reset();
          setStatus(
            "Thanks - your message is on its way. We'll be in touch within one business day.",
            "ok"
          );
        })
        .catch(function () {
          setStatus(
            "Something went wrong. Please try again or email info@nightblue.io.",
            "err"
          );
        })
        .finally(function () {
          if (btn) btn.disabled = false;
        });
    });
  }

  document.querySelectorAll("form[data-netlify]").forEach(enhanceForm);
})();
