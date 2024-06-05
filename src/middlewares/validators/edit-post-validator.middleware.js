import Joi from 'joi';

// 즉 유효성 검사를 한 것이다.
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
