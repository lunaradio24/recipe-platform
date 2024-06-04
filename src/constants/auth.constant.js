export const JWT_ACCESS_KEY = process.env.JWT_ACCESS_KEY;
export const JWT_REFRESH_KEY = process.env.JWT_REFRESH_KEY;
export const SALT_ROUNDS = Number(process.env.SALT_ROUNDS);

export const REQUIRED_FIELDS_SIGNUP = ['email', 'password', 'confirmPassword', 'username'];
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN_LENGTH = 8;

export const EMAIL_USER = process.env.EMAIL_USER;

export const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
export const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
export const NAVER_CALLBACK_URI = process.env.NAVER_CALLBACK_URI;

export const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID;
export const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;
export const KAKAO_CALLBACK_URL = process.env.KAKAO_CALLBACK_URL;
