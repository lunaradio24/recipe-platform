import Joi from 'joi';

const schema = Joi.object({
  content: Joi.string().max(191).required().messages({
    'any.required': '등록할 댓글의 내용을 입력해주세요.',
    'string.max': '댓글은 최대 191자까지 작성할 수 있습니다.',
  }),
});

export const commentValidator = async (req, res, next) => {
  try {
    await schema.validateAsync(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
