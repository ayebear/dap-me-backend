var io = require('socket.io')();

var clients = {};

io.on('connection', function(socket){
	clients[socket.id] = socket;
	for (var key in clients) {
		console.log(key);
	}

	socket.on('event', function(data) {
		console.log("Received data from: " + socket.id);
		console.log(data);
	});
	socket.on('disconnect', function() {
		delete clients[socket.id];
	});
});

io.listen(80);
