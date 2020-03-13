/**
 * Module dependencies
 */
const actionUtil = require("./_util/actionUtil");

/**
 * Find One Record
 *
 * get /:modelIdentity/:id
 *
 * An API call to find and return a single model instance from the data adapter
 * using the specified id.
 *
 * Required:
 * @param {Integer|String} id  - the unique id of the particular instance you'd like to look up *
 *
 */

module.exports = function findOneRecord(req, res) {
  let Model = actionUtil.parseModel(req);
  let pk = actionUtil.requirePk(req);

  let query = Model.findOne(pk);

  // populate as required
  actionUtil.populateEach(req, query);

  query.exec((err, matchingRecord) => {
    if (err) return res.serverError(err);

    if (!matchingRecord)
      return res.notFound("No record found with the specified id.");

    if (req._sails.hooks.pubsub && req.isSocket) {
      Model.subscribe(req, matchingRecord);
      actionUtil.subscribeDeep(req, matchingRecord);
    }

    return res.ok(matchingRecord);
  });
};
