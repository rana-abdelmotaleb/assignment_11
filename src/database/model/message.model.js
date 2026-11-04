import mongoose, { Schema, Types } from "mongoose";

const messageSchema = Schema(
  {
    content: {
      type: String,
      required: true,
      max: 50,
      min: 3,
    },
    reciverId: {
      type: Types.ObjectId,
      required: true,
      ref: "user",
    },
    messageImage: {
      type: String,
      required: false,
    },
  },
  { timestamps: true },
);

export const messageModel = mongoose.model("message", messageSchema);
