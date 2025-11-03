import fs from "fs";
import jsonServer from "json-server";
import logger from "./lib/logger.js";

import { dirname, join } from "path";
import { fileURLToPath } from "url";

const server = jsonServer.create();
const middlewares = jsonServer.defaults();

server.use(jsonServer.bodyParser);

server.use("/api/write-log", (req, res) => {
  const { level, message, status } = req.body;

  if (!level || !message) {
    return res.status(400).json({ error: "Level and message are required" });
  }

  logger.log(message, status);
  res.status(201).json({ message: "Log written successfully" });
});

server.use("/api/logs", async (req, res) => {
  try {
    console.log(req);
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const LOG_FILE = join(__dirname, "./logs.json");

    // Extract from and to query parameters
    const { from, to } = req.query;

    res.setHeader("Content-Type", "application/json");

    // Parse timestamps for filtering (handle null/undefined strings)
    const isValidParam = (param) =>
      param && param !== "null" && param !== "undefined";

    const fromTime = isValidParam(from) ? new Date(from).getTime() : null;
    const toTime = isValidParam(to) ? new Date(to).getTime() : null;

    // If no filtering needed, stream the entire file directly
    if (!fromTime && !toTime) {
      const stream = fs.createReadStream(LOG_FILE, {
        encoding: "utf-8",
        flags: "r",
      });

      stream.pipe(res);

      stream.on("error", (err) => {
        logger.error("Error streaming log file:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal Server Error" });
        }
      });

      return;
    }

    // For filtered logs, read and parse in chunks
    const fileStream = fs.createReadStream(LOG_FILE, { encoding: "utf-8" });
    let buffer = "";
    let isFirstLog = true;
    let arrayStarted = false;

    fileStream.on("data", (chunk) => {
      buffer += chunk;

      // Try to parse complete JSON
      try {
        const logsArray = JSON.parse(buffer);

        // Logs should be a direct array
        if (!Array.isArray(logsArray)) {
          throw new Error("Logs must be an array");
        }

        // Start response - write opening bracket
        if (!arrayStarted) {
          res.write("[");
          arrayStarted = true;
        }

        // Filter and stream logs
        logsArray.forEach((log) => {
          if (!log.timestamp) return;

          const logTime = new Date(log.timestamp).getTime();
          const passesFilter =
            (!fromTime || logTime >= fromTime) &&
            (!toTime || logTime <= toTime);

          if (passesFilter) {
            if (!isFirstLog) {
              res.write(",");
            }
            res.write(JSON.stringify(log));
            isFirstLog = false;
          }
        });

        // Clear buffer after processing
        buffer = "";
      } catch (err) {
        // JSON not complete yet, continue accumulating
      }
    });

    fileStream.on("end", () => {
      if (arrayStarted) {
        // Close the array
        res.write("]");
      } else {
        // No logs matched or no array started, return empty array
        res.write("[]");
      }

      res.end();
    });

    fileStream.on("error", (err) => {
      logger.error("Error reading log file:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error" });
      } else {
        res.end();
      }
    });
  } catch (err) {
    logger.error("Error processing logs:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

const PORT = process.env.API_PORT || 4000;
server.listen(PORT, () => {
  logger.log(`JSON Server running on PORT ${PORT}`);
});

server.use(middlewares);
