import { vi } from 'vitest';

export const players = {}

const createMockAPI = (id) => {
    const api = () => {};
    const on = vi.fn(() => api);
    const once = vi.fn(() => api);
    const off = vi.fn(() => api);
    const remove = vi.fn(() => api);
    const setup = vi.fn(() => api);

    Object.assign(api, { on, once, off, remove, setup });
    players[id] = api;

    return api;
}

export const mockLibrary = (id) => {
    return players[id] || createMockAPI(id);
}
