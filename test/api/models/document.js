'use strict';

const _ = require('lodash');
const should = require('should');
const helpers = require('../../../api/helpers');
const Document = require('../../../api/models/document');

describe('Document', () => {
  before(clearDB);

  afterEach(clearDB);

  describe('toJSONSummary', () => {
    it('returns simplified document representation', () => {
      return factory.create('documentWithRelated')
        .then((doc) => {
          const attributes = doc.toJSON();
          const expected = {
            id: attributes.id,
            name: attributes.name,
            url: attributes.url,
            type: attributes.type,
            source_id: doc.attributes.source_id,
            source_url: doc.related('file').attributes.source_url,
            file: doc.related('file').toJSONSummary(),
            trials: doc.related('trials').map((t) => t.toJSONSummary()),
            fda_approval: doc.related('fda_approval').toJSON(),
          }

          doc.toJSONSummary().should.deepEqual(expected)
        });
    });

    it('doesn\'t return null or undefined values for documents without files', () => {
      return factory.create('document', { source_id: null, fda_approval_id: null, file_id: null })
        .then((doc) => {
          const jsonSummary = doc.toJSONSummary();
          const values = _.values(jsonSummary);

          should(values).not.containEql(null);
          should(values).not.containEql(undefined);
        })
    })

    it('doesn\'t return null or undefined values for documents with files', () => {
      return factory.create('documentWithFile', { source_id: null, fda_approval_id: null, source_url: null })
        .then((doc) => {
          const jsonSummary = doc.toJSONSummary();
          const values = _.values(jsonSummary);

          should(values).not.containEql(null);
          should(values).not.containEql(undefined);
        })
    })
  });

  describe('toJSONWithoutPages', () => {
    it('returns JSON removing files.pages', () => {
      return factory.create('documentWithRelated')
        .then((doc) => {
          const json = doc.toJSON();
          const jsonWithoutPages = doc.toJSONWithoutPages();

          should(json.file.pages).not.be.undefined();
          should(jsonWithoutPages.pages).be.undefined();

          delete json.file.pages;

          should(jsonWithoutPages).deepEqual(json);
        });
    });

    it('returns same as toJSON() if document has no file', () => {
      return factory.create('document', { file_id: null })
        .then((doc) => {
          should(doc.toJSONWithoutPages()).deepEqual(doc.toJSON());
        })
    });
  });

  describe('virtuals', () => {
    describe('url', () => {
      it('returns the url', () => (
        factory.build('document')
          .then((doc) => should(doc.toJSON().url).eql(helpers.urlFor(doc)))
      ));
    });
  });

  describe('serialize', () => {
    describe('trial', () => {
      it('is the trial\'s JSON summary', () => {
        return factory.create('documentWithRelated')
          .then((doc) => {
            const trialsJSONSummary = doc.related('trials').map((trial) => trial.toJSONSummary());
            should(doc.toJSON().trials).deepEqual(trialsJSONSummary);
          });
      });
    });

    it('returns source_url as file.source_url if it has a file', () => {
      return factory.create('documentWithRelated')
        .then((doc) => {
          const fileSourceUrl = doc.related('file').attributes.source_url;
          should(doc.toJSON().source_url).eql(fileSourceUrl);
        });
    });
  });
});
