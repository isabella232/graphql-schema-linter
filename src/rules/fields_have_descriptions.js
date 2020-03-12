import { getDescription } from 'graphql/utilities/buildASTSchema';
import { ValidationError } from '../validation_error';
import {
  fullDescription,
  offsetLocation,
  blankLineBeforeNode,
  descriptionIsOneLine,
  leadingQuotesAreTripleQuote,
  leadingQuotesOnTheirOwnLine,
  trailingQuotesOnTheirOwnLine,
} from './description_util.js';

function offsetsOfBlankLinesInDescription(descriptionWithQuotes) {
  const retval = [];
  const blankLineRegexp = new RegExp('\\n\\s*\\n', 'g');
  let m;
  while ((m = blankLineRegexp.exec(descriptionWithQuotes))) {
    // We map to index + 1 to indicate where the blank line begins
    // (not the newline before it).
    retval.push(m.index + 1);
  }
  return retval;
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
  (type.interfaces || []).forEach(i =>
    findInterface(ancestors, i.name.value).fields.forEach(
      f => (retval[f.name.value] = 1)
    )
  );
  return retval;
}

function reportError(error, context, node, ancestors, offset) {
  const fieldName = node.name.value;
  const parentName = ancestors[ancestors.length - 1].name.value;

  context.reportError(
    new ValidationError(
      'fields-have-descriptions',
      `The field \`${parentName}.${fieldName}\`s description ${error}.`,
      [node],
      offsetLocation(node, offset)
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

      if (!blankLineBeforeNode(node)) {
        reportError(
          'should have a blank line before it',
          context,
          node,
          ancestors
        );
      }

      if (!leadingQuotesAreTripleQuote(descriptionWithQuotes)) {
        if (descriptionWithQuotes[0] === '"') {
          // offset == 0 matches the open single-quote.
          reportError('should use triple-quotes', context, node, ancestors, 0);
          // If the open-quote is a single quote, the end-quote must
          // be too.  We report both for the benefit of auto-fixing.
          reportError('should use triple-quotes', context, node, ancestors, -1);
        } else {
          // offset == 0 matches the `#`.
          reportError('should use triple-quotes', context, node, ancestors, 0);
        }
      }

      offsetsOfBlankLinesInDescription(descriptionWithQuotes).forEach(offset =>
        reportError(
          'should not include a blank line',
          context,
          node,
          ancestors,
          offset
        )
      );

      if (leadingQuotesOnTheirOwnLine(descriptionWithQuotes)) {
        // Offset of 0 here matches the triple-quote location.
        reportError(
          'should not put the leading triple-quote on its own line',
          context,
          node,
          ancestors,
          0
        );
      }

      if (
        descriptionIsOneLine(description) &&
        trailingQuotesOnTheirOwnLine(descriptionWithQuotes)
      ) {
        // Offset of -3 matches the triple-quote location.
        reportError(
          'should not put the trailing triple-quote on its own line',
          context,
          node,
          ancestors,
          -3
        );
      }
      if (
        !descriptionIsOneLine(description) &&
        !trailingQuotesOnTheirOwnLine(descriptionWithQuotes)
      ) {
        // Offset of -3 matches the triple-quote location.
        reportError(
          'should put the trailing triple-quote on its own line',
          context,
          node,
          ancestors,
          -3
        );
      }
    },
  };
}
