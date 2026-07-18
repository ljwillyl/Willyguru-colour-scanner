"use strict";
(() => {
  const header = document.querySelector('.top, .appHeader');
  if (!header) return;
  const nav = header.querySelector('nav');
  if (!nav) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'mobileMenuButton';
  button.setAttribute('aria-label', 'Open navigation menu');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span></span><span></span><span></span>';

  const backdrop = document.createElement('div');
  backdrop.className = 'mobileNavBackdrop';
  document.body.appendChild(backdrop);
  header.appendChild(button);

  function closeMenu() {
    nav.classList.remove('mobileOpen');
    backdrop.classList.remove('active');
    document.body.classList.remove('menuOpen');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open navigation menu');
  }

  function openMenu() {
    nav.classList.add('mobileOpen');
    backdrop.classList.add('active');
    document.body.classList.add('menuOpen');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', 'Close navigation menu');
  }

  button.addEventListener('click', () => {
    button.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });
  backdrop.addEventListener('click', closeMenu);
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) closeMenu();
  });
})();
