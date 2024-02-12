expect function findIndexByKey(key: string): number {
  for (let i = 0; i < jsonArray.length; i++) {
    if (jsonArray[i].key === key) {
      return i;
    }
  }
  return -1; // 찾지 못한 경우
}
