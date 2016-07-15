var client = require('socket.io-client')('http://localhost:3331');

var AUTH_SUCCESS = '#AUTH_SUCCESS;';
var AUTH_ERROR = '#AUTH_ERROR;';

client.on('connect', function(){

  client.emit('auth', {key: '5n9lhlb4uk160nt'});

  client.on('authevent', function(res){
    if(res.eventCode === AUTH_SUCCESS){
      console.log('Authorized!');
      client.emit('setup:device', {key: 'r7zhr0dx6ndf3p1'});
    }else{
      console.log('Not Authorized???!');
      process.exit(1);
    }
  });
  client.on('deviceevent', function(data){
    if(data.eventCode == '#DEVICE_SETUP_ASSET_OK;'){
      console.log('DEVICE_SETUP_ASSET_OK');
      client.emit('device:asset:send', {device_key: 'r7zhr0dx6ndf3p1', asset: {pin: 8, value: 22}});
    }else if(data.eventCode == '#DEVICE_SETUP_OK;'){
      //{label, value_type, last_value, type_asset, device_id, asset_pin}
      var assetin = {label: 'Temperature', value_type: 'string', last_value: 0, type_asset: 2, asset_pin: 8}
      client.emit('setup:device:asset', {device_key: 'r7zhr0dx6ndf3p1', asset: assetin});
    }else if(data.eventCode == '#DEVICE_SETUP_ASSET_ERROR;'){
      console.log('Erro device');
    }
  });
  client.on('disconnect', function(){
    console.log('Disconected');
  });
});
