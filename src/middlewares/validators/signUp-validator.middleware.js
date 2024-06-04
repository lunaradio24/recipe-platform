import Joi from 'joi';

const schema = Joi.object({
  email: Joi.string()
    .required()
    .email()
    .messages({ 'any.required': '이메일을 입력해주세요', 'string.email': '이메일 형식이 올바르지 않습니다.' }),
  password: Joi.string()
    .required()
    .min(8)
    .messages({ 'any.required': '비밀번호를 입력해 주세요.', 'string.min': '비밀번호는 8자리 이상이어야 합니다.' }),
  confirmPassword: Joi.string().required().messages({ 'any.required': '비밀번호 확인을 입력해 주세요.' }),
  username: Joi.string().required().messages({ 'any.required': '이름을 입력해 주세요.' }),
});

export const signUpValidator = async (req, res, next) => {
  try {
    await schema.validateAsync(req.body);
    next();
  } catch (error) {
    next(error);
  }
};
