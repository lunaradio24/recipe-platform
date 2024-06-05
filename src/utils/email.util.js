import nodemailer from 'nodemailer';
import { EMAIL_USER, EMAIL_PASS, CLIENT_URL } from '../constants/auth.constant.js';

export const sendVerificationEmail = async (email, token) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  // 이메일 발송 옵션
  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: '이메일 인증을 완료해주세요',
    html: `<p>이메일 인증을 위해 <a href="${CLIENT_URL}/verify-email?token=${token}">여기</a>를 클릭해주세요.
  해당 인증은 9시간이 지나면 폐기됩니다.</p>`,
  };
  // 이메일 발송
  await transporter.sendMail(mailOptions);
};
