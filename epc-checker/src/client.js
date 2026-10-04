const DEFAULT_BASE_URL =
  "https://api.get-energy-performance-data.communities.gov.uk";

function resolveToken() {
  const token =
    process.env.EPC_API_TOKEN ||
    process.env.EPC_API_TOKENS ||
    process.env.EPC_BEARER_TOKEN;
  if (!token) {
    throw new Error(
      "Missing EPC API bearer token. Set EPC_API_TOKEN (preferred) from the MHCLG 'My Bearer Token' page."
    );
  }
  return token.trim();
}

export function createClient({
  baseUrl = process.env.EPC_API_BASE_URL || DEFAULT_BASE_URL,
  token = resolveToken(),
  fetchImpl = globalThis.fetch,
} = {}) {
  async function request(path, query = {}) {
    const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, String(item));
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!response.ok) {
      const detail =
        typeof body === "object" ? JSON.stringify(body) : String(body);
      throw new Error(
        `EPC API ${response.status} ${response.statusText} for ${url.pathname}: ${detail}`
      );
    }

    return body;
  }

  return {
    baseUrl,
    searchDomestic(query) {
      return request("/api/domestic/search", query);
    },
    getCertificate(certificateNumber) {
      return request("/api/certificate", {
        certificate_number: certificateNumber,
      });
    },
    getCodes() {
      return request("/api/codes");
    },
    getCodeInfo(code, key) {
      return request("/api/codes/info", { code, key });
    },
  };
}
