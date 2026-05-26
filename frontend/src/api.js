const BASE = import.meta.env.DEV ? '' : 'https://deskflow-uc1r.onrender.com';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Tickets
  getTickets: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();
    return request('GET', `/tickets${qs ? '?' + qs : ''}`);
  },
  createTicket: (body) => request('POST', '/tickets', body),
  updateTicket: (id, body) => request('PATCH', `/tickets/${id}`, body),
  deleteTicket: (id) => request('DELETE', `/tickets/${id}`),
  getStats: () => request('GET', '/tickets/stats'),
};
