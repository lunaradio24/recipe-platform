import Joi from 'joi';

const schema = Joi.object({
  title: Joi.string(),
  content: Joi.string(),
})
  .min(1)
  .message({
    'object.min': '수정할 내용을 입력해주세요.',
  });

export const editPostValidator = async (req, res, next) => {
  try {
    await schema.validateAsync(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
