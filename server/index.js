const http = require("node:http");
const { createService } = require("./service");

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const service = createService();

http.createServer(service.handle).listen(port, host, () => {
  console.log(`listening on http://${host}:${port}`);
});
