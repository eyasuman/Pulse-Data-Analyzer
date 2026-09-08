import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// Banner images are sent as base64 JSON. A 5 MB decoded image expands to
// roughly 6.7 MB in transit, so leave enough room for the encoded payload.
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
