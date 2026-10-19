import { app } from "./app.js";
import { connectToDatabase, disconnectFromDatabase } from "./config/database.js";
import { env } from "./config/env.js";

async function startServer() {
  await connectToDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`Rescue Chat API listening on port ${env.PORT}.`);
  });

  const stop = async () => {
    server.close(async () => {
      await disconnectFromDatabase();
      process.exit(0);
    });
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

startServer().catch((error) => {
  console.error("Unable to start Rescue Chat API:", error.message);
  process.exit(1);
});
