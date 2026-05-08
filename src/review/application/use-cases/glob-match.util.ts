const REGEX_SPECIALS = new Set(['.', '+', '^', '$', '(', ')', '[', ']', '|', '\\']);

export function globToRegex(glob: string): RegExp {
  let regex = '';
  for (let i = 0; i < glob.length; ) {
    const c = glob.charAt(i);
    if (c === '*') {
      if (glob.charAt(i + 1) === '*') {
        regex += '.*';
        i += 2;
        if (glob.charAt(i) === '/') i++;
      } else {
        regex += '[^/]*';
        i++;
      }
      continue;
    }
    if (c === '?') {
      regex += '[^/]';
      i++;
      continue;
    }
    regex += REGEX_SPECIALS.has(c) ? '\\' + c : c;
    i++;
  }
  return new RegExp('^' + regex + '$');
}

export function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (globToRegex(pattern).test(filePath)) return true;
  }
  return false;
}
