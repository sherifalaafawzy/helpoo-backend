const express = require("express");
const Sentry = require("@sentry/node");
const nodeProfilingIntegration =
   require("@sentry/profiling-node").nodeProfilingIntegration;
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const helmet = require("helmet");
const xss = require("xss-clean");
const morgan = require("morgan");
const useragent = require("express-useragent");
const pug = require("pug");
const path = require("path");
const chalk = require("chalk");
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("../swagger-output.json");
const multerStorage = multer.diskStorage({
   destination: "./public/inspections/media", // Save files in the 'uploads' directory
   filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
   },
});

const filterBody = require("../middlewares/filterBody");
const errorController = require("../utils/errorController");
const upload = multer({
   storage: multerStorage,
});

const i18n = require("../utils/I18n");
const AppError = require("../utils/AppError");
const app = express();
Sentry.init({
   dsn: "https://e6d2c9bf35d431ae774d137e6fb45279@o1420692.ingest.us.sentry.io/4507124674068480",
   integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      nodeProfilingIntegration(),
   ],
   // Performance Monitoring
   tracesSampleRate: 1.0, //  Capture 100% of the transactions
   // Set sampling rate for profiling - this is relative to tracesSampleRate
   profilesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.use(i18n.init);

let uploadImages = upload.array("media");
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
// Sentry.init({})
app.use(cors());
// app.use(Sentry.Handlers.requestHandler());
// app.use(Sentry.Handlers.errorHandler());
app.use(helmet());

app.use(xss());
app.use(useragent.express());
app.use("/doc", swaggerUi.serve, swaggerUi.setup(swaggerFile));
// app.use(morgan(':method :url :status - :response-time ms'));
// app.use(morgan('dev'));
const morganMiddleware = morgan(function (tokens, req, res) {
   return [
      chalk.hex("#34ace0").bold(tokens.method(req, res)),
      chalk.hex("#ffb142").bold(tokens.status(req, res)),
      chalk.hex("#ff5252").bold(tokens.url(req, res)),
      chalk.hex("#2ed573").bold(tokens["response-time"](req, res) + " ms"),
      chalk.hex("#f78fb3").bold("@ " + tokens.date(req, res)),
   ].join(" ");
});

app.use(morganMiddleware);
app.use(bodyParser.json({ limit: "1000000mb" }));
app.use(bodyParser.urlencoded({ limit: "1000000mb", extended: true }));
// app.use((req, res, next) => {
//    console.log(req);
//    console.log(req.body);
//    console.log(req.files);
//    next();
// });
app.use(uploadImages);
app.use(filterBody);

app.use("/public", express.static("public"));
app.use("/views", express.static("views"));
app.use("/views/static", express.static("views/static"));

require("../routes")({ app });

app.get("/debug-sentry", function mainHandler(req, res, next) {
   return next(new AppError("This is error", 500));
});

app.use(Sentry.Handlers.errorHandler());

app.use(errorController);

// app.use(function onError(err, req, res, next) {
//    // The error id is attached to res.sentry to be returned
//    // and optionally displayed to the user for support.
//    res.statusCode = 500;
//    res.end(res.sentry + "\n");
// });

module.exports = app;
