/* ================================================================
   OPERA TAIPEI — JAVASCRIPT
   Handles all interactive behaviour:
   - Navigation shrink on scroll
   - Mobile hamburger menu toggle
   - Menu tab switching
   - Fade-in animation on scroll (IntersectionObserver)
================================================================ */


/* ================================================================
   DOM REFERENCES
   Grab all the elements we need to interact with up front,
   using descriptive variable names so the code is self-documenting.
   Sections covered: navbar, mobile menu, menu tabs, and all
   fade-in elements (about, bartenders, gallery, trusted-by, events,
   hours, contact).
================================================================ */
const navbar              = document.getElementById('navbar');
const hamburgerButton     = document.getElementById('hamburger');
const mobileMenu          = document.getElementById('mobile-menu');
const mobileNavLinks      = document.querySelectorAll('.mobile-nav-link');
const menuTabButtons      = document.querySelectorAll('.menu-tab');
const menuPanels          = document.querySelectorAll('.menu-panel');
const fadeInElements      = document.querySelectorAll('.fade-in');


/* ================================================================
   NAV SHRINK ON SCROLL
   When the user scrolls past the hero section (80px threshold),
   the "scrolled" class is added to the navbar, which triggers
   the CSS transition to a more compact height and darker background.
================================================================ */
const SCROLL_THRESHOLD_FOR_COMPACT_NAV = 80;

window.addEventListener('scroll', () => {
  const userHasScrolledPastHero = window.scrollY > SCROLL_THRESHOLD_FOR_COMPACT_NAV;
  navbar.classList.toggle('scrolled', userHasScrolledPastHero);
});


/* ================================================================
   MOBILE HAMBURGER MENU
   Clicking the hamburger button toggles both:
   - An "open" class on the button itself (animates lines into an X)
   - An "open" class on the mobile menu (shows/hides the dropdown)
================================================================ */
hamburgerButton.addEventListener('click', () => {
  hamburgerButton.classList.toggle('open');
  mobileMenu.classList.toggle('open');
});

/* Close the mobile menu when the user taps any nav link inside it */
mobileNavLinks.forEach(navLink => {
  navLink.addEventListener('click', () => {
    hamburgerButton.classList.remove('open');
    mobileMenu.classList.remove('open');
  });
});


/* ================================================================
   MENU TAB SWITCHING
   Each tab button has a data-tab attribute (e.g. data-tab="signatures").
   Clicking a tab:
   1. Removes "active" from all tab buttons and panels
   2. Adds "active" to the clicked tab button
   3. Adds "active" to the matching panel (id = "tab-{data-tab value}")
================================================================ */
menuTabButtons.forEach(tabButton => {
  tabButton.addEventListener('click', () => {

    /* Deactivate all tabs and panels first */
    menuTabButtons.forEach(button => button.classList.remove('active'));
    menuPanels.forEach(panel => panel.classList.remove('active'));

    /* Activate the clicked tab */
    tabButton.classList.add('active');

    /* Find and show the matching panel using the data-tab attribute */
    const targetPanelId = 'tab-' + tabButton.dataset.tab;
    const targetPanel   = document.getElementById(targetPanelId);

    if (targetPanel) {
      targetPanel.classList.add('active');
    }
  });
});


/* ================================================================
   FADE-IN ON SCROLL (IntersectionObserver)
   Elements with the class "fade-in" start invisible (defined in CSS).
   When they enter the viewport, the observer adds the "visible"
   class which triggers the CSS transition (opacity + slide up).

   Options:
   - threshold 0.1  → trigger when 10% of the element is visible
   - rootMargin     → trigger slightly before the element fully enters
================================================================ */
const fadeInObserverOptions = {
  threshold:  0.1,
  rootMargin: '0px 0px -40px 0px'
};

const fadeInObserver = new IntersectionObserver((observedEntries) => {
  observedEntries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');

      /* Stop observing once animated — no need to watch it again */
      fadeInObserver.unobserve(entry.target);
    }
  });
}, fadeInObserverOptions);

/* Attach the observer to every fade-in element on the page */
fadeInElements.forEach(element => {
  fadeInObserver.observe(element);
});
