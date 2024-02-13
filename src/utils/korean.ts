/**
 * 주어진 단어가 받침으로 끝나는지 아닌지에 따라
 * 다음에 시작하기 적절한 문자열을 반환합니다.
 * @param word
 * @param yes 주어진 단어가 받침이 있을 때 이어질 문자열
 * @param no 주어진 단어가 받침이 없을 때 이어질 문자열
 */
export const end_check = (word: string, yes = '', no = '') => {
  let molu = `(${yes}/${no})`
  if (yes.length == 0) molu = `(${no})`
  if (no.length == 0) molu = `(${yes})`

  if (word.length == 0) return molu

  const last_unicode = word.charCodeAt(word.length - 1)
  if (last_unicode < 44032 || last_unicode > 55203) return molu
  return (last_unicode - 44032) % 28 ? yes : no
}
