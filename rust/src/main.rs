
mod app;
mod types;
// mod prelude {
pub use self::app::*;
// }
// use crate::prelude::*;

// log := zerolog.New(os.Stdout).With().Timestamp().Logger()
// 	cliConfig := app.FromCommandLine(os.Args)
// 	app := app.NewApp(&types.AppParam{
// 		CLIconfig: cliConfig,
// 		Log:       &log,
// 	})

// 	err := app.Start()
// 	if err != nil {
// 		log.Error().Err(err).Msg("app Start failed")
// 		os.Exit(2)
// 	}
// 	// dummy call to make sure the function is not optimized away
// 	// 	handlers.WasmEntry()
// }

use std::convert::Infallible;
use std::env;
use std::net::SocketAddr;
use hyper::{Body, Request, Response, Server};
use hyper::service::{make_service_fn, service_fn};


async fn hello_world(_req: Request<Body>) -> Result<Response<Body>, Infallible> {
    Ok(Response::new("Hello, World".into()))
}

#[tokio::main]
async fn main() {
    let args = env::args().collect();
    let cfg = crate::app::cli_config::from_command_line(args);
    // We'll bind to 127.0.0.1:3000
    let addr = SocketAddr::from(([127, 0, 0, 1], cfg.listen.port));

    // A `Service` is needed for every connection, so this
    // creates one from our `hello_world` function.
    let make_svc = make_service_fn(|_conn| async {
        // service_fn converts our function into a `Service`
        Ok::<_, Infallible>(service_fn(hello_world))
    });

    let server = Server::bind(&addr).serve(make_svc);

    // Run this server for... forever!
    if let Err(e) = server.await {
        eprintln!("server error: {}", e);
    }
}