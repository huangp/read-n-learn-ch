// Mock for expo-sqlite
export const openDatabaseAsync = jest.fn();
export const SQLiteDatabase = jest.fn();

export default {
  openDatabaseAsync,
  SQLiteDatabase,
};
