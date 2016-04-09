var io = require('socket.io')();
var haversine = require('haversine');

// User id => User
var clients = {};
/*
Now:
	Socket id => {
		data: (user, lat, long, nearby),
		socket,
		nearby
	}
*/

// Socket id => Socket
// var connections = {};

// Socket id => Nearby user list
// var nearby = {};

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

function push_to_all() {
	// Send data to all clients
	var client_data = get_data();
	io.emit('user_data', client_data);
}

function get_distance(source, dest) {
	if (source != dest) {
		var source_client = clients[source].data;
		var dest_client = clients[dest].data;
		console.log('SOURCE: ' + source);
		if ('lat' in source_client && 'lng' in source_client
				&& 'lat' in dest_client && 'lng' in dest_client) {
			var start = {
				latitude: source_client.lat,
				longitude: source_client.lng
			};
			var end = {
				latitude: dest_client.lat,
				longitude: dest_client.lng
			};

			var distance = haversine(start, end);
			console.log(distance);
			return distance;
		}
	}
	return null;
}

function get_nearby_users(source) {
	var nearby_users = [];

	for (var dest in clients) {
		var distance = get_distance(source, dest);
		if (distance && distance < 0.02) {
			// nearby_users.push(clients[dest].data.user);
			nearby_users.push(dest);
		}
	}

	return nearby_users;
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

		// Compute nearby users
		var nearby_users = get_nearby_users(socket.id);
		update_nearby_users();

		// Send to all clients except sender
		var client_data = get_data();
		socket.broadcast.emit('user_data', client_data);

		// Send shortest distances to clients
		// io.emit('shortest', distances);
	});

	socket.on('disconnect', function() {
		delete clients[socket.id];
		push_to_all();
	});
});

io.listen(80);
