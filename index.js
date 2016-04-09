var io = require('socket.io')();

var clients = {};

function push_data() {
	// Get data to send
	var data = {};
	for (var client_id in clients) {
		data[client_id] = clients[client_id].data;
	}

	// Send data to all clients
	for (var client_id in clients) {
		clients[client_id].socket.emit('user_data', data);
	}
}

io.on('connection', function(socket) {
	clients[socket.id] = {
		socket: socket,
		data: {}
	};
	push_data();

	socket.on('user_data', function(data) {
		console.log("Received data from: " + socket.id);
		console.log(data);
		clients[socket.id].data = data;
		push_data();
	});

	socket.on('disconnect', function() {
		delete clients[socket.id];
		push_data();
	});
});

io.listen(80);
