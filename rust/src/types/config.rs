
pub struct AddrPort {
	pub port: u16,
	pub addr: String
}

pub struct FireBaseConfig {
	pub db_url:                 String,
	pub service_account_key_path: String
}

pub struct CLIConfig {
	pub app_name:     String,
	pub listen:      AddrPort,
	pub fire_base:    FireBaseConfig,
	pub kv_store_type: String,
	pub time_mode:    String
}
