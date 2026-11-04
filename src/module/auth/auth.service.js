import { env } from "../../config/env.service.js";
import { userModel } from "../../database/model/user.model.js";
import bycript from "bcrypt";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { randomInt } from "crypto";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "../../common/exciptions/error.exciptions.js";
import {
  generateNewAccessToken,
  generateToken,
} from "../../common/service/token.service.js";
import { sendEmail } from "../../common/middleware/sendEmail.js";
import {
  get,
  set,
  del,
  incr,
  ttl,
  expire,
} from "../../database/redis/redis.service.js";
//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<signUp>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
export const signUp = async (body, file) => {
  let { userName, email, password, confirmPassword, gender, role, uniqueName } =
    body;
  let profileImage;
  if (password !== confirmPassword) {
    return BadRequestException({
      message: "Password and confirm password do not match",
    });
  }
  if (file) {
    profileImage = file.path;
  }
  let userData = await userModel.findOne({ uniqueName });
  if (userData) {
    return ConflictException({ message: "Unique name already exists" });
  }
  let exits = await userModel.findOne({ email });

  if (!exits) {
    let hashPassword = await bycript.hash(password, Number(env.salt));
    // let hashPassword = await argon2.hash(password);
    let otp = Math.round(Math.random() * 1000000);
    let data = await userModel.create({
      userName,
      email,
      password: hashPassword,
      gender,

      ...(role && { role }),
      profileImage: profileImage,
      uniqueName,
    });
    await set(`otp::${data._id}`, otp, 60);
    console.log(`otp::${data._id}`);

    if (hashPassword) {
      await sendEmail({
        to: email,
        subject: "signup otp",
        html: `<h1>your otp is ${otp}</h1>`,
      });

      return { message: "User created successfully", data };
    }
  } else {
    return ConflictException({ message: "User already exists" });
  }
};
//<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<signIn>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

export const signIn = async (body) => {
  const { email, password } = body;

  const data = await userModel.findOne({ email });

  if (!data) {
    return NotFoundException({ message: "User not found" });
  }

  const userId = data._id.toString();

  const attemptsKey = `login:attempts::${userId}`;
  const lockKey = `login:locked::${userId}`;

  // 1. Check account lock
  const remainingTime = await ttl(lockKey);

  if (remainingTime > 0) {
    return UnauthorizedException({
      message: `Account locked. Try again after ${remainingTime} seconds`,
    });
  }

  // 2. Check password
  const isMatch = await bycript.compare(password, data.password);

  if (!isMatch) {
    const attempts = await incr(attemptsKey);

    // Keep attempts for 24 hours
    if (attempts === 1) {
      await expire(attemptsKey, 86400);
    }

    // Lock account after 5 failed attempts
    if (attempts >= 5) {
      await set(lockKey, "1", 300);
      await del(attemptsKey);

      return UnauthorizedException({
        message: "Too many failed attempts. Account locked for 5 minutes",
      });
    }

    return UnauthorizedException({
      message: `Invalid password. ${5 - attempts} attempts remaining`,
    });
  }

  // 3. Reset failed attempts after successful password
  await del(attemptsKey);

  // 4. Check if account is verified
  if (!data.isVerified) {
    return UnauthorizedException({
      message: "Please verify your account first",
    });
  }

  // 5. Check if Two-Step Verification is enabled
  if (data.isTwoStepVerificationEnabled) {
    const otp = randomInt(100000, 1000000);

    const otpKey = `2fa:login:otp::${userId}`;

    await set(otpKey, String(otp), 300);

    await sendEmail({
      to: data.email,
      subject: "Login Verification Code",
      html: `<h1>Your login verification code is ${otp}</h1>`,
    });

    return {
      message: "Verification code sent to your email",
      requiresOtp: true,
    };
  }

  // 6. If 2FA is disabled, generate tokens directly
  const { accessToken, refreshToken } = await generateToken(data);

  return {
    message: "User logged in successfully",
    accessToken,
    refreshToken,
  };
};

export const getById = async (id) => {
  let data = await userModel.findById(id);
  if (data) {
    return { message: "User found", data };
  }
  return NotFoundException({ message: "User not found" });
};
export const generateAccessToken = async (body) => {
  let { refreshToken } = body;

  let accessToken = await generateNewAccessToken(refreshToken);
  if (accessToken) {
    return { message: "Access token generated successfully", accessToken };
  }
  return UnauthorizedException({ message: "Invalid refresh token" });
};

export const verifyAccount = async (body) => {
  let { otp, email } = body;
  let data = await userModel.findOne({ email });
  if (!data) {
    return NotFoundException({ message: "User not found" });
  }
  if (data.isVerified) {
    return BadRequestException({
      message: "user already verified",
    });
  }
  let redisOtp = await get(`otp::${data._id}`);

  if (redisOtp != otp) {
    return BadRequestException({
      message: "otp dont match",
    });
  }
  data.isVerified = true;
  await data.save();
  return data;
};
export const getAllUsers = async () => {
  let data = await userModel.find();
  return data;
};
// Enable Two-Step Verification
export const enableTwoStepVerification = async (userId) => {
  const data = await userModel.findById(userId);

  if (!data) {
    return NotFoundException({ message: "User not found" });
  }

  if (data.isTwoStepVerificationEnabled) {
    return BadRequestException({
      message: "Two-step verification is already enabled",
    });
  }

  const otp = randomInt(100000, 1000000);

  await set(`2fa:enable:otp::${userId}`, String(otp), 300);

  await sendEmail({
    to: data.email,
    subject: "Enable Two-Step Verification",
    html: `<h1>Your verification code is ${otp}</h1>`,
  });

  return {
    message: "Verification code sent to your email",
  };
};

// Verify OTP and Enable Two-Step Verification
export const verifyEnableTwoStepVerification = async (body, userId) => {
  const { otp } = body;

  const data = await userModel.findById(userId);

  if (!data) {
    return NotFoundException({ message: "User not found" });
  }

  if (data.isTwoStepVerificationEnabled) {
    return BadRequestException({
      message: "Two-step verification is already enabled",
    });
  }

  const redisOtp = await get(`2fa:enable:otp::${userId}`);

  if (!redisOtp || String(redisOtp) !== String(otp)) {
    return BadRequestException({
      message: "Invalid or expired OTP",
    });
  }

  data.isTwoStepVerificationEnabled = true;
  await data.save();

  await del(`2fa:enable:otp::${userId}`);

  return {
    message: "Two-step verification enabled successfully",
  };
};
// Verify Login OTP
export const verifyLoginOtp = async (body) => {
  const { email, otp } = body;

  const data = await userModel.findOne({ email });

  if (!data) {
    return NotFoundException({
      message: "User not found",
    });
  }

  if (!data.isVerified) {
    return UnauthorizedException({
      message: "Please verify your account first",
    });
  }

  if (!data.isTwoStepVerificationEnabled) {
    return BadRequestException({
      message: "Two-step verification is not enabled",
    });
  }

  const userId = data._id.toString();
  const otpKey = `2fa:login:otp::${userId}`;

  const redisOtp = await get(otpKey);

  if (!redisOtp || String(redisOtp) !== String(otp)) {
    return UnauthorizedException({
      message: "Invalid or expired OTP",
    });
  }

  // Delete OTP after successful verification
  await del(otpKey);

  const { accessToken, refreshToken } = await generateToken(data);

  return {
    message: "User logged in successfully",
    accessToken,
    refreshToken,
  };
};
