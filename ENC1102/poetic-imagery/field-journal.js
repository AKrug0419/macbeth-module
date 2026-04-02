/* ══════════════════════════════════════════════════════════════
   FIELD JOURNAL — Shared Interactions
   ENC 1102 · Module Six · Poetry & Literary Elements
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── UTILITY ── */

  /**
   * Short alias for querySelector scoped to an optional root.
   */
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  /**
   * Short alias for querySelectorAll, returned as a real Array.
   */
  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }


  /* ══════════════════════════════════════════
     1.  REVEAL BUTTONS
     Generic pattern: a button with [data-reveal]
     toggles visibility of its target element,
     then hides itself.
     ══════════════════════════════════════════ */

  function initRevealButtons() {
    qsa('[data-reveal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetId = btn.getAttribute('data-reveal');
        var target = document.getElementById(targetId);
        if (target) {
          target.classList.remove('hidden');
          target.removeAttribute('aria-hidden');
        }
        btn.style.display = 'none';
      });
    });
  }


  /* ══════════════════════════════════════════
     2.  STEP ACCORDION — Sequential Unlock
     Practice pages use a locked step sequence:
       Step 1 is open; steps 2-4 are locked.
       Completing a step unlocks the next one.

     HTML contract:
       <div class="step-block s1" data-poem="limon" data-step="1">
         <div class="step-header" id="limon-s1-header" ...>
         <div class="step-content" id="limon-s1-content" ...>
       </div>

     A "next" button carries  data-unlock="limon:2"
     which unlocks step 2 of the limon poem section.

     A progress bar with class .progress-bar-fill
     inside [data-poem="limon"] is updated as steps unlock.
     ══════════════════════════════════════════ */

  function initStepAccordion() {
    /* Unlock handler (via Next buttons) */
    qsa('[data-unlock]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = btn.getAttribute('data-unlock').split(':');
        var poem  = parts[0];
        var step  = parseInt(parts[1], 10);
        unlockStep(poem, step);
      });
    });

    /* Toggle open/close on unlocked step headers */
    qsa('.step-header').forEach(function (header) {
      header.addEventListener('click', function () {
        if (header.classList.contains('locked')) return;

        var content = header.nextElementSibling;
        if (!content || !content.classList.contains('step-content')) return;

        var isOpen = !content.classList.contains('hidden');
        if (isOpen) {
          content.classList.add('hidden');
          content.setAttribute('aria-hidden', 'true');
          header.setAttribute('aria-expanded', 'false');
        } else {
          content.classList.remove('hidden');
          content.removeAttribute('aria-hidden');
          header.setAttribute('aria-expanded', 'true');
        }
      });

      /* Keyboard: Enter / Space to toggle */
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          header.click();
        }
      });
    });
  }

  /**
   * Unlock a given step for a poem section.
   * Removes .locked from the header, shows the content,
   * scrolls into view, and updates the progress bar.
   */
  function unlockStep(poem, step) {
    var headerId  = poem + '-s' + step + '-header';
    var contentId = poem + '-s' + step + '-content';
    var header  = document.getElementById(headerId);
    var content = document.getElementById(contentId);

    if (!header || !content) return;

    header.classList.remove('locked');
    header.setAttribute('aria-expanded', 'true');
    header.setAttribute('tabindex', '0');

    var lockIcon = qs('.step-lock-icon', header);
    if (lockIcon) lockIcon.remove();

    content.classList.remove('hidden');
    content.removeAttribute('aria-hidden');

    /* Smooth scroll to the newly opened step */
    setTimeout(function () {
      header.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);

    /* Update progress bar */
    updateProgress(poem, step);
  }

  /**
   * Update the thin progress bar for a poem section.
   * Total steps per poem is 4 (the four-step method).
   */
  function updateProgress(poem, currentStep) {
    var section = qs('[data-poem="' + poem + '"]');
    if (!section) {
      /* Fall back: look for a parent section wrapping this poem */
      var header = document.getElementById(poem + '-s1-header');
      if (header) section = header.closest('.poem-section-body, section');
    }
    if (!section) return;

    var bar = qs('.progress-bar-fill', section);
    if (!bar) return;

    var totalSteps = 4;
    var pct = Math.min(100, Math.round((currentStep / totalSteps) * 100));
    bar.style.width = pct + '%';
  }


  /* ══════════════════════════════════════════
     3.  SENSE FILTER TOGGLES
     Buttons with class .sense-filter-btn and a
     data-sense attribute (sight, sound, touch, etc.)
     toggle aria-pressed and dim/undim all <mark>
     elements of that sense class.

     When a sense is "off" (aria-pressed="false"),
     every <mark> with that sense class gets .dimmed,
     which (in the CSS) reduces it to plain text.
     ══════════════════════════════════════════ */

  function initSenseFilters() {
    var filterBtns = qsa('.sense-filter-btn');
    if (filterBtns.length === 0) return;

    filterBtns.forEach(function (btn) {
      /* Start all pressed */
      if (!btn.hasAttribute('aria-pressed')) {
        btn.setAttribute('aria-pressed', 'true');
      }

      btn.addEventListener('click', function () {
        var sense   = btn.getAttribute('data-sense');
        var pressed = btn.getAttribute('aria-pressed') === 'true';
        var next    = !pressed;

        btn.setAttribute('aria-pressed', String(next));

        /* Toggle .dimmed on matching marks */
        qsa('mark.' + sense).forEach(function (m) {
          if (next) {
            m.classList.remove('dimmed');
          } else {
            m.classList.add('dimmed');
          }
        });
      });
    });
  }


  /* ══════════════════════════════════════════
     4.  STUDENT INPUT — Session Persistence
     Textareas with class .student-input carry
     a unique id.  We save to sessionStorage
     on every input event and restore on load.
     This keeps student notes alive during a
     single browser session (not across sessions,
     which avoids privacy concerns).
     ══════════════════════════════════════════ */

  var STORAGE_PREFIX = 'fj_input_';

  function initStudentInputs() {
    /* Guard: some browsers in restricted contexts block storage */
    var storageAvailable = false;
    try {
      var test = '__fj_test__';
      sessionStorage.setItem(test, '1');
      sessionStorage.removeItem(test);
      storageAvailable = true;
    } catch (e) {
      /* silently disable persistence */
    }

    qsa('.student-input').forEach(function (textarea) {
      if (!textarea.id) return;

      /* Restore */
      if (storageAvailable) {
        var saved = sessionStorage.getItem(STORAGE_PREFIX + textarea.id);
        if (saved) textarea.value = saved;
      }

      /* Save on input */
      textarea.addEventListener('input', function () {
        if (storageAvailable) {
          sessionStorage.setItem(STORAGE_PREFIX + textarea.id, textarea.value);
        }
      });
    });
  }


  /* ══════════════════════════════════════════
     5.  FADE-IN ON SCROLL (Intersection Observer)
     Elements with .fade-in get their animation
     triggered when they enter the viewport.
     This replaces the CSS nth-child delay approach
     with a proper scroll-driven reveal.
     ══════════════════════════════════════════ */

  function initScrollFade() {
    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -40px 0px'
    });

    qsa('.fade-in').forEach(function (el) {
      /* Remove inline animation-delay from CSS nth-child approach */
      el.style.animationDelay = '0s';
      observer.observe(el);
    });
  }


  /* ══════════════════════════════════════════
     6.  KEYBOARD NAVIGATION HELPERS
     Ensure interactive elements that aren't
     natively focusable work with keyboard.
     ══════════════════════════════════════════ */

  function initKeyboardNav() {
    /* Step headers: set tabindex if not already */
    qsa('.step-header:not(.locked)').forEach(function (h) {
      if (!h.hasAttribute('tabindex')) {
        h.setAttribute('tabindex', '0');
      }
    });
  }


  /* ══════════════════════════════════════════
     7.  PRINT HELPER
     When printing, show all hidden answer blocks
     and step contents so the full page prints.
     (CSS handles this too via !important, but
     this ensures DOM state is clean.)
     ══════════════════════════════════════════ */

  function initPrintHelper() {
    if (!window.matchMedia) return;

    window.matchMedia('print').addEventListener('change', function (mql) {
      if (mql.matches) {
        /* Before print: reveal everything */
        qsa('.answer-block.hidden, .step-content.hidden, .connot-answer.hidden').forEach(function (el) {
          el.setAttribute('data-was-hidden', 'true');
          el.classList.remove('hidden');
        });
      } else {
        /* After print: re-hide what was hidden */
        qsa('[data-was-hidden="true"]').forEach(function (el) {
          el.classList.add('hidden');
          el.removeAttribute('data-was-hidden');
        });
      }
    });
  }


  /* ══════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════ */

  function init() {
    initRevealButtons();
    initStepAccordion();
    initSenseFilters();
    initStudentInputs();
    initScrollFade();
    initKeyboardNav();
    initPrintHelper();
  }

  /* Run when DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
