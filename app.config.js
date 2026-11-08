// GitHub Pages처럼 하위 경로에 올릴 때만 EXPO_BASE_URL을 준다 (예: /group-trip-app)
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...(config.experiments ?? {}), ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
});
