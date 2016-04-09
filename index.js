var io = require('socket.io')();

var clients = {};

function get_data() {
	// Get data to send
	var data = [];
	for (var client_id in clients) {
		var client = clients[client_id];
		if (client.data) {
			data.push(client.data);
		}
	}

	console.log('data:');
	console.log(data);

	return data;
}

function push_to_client(client_id, data) {
	clients[client_id].socket.emit('user_data', data);
}

function push_to_all() {
	// Send data to all clients
	var client_data = get_data();
	io.emit('user_data', client_data);
}

io.on('connection', function(socket) {

	// Send data to newly connected client
	var client_data = get_data();
	socket.emit('user_data', client_data);

	clients[socket.id] = {
		socket: socket,
		data: null
	};

	console.log('Client ' + socket.id + ' connected');

	socket.on('user_data', function(data) {
		console.log("Received data from: " + socket.id);
		console.log(data);
		clients[socket.id].data = data;

		// Send to all clients except sender
		var client_data = get_data();
		socket.broadcast.emit('user_data', client_data);
	});

	socket.on('disconnect', function() {
		delete clients[socket.id];
		push_to_all();
	});
});

io.listen(80);
