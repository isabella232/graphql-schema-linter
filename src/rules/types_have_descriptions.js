import { getDescription } from 'graphql/utilities/buildASTSchema';
import { ValidationError } from '../validation_error';
import {
  fullDescription,
  offsetLocation,
  blankLineBeforeNode,
  leadingQuotesAreTripleQuote,
  leadingQuotesOnTheirOwnLine,
  trailingQuotesOnTheirOwnLine,
} from './description_util.js';

function descriptionHasValidFirstline(description) {
  return description.match(/^[^\n]+(\n\n|$)/);
}

function reportError(error, context, node, typeKind, offset) {
  const interfaceTypeName = node.name.value;

  context.reportError(
    new ValidationError(
      'types-have-descriptions',
      `The ${typeKind} type \`${interfaceTypeName}\`s description ${error}.`,
      [node],
      offsetLocation(node, offset)
    )
  );
}

function validateTypeHasDescription(configuration, context, node, typeKind) {
  const description = getDescription(node, {
    commentDescriptions: configuration.getCommentDescriptions(),
  });

  if (!description) {
    return reportError('is missing', context, node, typeKind);
  }

  const descriptionWithQuotes = fullDescription(node);

  if (!blankLineBeforeNode(node)) {
    reportError('should have a blank line before it', context, node, typeKind);
  }

  if (!descriptionHasValidFirstline(description)) {
    reportError(
      'should have a one-line firstline, then optionally a blank line followed by other text',
      context,
      node,
      typeKind
    );
  }

  if (!leadingQuotesAreTripleQuote(descriptionWithQuotes)) {
    if (descriptionWithQuotes[0] === '"') {
      // offset == 0 matches the open single-quote.
      reportError('should use triple-quotes', context, node, typeKind, 0);
      // If the open-quote is a single quote, the end-quote must
      // be too.  We report both for the benefit of auto-fixing.
      reportError('should use triple-quotes', context, node, typeKind, -1);
    } else {
      // offset == 0 matches the `#`.
      reportError('should use triple-quotes', context, node, typeKind, 0);
    }
  }

  if (!leadingQuotesOnTheirOwnLine(descriptionWithQuotes)) {
    // Offset of 0 here matches the triple-quote location.
    reportError(
      'should put the leading triple-quote on its own line',
      context,
      node,
      typeKind,
      0
    );
  }

  if (!trailingQuotesOnTheirOwnLine(descriptionWithQuotes)) {
    // Offset of -3 matches the triple-quote location.
    reportError(
      'should put the trailing triple-quote on its own line',
      context,
      node,
      typeKind,
      -3
    );
  }
}

export function TypesHaveDescriptions(configuration, context) {
  return {
    TypeExtensionDefinition(node) {
      return false;
    },

    ScalarTypeDefinition(node) {
      // We do not require docstrings for scalars because they
      // are not things we define; we're just making use of them.
      // validateTypeHasDescription(configuration, context, node, 'scalar');
    },

    ObjectTypeDefinition(node) {
      validateTypeHasDescription(configuration, context, node, 'object');
    },

    InterfaceTypeDefinition(node) {
      validateTypeHasDescription(configuration, context, node, 'interface');
    },

    UnionTypeDefinition(node) {
      validateTypeHasDescription(configuration, context, node, 'union');
    },

    EnumTypeDefinition(node) {
      validateTypeHasDescription(configuration, context, node, 'enum');
    },

    InputObjectTypeDefinition(node) {
      validateTypeHasDescription(configuration, context, node, 'input object');
    },

    // Note we purposefully don't visit on type-extensions
    // ("extend type Foo"), which are not only not required
    // to have descriptions, but are not allowed to do so.
  };
}
