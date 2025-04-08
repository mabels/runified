import { Server } from "node:http";
import { EdgeHandler } from "../pony-types";
import { WebSocketServer } from "ws";
import { HttpURL } from "../../types";
// import { RMPHandler } from "../rmp-protocol";
// import { ReadableStream } from "stream/web";

// function stream2WS(id: string, reader: ReadableStreamDefaultReader<Uint8Array>, ws: WebSocket, doneFn: (err: Error | undefined) => void) {
//   console.log(`stream2WS:started:${id}`);
//   reader
//     .read()
//     .then(({ done, value }) => {
//       console.log(`stream2WS:${done}${value?.length}:${id}`);
//       if (done) {
//         doneFn(undefined);
//         return;
//       }
//       if (value) {
//         console.log(`stream2WS:${value.length}:${id}`);
//         ws.send(value);
//       }
//       stream2WS(id,reader, ws, doneFn);
//     })
//     .catch(doneFn);
// }

// function handleWebSocket(wsock: WebSocket, eh: RMPHandler) {
// new Promise<ReadableStream<Uint8Array>>((resolve, reject) => {
//     const rs = new ReadableStream<Uint8Array>({
//       start(controller) {
//         console.log(`connect:${eh.id}`);
//         wsock.on("connect", () => {
//           console.log(`connect-connection:-connect:${eh.id}`);
//         });
//         wsock.on("open", () => {
//           console.log(`connect-connection-open:${eh.id}`);
//           resolve(rs);
//         });
//         wsock.on("message", (data) => {
//           console.log(`connect-message:${data}:${eh.id}`);
//           controller.enqueue(data as Uint8Array);
//         });
//         wsock.on("close", () => {
//           console.log(`connect-close:${eh.id}`);
//           controller.close();
//         });
//       },
//     });
//   }).then((rs) => {
//     const request = new Request("ws://rmp.adviser.com/rmp", {
//       method: "PUT",
//       headers: new Headers(),
//       body: rs,
//     });
//     eh.fetch(request, {}, { ws: { wsock: wsock } }).then((res) => {
//       if (res.body) {
//         stream2WS(eh.id, res.body.getReader(), wsock, (err) => {
//           console.log(`stream2WS-close-error:${err}:${eh.id}`);
//           // wsock.close();
//         });
//       }
//     });
//   });
// }

export class NodeJSWSTransformer {
  readonly wsurl = new WebSocketServer({ noServer: true });

  // static connect(url: string, eh: RMPHandler) {
  //   const wsock = new WebSocket(url);
  //   return handleWebSocket(wsock, eh);
  // }

  static serve(server: Server, eh: EdgeHandler, url = "/rmp"): Promise<void> {
    const wraps = new NodeJSWSTransformer();
    return wraps.wrapServer(server, url, eh);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  wrapServer(server: Server, url: string, eh: EdgeHandler): Promise<void> {
    return new Promise((resolve, reject) => {
      server.on("upgrade", (request, socket, head) => {
        let pathname = request.url ? request.url : "/";
        try {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          pathname = HttpURL.parse(request.url!).unwrap().Path;
        } catch (e) {
          reject(e as Error);
        }
        // eslint-disable-next-line no-console
        console.log(`upgrade:${pathname}:${url}`);
        if (pathname !== url) {
          socket.destroy();
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this.wsurl.handleUpgrade(request, socket, head, (wsock) => {
          // eslint-disable-next-line no-console
          console.log(`upgraded:`);
          // resolve(wsock);
          resolve();
        });
      });
    });
  }
}
