const api = (() => {
  async function request(path, options = {}) {
    let res;
    try {
      res = await fetch(`/api${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
    } catch (err) {
      throw new Error('Can’t reach the server. Check your connection and try again.');
    }

    if (res.status === 204) return null;

    let body = null;
    try {
      body = await res.json();
    } catch (err) {
      body = null;
    }

    if (!res.ok) {
      const error = new Error((body && body.message) || 'Something went wrong.');
      error.status = res.status;
      error.fieldErrors = body && body.errors;
      throw error;
    }

    return body ? body.data : null;
  }

  return {
    get: (path) => request(path),
    post: (path, data) => request(path, { method: 'POST', body: JSON.stringify(data) }),
    put: (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) }),
    patch: (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (path) => request(path, { method: 'DELETE' }),
  };
})();
