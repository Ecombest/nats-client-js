const Validator = require("fastest-validator");

const v = new Validator({ useNewCustomCheckerFunction: true });

const validate = (schema: any, payload: any) => {
  const check = v.compile({ $$strict: true, ...schema });
  let payloadErrors = check(payload);
  if (payloadErrors instanceof Array) {
    throw new Error(payloadErrors[0]?.message);
  }
  return true;
};

export default validate;
