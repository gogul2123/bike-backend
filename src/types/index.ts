// User type
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: "admin" | "user";
  createdAt: Date;
}

// JWT Payload type
export interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "user";
  exp: number;
}

// Generic API Response type
export interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  message?: string;
}

// Extend NodeJS.ProcessEnv for env vars
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string;
      JWT_SECRET: string;
      NODE_ENV?: "development" | "production" | "test";
    }
  }
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
