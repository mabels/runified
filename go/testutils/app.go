package testutils

import (
	"context"
	"io"
	"os"

	"github.com/mabels/runified/types"
	types_app "github.com/mabels/runified/types/app"
	"github.com/rs/zerolog"
)

type MockApp struct {
	CliConfig *types_app.CLIConfig
	LogRef    *zerolog.Logger
	Sys_      types.SysAbstraction
}

func NewMockApp(cfg *types_app.CLIConfig, logWriter ...io.Writer) *MockApp {
	var lc io.Writer = os.Stdout

	if len(logWriter) > 0 {
		lc = logWriter[0]
	}
	mockSys := NewSysAbstraction(cfg.TimeMode)

	log := zerolog.New(lc).With().Str("MockApp", "MockApp").Timestamp().Logger()
	return &MockApp{
		CliConfig: cfg,
		LogRef:    &log,
		Sys_:      mockSys,
	}
}

func (a *MockApp) Log() *zerolog.Logger {
	return a.LogRef
}

func (a *MockApp) Sys() types.SysAbstraction {
	return a.Sys_
}

func (a *MockApp) CLIConfig() *types_app.CLIConfig {
	return a.CliConfig
}

func (*MockApp) Start() error {
	return nil
}
func (*MockApp) Stop() error {
	return nil
}

func (*MockApp) Context() context.Context {
	return nil
}
