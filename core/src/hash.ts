const fnv1aHash = (input: string): string => {
  const fnvPrime = 0x811c9dc5;
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i++) {
    hash = (hash ^ input.charCodeAt(i)) * fnvPrime;
  }
  return hash.toString(16);
};

const hash = (strings: string[]): string => {
  const sorted = strings.sort();
  const concatenatedString = sorted.join('');
  return fnv1aHash(concatenatedString);
};

export default hash;
