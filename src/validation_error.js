import { GraphQLError } from 'graphql/error';

export class ValidationError extends GraphQLError {
  // `offset` is optional.  If set, it overrides the location of
  // nodes[0].  It should be a byte-position within the body of the
  // schema file.
  constructor(ruleName, message, nodes, offset) {
    if (offset != null) {
      super(message, null, nodes[0].loc.source, [offset]);
    } else {
      super(message, nodes);
    }

    this.ruleName = ruleName;
  }
}
