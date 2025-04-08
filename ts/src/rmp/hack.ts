import http from "node:http";

function testRun(): Promise<void> {
  const port = 4711;
  const server = http.createServer((_req, res) => {
    res.end();
  });
  server.on("clientError", (err, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });
  server.listen(port);
  return Promise.resolve();
}

testRun()
  .then(() => {
    /* */
  })
  .catch((e: Error) => process.stderr.write(e.message));

export {};
