/**
 * 웹에서는 한글+영문만 남긴 woff2(약 0.6MB)를 쓴다.
 * 원래 TTF 두 개(9MB)를 받는 동안 화면이 하얗게 비어 있던 문제를 막는다.
 * 파일은 pyftsubset으로 만들었다 (한글 완성형 U+AC00-D7A3, 자모, 기본 라틴, 문장부호, 화살표, 기호).
 */
export const fontMap = {
  Jua_400Regular: require('../assets/fonts/Jua.woff2'),
  GowunDodum_400Regular: require('../assets/fonts/GowunDodum.woff2'),
};
