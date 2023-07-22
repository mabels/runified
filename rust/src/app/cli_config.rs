
use clap::{Command, Arg};

pub fn from_command_line(args: Vec<String>) -> crate::types::config::CLIConfig {
	let mut my_args = args.clone();
	if my_args.len() == 0 {
		my_args.push("test".into())
	}
    let matches = Command::new("runified")
        .version("dev")
        .author("beeto inc <dev@beeto.inc>")
        .about("Service Framework sample application")
        .arg(Arg::new("listen-addr").long("listen-addr").value_name("ADDRESS").help("listen address").default_value("[::]"))
        .arg(Arg::new("listen-port").long("listen-port").value_name("VALUE>").value_parser(clap::value_parser!(u16).range(1..)).default_value("8081"))
		.arg(Arg::new("firebase-db-url").long("firebase-db-url").value_name("URL").default_value("https://runified-361708-default-rtdb.firebaseio.com"))
		.arg(Arg::new("firebase-service-account-key-path").long("firebase-service-account-key-path").value_name("FILE").default_value("service-account-key.json"))
		.arg(Arg::new("kv-store-type").long("kv-store-type").value_name("inmemory|firebase").default_value("inmemory"))
		.arg(Arg::new("time-mode").long("time-mode").value_name("real|const|step").default_value("real"))
        .get_matches_from(args);

	return crate::types::config::CLIConfig {
		app_name: my_args[0].clone(),
		time_mode: matches.get_one::<String>("time-mode").unwrap().into(),
		listen: crate::types::config::AddrPort {
			port: *matches.get_one::<u16>("listen-port").unwrap(),
			addr: matches.get_one::<String>("listen-addr").unwrap().into(),
		},
		fire_base: crate::types::config::FireBaseConfig{
			db_url: matches.get_one::<String>("firebase-db-url").unwrap().into(),
			service_account_key_path: matches.get_one::<String>("firebase-service-account-key-path").unwrap().into(),
		},
		kv_store_type: matches.get_one::<String>("kv-store-type").unwrap().into(),
	}
}


#[cfg(test)]
mod tests {
    // Note this useful idiom: importing names from outer (for mod tests) scope.
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn test_config_default() -> Result<(), String> {
        let cfg = from_command_line(Vec::new());
        assert_eq!(cfg.listen.port, 8081);
        assert_eq!(cfg.listen.addr, "[::]");
        assert_eq!(cfg.app_name, "test");
        assert_eq!(
            cfg.fire_base.db_url,
            "https://runified-361708-default-rtdb.firebaseio.com"
        );
        assert_eq!(cfg.fire_base.service_account_key_path, "service-account-key.json");
        assert_eq!(cfg.kv_store_type, "inmemory");
        assert_eq!(cfg.time_mode, "real");
		return Ok(());
    }

    #[test]
    fn test_config_from_cli() -> Result<(), String> {
       let args = [
            "wurst",
            "--listen-port",
            "8083",
            "--listen-addr",
            "bla",
            "--firebase-db-url",
            "w1", // to be sure that you don't mix up the assigments
            "--firebase-service-account-key-path",
            "w2",
            "--kv-store-type",
            "firebase",
			"--time-mode",
			"const"
        ]
        .iter()
        .map(|s| s.to_string())
        .collect();
        let cfg = from_command_line(args);
        assert_eq!(cfg.listen.port, 8083);
        assert_eq!(cfg.listen.addr, "bla");
        assert_eq!(cfg.app_name, "wurst");
        assert_eq!(cfg.fire_base.db_url, "w1");
        assert_eq!(cfg.fire_base.service_account_key_path, "w2");
        assert_eq!(cfg.kv_store_type, "firebase");
        assert_eq!(cfg.time_mode, "const");
		return Ok(());
    }
}
