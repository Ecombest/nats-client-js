"use strict";

const FastestValidator = require("fastest-validator");

module.exports = { createValidateFunction };

const validator = new FastestValidator({
  useNewCustomCheckerFunction: true,
});

/**
 * @param {FastestValidator.ValidationSchema} schema
 * @returns {(data, opts?: { objectId?: string }) => Promise<void>}
 */
function createValidateFunction(schema) {
  const validate = validator.compile(buildFinalSchema(schema));

  return function (data, { objectId } = {}) {
    const meta = { objectId };
    const errors = validate(data, { meta });
    if (errors instanceof Array) throw new Error(errors[0].message);
    removeUndefinedFieldsRecursively(data);
  };
}

/**
 * @param {FastestValidator.ValidationSchema} schema
 * @returns {FastestValidator.ValidationSchema}
 */
function buildFinalSchema(schema) {
  const finalSchema = { $$strict: true, ...schema };

  return finalSchema;
}

const isUndefined = (val) => val === undefined;
const isPlainObject = (val) => val && val.constructor.name == "Object";

function removeUndefinedFieldsRecursively(obj) {
  for (const [field, val] of Object.entries(obj)) {
    if (isUndefined(val)) delete obj[field];
    else if (isPlainObject(val)) removeUndefinedFieldsRecursively(val);
  }
}
