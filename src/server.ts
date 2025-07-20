// src/server.ts
import app from "./app";
import { envConfig } from "./config/env";

const PORT = envConfig.port || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
