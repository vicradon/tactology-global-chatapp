import { useState, useEffect, useCallback } from "react";
import getAPIBaseURL from "./getAPIBase";

interface FetchOptions extends RequestInit {
  headers?: HeadersInit;
}

const API_BASE_URL = getAPIBaseURL();

export function useFetchQuery(endpoint: string, options: FetchOptions = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const url = `${API_BASE_URL}${endpoint}`;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(url, {
      ...options,
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (isMounted) {
          setData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url, options]);

  return { data, loading, error };
}

export function useFetchMutation(endpoint: string, options: FetchOptions = {}) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<any>(null);

  const url = `${API_BASE_URL}${endpoint}`;

  const mutate = useCallback(
    async (body?: any) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...options.headers },
          body: JSON.stringify(body),
          credentials: "include",
          ...options,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();
        setData(result);
        return result;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [url, options]
  );

  return { mutate, data, loading, error };
}
