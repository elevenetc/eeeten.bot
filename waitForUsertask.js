/**
 * Created by eleven on 21/05/2016.
 */
function waitForUserTask(waitingUsers, bot, cron, user, handler) {
	if (user.name === "e.levenetc") {

		// var attemptTime = 1;
		// var job = cron.job('0-30 * * * * *', function () {
		// 	attemptTime--;
		// 	if (attemptTime == 0) {
		// 		console.log("Finished waiting for " + user.name);
		// 		job.stop();
		// 	}
		// });

		user.state = STATE_CANDIDATE;

		setTimeout(function () {

			console.log("Waiting for " + user.name + " finished");

			if (user.state === STATE_CANDIDATE) {
				user.state = STATE_NO_ANSWER;
				console.log("No answer from " + user.name + "");
			}

		}, 100);

		waitingUsers[user.id] = user;
		console.log("Start waiting for " + user.name);

		//job.start();

	}
}


exports.waitForUserTask = waitForUserTask;