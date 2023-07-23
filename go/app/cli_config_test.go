package app

import (
	"testing"
)

func TestConfigDefault(t *testing.T) {
	// os.Args = []string {"wurst", "--port", "8083"}

	cfg := FromCommandLine([]string{})
	if cfg == nil {
		t.Error("config is nil")
	}
	if cfg.Listen.Port != 8081 {
		t.Error("port not 8081")
	}
	if cfg.Listen.Addr != "" {
		t.Error("Addr set")
	}
	if cfg.AppName != "test" {
		t.Error("name not test")
	}
	if cfg.FireBase.DBUrl != "https://runified-default-rtdb.firebaseio.com" {
		t.Error("FirebaseDatabaseURL not default")
	}
	if cfg.FireBase.ServiceAccountKeyPath != "serviceAccountKey.json" {
		t.Error("ServiceAccountKeyPath not default")
	}
}

func TestConfigFromCLI(t *testing.T) {

	cfg := FromCommandLine([]string{"wurst",
		"--listen-port", "8083",
		"--listen-addr", "bla",
		"--firebase-db-url", "w1", // to be sure that you don't mix up the assigments
		"--firebase-service-account-key-path", "w2",
		"--kv-store-type", "firebase"})
	if cfg == nil {
		t.Error("config is nil")
	}
	if cfg.Listen.Port != 8083 {
		t.Error("port not 8083")
	}
	if cfg.Listen.Addr != "bla" {
		t.Error("Addr not bla")
	}
	if cfg.AppName != "wurst" {
		t.Error("name not wurst")
	}
	if cfg.FireBase.DBUrl != "w1" {
		t.Error("FirebaseDatabaseURL not w1")
	}
	if cfg.FireBase.ServiceAccountKeyPath != "w2" {
		t.Error("ServiceAccountKeyPath not w2")
	}
	if cfg.KVStoreType != "firebase" {
		t.Error("KVStoreType not firebase")
	}
}
