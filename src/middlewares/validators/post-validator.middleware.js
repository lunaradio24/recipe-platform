import Joi from 'joi';

// 즉 유효성 검사를 한 것이다.
const schema = Joi.object({
  title: Joi.string().required().messages({
    'any.required': '제목의 내용을 입력해주세요.',
  }),

  content: Joi.string().required().messages({
    'any.required': '등록할 댓글의 내용을 입력해주세요.',
  }),

  //imageUrl: // ???? 이것도 여기다가 넣나?
});

export const postValidator = async (req, res, next) => {
  try {
    await schema.validateAsync(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
