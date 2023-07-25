import http from "node:http";

async function testRun() {
  const port = 4711;
  const server = http.createServer((_req, res) => {
    res.end();
  });
  server.on("clientError", (err, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });
  server.listen(port);
}

testRun()
  .then(() => {})
  .catch(process.stderr.write);

export {};
