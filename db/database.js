// database connection instance
module.exports = {
  conn: function(){
    return require("massive").connectSync({
      connectionString : "postgres://iotuser:12345ok@localhost/iotdatabase" // if use ssl: ?ssl=true"
    });
  }
};
