"use strict";

const chalk = require("chalk");
const fs = require("fs");
const mysql = require("promise-mysql");
var commandExists = require("command-exists").sync;
var cmd = require("node-cmd");

module.exports = {
    log: function(message){
        console.log(chalk.blue(message));
    },
    logError: function(message){
        console.error(chalk.red(message));
    },
    run: function(conf_fileValue, commander){
        this.log("Loading config file...");
        this.commander = commander;
        try {
            var contents = fs.readFileSync(conf_fileValue);
            this.config = JSON.parse(contents);
        } catch (error) {
            this.logError("Failed to open config file.");
        if (error && error.message) {
            this.logError(error.message);
        } else if (error) {
            this.logError(error);
        }
        this.commander.outputHelp(help => help);
        process.exit(1);
        }
        this.log("Config file loaded.");

        this.log("Checking target db");
        var target_test_connection = JSON.clone(this.config.target_db);
        delete target_test_connection.database;
        mysql
        .createConnection(target_test_connection)
        .bind(this)
        .then(function(connection) {
            this.target_connection = connection;
            this.log("Checking target database name exists");
            return connection.query(
            "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
            [this.config.target_db.database]
            );
        })
        .then(this.checkTargetDatabase)
        .then(this.createTargetDatabase)
        .then(this.migrationDatabaseProcess)
        .then(this.executeQueries)
        .then(function(){
            this.log("Mission accomplished!!!");
            process.exit(0);
        }).catch(function(reason){
            var message = reason.message;
            var error = reason.error;
            this.logError(message);
            if (error && error.message) {
                this.logError(error.message);
            } else if (error) {
                this.logError(error);
            }
            commander.outputHelp(help => help);
            process.exit(1);
        });
    },
    executeQueries: function () {
        var thisSelf = this;
        return new Promise(function (resolve, reject) {
          thisSelf.log("Executing queries...");
          mysql.createConnection(thisSelf.config.target_db).then(function (connection) {
            var queries = thisSelf.config.rules.map(function (query_data) {
              var query = "UPDATE " + query_data.table + " SET ";
              query_data.fields.forEach(function (field) {
                query += field.field + " = " + field.apply + ", ";
              });
              var whereQuery = query_data.where.length > 0 ? " where " + query_data.where : "";
              query = query.replace(/, ([^, ]*)$/, "$1") + whereQuery + ";";
              console.log(chalk.green(" - " + query));
              return connection.query(query);
            });
            Promise.all(queries)
              .then(function () {
                resolve();
              })
              .catch(function (error) {
                reject({
                  message: "Executing queries failed.",
                  error: error
                });
              });
          });
        });
      },
      migrationDatabaseProcess: function () {
        var thisSelf = this;
        return new Promise(function (resolve, reject) {
          thisSelf.log("Initialize cloning db...");
          var execDump = thisSelf.commander.dump || "mysqldump";
          var execMysql = thisSelf.commander.mysql || "mysql";
          var dumpExists = commandExists(execDump);
          var mysqlExists = commandExists(execMysql);
          if (dumpExists && mysqlExists) {
            thisSelf.log(" - Launched cloning process..");
            var dump = execDump + " " + thisSelf.config.source_db.database;
            var pipe = " | " + execMysql + " " + thisSelf.config.target_db.database;
            if (thisSelf.config.source_db.user && thisSelf.config.source_db.password) {
              dump =
                execDump +
                " -P " +
                thisSelf.config.source_db.port +
                " -h " +
                thisSelf.config.source_db.host +
                " -u " +
                thisSelf.config.source_db.user +
                " -p" +
                thisSelf.config.source_db.password +
                " " +
                thisSelf.config.source_db.database;
            }
            if (thisSelf.config.target_db.user && thisSelf.config.target_db.password) {
              pipe =
                " | " +
                execMysql +
                " -u " +
                thisSelf.config.target_db.user +
                " -p" +
                thisSelf.config.target_db.password +
                " " +
                thisSelf.config.target_db.database;
            }
            cmd.get(dump + pipe, function (error) {
              if (error) {
                reject({
                  message: "Failed to migrating data.",
                  error: error
                });
              }
              resolve();
            });
          }
          else {
            var message = !dumpExists ? "mysqldump is necessary. Please check the options below.\n" : "";
            message += !mysqlExists ? "mysql is necessary. Please check the options below." : "";
            reject({
              message: message
            });
          }
        });
      },
      createTargetDatabase: function() {
        var thisSelf = this;
        return new Promise(function (resolve, reject) {
          thisSelf.log(" - Creating target db " + thisSelf.config.target_db.database);
          thisSelf.target_connection.query("CREATE DATABASE " + thisSelf.config.target_db.database, function (error) {
            if (error) {
              reject({
                message: "Failed to create target DB.",
                error: error
              });
            }
            resolve();
          });
        });
      },
      checkTargetDatabase: function(rows) {
        var thisSelf = this;
        return new Promise(function (resolve, reject) {
          if (rows.length > 0) {
            thisSelf.log(" - Target database " + thisSelf.config.target_db.database + " exists");
            if (thisSelf.commander.force) {
              thisSelf.log(" - Dropping target db " + thisSelf.config.target_db.database);
              thisSelf.target_connection.query("DROP DATABASE " + thisSelf.config.target_db.database);
              resolve();
            }
            else {
              reject({
                message: "Use --force option to overwrite target db."
              });
            }
          }
          else {
            resolve();
          }
        });
      }
};
