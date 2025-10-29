import Joi from 'joi';

export const uploadFileSchema = Joi.object({
  file: Joi.any().required().messages({
    'any.required': 'File is required',
  }),
});

export const fileIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid file ID format',
    'any.required': 'File ID is required',
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
