import Joi from 'joi';

export const initiateAuthSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
});

export const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  otp: Joi.string()
    .length(parseInt(process.env.OTP_LENGTH || '6'))
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': `OTP must be ${process.env.OTP_LENGTH || 6} digits`,
      'string.pattern.base': 'OTP must contain only numbers',
      'any.required': 'OTP is required',
    }),
});

export const validate = (schema: Joi.ObjectSchema) => {
  return (data: any) => {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => detail.message);
      throw new Error(errors.join(', '));
    }

    return value;
  };
};
