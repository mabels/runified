package types_app

import (
	"context"

	"github.com/mabels/runified/types"
	"github.com/rs/zerolog"
)

type AppParam struct {
	CLIconfig *CLIConfig
	Log       *zerolog.Logger
	Ctx       context.Context
	Sys       types.SysAbstraction
}

type App interface {
	Log() *zerolog.Logger
	CLIConfig() *CLIConfig
	Start() error
	Stop() error
	Sys() types.SysAbstraction
	Context() context.Context
}
