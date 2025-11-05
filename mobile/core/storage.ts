import AsyncStorage from '@react-native-async-storage/async-storage';

const TOP_SCORE_KEY = 'topScore';

export const saveTopScore = async (score: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOP_SCORE_KEY, String(score));
  } catch (e) {
    console.error("Failed to save top score.", e);
  }
};

export const loadTopScore = async (): Promise<number> => {
  try {
    const scoreStr = await AsyncStorage.getItem(TOP_SCORE_KEY);
    if (scoreStr !== null) {
      return parseInt(scoreStr, 10);
    }
    return 0;
  } catch (e) {
    console.error("Failed to load top score.", e);
    return 0;
  }
};
