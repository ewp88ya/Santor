import jwt, {
  type SignOptions
} from "jsonwebtoken";

import { env } from "../../config/env.js";


const options: SignOptions = {
  expiresIn: "7d",
};


export function signToken(payload: object) {
  return jwt.sign(
    payload,
    env.JWT_SECRET,
    {
      ...options,
      expiresIn: env.JWT_EXPIRES as SignOptions["expiresIn"],
    }
  );
}


export function verifyToken(token: string) {
  return jwt.verify(
    token,
    env.JWT_SECRET
  );
}
