const API_URL = import.meta.env.VITE_API_URL || '';

export const getImageUrl = (path) =>
  path ? (path.startsWith('http') ? path : `${API_URL}${path}`) : null;

export const API_BASE = API_URL;
