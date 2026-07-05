import type { Request, Response } from "express";
import { loginUser, registerUser } from "../services/authService.js";

const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

export const registerController = async (req: Request, res: Response) => {
  const { name, email, password } = req.body as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
  };

  if (!isString(name) || !isString(email) || !isString(password)) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();

  if (trimmedName.length < 2 || trimmedName.length > 80) {
    return res.status(400).json({ message: "Name must be between 2 and 80 characters" });
  }

  if (trimmedEmail.length < 5 || trimmedEmail.length > 120 || !trimmedEmail.includes("@")) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  if (password.length < 8 || password.length > 100) {
    return res.status(400).json({ message: "Password must be between 8 and 100 characters" });
  }

  try {
    const result = await registerUser({
      name: trimmedName,
      email: trimmedEmail,
      password
    });

    if (result.error) {
      return res.status(409).json({ message: result.error });
    }

    return res.status(201).json(result);
  } catch {
    return res.status(500).json({ message: "Registration failed" });
  }
};

export const loginController = async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: unknown;
    password?: unknown;
  };

  if (!isString(email) || !isString(password)) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail.length < 5 || trimmedEmail.length > 120 || !trimmedEmail.includes("@")) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  if (password.length < 8 || password.length > 100) {
    return res.status(400).json({ message: "Password must be between 8 and 100 characters" });
  }

  try {
    const result = await loginUser({
      email: trimmedEmail,
      password
    });

    if (result.error) {
      return res.status(401).json({ message: result.error });
    }

    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ message: "Login failed" });
  }
};
