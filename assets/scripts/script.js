const ready = (fn) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
};

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

const reflow = (el) => el.offsetWidth;

const stepWidth = (track) => {
  const item = track.firstElementChild;
  if (!item) return 0;
  return item.offsetWidth + (parseFloat(getComputedStyle(track).columnGap) || 0);
};

const rafThrottle = (fn) => {
  let queued = false;
  return (...args) => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(...args);
    });
  };
};

const setupStages = () => {
  const track = document.querySelector('.stages__list');
  const prev = document.querySelector('.stages__prev');
  const next = document.querySelector('.stages__next');
  const dotsBox = document.querySelector('.stages__dots');
  if (!track || !prev || !next || !dotsBox) return;

  const slides = [...track.querySelectorAll('.stages__pair')];
  if (!slides.length) return;

  const dots = slides.map((_, i) => {
    const dot = document.createElement('li');
    if (i === 0) dot.classList.add('is-active');
    dotsBox.append(dot);
    return dot;
  });

  let step = stepWidth(track);

  const sync = () => {
    const max = track.scrollWidth - track.clientWidth;
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= max - 1;
    if (!step) return;
    const i = Math.min(slides.length - 1, Math.max(0, Math.round(track.scrollLeft / step)));
    dots.forEach((d, idx) => d.classList.toggle('is-active', idx === i));
  };

  const scrollOne = (dir) =>
    track.scrollBy({
      left: dir * step,
      behavior: reduceMotion.matches ? 'auto' : 'smooth',
    });

  prev.addEventListener('click', () => scrollOne(-1));
  next.addEventListener('click', () => scrollOne(1));

  track.addEventListener('scroll', sync, { passive: true });
  window.addEventListener(
    'resize',
    rafThrottle(() => {
      step = stepWidth(track);
      sync();
    }),
  );

  sync();
};

const setupMembers = () => {
  const root = document.querySelector('.members');
  if (!root) return;
  const track = root.querySelector('.members__list');
  const prev = root.querySelector('.members__prev');
  const next = root.querySelector('.members__next');
  const counter = root.querySelector('.members__counter');
  const counterCurrent = root.querySelector('.members__counter-current');
  if (!track || !prev || !next || !counter || !counterCurrent) return;

  const total = track.children.length;
  if (!total) return;

  const AUTO_DELAY = 4000;
  let index = 0;
  let busy = false;
  let timer = 0;
  let isHovered = false;
  let isFocused = false;

  const renderCounter = () => {
    counterCurrent.textContent = String(index + 1);
  };

  const afterTransition = (cb) => {
    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      cb();
    };
    track.addEventListener('transitionend', fire, { once: true });
    setTimeout(fire, 800);
  };

  const advance = (dir) => {
    if (busy) return;
    busy = true;

    index = (index + dir + total) % total;
    renderCounter();

    if (reduceMotion.matches) {
      if (dir > 0) track.append(track.firstElementChild);
      else track.prepend(track.lastElementChild);
      busy = false;
      return;
    }

    const step = stepWidth(track);
    if (!step) {
      busy = false;
      return;
    }

    if (dir > 0) {
      track.style.transform = `translateX(-${step}px)`;
      afterTransition(() => {
        track.classList.add('is-skipping');
        track.append(track.firstElementChild);
        track.style.transform = '';
        reflow(track);
        track.classList.remove('is-skipping');
        busy = false;
      });
    } else {
      track.classList.add('is-skipping');
      track.prepend(track.lastElementChild);
      track.style.transform = `translateX(-${step}px)`;
      reflow(track);
      track.classList.remove('is-skipping');
      track.style.transform = '';
      afterTransition(() => {
        busy = false;
      });
    }
  };

  const start = () => {
    if (isHovered || isFocused || reduceMotion.matches || timer) return;
    timer = setInterval(() => advance(1), AUTO_DELAY);
  };

  const stop = () => {
    clearInterval(timer);
    timer = 0;
  };

  const sync = () => {
    if (isHovered || isFocused || document.hidden) stop();
    else start();
  };

  const restart = () => {
    stop();
    start();
  };

  prev.addEventListener('click', () => {
    advance(-1);
    restart();
  });
  next.addEventListener('click', () => {
    advance(1);
    restart();
  });

  root.addEventListener('pointerenter', () => {
    isHovered = true;
    sync();
  });
  root.addEventListener('pointerleave', () => {
    isHovered = false;
    sync();
  });
  root.addEventListener('focusin', () => {
    isFocused = true;
    sync();
  });
  root.addEventListener('focusout', (e) => {
    if (root.contains(e.relatedTarget)) return;
    isFocused = false;
    sync();
  });

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      advance(-1);
      restart();
    } else if (e.key === 'ArrowRight') {
      advance(1);
      restart();
    }
  });

  document.addEventListener('visibilitychange', sync);

  reduceMotion.addEventListener('change', () => {
    stop();
    sync();
  });

  renderCounter();
  start();
};

ready(() => {
  setupStages();
  setupMembers();
});
