var io = require('socket.io')();
var haversine = require('haversine');

/*
User id => {
	data: (user, lat, long, nearby),
	nearby (list of users),
	socket_id
}
*/
var clients = {};

// Socket id => Socket
var connections = {};

// Socket id => Nearby user list
// var nearby = {};

function get_data() {
	// Get data to send
	var data = [];
	for (var client_id in clients) {
		var client = clients[client_id];
		if (client.data && client.data.length > 0) {
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

function update_nearby_users() {
	for (var source in clients) {
		var nearby_users = get_nearby_users(source);

		// Nearby user list
		clients[source].nearby = nearby_users;

		// Nearby user boolean
		clients[source].data.nearby = (nearby_users.length > 0);
	}
}

function sync_users() {
	// Delete users without socket connections
	for (var user_id in clients) {
		var socket_id = clients[user_id];
		if (!(socket_id in connections)) {
			delete clients[user_id];
		}
	}
}

io.on('connection', function(socket) {

	// Send data to newly connected client
	var client_data = get_data();
	socket.emit('user_data', client_data);

	connections[socket.id] = socket;

	console.log('Client ' + socket.id + ' connected');

	sync_users();

	socket.on('user_data', function(data) {
		console.log("Received data from: " + socket.id);
		console.log(data);
		if ('user' in data) {
			// Add new user if needed
			if (!(data.user in clients)) {
				clients[data.user] = {
					data: {},
					nearby: [],
					socket_id: socket.id
				};
			}

			// Compute nearby users
			update_nearby_users();

			// Send to all clients (nearby may have changed)
			push_to_all();
		}
	});

	socket.on('disconnect', function() {
		delete connections[socket.id];
		sync_users();
		push_to_all();
	});
});

io.listen(80);
