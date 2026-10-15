export const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `http://${hostname}:3001`;
    }
  }
  return 'http://localhost:3001';
};

export async function apiFetch<T>(endpoint: string, options?: RequestInit, retries = 3): Promise<T> {
  const baseUrl = getApiUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erro na chamada à API: ${response.status}`);
      }

      return await response.json() as Promise<T>;
    } catch (err: any) {
      if (attempt < retries && (err.name === 'TypeError' || err.message.includes('fetch'))) {
        await new Promise((res) => setTimeout(res, 600));
        continue;
      }

      if (err.name === 'TypeError' || err.message.includes('fetch')) {
        throw new Error(`Não foi possível conectar à API (${baseUrl}). Verifique a conexão com o servidor.`);
      }
      throw err;
    }
  }

  throw new Error('Erro inesperado na chamada da API.');
}



