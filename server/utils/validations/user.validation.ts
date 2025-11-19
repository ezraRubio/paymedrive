import Joi from 'joi';
import { UserTier } from '../../models/user.model';

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

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 100 characters',
  }),
});

export const upgradeTierSchema = Joi.object({
  tier: Joi.string()
    .valid(...Object.values(UserTier))
    .required()
    .messages({
      'any.only': 'Invalid tier. Must be one of: free, pro, unlimited',
      'any.required': 'Tier is required',
    }),
});

export const validate = (schema: Joi.ObjectSchema) => {
  return <T = unknown>(data: T) => {
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
