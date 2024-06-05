import Joi from 'joi';

const schema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({ 'any.required': '이메일을 입력해 주세요.', 'string.email': '이메일 형식이 올바르지 않습니다.' }),
  password: Joi.string().required().messages({ 'any.required': '비밀번호를 입력해 주세요.' }),
});

export const signInValidator = async (req, res, next) => {
  try {
    await schema.validateAsync(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
