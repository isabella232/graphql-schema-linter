export function fullDescription(node) {
  // While the sdl parser exposes node.description, it sadly elides
  // leading and trailing newlines.  So I look at the source to get
  // my own version (which includes leading and trailing quotes).
  // This is hacky!
  // TODO(csilvers): figure out what source.locationOffset is.
  for (
    let token = node.loc.startToken;
    token != node.loc.endToken;
    token = token.next
  ) {
    if (token.kind === 'BlockString') {
      return node.loc.source.body.substring(token.start, token.end);
    }
  }
  return '';
}

// True if the given node has a blank line before it, or a line
// ending in `{`.  This calculation ignores comment lines.
export function blankLineBeforeNode(node) {
  let prevToken = node.loc.startToken.prev;
  while (prevToken && prevToken.kind === 'Comment') {
    prevToken = prevToken.prev;
  }
  return (
    !prevToken ||
    prevToken.kind === '<SOF>' || // "Start of file"
    prevToken.line < prevToken.next.line - 1 ||
    prevToken.kind === '{'
  );
}

export function descriptionIsOneLine(description) {
  return description.indexOf('\n') === -1;
}

export function leadingQuotesAreTripleQuote(descriptionWithQuotes) {
  return !!descriptionWithQuotes.match(/^"""/);
}

export function leadingQuotesOnTheirOwnLine(descriptionWithQuotes) {
  return !!descriptionWithQuotes.match(/^"""\n/);
}

export function trailingQuotesOnTheirOwnLine(descriptionWithQuotes) {
  return !!descriptionWithQuotes.match(/\n\s*"""$/);
}
