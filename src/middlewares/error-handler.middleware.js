import { HTTP_STATUS } from '../constants/http-status.constant.js';

const errorHandler = (err, req, res, next) => {
  switch (err.name) {
    // JWT verify method에서 발생한 에러 처리
    case 'TokenExpiredError':
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ status: HTTP_STATUS.UNAUTHORIZED, message: '인증 정보가 만료되었습니다.' });
    case 'JsonWebTokenError':
      return res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json({ status: HTTP_STATUS.UNAUTHORIZED, message: '인증 정보가 유효하지 않습니다.' });

    // CustomError로 받은 에러 처리
    case 'CustomError':
      return res.status(err.code).json({ status: err.code, message: err.message });

    // Joi로 발생한 에러 처리
    case 'ValidationError':
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ status: HTTP_STATUS.BAD_REQUEST, message: err.message });

    // Prisma에서 발생한 에러 처리
    case 'PrismaClientInitializationError':
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: HTTP_STATUS.BAD_REQUEST,
        message: 'Prisma client 초기화에 문제가 발생했습니다.',
      });

    case 'PrismaClientKnownRequestError':
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ status: HTTP_STATUS.BAD_REQUEST, message: err.message });

    case 'PrismaClientUnknownRequestError':
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        message: '데이터베이스 측에서 알 수 없는 에러가 발생했습니다.',
      });

    case 'PrismaClientValidationError':
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: HTTP_STATUS.BAD_REQUEST,
        message: '데이터 필드에 잘못된 타입이 입력되었습니다',
      });

    // 그 밖의 에러 처리
    default:
      return res
        .status(err.code || HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json({ message: err.message ?? '예상치 못한 에러가 발생했습니다. 관리자에게 문의해 주세요.' });
  }
};

export default errorHandler;
