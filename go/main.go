package main

import (
	"os"

	"github.com/mabels/runified/app"
	types_app "github.com/mabels/runified/types/app"
	"github.com/rs/zerolog"
)

func main() {
	log := zerolog.New(os.Stdout).With().Timestamp().Logger()
	cli_config := app.FromCommandLine(os.Args)
	app := app.NewApp(&types_app.AppParam{
		CLIconfig: cli_config,
		Log:       &log,
	})

	err := app.Start()
	if err != nil {
		log.Error().Err(err).Msg("app Start failed")
		os.Exit(2)
	}
	// dummy call to make sure the function is not optimized away
	// 	handlers.WasmEntry()
}
