// src/server.ts
import app from "./app.js";
import { envConfig } from "./config/env.js";

const PORT = envConfig.port || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
