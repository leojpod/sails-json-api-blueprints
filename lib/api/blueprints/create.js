/**
 * Module dependencies
 */
const actionUtil = require("./_util/actionUtil");

/**
 * Create Record
 *
 * post /:modelIdentity
 *
 * An API call to create and return a single model instance from the data adapter
 * using the specified criteria.
 *
 */
module.exports = function createRecord(req, res) {
  let Model = actionUtil.parseModel(req);
  let data = actionUtil.parseValues(req, Model);

  // Create new instance of model using data from params
  Model.create(data).exec((err, newInstance) => {
    if (err) return res.negotiate(err);

    let Q = Model.findOne(newInstance[Model.primaryKey]);
    Q.exec((err, newRecord) => {
      if (err) {
        return res.negotiate(err);
      }
      // If we have the pubsub hook, use the model class's publish method
      // to notify all subscribers about the created item
      if (req._sails.hooks.pubsub) {
        if (req.isSocket) {
          Model.subscribe(req, newInstance);
          Model.introduce(newInstance);
        }
        // Make sure data is JSON-serializable before publishing
        let publishData = _.isArray(newInstance)
          ? _.map(newInstance, function(instance) {
              return instance.toJSON();
            })
          : newInstance.toJSON();
        Model.publishCreate(publishData, !req.options.mirror && req);
      }
      return res.created(newRecord);
    });
  });
};
