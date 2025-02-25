import * as dotenv from 'dotenv';
dotenv.config();

export const jwtConstants = {
  secret: process.env.JWT_SECRET,
  CREDENTIALS_MAX_AGE_IN_SECONDS: 60 * 60,
};
