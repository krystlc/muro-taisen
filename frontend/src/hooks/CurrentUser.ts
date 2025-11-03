const CURRENT_USER_KEY = "username";

export const currentUser = {
  getUsername() {
    return localStorage.getItem(CURRENT_USER_KEY);
  },
  setUsername(username: string) {
    localStorage.setItem(CURRENT_USER_KEY, username);
  },
};
