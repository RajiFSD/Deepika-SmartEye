// src/services/normalize.js
export const normalizeArray = (response, possiblePaths = []) => {
  // response may be the Axios response object OR already response.data
  const src = response?.data ?? response;

  // try provided paths first (strings like 'data.tenantProducts')
  for (const path of possiblePaths) {
    const parts = path.split('.');
    let cur = src;
    let ok = true;
    for (const p of parts) {
      if (cur == null || !(p in cur)) { ok = false; break; }
      cur = cur[p];
    }
    if (ok && Array.isArray(cur)) return cur;
  }

  // common fallback locations
  if (Array.isArray(src)) return src;
  if (Array.isArray(src?.data)) return src.data;
  if (Array.isArray(src?.data?.data)) return src.data.data;
  if (Array.isArray(src?.data?.tenantProducts)) return src.data.tenantProducts;
  if (Array.isArray(src?.data?.tenants)) return src.data.tenants;
  if (Array.isArray(src?.data?.products)) return src.data.products;
  if (Array.isArray(src?.tenantProducts)) return src.tenantProducts;
  if (Array.isArray(src?.tenants)) return src.tenants;
  if (Array.isArray(src?.products)) return src.products;

  return []; // nothing found
};
