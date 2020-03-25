const actionUtil = require("./_util/actionUtil");

/**
 * Update One Record
 *
 * An API call to update a model instance with the specified `id`,
 * treating the other unbound parameters as attributes.
 *
 * @param {Integer|String} id  - the unique id of the particular record you'd like to update  (Note: this param should be specified even if primary key is not `id`!!)
 * @param *                    - values to set on the record
 *
 */
module.exports = async function updateOneRecord(req, res) {
  // Look up the model
  var Model = actionUtil.parseModel(req);

  // Locate and validate the required `id` parameter.
  var pk = actionUtil.requirePk(req);

  // Create `values` object (monolithic combination of all parameters)
  // But omit the blacklisted params (like JSONP callback param, etc.)
  var values = actionUtil.parseValues(req, Model);

  let beforeRecord = await Model.findOne(pk);
  // Find and update the targeted record.
  Model.update(pk, values).exec((err, records) => {
    // Differentiate between waterline-originated validation errors
    // and serious underlying issues. Respond with badRequest if a
    // validation error is encountered, w/ validation info.
    if (err) return res.negotiate(err);

    // Because this should only update a single record and update
    // returns an array, just use the first item.  If more than one
    // record was returned, something is amiss.
    if (!records || !records.length || records.length > 1) {
      req._sails.log.warn(
        "Unexpected output from `" + Model.globalId + ".update`."
      );
    }

    var updatedRecord = records[0];

    if (updatedRecord === undefined) {
      return res.notFound();
    }

    // If we have the pubsub hook, use the Model's publish method
    // to notify all subscribers about the update.
    if (req._sails.hooks.pubsub) {
      if (req.isSocket) {
        Model.subscribe(req, records);
      }
      Model.publishUpdate(pk, _.cloneDeep(values), !req.options.mirror && req, {
        previous: _.cloneDeep(beforeRecord.toJSON()),
      });
    }

    let query = Model.findOne(pk);
    query = actionUtil.populateEach(req, query);
    return query.exec((err, updatedRecord) => {
      if (err) {
        return res.negotiate(err);
      }

      // Let's update relationships if any
      if (req.body.data.relationships) {
        for (var name in req.body.data.relationships) {
          let relationships = req.body.data.relationships[name];

          if (_.isArray(updatedRecord[name])) {
            actionUtil.updateRelationship(updatedRecord, name, relationships);
          } else {
            if (relationships.data) {
              updatedRecord[name] = relationships.data.id;
            } else {
              updatedRecord[name] = null;
            }
          }
        }

        updatedRecord.save((err) => {
          query = Model.findOne(pk);
          query = actionUtil.populateEach(req, query);
          return query.exec((err, updatedRecord) => {
            if (err) {
              return res.negotiate(err);
            }
            return res.ok(updatedRecord);
          });
        });
      } else {
        return res.ok(updatedRecord);
      }
    });
  });
};
