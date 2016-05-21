//var Botkit = require('../lib/Botkit.js');
var Botkit = require('botkit');

var controller = Botkit.slackbot({
  debug: false
});

controller.spawn({
  token: "xoxb-43681040471-ohuyBHDQKIO3NLrkg9cOAhj0"
}).startRTM()

controller.hears('hello',['direct_message','direct_mention','mention'],function(bot,message) {

  bot.reply(message,'Hello yourself.');

});