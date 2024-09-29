import type { JSONSchema7 } from 'json-schema';

/**
 * 扩展点 schema
 */
const ContributionPointDefinitionSchema: JSONSchema7 = {
  type: 'object',
  properties: {
    name: {
      type: 'string'
    },

    definitionSchema: {
      type: 'object'
    }
  }
}

/**
 * manifest schema
 */
export const ExpansionManifestSchema: JSONSchema7 = {
  type: 'object',
  properties: {

    name: {
      type: 'string'
    },

    publisher: {
      type: 'string'
    },

    version: {
      type: 'string'
    },

    dependencies: {
      type: 'object',
      additionalProperties: {
        type: 'string'
      }
    },

    main: {
      type: 'string'
    },

    activationEvents: {
      type: 'array',
      items: {
        type: 'string'
      }
    },

    deactivationEvents: {
      type: 'array',
      items: {
        type: 'string'
      }
    },

    contributes: {
      type: 'object'
    },

    contributionPoints: {
      type: 'array',
      items: ContributionPointDefinitionSchema
    }

  }
};
