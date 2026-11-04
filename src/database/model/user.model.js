import mongoose, { Schema } from "mongoose";
import { genderEnum, providerEnum, roleEnum } from "../../common/index.js";

const userSchema = Schema(
  {
    userName: {
      type: String,
      required: true,
      max: 50,
      min: 3,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: genderEnum,
      default: genderEnum.Male,
    },
    role: {
      type: String,
      enum: roleEnum,
      default: roleEnum.User,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    provider: {
      type: String,
      enum: providerEnum,
      default: providerEnum.system,
    },
    profileImage: {
      type: String,
    },
    uniqueName: {
      type: String,
      required: true,
      unique: true,
    },
    isTwoStepVerificationEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const userModel = mongoose.model("user", userSchema);
