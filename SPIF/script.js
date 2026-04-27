/* ═══════════════════════════════════════
   SPIF 1.0 — UI JavaScript
   Handles nav, scroll reveal, and the
   video→3D crossfade driven by scroll.
═══════════════════════════════════════ */

// ── Nav scroll behavior ────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ── Video → 3D crossfade on scroll ────────────────────────────────────────────
// #hero-scroll-wrapper is 220vh tall; #hero is sticky inside it.
// scrollY 0 → 0 px into wrapper   = progress 0 (video)
// scrollY grows → progress 0→1    = crossfade
// scrollY past wrapper             = progress 1 (CAD, page continues)
//
// window._spifScrollProgress: 0 = video fully visible, 1 = CAD fully visible
// 3D controls are only enabled when progress == 1 (see spif-3d.js)

window._spifScrollProgress = 0;

const heroWrapper = document.getElementById('hero-scroll-wrapper');

function updateScrollProgress() {
    if (!heroWrapper) return;
    const wrapperH   = heroWrapper.offsetHeight;   // 220vh
    const stickyH    = window.innerHeight;          // 100vh — the pinned view
    const scrollDist = wrapperH - stickyH;          // 120vh — the actual travel
    // Add a 10% buffer at each end so the crossfade doesn't start/end abruptly
    const buffer = scrollDist * 0.10;
    const raw = (window.scrollY - heroWrapper.offsetTop - buffer) / (scrollDist - buffer * 2);
    window._spifScrollProgress = Math.max(0, Math.min(1, raw));
}

window.addEventListener('scroll', updateScrollProgress, { passive: true });
updateScrollProgress();

// ── Scroll reveal ──────────────────────
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const siblings = Array.from(entry.target.parentElement.querySelectorAll('.reveal:not(.visible)'));
            const idx = siblings.indexOf(entry.target);
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, idx * 80);
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Smooth scroll for nav links ────────
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ── Absolute-in-section scroll photos ────────────────────────────────────
// Each image is appended inside its section (position:absolute).
// It scrolls with the page. JS only drives translateX for slide in/out.
// Slide in when section enters viewport, stay put, slide back on scroll-up.

(function initScrollPhotos() {

    const PHOTOS = [
        { src: 'models/machine-setup.jpg',  anchor: '#build', side: 'right', topOffset: 40 },
        { src: 'models/projection-cal.jpg', anchor: '#build', side: 'left',  contentAnchor: '#build .section-inner' },
        { src: 'models/print-output.jpg',   anchor: '#state', side: 'right', contentAnchor: '#state .section-inner', gap: 0 },
    ];

    const SLIDE_PX = 600;

    function easeOut(t) { return 1 - Math.pow(1 - t, 2); }

    const instances = PHOTOS.map(cfg => {
        const section = document.querySelector(cfg.anchor);
        if (!section) return null;

        const img = document.createElement('img');
        img.src = cfg.src;
        img.className = 'scroll-photo scroll-photo--' + cfg.side + (cfg.contentAnchor ? ' scroll-photo--center' : '');

        if (cfg.contentAnchor) {
            img.style.transform = cfg.side === 'right' ? 'translateX(120vw)' : 'translateX(-120vw)';
        } else {
            img.style.transform = 'translateX(120vw)';
        }
        section.appendChild(img);

        const contentEl = cfg.contentAnchor ? document.querySelector(cfg.contentAnchor) : null;
        return { img, section, side: cfg.side, topOffset: cfg.topOffset || 0, contentEl };
    }).filter(Boolean);

    function tick() {
        const vh = window.innerHeight;
        const vw = window.innerWidth;

        instances.forEach(inst => {
            const secRect = inst.section.getBoundingClientRect();

            // For center images: measure actual bottom of section-inner content, place image right below it
            let topPx;
            if (inst.contentEl) {
                const innerRect = inst.contentEl.getBoundingClientRect();
                const gap = inst.gap !== undefined ? inst.gap : 40;
                topPx = innerRect.bottom - secRect.top + gap;
            } else {
                topPx = inst.topOffset;
            }

            inst.img.style.top = topPx + 'px';

            const imgAbsTop = secRect.top + topPx;
            const raw = (vh * 1.5 - imgAbsTop) / SLIDE_PX;
            const progress = Math.max(0, Math.min(1, raw));
            const eased = easeOut(progress);

            const offscreen = vw * 1.15;
            const slide = offscreen * (1 - eased);
            if (inst.contentEl) {
                // Centrepiece: resting position is -50% (true centre); slide in from off-screen
                const restX = -inst.img.offsetWidth / 2;
                const tx = inst.side === 'right' ? restX + offscreen * (1 - eased) : restX - offscreen * (1 - eased);
                inst.img.style.transform = `translateX(${tx}px)`;
            } else {
                const tx = inst.side === 'right' ? slide : -slide;
                inst.img.style.transform = `translateX(${tx}px)`;
            }
        });
    }

    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick,  { passive: true });
    tick();
}());

// ── Active nav link on scroll ──────────
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-links a[href^="#"]');

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            navLinks.forEach(link => {
                link.style.color = '';
                if (link.getAttribute('href') === '#' + entry.target.id) {
                    link.style.color = 'var(--text)';
                }
            });
        }
    });
}, { threshold: 0.4 });

sections.forEach(s => sectionObserver.observe(s));
