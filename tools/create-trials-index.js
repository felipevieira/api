/* eslint-disable no-console */
'use strict';

const client = require('../config').elasticsearch;
const Trial = require('../api/models/trial');
const Location = require('../api/models/location');

const trialMapping = {
  properties: {
    brief_summary: {
      type: 'string',
    },
    url: {
      type: 'string',
      index: 'not_analyzed',
    },
    id: {
      type: 'string',
      index: 'not_analyzed',
    },
    interventions: {
      properties: {
        attributes: {
          properties: {
            id: {
              type: 'string',
              index: 'not_analyzed',
            },
            name: {
              type: 'string',
              copy_to: 'intervention',
            },
          },
        },
      },
    },
    intervention: {
      type: 'string',
    },
    locations: {
      properties: {
        attributes: {
          properties: {
            id: {
              type: 'string',
              index: 'not_analyzed',
            },
            name: {
              type: 'string',
              copy_to: 'location',
            },
            type: {
              type: 'string',
              index: 'not_analyzed',
            },
          },
        },
        role: {
          type: 'string',
          index: 'not_analyzed',
        },
      },
    },
    location: {
      type: 'string',
    },
    problems: {
      properties: {
        attributes: {
          properties: {
            id: {
              type: 'string',
              index: 'not_analyzed',
            },
            name: {
              type: 'string',
              copy_to: 'problem',
            },
          },
        },
      },
    },
    problem: {
      type: 'string',
    },
    persons: {
      properties: {
        attributes: {
          properties: {
            id: {
              type: 'string',
              index: 'not_analyzed',
            },
            name: {
              type: 'string',
            },
            type: {
              type: 'string',
              index: 'not_analyzed',
            },
          },
        },
        role: {
          type: 'string',
          index: 'not_analyzed',
        },
      },
    },
    organisations: {
      properties: {
        attributes: {
          properties: {
            id: {
              type: 'string',
              index: 'not_analyzed',
            },
            name: {
              type: 'string',
            },
            type: {
              type: 'string',
              index: 'not_analyzed',
            },
          },
        },
        role: {
          type: 'string',
          index: 'not_analyzed',
        },
      },
    },
    public_title: {
      type: 'string',
    },
    registration_date: {
      type: 'date',
      format: 'dateOptionalTime',
    },
  },
};

const locationMapping = {
  properties: {
    id: {
      type: 'string',
      index: 'not_analyzed',
    },
    name: {
      type: 'string',
      index_analyzer: 'autocomplete',
      search_analyzer: 'standard',
    },
    type: {
      type: 'string',
      index: 'not_analyzed',
    },
  },
}

const trialsIndex = {
  index: 'trials',
  body: {
    settings: {
      analysis: {
        filter: {
          autocomplete_filter: {
            type: 'edge_ngram',
            min_gram: 1,
            max_gram: 20,
          },
        },
        analyzer: {
          autocomplete: {
            type: 'custom',
            tokenizer: 'standard',
            filter: [
              'lowercase',
              'autocomplete_filter',
            ],
          },
        },
      },
    },
    mappings: {
      trial: trialMapping,
      location: locationMapping,
    },
  },
};

function bulkIndexEntities(entities, indexType) {
  if (entities.length === 0) {
    return undefined;
  }

  const bulkBody = entities.models.reduce((result, entity) => {
    const action = {
      index: {
        _index: 'trials',
        _type: indexType,
        _id: entity.id,
      },
    };
    return result.concat([action, entity.toJSON()]);
  }, []);

  return client.bulk({
    body: bulkBody,
  });
}

function indexModel(model, indexType, fetchOptions) {
  return model.count().then((modelCount) => {
    const bufferLength = 1000;
    console.info(`${modelCount} entities being indexed in "${indexType}" (${bufferLength} at a time).`);
    let offset = 0;
    let chain = Promise.resolve();

    do {
      const queryParams = {
        limit: bufferLength,
        offset,
      };

      chain = chain
        .then(() => model.query(queryParams).fetchAll(fetchOptions))
        .then((entities) => bulkIndexEntities(entities, indexType))
        .then((resp) => {
          console.info(`${resp.items.length} successfully reindexed.`);
        });

      offset = offset + bufferLength;
    } while (offset <= modelCount);

    return chain;
  });
}

client.indices.delete({ index: 'trials', ignore: 404 })
  .then(() => client.indices.create(trialsIndex))
  .then(() => indexModel(Trial, 'trial', { withRelated: Trial.relatedModels }))
  .then(() => indexModel(Location, 'location'))
  .then(() => process.exit())
  .catch((err) => {
    throw err;
  });
