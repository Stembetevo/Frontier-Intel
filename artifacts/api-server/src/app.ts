import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

const app: Express = express();

// CORS — in production restrict to the deployed frontend origin.
// Set CORS_ORIGIN env var on Render to your Vercel URL,
// e.g. https://frontier-intel.vercel.app
// Multiple origins can be comma-separated: https://a.vercel.app,https://b.vercel.app
const rawOrigin = process.env.CORS_ORIGIN;

const allowedOrigins: string[] = rawOrigin
  ? rawOrigin.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, Render health checks)
      if (!origin) return callback(null, true);
      // In development (no CORS_ORIGIN set) allow everything
      if (allowedOrigins.length === 0) return callback(null, true);
      // In production only allow listed origins
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
