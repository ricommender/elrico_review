(() => {
  'use strict';

  // Preview v1.5: robust Safari playback, no fixed timer interrupting the film.
  const intro = document.getElementById('intro');
  const site = document.getElementById('site');
  const skip = document.getElementById('skip-intro');
  const replay = document.getElementById('replay-intro');
  const playButton = document.getElementById('intro-play');
  const video = document.getElementById('intro-video');
  const status = document.getElementById('intro-status');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isiOS = /iP(hone|ad|od)/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  let closed = true;
  let phase = 'idle';
  let sequence = 0;
  let pendingPlay = false;
  let returnFocus = false;
  let preloadTimer = null;
  let fallbackTimer = null;
  let stallTimer = null;

  function clearTimers() {
    clearTimeout(preloadTimer);
    clearTimeout(fallbackTimer);
    clearTimeout(stallTimer);
  }

  function showStatus(message) {
    if (status && status.textContent !== message) status.textContent = message;
  }

  function finishIntro() {
    if (closed) return;
    closed = true;
    phase = 'idle';
    sequence++;
    pendingPlay = false;
    clearTimers();
    if (video) video.pause();
    if (playButton) playButton.hidden = true;
    intro.classList.add('done');
    intro.classList.remove('has-film', 'buffering', 'awaiting-tap', 'fallback');
    intro.setAttribute('aria-hidden', 'true');
    intro.setAttribute('inert', '');
    site.removeAttribute('inert');
    site.classList.add('ready');
    document.body.classList.remove('intro-active');
    if (returnFocus) {
      returnFocus = false;
      replay.focus({preventScroll:true});
    } else if (document.activeElement === skip || document.activeElement === playButton) {
      document.activeElement.blur();
    }
  }

  function showFallback() {
    if (closed) return;
    phase = 'fallback';
    pendingPlay = false;
    clearTimers();
    if (video) video.pause();
    if (playButton) playButton.hidden = true;
    intro.classList.remove('has-film', 'buffering', 'awaiting-tap');
    intro.classList.add('fallback');
    showStatus('METALLIC CORE');
    // A complete short animated fallback, not a video-error dialog.
    fallbackTimer = setTimeout(finishIntro, 4800);
  }

  function requestManualStart(message = 'ZUM STARTEN TIPPEN') {
    if (closed || phase === 'idle' || phase === 'fallback') return;
    const wasPlaying = phase === 'film';
    phase = 'manual';
    pendingPlay = false;
    clearTimeout(preloadTimer);
    clearTimeout(stallTimer);
    if (video) video.pause();
    intro.classList.remove('has-film', 'buffering');
    intro.classList.add('awaiting-tap');
    if (playButton) {
      playButton.hidden = false;
      playButton.firstChild.textContent = wasPlaying ? 'Film fortsetzen ' : 'Film starten ';
    }
    showStatus(message);
    // No auto-dismiss here: the visitor decides to play or use the always visible skip.
  }

  function beginFilm(fromTap = false) {
    if (!video || closed || pendingPlay) return;
    if (fromTap ? phase !== 'manual' : phase !== 'loading') return;

    const token = sequence;
    pendingPlay = true;
    phase = 'starting';
    clearTimeout(preloadTimer);
    clearTimeout(stallTimer);
    if (playButton) playButton.hidden = true;
    intro.classList.remove('buffering', 'awaiting-tap');
    showStatus('FILM STARTET');

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    // For manual playback, this call stays directly in the user click handler.
    let playPromise;
    try { playPromise = video.play(); }
    catch (_) {
      pendingPlay = false;
      requestManualStart('FILM MANUELL STARTEN');
      return;
    }

    Promise.resolve(playPromise).then(() => {
      if (closed || sequence !== token || phase !== 'starting') return;
      phase = 'film';
      pendingPlay = false;
      intro.classList.remove('awaiting-tap', 'buffering');
      intro.classList.add('has-film');
      if (playButton) playButton.hidden = true;
      showStatus('FILMSEQUENZ AKTIV');
      // Deliberately NO fixed 5-6 second timeout; only the real 'ended' event finishes.
    }).catch(() => {
      if (closed || sequence !== token) return;
      pendingPlay = false;
      requestManualStart('FILM MANUELL STARTEN');
    });

    // A permanently unresolved promise (seen on some Safari versions) must still
    // offer a human-initiated retry instead of abruptly closing the intro.
    preloadTimer = setTimeout(() => {
      if (!closed && sequence === token && phase === 'starting') {
        pendingPlay = false;
        requestManualStart('FILM MANUELL STARTEN');
      }
    }, fromTap ? 8000 : 6500);
  }

  function startIntro(fromReplay = false) {
    if (reduced) return;
    sequence++;
    clearTimers();
    closed = false;
    phase = 'loading';
    pendingPlay = false;
    returnFocus = fromReplay;

    if (video) {
      video.pause();
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      try { video.currentTime = 0; } catch (_) {}
    }
    intro.removeAttribute('inert');
    intro.setAttribute('aria-hidden', 'false');
    intro.classList.remove('done', 'run', 'has-film', 'buffering', 'fallback', 'awaiting-tap');
    if (playButton) playButton.hidden = true;
    void intro.offsetWidth;
    intro.classList.add('run');
    site.classList.remove('ready');
    site.setAttribute('inert', '');
    document.body.classList.add('intro-active');
    showStatus('FILM WIRD VORBEREITET');
    if (fromReplay) skip.focus({preventScroll:true});

    if (!video) {
      showFallback();
      return;
    }

    // An iPhone receives the smaller H.264 Baseline variant with faststart.
    if (isiOS && video.getAttribute('src') !== './assets/elrico-orb-intro-mobile.mp4') {
      video.setAttribute('src', './assets/elrico-orb-intro-mobile.mp4');
      video.load();
    }

    // Wait for real media readiness rather than guessing from time alone.
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      beginFilm(false);
    } else {
      video.load();
      preloadTimer = setTimeout(() => {
        if (!closed && phase === 'loading') requestManualStart();
      }, 7500);
    }
  }

  if (video) {
    video.addEventListener('loadeddata', () => {
      if (!closed && phase === 'loading') beginFilm(false);
    });
    video.addEventListener('canplay', () => {
      if (!closed && phase === 'loading') beginFilm(false);
    });
    video.addEventListener('ended', () => {
      if (!closed && (phase === 'film' || phase === 'starting')) finishIntro();
    });
    video.addEventListener('error', () => {
      if (!closed) showFallback();
    });
    video.addEventListener('waiting', () => {
      if (closed || phase !== 'film') return;
      intro.classList.add('buffering');
      showStatus('VIDEO PUFFERT');
      // Do not cut off the film on the first 1–3 seconds of buffering.
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        if (!closed && phase === 'film' && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
          requestManualStart('FILM FORTSETZEN');
        }
      }, 10000);
    });
    video.addEventListener('playing', () => {
      if (closed) return;
      clearTimeout(stallTimer);
      intro.classList.remove('buffering');
      if (phase === 'film') showStatus('FILMSEQUENZ AKTIV');
    });
    video.addEventListener('timeupdate', () => {
      if (closed || phase !== 'film') return;
      if (!video.paused) {
        clearTimeout(stallTimer);
        intro.classList.remove('buffering');
      }
    });
  }

  skip.addEventListener('click', finishIntro);
  if (playButton) playButton.addEventListener('click', () => beginFilm(true));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !closed) finishIntro();
  });
  // Safari can report document.hidden temporarily on navigation or UI transitions.
  // Never treat visibilitychange as permission to terminate a playing film.
  replay.addEventListener('click', () => startIntro(true));

  if (reduced) {
    closed = false;
    if (video) video.preload = 'none';
    finishIntro();
  } else {
    startIntro(false);
  }

  // Thin reading-progress line and nav contrast as the page scrolls.
  const progressFill = document.getElementById('page-progress-fill');
  const nav = document.getElementById('nav');
  let scrollFrame = 0;
  function updateScrollState() {
    scrollFrame = 0;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0, window.scrollY / max));
    progressFill.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
    nav.classList.toggle('scrolled', window.scrollY > 22);
  }
  function requestScrollState() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollState);
  }
  window.addEventListener('scroll', requestScrollState, {passive:true});
  window.addEventListener('resize', requestScrollState);
  updateScrollState();

  const visual = document.getElementById('hero-visual');
  const stage = document.getElementById('logo-stage');
  if (!reduced && window.matchMedia('(pointer:fine)').matches) {
    visual.addEventListener('pointermove', event => {
      const box = visual.getBoundingClientRect();
      const x = (event.clientX-box.left)/box.width-.5;
      const y = (event.clientY-box.top)/box.height-.5;
      visual.closest('.hero').style.setProperty('--grid-x', (x * 8).toFixed(1) + 'px');
      visual.closest('.hero').style.setProperty('--grid-y', (y * 8).toFixed(1) + 'px');
      stage.style.transform = 'rotate(-5deg) rotateY('+ (x*10).toFixed(2)+'deg) rotateX('+(-y*9).toFixed(2)+'deg) translateY('+(-y*8).toFixed(1)+'px)';
    });
    visual.addEventListener('pointerleave', () => {stage.style.transform = 'rotate(-5deg)';visual.closest('.hero').style.removeProperty('--grid-x');visual.closest('.hero').style.removeProperty('--grid-y');});
  }

  const reveals = document.querySelectorAll('.reveal');
  const revealGroups = document.querySelectorAll('.focus-item.reveal');
  revealGroups.forEach((item, index) => {
    item.style.setProperty('--reveal-delay', (index * 95) + 'ms');
  });
  if ('IntersectionObserver' in window && !reduced) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:.12,rootMargin:'0px 0px -30px 0px'});
    reveals.forEach(el => observer.observe(el));
  } else reveals.forEach(el => el.classList.add('visible'));

  const modes = {
    build: {direction:'"AI Application"',output:'Aus einer Idee wird eine Anwendung.'},
    automate: {direction:'"Smart Automation"',output:'Routine wird zum automatisierten Workflow.'},
    create: {direction:'"Creative Experiment"',output:'Neue Fragen. Neue Möglichkeiten.'}
  };
  const direction = document.getElementById('terminal-direction');
  const output = document.getElementById('terminal-output');
  document.querySelectorAll('.lab-choice').forEach(button => {
    button.addEventListener('click', () => {
      const mode = modes[button.dataset.mode];
      if (!mode) return;
      document.querySelectorAll('.lab-choice').forEach(item => {
        const selected = item === button;
        item.classList.toggle('active',selected);
        item.setAttribute('aria-pressed',String(selected));
      });
      direction.textContent = mode.direction;
      output.textContent = mode.output;
    });
  });

  const form = document.getElementById('brief-form');
  const feedback = document.getElementById('form-feedback');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const idea = document.getElementById('brief-idea').value.trim();
    if (!idea) {
      feedback.textContent = 'Bitte zuerst deine Idee eingeben.';
      return;
    }
    const type = document.getElementById('brief-type').value;
    const brief = ['ELRICO.DE – IDEENBRIEFING','','Bereich: '+type,'','Idee:',idea,'','Nächster Schritt: Konzept und mögliche Umsetzung klären.'].join('\n');
    try {
      await navigator.clipboard.writeText(brief);
      feedback.textContent='Briefing kopiert. Du kannst es jetzt in eine Nachricht einfügen.';
      feedback.classList.add('success');
    } catch {
      const field=document.createElement('textarea');
      field.value=brief;field.style.position='fixed';field.style.opacity='0';
      document.body.appendChild(field);
      field.select();
      const copied=document.execCommand('copy');
      field.remove();
      feedback.textContent=copied?'Briefing kopiert.':'Kopieren nicht möglich. Bitte Text aus dem Eingabefeld kopieren.';
      feedback.classList.toggle('success',copied);
    }
  });
})();