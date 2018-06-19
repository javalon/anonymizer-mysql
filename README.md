# anonymizer-mysql

This simple tool will allow you to make anonymizerd clone of your database.

## Installation

### Yarn

```shell
yarn global add "anonymizer-mysql"
```

### Npm

```shell
npm install --global "anonymizer-mysql"
```

## Usage

You need to create a config(.json) file like this:

```json
{
  "source_db": {
    "host": "localhost",
    "user": "user",
    "password": "password",
    "database": "source",
    "port": "3306"
  },
  "target_db": {
    "host": "localhost",
    "user": "user",
    "password": "password",
    "database": "target",
    "port": "3306"
  },
  "rules": [
    {
      "table": "users",
      "fields": [
        {
          "field": "username",
          "apply": "substring(md5(username),1,8)"
        },
        {
          "field": "password",
          "apply": "'da248eeaffa573da8c323c3eb56aaf32ec6ce244e401a24c55f30c907d0bbfb5'"
        },
        {
          "field": "surname",
          "apply": "substring(md5(surname),1,8)"
        },
        {
          "field": "name",
          "apply": "substring(md5(name),1,8)"
        },
        {
          "field": "email",
          "apply": "concat(substring(md5(email),1,8), '@email.com')"
        },
        {
          "field": "birthDate",
          "apply": "birthDate - INTERVAL FLOOR(RAND() * 30) DAY"
        },
        {
          "field": "photo",
          "apply": "'http://placehold.it/50x50'"
        }
      ],
      "where": "rolId = 5"
    },
    {
      "table": "users",
      "fields": [
        {
          "field": "password",
          "apply": "'da248eeaffa573da8c323c3eb56aaf32ec6ce244e401a24c55f30c907d0bbfb5'"
        },
        {
          "field": "surname",
          "apply": "substring(md5(surname),1,8)"
        },
        {
          "field": "name",
          "apply": "substring(md5(name),1,8)"
        }
      ],
      "where": "rolId = 1"
    }
  ]
}
```

You need to configure the database connections. "source_db" referred to the original database to anonymize. "target_db" referred to the anonymized clone of the "source_db". Be care, in this process, the "target_db" database is going to be destroyed.

You need to configure rules to apply to a field of one table.

The "apply" JSON attribute indicates the MySQL function to execute, here your anonymizer function for this field. For example, use "substring(md5(name),1,8)" for anonymize the field called name.

For conditional queries use the JSON attribute "where".

You can create many conditional queries for the same table. See the example.

Once you has been created a config(.json) file, you can use this tool with:
Usage: anonymizer-mysql [options]

Options:

    -V, --version       output the version number
    -f, --force         Overwrite the clone db if it already exists.
    -c, --conf <file>   Config file. Default: config.json
    -d, --dump <file>   Path to mysqldump. Default: system mysqldump.
    -m, --mysql <file>  Path to mysql. Default: system mysql.
    -h, --help          output usage information
