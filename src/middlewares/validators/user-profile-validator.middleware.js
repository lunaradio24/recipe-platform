import Joi from 'joi';

const schema = Joi.object({
  introduction: Joi.string().max(191).messages({ 'string.max': '자기소개는 191자까지 작성할 수 있습니다.' }),
});

export const userProfileValidator = async (req, res, next) => {
  try {
    await schema.validateAsync(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
