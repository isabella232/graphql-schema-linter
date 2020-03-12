import { TypesHaveDescriptions } from '../../src/rules/types_have_descriptions';
import {
  expectFailsRule,
  expectPassesRule,
  expectPassesRuleWithConfiguration,
} from '../assertions';

describe('TypesHaveDescriptions rule', () => {
  it('catches enum types that have no description', () => {
    expectFailsRule(
      TypesHaveDescriptions,
      `
      """
      A
      """
      enum A {
        A
      }

      enum STATUS {
        DRAFT
        PUBLISHED
        HIDDEN
      }
    `,
      [
        {
          message: 'The enum type `STATUS`s description is missing.',
          locations: [{ line: 9, column: 7 }],
        },
      ]
    );
  });

  it('allows scalar types not to have descriptions', () => {
    expectPassesRule(
      TypesHaveDescriptions,
      `
      """
      A
      """
      scalar A

      scalar DateTime
    `
    );
  });

  it('catches object types that have no description', () => {
    expectFailsRule(
      TypesHaveDescriptions,
      `
      type A {
        a: String
      }

      """
      B
      """
      type B {
        b: String
      }
    `,
      [
        {
          message: 'The object type `A`s description is missing.',
          locations: [{ line: 2, column: 7 }],
        },
      ]
    );
  });

  it('catches input types that have no description', () => {
    expectFailsRule(
      TypesHaveDescriptions,
      `
      input AddStar {
        id: ID!
      }

      """
      RemoveStar
      """
      input RemoveStar {
        id: ID!
      }
    `,
      [
        {
          message: 'The input object type `AddStar`s description is missing.',
          locations: [{ line: 2, column: 7 }],
        },
      ]
    );
  });

  it('catches interface types that have no description', () => {
    expectFailsRule(
      TypesHaveDescriptions,
      `
      """
      B
      """
      interface B {
        B: String
      }

      interface A {
        a: String
      }
    `,
      [
        {
          message: 'The interface type `A`s description is missing.',
          locations: [{ line: 9, column: 7 }],
        },
      ]
    );
  });

  it('catches union types that have no description', () => {
    expectFailsRule(
      TypesHaveDescriptions,
      `
      """
      A
      """
      type A {
        a: String
      }

      """
      B
      """
      type B {
        b: String
      }

      union AB = A | B

      """
      BA
      """
      union BA = B | A
    `,
      [
        {
          message: 'The union type `AB`s description is missing.',
          locations: [{ line: 16, column: 7 }],
        },
      ]
    );
  });

  it('ignores type extensions', () => {
    expectPassesRule(
      TypesHaveDescriptions,
      `
      extend type Query {
        b: String
      }

      """
      Interface
      """
      interface Vehicle {
        make: String!
      }

      extend interface Vehicle {
        something: String!
      }
    `
    );
  });

  it('requires a blank line before the description', () => {
    expectFailsRule(
      TypesHaveDescriptions,
      `
      """
      A
      """
      type A {
        a: String
      }
      """
      B -- needs a blank line!
      """
      type B {
        a: String
      }
      # Having a comment before it is not a help.
      """
      C
      """
      type C {
        a: String
      }

      """
      But this is ok.
      """
      type D {
        a: String
      }
    `,
      [
        {
          message:
            'The object type `B`s description should have a blank line before it.',
          locations: [{ line: 8, column: 7 }],
        },
        {
          message:
            'The object type `C`s description should have a blank line before it.',
          locations: [{ line: 15, column: 7 }],
        },
      ]
    );
  });

  it('enforces triple-quotes for descriptions', () => {
    expectFailsRule(
      TypesHaveDescriptions,
      `
      "Description has single quotes."
      type A {
        a: String
      }
    `,
      [
        {
          message: 'The object type `A`s description should use triple-quotes.',
          locations: [{ line: 2, column: 7 }],
        },
        {
          message: 'The object type `A`s description should use triple-quotes.',
          locations: [{ line: 2, column: 38 }],
        },
        {
          message:
            'The object type `A`s description should put the leading triple-quote on its own line.',
          locations: [{ line: 2, column: 7 }],
        },
        {
          message:
            'The object type `A`s description should put the trailing triple-quote on its own line.',
          locations: [{ line: 2, column: 36 }],
        },
      ]
    );
  });

  it('enforces one-line firstlines in the description', () => {
    expectFailsRule(
      TypesHaveDescriptions,
      `
      """
      This is a type that does
      not respect the one-line rule.
      """
      type A {
        a: String
      }

      """
      This type does
      not either.

      Having a blank line later is not enough.
      """
      type B {
        a: String
      }

      """
      This type is ok.
      """
      type C {
        a: String
      }

      """
      And this type is too.

      The blank line here is what you want.
      """
      type D {
        a: String
      }
    `,
      [
        {
          message:
            'The object type `A`s description should have a one-line firstline, then optionally a blank line followed by other text.',
          locations: [{ line: 2, column: 7 }],
        },
        {
          message:
            'The object type `B`s description should have a one-line firstline, then optionally a blank line followed by other text.',
          locations: [{ line: 10, column: 7 }],
        },
      ]
    );
  });

  it('verifies leading triple-quote', () => {
    expectFailsRule(
      TypesHaveDescriptions,
      `
      """This type should get its quotes right!
      """
      type A {
        a: String
      }
    `,
      [
        {
          message:
            'The object type `A`s description should put the leading triple-quote on its own line.',
          locations: [{ line: 2, column: 7 }],
        },
      ]
    );
  });

  it('verifies trailing triple-quote', () => {
    expectFailsRule(
      TypesHaveDescriptions,
      `
      """
      This type should get its quotes right!"""
      type A {
        a: String
      }

      """This type should too!"""
      type B {
        a: String
      }
    `,
      [
        {
          message:
            'The object type `A`s description should put the trailing triple-quote on its own line.',
          locations: [{ line: 3, column: 45 }],
        },
        {
          message:
            'The object type `B`s description should put the leading triple-quote on its own line.',
          locations: [{ line: 8, column: 7 }],
        },
        {
          message:
            'The object type `B`s description should put the trailing triple-quote on its own line.',
          locations: [{ line: 8, column: 31 }],
        },
      ]
    );
  });

  it('gets descriptions correctly with commentDescriptions option', () => {
    expectPassesRuleWithConfiguration(
      TypesHaveDescriptions,
      `
      """
      A
      """
      scalar A

      """
      B
      """
      type B {
        b: String
      }

      """
      C
      """
      interface C {
        c: String
      }

      """
      D
      """
      union D = B

      """
      E
      """
      enum E {
        A
      }

      """
      F
      """
      input F {
        f: String
      }
    `,
      { commentDescriptions: true }
    );
  });
});
