import jwt from "jsonwebtoken";
import { env } from "../../config/env.service.js";
import { BadRequestException } from "../exciptions/error.exciptions.js";

export const auth = async (req, res, next) => {
  //   console.log(req.headers.authorization);
  if (!req.headers.authorization) {
    BadRequestException({
      message: "token not Found",
    });
  }
  let [flag, token] = req.headers.authorization.split(" ");
  //   console.log({ flag, token });
  switch (flag) {
    case "Basic":
      const basicData = Buffer.from(token, "base64").toString("ascii");
      let [email, password] = basicData.split(":");
      console.log({ email, password });
      break;
    case "Bearer":
      let deCoded = await jwt.decode(token);
      let sign;
      switch (deCoded.aud) {
        case "user":
          sign = env.accessSignUser;

          break;
        case "admin":
          sign = env.accessSignAdmin;

          break;
        default:
          break;
      }
      let verify = await jwt.verify(token, sign);
      console.log(verify);
      if (verify) {
        req.user = verify;
        next();
      } else {
        return BadRequestException({ message: "Invalid token" });
      }
      break;
  }

  //   req.user = deCoded;
  //   console.log(req.user.id);
  //   next();
};
