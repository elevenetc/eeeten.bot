var DEBUG = true;

var waitingUsers = {};
var testUsers = [
	"e.levenetc"
];

var STATE_IDLE = "idle";
var STATE_CANDIDATE = "candidate";
var STATE_ACCEPTED = "accepted";
var STATE_DECLINED = "declined";
var STATE_NO_ANSWER = "noAnswer";

var botkit = require('botkit');
var cron = require('cron');
var controller = botkit.slackbot({debug: DEBUG});

if (!process.env.token) {
	console.log('Error: Specify token in environment');
	process.exit(1);
}

var bot = controller.spawn({
	token: process.env.token
});

bot.startRTM();

function U(name, id) {
	this.name = name;
	this.id = id;
	this.state = STATE_IDLE;
}

controller.on('rtm_open', function (bot) {

	console.log('Bot is connected');


	bot.api.users.list({}, function (err, response) {
		if (response.hasOwnProperty('members') && response.ok) {
			var total = response.members.length;
			for (var i = 0; i < total; i++) {
				var member = response.members[i];
				//console.log(member.name);
				var user = new U(member.name, member.id);
				startWaitForUser(bot, user);
			}
		}
	});
});


controller.hears('yes', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
	logMessageFromUser(message);
	var userId = message.user;

	if (waitingUsers.hasOwnProperty(userId)) {
		var user = waitingUsers[userId];

		if (user.state === STATE_CANDIDATE) {
			user.state = STATE_ACCEPTED;
			console.log("User " + user.name + " accepted invitation");
		}
	}
});

controller.hears('no', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
	logMessageFromUser(message);
	var userId = message.user;
	if (waitingUsers.hasOwnProperty(userId)) {

		var user = waitingUsers[userId];
		if (user.state === STATE_CANDIDATE) {
			user.state = STATE_DECLINED;
			console.log("User " + user.name + " declined invitation");
		}

	}
});

function startWaitForUser(bot, user) {
	if (testUsers.indexOf(user.name) > -1) {

		user.state = STATE_CANDIDATE;

		waitingUsers[user.id] = user;

		sendMessageToUser(user, 'Hello ' + user.name + '!!! Are you ready to help? Say "no" if you\'re busy.');

		setTimeout(function () {

			console.log("Waiting for " + user.name + " finished");

			if (user.state === STATE_CANDIDATE) {
				user.state = STATE_NO_ANSWER;
				sendMessageToUser(bot, user, 'Ok, sorry for disturbance. I try to find another person to help.');
			}

		}, 5000);

	}
}

function sendMessageToUser(user, text) {

	bot.api.chat.postMessage(
		{text: text, channel: user.id, as_user: true},
		function (err, response) {
			console.log("error:" + err);
			console.log("resp:" + response);
		}
	);

	logMessageToUser(user, text);
}

function logMessageToUser(user, text) {
	console.log("Message to " + user.name + ": " + text);
}

function logMessageFromUser(message) {
	var userId = message.user;
	console.log("Message from " + userId + ": " + message.text);
}