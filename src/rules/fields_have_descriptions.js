import { getDescription } from 'graphql/utilities/buildASTSchema';
import { ValidationError } from '../validation_error';

function fullDescription(node) {
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

function descriptionHasBlankLine(description) {
  return description.match(/\n\s*\n/);
}

function descriptionIsOneLine(description) {
  return description.indexOf('\n') === -1;
}

function leadingQuotesAreTripleQuote(descriptionWithQuotes) {
  return !!descriptionWithQuotes.match(/^"""/);
}

function leadingQuotesOnTheirOwnLine(descriptionWithQuotes) {
  return !!descriptionWithQuotes.match(/^"""\n/);
}

function trailingQuotesOnTheirOwnLine(descriptionWithQuotes) {
  return !!descriptionWithQuotes.match(/\n\s*"""$/);
}

// Find the interface type with the given name.  There's probably
// a graphql-js API to do this, but I can't figure it out, so
// I just manually iterate through ancestors.
function findInterface(ancestors, name) {
  for (let i = 0; i < ancestors.length; i++) {
    // Each element of ancestors can be a node or an array of its own.
    if (ancestors[i].length) {
      const found = findInterface(ancestors[i], name);
      if (found) {
        return found;
      }
    } else if (
      ancestors[i].kind === 'InterfaceTypeDefinition' &&
      ancestors[i].name.value === name
    ) {
      return ancestors[i];
    }
  }
  return null;
}

// Finds all fields defined in any interfaces inherited by
// the type that defines `node`.  `node` should be a FieldDefinition.
function interfaceFieldsFor(node, ancestors) {
  const retval = {};
  const type = ancestors[ancestors.length - 1];
  // For each interface listed on this type, we find the definition
  // of that interface, then add all its fields to retval.
  type.interfaces.forEach(i =>
    findInterface(ancestors, i.name.value).fields.forEach(
      f => (retval[f.name.value] = 1)
    )
  );
  return retval;
}

// True if the field-definition has a blank line before it, or a line
// ending in `{`.
function blankLineBeforeField(node) {
  let prevToken = node.loc.startToken.prev;
  while (prevToken && prevToken.kind === 'Comment') {
    prevToken = prevToken.prev;
  }
  return (
    !prevToken ||
    prevToken.line < prevToken.next.line - 1 ||
    prevToken.kind === '{'
  );
}

function reportError(error, context, node, ancestors) {
  const fieldName = node.name.value;
  const parentName = ancestors[ancestors.length - 1].name.value;

  context.reportError(
    new ValidationError(
      'fields-have-descriptions',
      `The field \`${parentName}.${fieldName}\`s description ${error}.`,
      [node]
    )
  );
}

export function FieldsHaveDescriptions(configuration, context) {
  return {
    FieldDefinition(node, key, parent, path, ancestors) {
      const description = getDescription(node, {
        commentDescriptions: configuration.getCommentDescriptions(),
      });

      if (!description) {
        const fieldName = node.name.value;

        // We do not require descriptions on deprecated fields.
        if (
          node.directives &&
          node.directives.some(d => d.name.value == 'deprecated')
        ) {
          return;
        }
        // Or on interface fields.
        if (!description && interfaceFieldsFor(node, ancestors)[fieldName]) {
          return;
        }

        return reportError('is missing', context, node, ancestors);
      }

      const descriptionWithQuotes = fullDescription(node);

      if (!blankLineBeforeField(node)) {
        reportError(
          'should have a blank line before it',
          context,
          node,
          ancestors
        );
      }

      if (!leadingQuotesAreTripleQuote(descriptionWithQuotes)) {
        reportError('should use triple-quotes', context, node, ancestors);
      }

      if (descriptionHasBlankLine(description)) {
        reportError(
          'should not include a blank line',
          context,
          node,
          ancestors
        );
      }

      if (leadingQuotesOnTheirOwnLine(descriptionWithQuotes)) {
        reportError(
          'should not put the leading triple-quote on its own line',
          context,
          node,
          ancestors
        );
      }

      if (
        descriptionIsOneLine(description) &&
        trailingQuotesOnTheirOwnLine(descriptionWithQuotes)
      ) {
        reportError(
          'should not put the trailing triple-quote on its own line',
          context,
          node,
          ancestors
        );
      }
      if (
        !descriptionIsOneLine(description) &&
        !trailingQuotesOnTheirOwnLine(descriptionWithQuotes)
      ) {
        reportError(
          'should put the trailing triple-quote on its own line',
          context,
          node,
          ancestors
        );
      }
    },
  };
}
