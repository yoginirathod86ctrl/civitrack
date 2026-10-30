class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const config = { credentials: 'same-origin', headers: {}, ...options };
  if (config.body !== undefined && !(config.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }
  let response;
  try {
    response = await fetch(path, config);
  } catch {
    throw new ApiError('Unable to reach the CivicPulse server. Check that it is running.', 0, 'NETWORK_ERROR');
  }
  if (response.status === 401 && !path.startsWith('/api/auth/')) {
    window.dispatchEvent(new CustomEvent('civicpulse:unauthorized'));
  }
  if (response.status === 204) return null;
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) throw new ApiError(`Request failed with status ${response.status}.`, response.status, 'BAD_RESPONSE');
  }
  if (!response.ok || payload?.ok === false) {
    throw new ApiError(
      payload?.error?.message || payload?.message || `Request failed with status ${response.status}.`,
      response.status,
      payload?.error?.code || 'REQUEST_FAILED',
      payload?.error?.details
    );
  }
  return payload?.data !== undefined ? payload.data : payload;
}

export const api = {
  get(path) {
    return request(path);
  },
  post(path, body) {
    return request(path, { method: 'POST', body });
  },
  patch(path, body) {
    return request(path, { method: 'PATCH', body });
  },
  delete(path) {
    return request(path, { method: 'DELETE' });
  },
  async download(path, fallbackName) {
    const response = await fetch(path, { credentials: 'same-origin' });
    if (!response.ok) {
      let message = 'Unable to download this file.';
      try {
        const payload = await response.json();
        message = payload?.error?.message || message;
      } catch {}
      throw new ApiError(message, response.status, 'DOWNLOAD_FAILED');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    const filename = match ? match[1] : fallbackName;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
};

export { ApiError };
