#!/usr/bin/env node

"use strict";

const commander = require("commander");
const { version } = require("../package.json");
const { error } = console;
const { exit, argv } = process;

const anonymizer = require("../lib/anonymizer-mysql");

if (typeof JSON.clone !== "function") {
  JSON.clone = function(obj) {
    return JSON.parse(JSON.stringify(obj));
  };
}

commander
  .version(version)
  .option("-f, --force", "Overwrite the clone db if it already exists.")
  .option("-c, --conf <file>", "Config file. Default: config.json")
  .option("-d, --dump <file>", "Path to mysqldump. Default: system mysqldump.")
  .option("-m, --mysql <file>", "Path to mysql. Default: system mysql.")
  .parse(argv);

commander.on("command:*", () => {
  error(
    `Invalid command: ${commander.args.join(" ")}\nSee --help for a list of available commands.`
  );
  exit(1);
});

var conf_fileValue = commander.conf || process.cwd() + "/config.json";

anonymizer.run(conf_fileValue, commander);
