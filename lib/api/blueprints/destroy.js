/**
 * Module dependencies
 */
const actionUtil = require("./_util/actionUtil");

/**
 * Destroy One Record
 *
 * delete  /:modelIdentity/:id
 *
 * Destroys the single model instance with the specified `id` from
 * the data adapter for the given model if it exists.
 *
 * Required:
 * @param {Integer|String} id  - the unique id of the particular instance you'd like to delete
 *
 */
module.exports = function destroyOneRecord(req, res) {
  let Model = actionUtil.parseModel(req);
  let pk = actionUtil.requirePk(req);

  let query = Model.findOne(pk);
  query.exec((err, record) => {
    if (err) return res.serverError(err);
    if (!record) return res.notFound("No record found with the specified id.");

    return Model.destroy(pk).exec(err => {
      if (err) return res.negotiate(err);

      if (req._sails.hooks.pubsub) {
        Model.publishDestroy(pk, !req._sails.config.blueprints.mirror && req, {
          previous: record
        });
        if (req.isSocket) {
          Model.unsubscribe(req, record);
          Model.retire(record);
        }
      }

      return res.json({ meta: {} });
    });
  });
};
