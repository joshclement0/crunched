/* eslint-disable no-undef */

const devCerts = require("office-addin-dev-certs");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const AGENT_REQUEST_LIMIT_BYTES = 5 * 1024 * 1024;

function requestIdFor(request) {
  const suppliedId = request.headers["x-request-id"];
  return typeof suppliedId === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(suppliedId)
    ? suppliedId
    : `agent-${crypto.randomUUID()}`;
}

function logAgentRequest(level, message, details) {
  console[level](`[agent] ${message}`, details);
}

function loadLocalServerEnvironment() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim();
  });
}

loadLocalServerEnvironment();

const urlDev = "https://localhost:3000/";
const urlProd = "https://www.contoso.com/"; // CHANGE THIS TO YOUR PRODUCTION DEPLOYMENT LOCATION

async function getHttpsOptions() {
  const httpsOptions = await devCerts.getHttpsServerOptions();
  return { ca: httpsOptions.ca, key: httpsOptions.key, cert: httpsOptions.cert };
}

module.exports = async (env, options) => {
  const dev = options.mode === "development";
  const config = {
    devtool: "source-map",
    entry: {
      polyfill: ["core-js/stable", "regenerator-runtime/runtime"],
      react: ["react", "react-dom"],
      taskpane: {
        import: ["./src/taskpane/index.tsx", "./src/taskpane/taskpane.html"],
        dependOn: "react",
      },
      commands: "./src/commands/commands.ts",
    },
    output: {
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".html", ".js"],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
          },
        },
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: ["ts-loader"],
        },
        {
          test: /\.html$/,
          exclude: /node_modules/,
          use: "html-loader",
        },
        {
          test: /\.(png|jpg|jpeg|ttf|woff|woff2|gif|ico)$/,
          type: "asset/resource",
          generator: {
            filename: "assets/[name][ext][query]",
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        filename: "taskpane.html",
        template: "./src/taskpane/taskpane.html",
        chunks: ["polyfill", "taskpane", "react"],
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: "assets/*",
            to: "assets/[name][ext][query]",
          },
          {
            from: "manifest*.xml",
            to: "[name]" + "[ext]",
            transform(content) {
              if (dev) {
                return content;
              } else {
                return content.toString().replace(new RegExp(urlDev, "g"), urlProd);
              }
            },
          },
        ],
      }),
      new HtmlWebpackPlugin({
        filename: "commands.html",
        template: "./src/commands/commands.html",
        chunks: ["polyfill", "commands"],
      }),
      new webpack.ProvidePlugin({
        Promise: ["es6-promise", "Promise"],
      }),
    ],
    devServer: {
      hot: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      server: {
        type: "https",
        options: env.WEBPACK_BUILD || options.https !== undefined ? options.https : await getHttpsOptions(),
      },
      port: process.env.npm_package_config_dev_server_port || 3000,
      setupMiddlewares: (middlewares, devServer) => {
        devServer.app.post("/api/agent", (request, response) => {
          const requestId = requestIdFor(request);
          const startedAt = Date.now();
          let body = "";
          let receivedBytes = 0;
          let requestTooLarge = false;
          logAgentRequest("info", "Request received", { requestId });
          request.on("data", (chunk) => {
            receivedBytes += chunk.length;
            if (receivedBytes > AGENT_REQUEST_LIMIT_BYTES) {
              requestTooLarge = true;
              return;
            }
            body += chunk;
          });
          request.on("end", async () => {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("X-Request-ID", requestId);
            if (requestTooLarge) {
              response.statusCode = 413;
              const error = `The workbook data sent to the AI is too large (${Math.ceil(
                receivedBytes / 1024
              )} KB). Ask about a smaller range or subset of the data.`;
              logAgentRequest("warn", "Request rejected", {
                requestId,
                status: response.statusCode,
                receivedBytes,
                elapsedMs: Date.now() - startedAt,
              });
              response.end(JSON.stringify({ error }));
              return;
            }
            try {
              const input = JSON.parse(body || "{}");
              const { runExcelAgent } = await import("./server/excelAgent.mjs");
              const result = await runExcelAgent(input, { requestId, logger: console });
              logAgentRequest("info", "Request completed", {
                requestId,
                status: 200,
                receivedBytes,
                elapsedMs: Date.now() - startedAt,
                resultType: result.type,
              });
              response.end(JSON.stringify(result));
            } catch (error) {
              response.statusCode = Number.isInteger(error.statusCode)
                ? error.statusCode
                : error instanceof SyntaxError
                  ? 400
                  : 500;
              logAgentRequest("error", "Request failed", {
                requestId,
                status: response.statusCode,
                receivedBytes,
                elapsedMs: Date.now() - startedAt,
                error: error.message || String(error),
              });
              response.end(JSON.stringify({ error: error.message || "Agent request failed" }));
            }
          });
        });
        devServer.app.post("/api/enrich-company", (request, response) => {
          let body = "";
          request.on("data", (chunk) => {
            body += chunk;
            if (body.length > 20_000) request.destroy();
          });
          request.on("end", async () => {
            response.setHeader("Content-Type", "application/json");
            try {
              const input = JSON.parse(body || "{}");
              const { enrichCompany } = await import("./server/companyEnrichment.mjs");
              const company = await enrichCompany(input);
              response.end(JSON.stringify(company));
            } catch (error) {
              response.statusCode = error instanceof SyntaxError ? 400 : 500;
              response.end(JSON.stringify({ error: error.message || "Company research failed" }));
            }
          });
        });
        devServer.app.post("/api/startup-signals", (request, response) => {
          let body = "";
          request.on("data", (chunk) => {
            body += chunk;
            if (body.length > 50_000) request.destroy();
          });
          request.on("end", async () => {
            response.setHeader("Content-Type", "application/json");
            try {
              const input = JSON.parse(body || "{}");
              const { runDailyStartupScrub } = await import("./server/dailyStartupScrub.mjs");
              const result = await runDailyStartupScrub({
                followedCompanies: input.companies,
                includeMockedData: false,
              });
              response.end(JSON.stringify({ articles: result.articles, warnings: result.warnings }));
            } catch (error) {
              response.statusCode = error instanceof SyntaxError ? 400 : 500;
              response.end(JSON.stringify({ error: error.message || "Startup signal scan failed" }));
            }
          });
        });
        return middlewares;
      },
    },
  };

  return config;
};
