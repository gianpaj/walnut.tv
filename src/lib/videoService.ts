export function isVideoObject({ data }: RedditPost) {
  // FIXME: allow support reddit videos (rendering)
  // reddit videos
  if (data.is_video === true) return false;

  // debug only - return only reddit videos
  // return false;

  if (data.media !== null) {
    return data.media.type.includes("youtube.com"); // data.media.type.includes("vimeo.com")
  }
  return false;
}

/**
 * input = [[1,2,3], [4,5,6,7,8], [9,10]];
 * output = [1, 4, 9, 2, 5, 10, 3, 6, 7, 8]
 */
export function interleaveArrays<T>(arrayOfArrays: T[][]): T[] {
  const result: T[] = [];
  while (arrayOfArrays.length > 0) {
    arrayOfArrays = arrayOfArrays.filter((subArray) => {
      if (subArray.length > 0) {
        result.push(subArray.shift() as T);
        return true;
      }
      return false;
    });
  }
  return result;
}
