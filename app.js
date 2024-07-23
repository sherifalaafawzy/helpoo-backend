const cluster = require("cluster");
const numCPUs = require("os").cpus().length;

if (cluster.isMaster) {
   require("./config");
   // console.log(process.env);
   require("./process/index");

   console.log(`Master process with PID ${process.pid} is running`);

   // fork worker
   let numberOfCPUs = numCPUs - 1;
   let CPURatio = Number(process.env.CORES_RATIO) || 1;
   for (let i = 0; i < numberOfCPUs / CPURatio; i++) {
      cluster.fork();
      console.log("Worker forked");
   }

   // Event listener for when a worker process exits
   cluster.on("exit", (worker, code, signal) => {
      console.log(
         `Worker proccess with PID ${worker.process.pid} exited with code ${code}`
      );
      console.log(`Froking a new worker`);
      cluster.fork();
   });
} else {
   // * Import env variables
   require("./config");
   // require("./process/index");

   // * start the cron-jobs
   const log = require("npmlog");
   process.on("unhandledRejection", (error) => {
      console.error("unhandledRejection", error);
   });

   process.on("unhandledException", (error) => {
      console.error("unhandledException", error);
   });

   const startServer = async function () {
      const app = await require("./loaders")();

      const relations = require("./models/relations");
      const db = require("./loaders/sequelize");
      await relations(db);

      const port = process.env.PORT || 3000;
      app.listen(port, function () {
         log.info("STARTING", `Server is running on port ${port}`);
      });
   };

   startServer();
}
