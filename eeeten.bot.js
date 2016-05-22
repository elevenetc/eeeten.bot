/**
 * To run:
 * env token=<token> node eeeten.bot.js
 */

if (!process.env.token) {
	logError('Error: Specify token in environment');
	process.exit(1);
}

var usersMap = {};
var invitationUsersQueue = [];

var STATE_IDLE = 'idle';
var STATE_CANDIDATE = 'candidate';
var STATE_ACCEPTED = 'accepted';
var STATE_DECLINED = 'declined';
var STATE_NO_ANSWER = 'noAnswer';

var config = require("./config.js");
var botkit = require('botkit');
var cron = require('cron');
var controller = botkit.slackbot({debug: false});
var bot = controller.spawn({token: process.env.token});

bot.startRTM();

function U(name, id) {
	this.name = name;
	this.id = id;
	this.state = STATE_IDLE;
}

controller.on('rtm_open', function (bot) {
	//console.log('Bot is connected');
});

controller.hears('start', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {

	var listOfChosenUsers = getListOfChosenUsers();
	var invitationIsInProgress = isInvitationIsInProgress();

	if (invitationIsInProgress) {
		bot.reply(message, 'I\'m already searching for people!');
	} else {

		if (listOfChosenUsers.length > 0) {
			bot.reply(message, 'For today I\'ve already found people: ' + listOfChosenUsers + '\n If you want to find other people send "reset" command.');
		} else {
			bot.reply(message, 'Ok! I\'ve started invitation process.');
			startSearchForPeople();
		}

	}

});

controller.hears('status', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
	var invitationIsInProgress = isInvitationIsInProgress();
	var listOfChosenUsers = getListOfChosenUsers();
	bot.reply(message,
		'Status:\nSearching in progress: ' + invitationIsInProgress +
		'\n Chosen people: ' + (listOfChosenUsers.length == 0 ? 'no' : listOfChosenUsers)
	);
});

controller.hears('echo', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
	bot.reply(message, 'echo: ok');
});

controller.hears('reset', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
	var invitationIsInProgress = isInvitationIsInProgress();
	var listOfChosenUsers = getListOfChosenUsers();

	if (invitationIsInProgress) {
		bot.reply(message, 'I\'m already searching for people!');
	} else {
		if (listOfChosenUsers.length > 0) {
			bot.reply(message, 'Ok! I\'ve started invitation process.');
			startSearchForPeople();
		} else {
			bot.reply(message, 'No people were chosen today. Send "start" command and I\'ll find people for today.');
		}
	}
});

controller.hears('yes', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
	logMessageFromUser(message);
	var userId = message.user;
	var wasCandidate = false;

	if (usersMap.hasOwnProperty(userId)) {
		var user = usersMap[userId];
		if (user.state === STATE_CANDIDATE) {
			user.state = STATE_ACCEPTED;
			wasCandidate = true;
		}
	}

	if (wasCandidate) bot.reply(message, 'Thanks for help!');
});

controller.hears('no', ['direct_message', 'direct_mention', 'mention'], function (bot, message) {
	logMessageFromUser(message);
	var userId = message.user;
	if (usersMap.hasOwnProperty(userId)) {

		var user = usersMap[userId];
		if (user.state === STATE_CANDIDATE) {
			user.state = STATE_DECLINED;
		}

	}
});

function startSearchForPeople() {

	invitationUsersQueue.length = 0;
	usersMap = {};

	bot.api.users.list({}, function (err, response) {
		if (response.hasOwnProperty('members') && response.ok) {
			var total = response.members.length;
			for (var i = 0; i < total; i++) {
				var member = response.members[i];

				if (config.ignoredUsers.indexOf(member.name) > -1) continue;

				var user = new U(member.name, member.id);
				usersMap[member.id] = user;
				invitationUsersQueue.push(user);
			}

			randomizeArray(invitationUsersQueue);

			for (var i = 0; i < config.teamSize; i++) nextUser();

		} else {
			logError('Unable to load list of users');
		}
	});
}

function nextUser() {

	if (invitationUsersQueue.length == 0) {

		for (var userId in usersMap) {
			if (usersMap[userId].state == STATE_CANDIDATE) {
				return;
			}
		}

		var listOfChosenUsers = getListOfChosenUsers();
		if (listOfChosenUsers.length == 0) {
			sendMessageTo(config.workingChannel, 'Nobody wants to help today :(');
		} else {
			console.log(listOfChosenUsers.toString());
			sendMessageTo(config.workingChannel, 'Today next people help to serve the lunch:' + listOfChosenUsers.toString());
		}


		printUsers(usersMap);
	} else {
		var user = invitationUsersQueue.shift();
		startWaitForUser(user);
	}
}

function startWaitForUser(user) {

	user.state = STATE_CANDIDATE;

	sendMessageToUser(user, 'Hello ' + user.name + '!!! Are you ready to help? Say "no" if you\'re busy.');

	setTimeout(function () {

		if (user.state === STATE_CANDIDATE) {
			user.state = STATE_NO_ANSWER;
			sendMessageToUser(user, 'Ok, sorry for disturbance. I try to find another person to help.');
		}

		nextUser();

	}, config.waitingTime);
}

function sendMessageToUser(user, text) {

	var isNotTestUser = config.testUsers.length > 0 && config.testUsers.indexOf(user.name) > -1;
	if (isNotTestUser) sendMessageTo(user.id, text);
	logMessageToUser(user.name, text);
}

function sendMessageTo(channelId, text) {
	bot.api.chat.postMessage(
		{text: text, channel: channelId, as_user: true},
		function (error, response) {
			if (error != null) logError(error);
		}
	);
}

/**
 * Utils
 */

function logMessageToUser(name, text) {
	console.log('Message to ' + name + ': ' + text);
}

function logMessageFromUser(message) {
	var userId = message.user;
	console.log('Message from ' + userId + ': ' + message.text);
}

function logError(errorMessage) {
	console.log('Error: ' + errorMessage);
}

function randomizeArray(array) {
	for (var i = array.length - 1; i > 0; i--) {
		var aIndex = Math.floor(Math.random() * (i + 1));
		var bIndex = array[i];
		array[i] = array[aIndex];
		array[aIndex] = bIndex;
	}
	return array;
}

function printUsers(users) {
	console.log(users);
}

function isInvitationIsInProgress() {
	for (var userId in usersMap) {
		if (usersMap[userId].state == STATE_CANDIDATE) {
			return true;
		}
	}
	return false;
}

function getListOfChosenUsers() {
	var result = [];
	for (var userId in usersMap) {
		var user = usersMap[userId];
		if (user.state == STATE_ACCEPTED) {
			result.push(user.name);
		}
	}
	return result;
}