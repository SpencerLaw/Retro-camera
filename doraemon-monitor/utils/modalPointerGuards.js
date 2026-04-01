export function shouldStopModalMouseDown(target) {
  let current = target;

  while (current) {
    const tagName = typeof current.tagName === 'string' ? current.tagName.toUpperCase() : '';
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || tagName === 'LABEL') {
      return false;
    }

    if (typeof current.getAttribute === 'function' && current.getAttribute('contenteditable') === 'true') {
      return false;
    }

    current = current.parentElement || current.parentNode || null;
  }

  return true;
}
