// src/server.ts
import app from "./app.js";
import { envConfig } from "./config/env.js";

const PORT = Number(envConfig.port) || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
