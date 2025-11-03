import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOG_FILE = join(__dirname, "../logs.json");

// Ensure logs directory exists
const logDir = dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const getTimestamp = () => {
  const now = new Date();
  return now.toISOString(); // ISO format: 2025-11-03T10:30:00.000Z
};

const formatMessage = (level, message) => {
  return `[${getTimestamp()}] [${level}] ${message}`;
};

const writeToFile = (log) => {
  try {
    // construct log entry
    const messageObj = {
      timestamp: getTimestamp(),
      level: log.level,
      status: log.status || "N/A",
      message: log.message,
    };

    // read existing logs
    const existingLogs = fs.existsSync(LOG_FILE)
      ? JSON.parse(fs.readFileSync(LOG_FILE, "utf8"))
      : [];

    // store only the last 500 logs
    const logs = [
      ...existingLogs.reverse().slice(0, 488).reverse(),
      messageObj,
    ];

    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to write to log file:", err?.message || err);
  }
};

const logger = {
  log: (message, status) => {
    const level = "INFO";
    const formattedMessage = formatMessage(level, message);
    console.log(formattedMessage);

    writeToFile({ level, message, status });
  },
  error: (message, status) => {
    const level = "ERROR";
    const formattedMessage = formatMessage(level, message);
    console.error(formattedMessage);

    writeToFile({ level, message, status });
  },
  warn: (message, status) => {
    const level = "WARN";
    const formattedMessage = formatMessage(level, message);
    console.warn(formattedMessage);

    writeToFile({ level, message, status });
  },
  info: (message, status) => {
    const level = "INFO";
    const formattedMessage = formatMessage(level, message);
    console.info(formattedMessage);

    writeToFile({ level, message, status });
  },
};

export default logger;
