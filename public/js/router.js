export const router = {
  current: null,
  navigate(path, { replace = false, silent = false } = {}) {
    const target = path || '/';
    if (replace) history.replaceState({}, '', target);
    else if (location.pathname + location.search !== target) history.pushState({}, '', target);
    if (!silent) window.dispatchEvent(new PopStateEvent('popstate'));
  },
  replace(path) {
    router.navigate(path, { replace: true });
  },
  back(fallback = '/') {
    if (history.length > 1) history.back();
    else router.navigate(fallback);
  }
};

export function parseRoute() {
  const url = new URL(location.href);
  const segments = url.pathname.split('/').filter(Boolean);
  return {
    path: url.pathname,
    segments,
    query: url.searchParams,
    hash: url.hash
  };
}

export function navigate(path, options) {
  router.navigate(path, options);
}

export function queryParam(name, fallback = '') {
  return new URL(location.href).searchParams.get(name) || fallback;
}
