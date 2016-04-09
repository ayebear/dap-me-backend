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
	var data = get_data();

	// Send data to all clients
	for (var client_id in clients) {
		push_to_client(client_id, data);
	}
}

io.on('connection', function(socket) {

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
		push_to_all();
	});

	socket.on('disconnect', function() {
		delete clients[socket.id];
		push_to_all();
	});
});

io.listen(80);
