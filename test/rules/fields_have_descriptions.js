import { FieldsHaveDescriptions } from '../../src/rules/fields_have_descriptions';
import {
  expectFailsRule,
  expectPassesRuleWithConfiguration,
} from '../assertions';

describe('FieldsHaveDescriptions rule', () => {
  it('catches fields that have no description', () => {
    expectFailsRule(
      FieldsHaveDescriptions,
      `
      type A {
        withoutDescription: String
        withoutDescriptionAgain: String!

        """Description"""
        withDescription: String
      }
    `,
      [
        {
          message: 'The field `A.withoutDescription`s description is missing.',
          locations: [{ line: 3, column: 9 }],
        },
        {
          message:
            'The field `A.withoutDescriptionAgain`s description is missing.',
          locations: [{ line: 4, column: 9 }],
        },
      ]
    );
  });

  it('requires a blank line before the description', () => {
    expectFailsRule(
      FieldsHaveDescriptions,
      `
      type A {
        """Description."""
        withDescription: String
        """Another description."""
        noBlankLine: String
        # Comment
        """Having a comment before you is no excuse."""
        badCommentedLine: String

        # Comment
        """But this is ok."""
        commentedLine: String
      }
    `,
      [
        {
          message:
            'The field `A.noBlankLine`s description should have a blank line before it.',
          locations: [{ line: 5, column: 9 }],
        },
        {
          message:
            'The field `A.badCommentedLine`s description should have a blank line before it.',
          locations: [{ line: 8, column: 9 }],
        },
      ]
    );
  });

  it('enforces triple-quotes for descriptions', () => {
    expectFailsRule(
      FieldsHaveDescriptions,
      `
      type A {
        "Description has single quotes."
        single: String
      }
    `,
      [
        {
          message:
            'The field `A.single`s description should use triple-quotes.',
          locations: [{ line: 3, column: 9 }],
        },
        {
          message:
            'The field `A.single`s description should use triple-quotes.',
          locations: [{ line: 3, column: 40 }],
        },
      ]
    );
  });

  it('catches fields that have a blank line in the description', () => {
    expectFailsRule(
      FieldsHaveDescriptions,
      `
      type A {
        """Description.

        Description has a blank line.
        
        And then it has another one!
        For shame.
        """
        withDescription: String
      }
    `,
      [
        {
          message:
            'The field `A.withDescription`s description should not include a blank line.',
          locations: [{ line: 4, column: 1 }],
        },
        {
          message:
            'The field `A.withDescription`s description should not include a blank line.',
          locations: [{ line: 6, column: 1 }],
        },
      ]
    );
  });

  it('verifies leading triple-quote', () => {
    expectFailsRule(
      FieldsHaveDescriptions,
      `
      type A {
        """
        Leading triple-quote should be on the same line."""
        singleLine: String

        """
        Leading triple-quote should be on the same line.
        """
        singleLine2: String

        """
        Leading triple-quote should be on the same line.
        Don't you agree?
        """
        multiLine: String
      }
    `,
      [
        {
          message:
            'The field `A.singleLine`s description should not put the leading triple-quote on its own line.',
          locations: [{ line: 3, column: 9 }],
        },
        {
          message:
            'The field `A.singleLine2`s description should not put the leading triple-quote on its own line.',
          locations: [{ line: 7, column: 9 }],
        },
        {
          message:
            'The field `A.singleLine2`s description should not put the trailing triple-quote on its own line.',
          locations: [{ line: 9, column: 9 }],
        },
        {
          message:
            'The field `A.multiLine`s description should not put the leading triple-quote on its own line.',
          locations: [{ line: 12, column: 9 }],
        },
      ]
    );
  });

  it('verifies trailing triple-quote', () => {
    expectFailsRule(
      FieldsHaveDescriptions,
      `
      type A {
        """Trailing quotes should be on the same line.
        """
        singleLine: String

        """Trailing quotes should be on their own line.
        Don't you agree?"""
        multiLine: String
      }
    `,
      [
        {
          message:
            'The field `A.singleLine`s description should not put the trailing triple-quote on its own line.',
          locations: [{ line: 4, column: 9 }],
        },
        {
          message:
            'The field `A.multiLine`s description should put the trailing triple-quote on its own line.',
          locations: [{ line: 8, column: 25 }],
        },
      ]
    );
  });

  it('does not require a docstring for deprecated fields', () => {
    expectPassesRuleWithConfiguration(
      FieldsHaveDescriptions,
      `
      type A {
        field: String @deprecated(reason: "To test deprecation")
      }
    `,
      { commentDescriptions: true }
    );
  });

  it('does not require a docstring for interface fields', () => {
    expectFailsRule(
      FieldsHaveDescriptions,
      `
      interface I {
        """This field is documented."""
        interfaceField: String
      }

      interface I2 {
        """This field is documented."""
        otherInterfaceField: String
      }

      interface I3 {
        """This field is documented."""
        unimplementedField: String
      }

      type A implements I & I2 {
        interfaceField: String
        otherInterfaceField: String

        otherField: String
        unimplementedField: String
      }
    `,
      [
        {
          message: 'The field `A.otherField`s description is missing.',
          locations: [{ line: 21, column: 9 }],
        },
        {
          message: 'The field `A.unimplementedField`s description is missing.',
          locations: [{ line: 22, column: 9 }],
        },
      ]
    );
  });

  it('gets descriptions correctly with commentDescriptions option', () => {
    expectPassesRuleWithConfiguration(
      FieldsHaveDescriptions,
      `
      type A {
        """Description"""
        withDescription: String

        """A single-line description."""
        singleLine: String

        """A multi-line description.
        This is line two.
        """
        multiLine: String
      }
    `,
      { commentDescriptions: true }
    );
  });
});
