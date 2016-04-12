var io = require('socket.io')();
var haversine = require('haversine');



/*
Stores all client (user) data in memory
user_id: {
	data: {user, lat, long, nearby},
	nearby: [list of users],
	socket_id
}
*/
var clients = {};

// Stores the socket objects by socket ID
// Socket id => Socket
var connections = {};

// Radius in kilometers to use for computing nearby users
var DAP_RADIUS = 1.0;

// Port to run socket.io server on
var SERVER_PORT = 80;



function get_data() {
	// Get public user data to send back to clients
	var data = [];
	for (var client_id in clients) {
		var client = clients[client_id];
		// Ensure there is data from this user before sending it
		if (client.data && Object.keys(client.data).length > 0) {
			data.push(client.data);
		}
	}
	return data;
}

function push_to_all() {
	// Send data to all clients
	var client_data = get_data();
	io.emit('user_data', client_data);
}

// Returns the distance in kilometers between two geographic locations
function get_distance(source, dest) {
	if (source != dest) {
		var source_client = clients[source].data;
		var dest_client = clients[dest].data;
		if ('lat' in source_client && 'lng' in source_client
				&& 'lat' in dest_client && 'lng' in dest_client) {
			// Get start and end points
			var start = {
				latitude: source_client.lat,
				longitude: source_client.lng
			};
			var end = {
				latitude: dest_client.lat,
				longitude: dest_client.lng
			};

			// Compute the distance using haversine
			return haversine(start, end);
		}
	}
	return null;
}

// Returns a list of nearby user IDs based on dap radius
function get_nearby_users(source, radius) {
	var nearby_users = [];
	radius = radius || DAP_RADIUS

	for (var dest in clients) {
		var distance = get_distance(source, dest);
		if (distance && distance < radius) {
			nearby_users.push(dest);
		}
	}

	return nearby_users;
}

// Sets the nearby user lists and booleans
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
			console.log("User disconnected: " + user_id);
			delete clients[user_id];
		}
	}
}

function handle_on_connection(socket) {
	// Send data to newly connected client
	var client_data = get_data();
	socket.emit('user_data', client_data);

	// Keep socket object to use for future communications
	connections[socket.id] = socket;

	console.log('Client ' + socket.id + ' connected');

	sync_users();
}

function handle_user_data(socket, data) {
	if ('user' in data) {
		// Add new user if needed
		if (data.user in clients) {
			// Merge fields from user's message
			// TODO: Make this generic and move "nearby" and other data originating from server to another parent in the dictionary
			var client = clients[data.user];
			client.data.user = data.user;
			client.data.lat = data.lat;
			client.data.lng = data.lng;
		} else {
			// Create new client with data from message
			clients[data.user] = {
				data: data,
				nearby: [],
				socket_id: socket.id
			};
		}

		// Compute nearby users
		update_nearby_users();

		// Send to all clients (nearby may have changed)
		push_to_all();
	}
}

function handle_notification(socket, data) {
	// Received notification from client
	if ('user' in data && data.user in clients) {
		var nearby = clients[data.user].nearby;

		// Forward message to all nearby clients
		for (var user in nearby) {
			connections[clients[nearby[user]].socket_id].emit('notification', {
				'source_user': data.user
			});
		}
	}
}

function handle_disconnect(socket) {
	// Remove socket and user when they disconnect
	delete connections[socket.id];
	sync_users();

	// Notify other users that this client disconnected
	push_to_all();
}

function register_socket_handlers(socket) {
	socket.on('user_data', function(data) {
		handle_user_data(socket, data);
	});

	socket.on('notification', function(data) {
		handle_notification(socket, data);
	});

	socket.on('disconnect', function() {
		handle_disconnect(socket);
	});
}

// Handle when new clients connect
io.on('connection', function(socket) {
	handle_on_connection(socket);
	register_socket_handlers(socket);
});

// Start socket.io server
io.listen(SERVER_PORT);
