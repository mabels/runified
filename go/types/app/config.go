package types_app

type AddrPort struct {
	Port uint16
	Addr string
}

type FireBaseConfig struct {
	DBUrl                 string
	ServiceAccountKeyPath string
}

type CLIConfig struct {
	AppName     string
	Listen      AddrPort
	FireBase    FireBaseConfig
	KVStoreType string
	TimeMode    string
}
