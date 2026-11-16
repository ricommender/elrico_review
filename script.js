(() => {
  'use strict';

  // Cinematic preview 1.4: Safari-safe autoplay, manual start and graceful fallback.
  // Original logo artwork and the Magnific movie remain unchanged.
  const intro = document.getElementById('intro');
  const site = document.getElementById('site');
  const skip = document.getElementById('skip-intro');
  const replay = document.getElementById('replay-intro');
  const playButton = document.getElementById('intro-play');
  const video = document.getElementById('intro-video');
  const status = document.getElementById('intro-status');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let closed = true;
  let returningFocus = false;
  let phase = 'idle';
  let sequence = 0;
  let pendingPlay = false;
  let readyTimeout = 0;
  let graceTimeout = 0;
  let filmTimeout = 0;
  let bufferingTimeout = 0;

  function clearIntroTimers() {
    clearTimeout(readyTimeout);
    clearTimeout(graceTimeout);
    clearTimeout(filmTimeout);
    clearTimeout(bufferingTimeout);
  }

  function setIntroStatus(message) {
    if (status && status.textContent !== message) status.textContent = message;
  }

  function finishIntro() {
    if (closed) return;
    closed = true;
    sequence++;
    phase = 'idle';
    pendingPlay = false;
    clearIntroTimers();
    if (video) video.pause();
    if (playButton) playButton.hidden = true;
    intro.classList.add('done');
    intro.classList.remove('has-film', 'buffering', 'awaiting-tap');
    intro.setAttribute('aria-hidden', 'true');
    intro.setAttribute('inert', '');
    site.removeAttribute('inert');
    site.classList.add('ready');
    document.body.classList.remove('intro-active');
    if (returningFocus) {
      replay.focus({preventScroll: true});
      returningFocus = false;
    } else if (document.activeElement === skip || document.activeElement === playButton) {
      skip.blur();
    }
  }

  function fallbackIntro(message = 'ORB-ANIMATION') {
    if (closed || phase === 'idle') return;
    phase = 'fallback';
    pendingPlay = false;
    clearIntroTimers();
    if (video) video.pause();
    if (playButton) playButton.hidden = true;
    intro.classList.remove('has-film', 'buffering', 'awaiting-tap');
    intro.classList.add('fallback');
    setIntroStatus(message);
    graceTimeout = setTimeout(finishIntro, 1650);
  }

  function offerManualPlayback() {
    if (closed || phase !== 'loading') return;
    phase = 'manual';
    pendingPlay = false;
    clearTimeout(readyTimeout);
    if (video) video.pause();
    intro.classList.remove('has-film', 'buffering');
    intro.classList.add('awaiting-tap');
    if (playButton) playButton.hidden = false;
    setIntroStatus('VIDEO MANUELL STARTEN');
    // The homepage remains accessible without any interaction.
    graceTimeout = setTimeout(finishIntro, 3600);
  }

  function startFilm(manual = false) {
    if (!video || closed || pendingPlay) return;
    if (manual ? phase !== 'manual' : phase !== 'loading') return;
    pendingPlay = true;
    if (manual) {
      phase = 'starting';
      clearTimeout(graceTimeout);
      if (playButton) playButton.hidden = true;
      setIntroStatus('FILM WIRD GESTARTET');
    }

    const token = sequence;
    video.muted = true;
    video.playsInline = true;
    // play() is called directly from the manual button's click gesture on iOS.
    let promise;
    try {
      promise = video.play();
    } catch (_) {
      pendingPlay = false;
      if (manual) fallbackIntro('VIDEO NICHT VERFÜGBAR');
      else offerManualPlayback();
      return;
    }

    Promise.resolve(promise).then(() => {
      if (closed || sequence !== token || (phase !== 'loading' && phase !== 'starting')) {
        video.pause();
        return;
      }
      pendingPlay = false;
      phase = 'film';
      clearTimeout(readyTimeout);
      clearTimeout(graceTimeout);
      if (playButton) playButton.hidden = true;
      intro.classList.remove('fallback', 'buffering', 'awaiting-tap');
      intro.classList.add('has-film');
      setIntroStatus('FILMSEQUENZ AKTIV');
      filmTimeout = setTimeout(finishIntro, 6500);
    }).catch(() => {
      if (closed || sequence !== token) return;
      pendingPlay = false;
      if (manual) fallbackIntro('VIDEO AUF DIESEM GERÄT NICHT VERFÜGBAR');
      else offerManualPlayback();
    });

    if (manual) {
      // Some iOS versions leave play() pending if the media cannot be decoded.
      readyTimeout = setTimeout(() => {
        if (!closed && sequence === token && phase === 'starting') {
          fallbackIntro('VIDEO AUF DIESEM GERÄT NICHT VERFÜGBAR');
        }
      }, 2500);
    }
  }

  function startIntro(fromReplay = false) {
    if (reduced) return;
    sequence++;
    clearIntroTimers();
    if (video) {
      video.pause();
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      try { video.currentTime = 0; } catch (_) {}
    }
    closed = false;
    returningFocus = fromReplay;
    pendingPlay = false;
    phase = 'loading';

    intro.removeAttribute('inert');
    intro.setAttribute('aria-hidden', 'false');
    intro.classList.remove('done', 'run', 'fallback', 'buffering', 'has-film', 'awaiting-tap');
    if (playButton) playButton.hidden = true;
    void intro.offsetWidth;
    intro.classList.add('run');
    site.classList.remove('ready');
    site.setAttribute('inert', '');
    document.body.classList.add('intro-active');
    setIntroStatus('FILM WIRD GELADEN');
    if (fromReplay) skip.focus({preventScroll: true});

    // Safari may defer preload, so a strict 1.85 s readyState deadline is too short.
    // Attempt playback immediately and let the play() promise tell us if it succeeded.
    readyTimeout = setTimeout(offerManualPlayback, 3600);
    if (video) {
      if (video.readyState === 0) video.load();
      startFilm(false);
    } else {
      fallbackIntro();
    }
  }

  if (video) {
    video.addEventListener('ended', () => {
      if (!closed && phase === 'film') finishIntro();
    });
    video.addEventListener('error', () => {
      if (closed) return;
      if (phase === 'loading') offerManualPlayback();
      else if (phase === 'film' || phase === 'starting') fallbackIntro('VIDEO NICHT VERFÜGBAR');
    });
    video.addEventListener('waiting', () => {
      if (closed || phase !== 'film') return;
      intro.classList.add('buffering');
      setIntroStatus('VIDEO WIRD GEPUFFERT');
      clearTimeout(bufferingTimeout);
      bufferingTimeout = setTimeout(() => {
        if (!closed && phase === 'film') fallbackIntro();
      }, 3000);
    });
    video.addEventListener('playing', () => {
      if (closed || phase !== 'film') return;
      clearTimeout(bufferingTimeout);
      intro.classList.remove('buffering');
      setIntroStatus('FILMSEQUENZ AKTIV');
    });
  }

  skip.addEventListener('click', finishIntro);
  if (playButton) playButton.addEventListener('click', () => startFilm(true));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !closed) finishIntro();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !closed) finishIntro();
  });
  replay.addEventListener('click', () => startIntro(true));

  if (reduced) {
    closed = false;
    if (video) {
      video.preload = 'none';
      video.querySelectorAll('source').forEach(source => source.remove());
    }
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