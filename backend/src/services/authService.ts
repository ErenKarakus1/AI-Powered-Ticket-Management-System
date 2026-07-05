import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getPrisma } from "../config/prisma.js";
import { env } from "../config/env.js";

type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

type LoginInput = {
  email: string;
  password: string;
};

const createToken = (userId: string, role: string) => {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is required");
  }

  return jwt.sign({ userId, role }, env.jwtSecret, { expiresIn: "1d" });
};

const toPublicUser = (user: {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

export const registerUser = async (input: RegisterInput) => {
  const prisma = getPrisma();
  const email = input.email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return {
      error: "Email is already registered"
    };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash
    }
  });

  return {
    user: toPublicUser(user),
    token: createToken(user.id, user.role)
  };
};

export const loginUser = async (input: LoginInput) => {
  const prisma = getPrisma();
  const email = input.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    return {
      error: "Invalid email or password"
    };
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    return {
      error: "Invalid email or password"
    };
  }

  return {
    user: toPublicUser(user),
    token: createToken(user.id, user.role)
  };
};
