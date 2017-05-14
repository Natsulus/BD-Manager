#!/usr/bin/env node

const Commander = require("commander");
const ps = require("ps-node");
const config = require("./config");
const fs = require("fs-extra");
const path = require("path");
const replace = require("replace-in-file");
const https = require("https");
const AdmZip = require("adm-zip");
const exec = function(command, options) {
	return new Promise((resolve, reject) => {
		require("child_process").exec(command, options, (err, stdout, stderr) => {
			if (err) return reject(err);
			return resolve(stdout);
		});
	});
	
}

config.bdPath = pathEnv(config.bdPath);
config.discordPath = pathEnv(config.discordPath);

//Commander.version("1.0.0");

Commander
	.command("version")
	.alias("v")
	.description("Check current version of BD installed")
	.action(() => {
		// 
	});
Commander
	.command("download")
	.alias("d")
	.description("Download the latest version of BetterDiscord")
	.action(version => {
		version = getInt(version) || 2;
		
		let zipPath;
		let dir;
		
		fs.ensureDirSync("./Download")
		if (version === 1) {
			zipPath = "./Download/v1.zip";
			dir = "./Download/v1";
			if (fs.existsSync(zipPath)) {
				fs.removeSync(zipPath);
			}
			if (fs.existsSync(dir)) {
				fs.removeSync(dir);
			}
			download("https://codeload.github.com/Jiiks/BetterDiscordApp/zip/stable16", zipPath).then(() => {
				let zip = AdmZip(zipPath);
				
				zip.extractAllTo("./Download");
				fs.renameSync("./Download/BetterDiscordApp-stable16", dir);
				console.log("Finished Downloading BetterDiscord v1");
			}).catch(console.error);
		} else if (version === 2) {
			zipPath = "./Download/v2.zip";
			dir = "./Download/v2";
			if (fs.existsSync(zipPath)) {
				fs.removeSync(zipPath);
			}
			if (fs.existsSync(dir)) {
				fs.removeSync(dir);
			}
			download("https://codeload.github.com/Jiiks/BetterDiscordApp/zip/v2", zipPath).then(() => {
				let zip = AdmZip(zipPath);
				
				zip.extractAllTo("./Download");
				fs.renameSync("./Download/BetterDiscordApp-2", dir);
				fs.removeSync(path.resolve(dir, "plugins"));
				fs.ensureDirSync(path.resolve(dir, "plugins"));
				console.log("Finished Downloading BetterDiscord v2");
			}).catch(console.error);
		} else {
			console.log("Only version 1 & 2 are available");
		}
	});
Commander
	.command("node-module")
	.alias("nm")
	.description("Run 'npm install' & 'npm run build-client' for BetterDiscord v2 if downloaded")
	.action(() => {
		nodeModuleCommand().catch(console.error);
	});
Commander
	.command("install [version]")
	.alias("i")
	.description("Install BetterDiscord to configurated path")
	.option("-n, --node-module", "Run the node-module command before installing")
	.option("-s, --set", "Run the set command after installing")
	.option("-r, --set-restart", "Run the set command with the restart option after installing")
	.action((version, {nodeModule, set, setRestart}) => {
		version = getInt(version) || 2;
		
		if (version === 1) {
			fs.copySync("./Download/v1", path.resolve(config.discordPath, "node_modules/BetterDiscord"));
			fs.ensureSymlinkSync(path.resolve(config.discordPath, "node_modules/BetterDiscord"), path.resolve(config.bdPath, "v1"));
			console.log("Successfully Installed BetterDiscord v1");
			if (setRestart) {
				setCommand(version, setRestart).then(() => {}).catch(console.error);
			} else if (set) {
				setCommand(version).then(() => {}).catch(console.error);
			}
		} else if (version === 2) {
			if (nodeModule) {
				nodeModuleCommand().then(() => {
					fs.copySync("./Download/v2", path.resolve(config.bdPath, "v2"));
					console.log("Successfully Installed BetterDiscord v2");
					if (setRestart) {
						setCommand(version, setRestart).then(() => {}).catch(console.error);
					} else if (set) {
						setCommand(version).then(() => {}).catch(console.error);
					}
				}).catch(console.error);
			} else {
				fs.copySync("./Download/v2", path.resolve(config.bdPath, "v2"));
				console.log("Successfully Installed BetterDiscord v2");
				if (setRestart) {
					setCommand(version, setRestart).then(() => {}).catch(console.error);
				} else if (set) {
					setCommand(version).then(() => {}).catch(console.error);
				}
			}
			
		} else {
			return console.log("Only version 1 & 2 are available");
		}
	});
Commander
	.command("uninstall [version]")
	.alias("u")
	.description("Uninstall BetterDiscord from configurated path")
	.action((version) => {
		version = getInt(version) || 2;
		
		if (version === 1) {
			fs.removeSync(path.resolve(config.discordPath, "node_modules/BetterDiscord"));
		} else if (version === 2) {
			fs.removeSync(path.resolve(config.bdPath, "v2"));
		} else {
			return console.log("Only version 1 & 2 are available");
		}
	});
Commander
	.command("set [version]")
	.description("Set BetterDiscord version to use")
	.option("-r, --restart", "Restart Discord")
	.action((version, {restart}) => {
		setCommand(version, restart).then(() => {}).catch(console.error);
	});
Commander
	.command("sync [version]")
	.alias("s")
	.description("Sync Plugins and Themes (TBA)")
	.action((version) => {
		//
	});
Commander
	.command("config")
	.alias("c")
	.description("Get or Set a Config Key's Value")
	.option("-g, --get <key>", "Get the value of a config key")
	.option("-s, --set [key]-[value]", "Set the value of a config key", val => {
		return val.split("-");
	})
	.option("-l, --list", "List all config keys")
	.action(({get, set, list}) => {
		if (get) {
			if (config[get]) console.log(`${get}: ${config[get]}`);
			else console.log(`Key "${get}" does not exist`);
		} else if (set) {
			let key = set.splice(0, 1)[0];
			set = set.join("-");
			if (config[key]) {
				config[key] = path.resolve(set);
				fs.writeFileSync("./config.json", JSON.stringify(config, null, 4));
				console.log(`${key} set to: ${set}`);
			} else {
				console.log(`Key "${key}" does not exist`);
			}
		} else if (list) {
			let str = "Keys:";
			for (const key in config) {
				str += `\n- ${key}`;
			}
			console.log(str);
		} else {
			console.log(Commander);
		}
	});

Commander.parse(process.argv);

if (!Commander.args.length) Commander.help();

function getInt(value) {
  let x;
  if(isNaN(value) ? !1 : (x = parseFloat(value), (0 | x) === x)) {
	  return parseInt(value);
  }
  return;
}

function installInjector(version, basePath, dataPath) {
	return new Promise((resolve, reject) => {
		let fromText;
		let toText;
		let conf = require("./app/config.json");
		conf.basePath = basePath;
		conf.dataPath = dataPath;
		
		if (version === 1) {
			conf.bdPath = basePath;
			fromText = "BetterDiscord({mainWindow: mainWindow, config: config});";
			toText = "BetterDiscord(mainWindow);"
		} else {
			conf.bdPath = path.resolve(basePath, "src/core/main");
			fromText = "BetterDiscord(mainWindow);"
			toText = "BetterDiscord({mainWindow: mainWindow, config: config});";
		}
		fs.writeFileSync("./app/config.json", JSON.stringify(conf, null, 4));
		
		replace({
			files: "./app/index.js",
			from: fromText,
			to: toText
		}).then(() => {
			fs.ensureDirSync(path.resolve(config.discordPath, "app"));
			fs.copySync("./app", path.resolve(config.discordPath, "app"));
			resolve();
		}).catch(reject);
	});
}

function pathEnv(str) {
	return path.resolve(str.replace(/%([^%]+)%/g, function(_,n) {
		return process.env[n];
	}));
}

function download(url, dest) {
	return new Promise((resolve, reject) => {
		let file = fs.createWriteStream(dest);
		let request = https.get(url, res => {
			res.pipe(file);
			
			file.on("finish", () => {
				file.close();
				resolve();
			});
		}).on("error", err => {
			fs.unlink(dest);
			reject(err);
		});
	});
}

function nodeModuleCommand() {
	return new Promise ((resolve, reject) => {
		let cwd = "./Download/v2";
		if (fs.existsSync(cwd)) {
			exec("npm install", {cwd}).then(stdout => {
				return exec("npm run build-client", {cwd});
			}).then(stdout2 => {
				console.log("Node Modules Installed & Client Successfully Built");
				resolve();
			}).catch(reject);
		} else {
			reject("Please download v2 first with the download command");
		}
	});
}

function setCommand(version, restart) {
	return new Promise ((resolve, reject) => {
		version = getInt(version) === 0 ? 0 : getInt(version) || 2;
		
		if (version === 0) {
			fs.removeSync(path.resolve(config.discordPath, "app"));
			console.log("Disabled BetterDiscord");
			if (restart) {
				restartDiscord();
			}
		} else if (version === 1) {
			installInjector(version, path.resolve(config.discordPath, "node_modules/BetterDiscord"), "")
				.then(() => {
					console.log("Set to use BetterDiscord v1");
					if (restart) {
						restartDiscord().then(() => {
							resolve();
						})
					} else {
						resolve();
					}
				}).catch(reject);
		} else if (version === 2) {
			installInjector(version, path.resolve(config.bdPath, "v2"), path.resolve(config.bdPath, "v2/data"))
				.then(() => {
					console.log("Set to use BetterDiscord v2");
					if (restart) {
						restartDiscord().then(() => {
							resolve();
						})
					} else {
						resolve();
					}
				}).catch(reject);
		} else {
			reject("Only version 1 & 2 are available, 0 is to disable BD");
		}
	});
}

function restartDiscord() {
	return new Promise ((res, rej) => {
		ps.lookup({}, (err, list) => {
			if (err) rej(err);
			
			list = list.filter(process => {
				return process.command.includes("Discord");
			});
			
			if (list.length > 0) {
				console.log("Restarting Discord...");
				list.map(process => {
					return new Promise((resolve, reject) => {
						ps.kill(process.pid, killErr => {
							if (killErr) reject(killErr);
							else resolve();
						});
					});
				});
				
				Promise.all(list).then(() => {
					require("child_process").execFile(path.resolve(config.discordPath, "../../Update.exe"), 
					["--processStart", path.resolve(config.discordPath, "../Discord.exe")], startErr => {
						if (startErr) return rej(startErr);
						console.log("Successfully Restarted Discord");
						process.exit(0);
						res();
					});
				}).catch(console.error);
			} else {
				console.log("Starting Discord...");
				require("child_process").execFile(path.resolve(config.discordPath, "../../Update.exe"), 
					["--processStart", path.resolve(config.discordPath, "../Discord.exe")], startErr => {
					if (startErr) return rej(startErr);
					console.log("Successfully Started Discord");
					res();
				});
			}
		});
	});
}