export const LANDING_NAV_OFFSET_PX = 90;
export const CALLBACK_SECTION_ID = 'download';
export const CALLBACK_SECTION_HASH = `#${CALLBACK_SECTION_ID}`;

export function navigateToCallbackSection(
  reducedMotion = false,
): boolean {
  const scrolled = scrollToLandingSection(
    CALLBACK_SECTION_ID,
    reducedMotion ? 'auto' : 'smooth',
  );
  if (!scrolled) return false;

  window.history.pushState(null, '', CALLBACK_SECTION_HASH);
  window.dispatchEvent(
    new CustomEvent('landing:hash-navigate', { detail: { id: CALLBACK_SECTION_ID } }),
  );
  return true;
}

export function scrollToLandingSection(
  id: string,
  behavior: ScrollBehavior = 'smooth',
): boolean {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior, block: 'start' });
  return true;
}

export function isLandingHashHref(href: string): boolean {
  return href.startsWith('#') && href.length > 1;
}

export function handleLandingHashClick(
  event: { preventDefault: () => void },
  href: string,
  reducedMotion = false,
): boolean {
  if (!isLandingHashHref(href)) return false;

  const id = href.slice(1);
  const scrolled = scrollToLandingSection(id, reducedMotion ? 'auto' : 'smooth');
  if (!scrolled) return false;

  event.preventDefault();
  window.history.pushState(null, '', href);
  window.dispatchEvent(new CustomEvent('landing:hash-navigate', { detail: { id } }));
  return true;
}
