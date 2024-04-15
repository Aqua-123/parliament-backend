import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  constituency: { type: String, required: true },
  sabha: { type: String, required: true },
  mothertongue: { type: String, required: true },
  password: { type: String, required: true },
});

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = bcrypt.hash(this.password, 8);
  }
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
