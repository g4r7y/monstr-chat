const wrapText = (text: string, targetWidth: number): string[] => {
  const lines = [];
  // split on single whitespace (consecutive spaces will be treated as zero-length 'words'
  const words = text.split(/\s/);
  let currentLine = '';
  const iterator = words[Symbol.iterator]();
  let iterResult = iterator.next();
  let word = iterResult.value;
  while (!iterResult.done) {
    word = word!;
    // if line already started
    if (currentLine.length > 0) {
      if (currentLine.length + word.length + 1 <= targetWidth) {
        currentLine = currentLine + ' ' + word;
        iterResult = iterator.next();
        word = iterResult.value;
      } else {
        lines.push(currentLine.trim());
        currentLine = '';
      }
    }
    // it is a new line
    else {
      if (word.length <= targetWidth) {
        currentLine = word;
        iterResult = iterator.next();
        word = iterResult.value;
      } else {
        // word is longer than line
        lines.push(word.slice(0, targetWidth));
        currentLine = '';
        word = word.slice(targetWidth);
      }
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine.trim());
  }

  return lines;
};

const truncateText = (text: string, limit: number): string => {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1) + '…';
};

export { wrapText, truncateText };
