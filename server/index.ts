import "dotenv/config";
import http from "http";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.json = function (bodyJson: any, ...args: any[]) {
    capturedJsonResponse = bodyJson;
    // @ts-ignore - keep original behavior
    return originalResJson.apply(res, [bodyJson, ...args]);
  } as typeof res.json;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        try {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } catch (_) {
          logLine += ` :: [unserializable response]`;
        }
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server: http.Server = await registerRoutes(app) as unknown as http.Server;

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // ensure we attempt to send a JSON response
      try {
        res.status(status).json({ message });
      } catch (sendErr) {
        // if sending fails, log and continue to throw
        log(`Error while sending error response: ${String(sendErr)}`);
      }

      // rethrow so that the outer error handlers / process can see it
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);

    // attach an error handler before calling listen so we can retry if needed
    let triedFallback = false;

    server.on("error", (err: any) => {
      // Helpful debug log
      log(`server error event: ${err?.code} - ${err?.message}`);

      // If the platform doesn't support the requested socket options, retry without them
      if (!triedFallback && (err.code === "ENOTSUP" || err.code === "EADDRNOTAVAIL")) {
        triedFallback = true;
        log("Attempting fallback: retrying listen on 127.0.0.1 without special options...");
        try {
          // close existing server if needed and retry. On some platforms the server is already
          // closed by the error; calling close then listen ensures a fresh attempt.
          server.close(() => {
            server.listen(port, "127.0.0.1", () => {
              log(`(fallback) serving on 127.0.0.1:${port}`);
            });
          });
        } catch (retryErr: any) {
          log(`Fallback retry failed: ${retryErr?.code} - ${retryErr?.message}`);
          process.exit(1);
        }
        return;
      }

      // For other errors or if fallback already attempted, exit with helpful message
      log(`Failed to bind server: ${err?.code} - ${err?.message}`);
      process.exit(1);
    });

    // Primary listen attempt: minimal options (no host/reusePort) — let Node pick best interface.
    server.listen(port, () => {
      log(`serving on port ${port}`);
    });

    // Also handle uncaught rejections and exceptions so we log them clearly
    process.on("unhandledRejection", (reason) => {
      log(`unhandledRejection: ${String(reason)}`);
    });
    process.on("uncaughtException", (ex) => {
      log(`uncaughtException: ${String(ex)}`);
      process.exit(1);
    });

  } catch (topErr) {
    log(`Fatal error during server startup: ${String(topErr)}`);
    process.exit(1);
  }
})();