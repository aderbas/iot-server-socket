/**
  Node application to comunicate IOT devices to platform
  @author Aderbal Nunes <aderbalnunes@gmail.com>
  13 Jul 2016
*/

// depenencies
var express   = require('express'),
    http      = require('http'),
    bodyParse = require('body-parser'),
    mensages  = require('./mensages'),
    meOverride= require('method-override'),
    fs        = require('fs'),
    //connection= require('./connection.js'),
    //database  = require('./data.js'),
    util      = require('util'),
    client    = {},
    cli       = undefined;

var app = module.exports.app = express();
// Hook Socket.io into Express
//var server = https.createServer(require('./certificate.js'), app);
var server = http.createServer(app);
//server.socket = socket;
var io = require('socket.io').listen(server);
// Configuration
app.set('port', process.env.PORT || 3331);
app.set('db', require('./db/database.js').conn());
app.use(express.static('./static'));
app.use(bodyParse.urlencoded({'extended':'true'}));
app.use(bodyParse.json());
app.use(bodyParse.json({ type: 'application/vnd.api+json' }));
app.use(meOverride());

function makeResponse(code, data){
  return {
    resultData: data,
    eventCode: code
  };
}

// Socket.io Communication
io.sockets.on('connection', function(socket){
  // on web client connect to this
  socket.on('auth', function(data){
    util.log('Client '+data.key+' try to auth');
    app.get('db').iot_user.findOne({user_key: data.key}, function(err, user){
      if(err === null && user){
        // put client
        client[data.key] = {
          id: socket.id,
          auth: true
        };
        // emit join-success
        io.to(client[data.key].id).emit('authevent', makeResponse(mensages.AUTH_SUCCESS, user));
        util.log('Client '+data.key+' Authorized');
      }else{
        util.log('Client '+data.key+' not Authorized');
        // emit error
        io.to(socket.id).emit('authevent', makeResponse(mensages.AUTH_ERROR));
      }
    });
  });

  // when client send setup device
  socket.on('setup:device', function(data){
    // if socket client has authorized
    if(findClient(socket.id)){
      // find device
      app.get('db').iot_device.findOne({device_key: data.key}, function(err, device){
        if(err === null && device){
          io.to(socket.id).emit('deviceevent', makeResponse(mensages.DEVICE_SETUP_OK, device));
        }else{
          io.to(socket.id).emit('deviceevent', makeResponse(mensages.DEVICE_NOT_FOUND, 'Erro to find device '+data.key));
        }
      });
    }else{
      io.to(socket.id).emit('authevent', makeResponse(mensages.AUTH_ERROR));
    }
  });

  // when client setup an asset
  socket.on('setup:device:asset', function(data){
    // if socket client has authorized
    if(findClient(socket.id)){
      // find device
      app.get('db').iot_device.findOne({device_key: data.device_key}, function(err, device){
        if(err === null && device){
          // check if asset exist
          app.get('db').iot_device_asset.findOne({asset_pin: data.asset.asset_pin}, function(err, pre_asset){
            if(err === null && !pre_asset){
              // add asset {label, value_type, last_value, type_asset, device_id, asset_pin}
              data.asset.device_id = device.id;
              app.get('db').iot_device_asset.insert(data.asset, function(err, asset){
                if(err === null && asset){
                  io.to(socket.id).emit('deviceevent', makeResponse(mensages.DEVICE_SETUP_ASSET_OK, asset));
                }else{
                  io.to(socket.id).emit('deviceevent', makeResponse(mensages.DEVICE_SETUP_ASSET_ERROR));
                }
              });
            }else{
              io.to(socket.id).emit('deviceevent', makeResponse(mensages.DEVICE_SETUP_ASSET_OK, pre_asset));
            }
          });
        }else{
          io.to(socket.id).emit('deviceevent', makeResponse(mensages.DEVICE_NOT_FOUND, 'Erro to find device '+data.device_key));
        }
      });
    }else{
      io.to(socket.id).emit('authevent', makeResponse(mensages.AUTH_ERROR));
    }
  });

  // when device send a value
  socket.on('device:asset:send', function(data){
    // if socket client has authorized
    if(findClient(socket.id)){
      // find device
      app.get('db').iot_device.findOne({device_key: data.device_key}, function(err, device){
        if(err === null && device){
          app.get('db').iot_device_asset.findOne({asset_pin: data.asset.pin}, function(err, pre_asset){
            if(err === null && pre_asset){
              app.get('db').iot_device_asset.update({asset_pin: data.asset.pin, last_value: data.asset.value}, function(err, asset){
                if(err === null && asset){
                  io.to(socket.id).emit('deviceevent', makeResponse(mensages.DEVICE_ASSET_SEND_OK, asset));
                }else{
                  io.to(socket.id).emit('deviceevent', makeResponse(mensages.DEVICE_ASSET_SEND_ERROR, 'Erro to find asset on pin '+data.asset.pin));
                }
              });
            }else{
              io.to(socket.id).emit('deviceevent', makeResponse(mensages.DEVICE_ASSET_NOT_FOUND));
            }
          });
        }else{
          io.to(socket.id).emit('deviceevent', makeResponse(mensages.DEVICE_NOT_FOUND, 'Erro to find device '+data.device_key));
        }
      });
    }else{
      io.to(socket.id).emit('authevent', makeResponse(mensages.AUTH_ERROR));
    }
  });

  // when client disconect
  socket.on('disconnect', function(){
    cli = findClient(socket.id);
    if(cli){
      util.log(cli + ' CLOSE CONNECTION');
      delete client[cli];
    }
  });
});

// util
function findClient(id){
  var n;
  for(n in client){
    if(client[n].id == id){
      return n;
    }
  }
  return undefined;
}

// Start server
server.listen(app.get('port'), function(){
  util.log("IOT server listening on port "+ app.get('port'));
});
