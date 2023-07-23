package app

import (
	types_app "github.com/mabels/runified/types/app"
	"github.com/spf13/pflag"
)

func FromCommandLine(args []string) *types_app.CLIConfig {
	appName := "test"
	if len(args) != 0 {
		appName = args[0]
	}

	fs := pflag.NewFlagSet(appName, pflag.ContinueOnError)

	retVal := types_app.CLIConfig{AppName: appName}
	fs.Uint16Var(&retVal.Listen.Port, "listen-port", 8081, "listen port ")
	fs.StringVar(&retVal.Listen.Addr, "listen-addr", "", "listen address")
	fs.StringVar(&retVal.FireBase.DBUrl, "firebase-db-url", "https://runified-default-rtdb.firebaseio.com", "firebase database url")
	fs.StringVar(&retVal.FireBase.ServiceAccountKeyPath, "firebase-service-account-key-path", "serviceAccountKey.json", "the path to the google service account key file")
	fs.StringVar(&retVal.KVStoreType, "kv-store-type", "inmemory", "the type of the kv store [inmemory|firebase|firestore]")
	fs.Parse(args)
	return &retVal
}
