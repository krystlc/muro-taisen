import { useState, useEffect, useCallback } from "react";
import { BASE_URL } from "@/core/config";
import { getToken, saveToken, deleteToken } from "@/core/auth";

// --- High Scores Hook ---

export type Score = {
  username: string;
  score: number;
};

export function useHighScores() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHighScores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BASE_URL}/scores`);
      if (response.ok) {
        const data = await response.json();
        setScores(data);
      } else {
        setError("Failed to fetch high scores.");
      }
    } catch (e) {
      setError("An error occurred. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  const submitScore = useCallback(async (token: string, score: number) => {
    try {
      const response = await fetch(`${BASE_URL}/scores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ score }),
      });
      return response.ok;
    } catch (e) {
      console.error("Error submitting score:", e);
      return false;
    }
  }, []);

  return { scores, loading, error, fetchHighScores, submitScore };
}

// --- Auth Hook ---

export type User = {
  username: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const storedToken = await getToken();
      if (storedToken) {
        setToken(storedToken);
        try {
          const response = await fetch(`${BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          if (response.ok) {
            const data = await response.json();
            setUser({ username: data.username });
          } else {
            await deleteToken();
            setToken(null);
          }
        } catch (e) {
          console.error("Failed to fetch user profile", e);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const register = useCallback(async (username: string) => {
    try {
      const response = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await response.json();
      if (response.ok) {
        await saveToken(data.token);
        setToken(data.token);
        setUser({ username });
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (e) {
      return { success: false, error: "An unexpected error occurred." };
    }
  }, []);

  const logout = useCallback(async () => {
    await deleteToken();
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, loading, register, logout };
}
