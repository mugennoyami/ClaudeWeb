(() => {
  const header = document.getElementById('header');
  const nav = document.getElementById('nav');
  const navToggle = document.querySelector('.nav-toggle');

  /* Header bekommt Hintergrund, sobald gescrollt wird */
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Felge dreht sich beim Scrollen mit (ohne Bewegung bei reduzierter Animation) */
  const wheelWrap = document.querySelector('.hero-wheel-wrap');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (wheelWrap && !reduceMotion) {
    let frame = null;
    window.addEventListener(
      'scroll',
      () => {
        if (frame) return;
        frame = window.requestAnimationFrame(() => {
          wheelWrap.style.setProperty('--turn', `${(window.scrollY * 0.12) % 360}deg`);
          frame = null;
        });
      },
      { passive: true }
    );
  }

  /* Mobiles Menü */
  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
  };

  navToggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });

  /* Elemente einblenden, wenn sie in den Viewport kommen */
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealItems.forEach((el) => observer.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add('is-visible'));
  }

  /* Kontaktformular: baut eine E-Mail zusammen, speichert aber nichts auf dem Server */
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const value = (key) => (data.get(key) || '').toString().trim();

      const subject = `Anfrage ${value('model')} – ${value('goal')}`;
      const body = [
        `Name: ${value('name')}`,
        `E-Mail: ${value('email')}`,
        `Fahrzeug: ${value('model')}`,
        `Ziel: ${value('goal')}`,
        '',
        value('message'),
      ].join('\n');

      const to = form.dataset.email;
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
})();
