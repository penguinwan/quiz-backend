exports.leaderboard = async (aws, batchTable, participantTable, resultTable) => {
  const ddb = new aws.DynamoDB.DocumentClient();

  const batches = (await ddb.scan({ TableName: batchTable }).promise()).Items;
  const participants = (await ddb.scan({ TableName: participantTable }).promise()).Items;
  const results = (await ddb.scan({ TableName: resultTable }).promise()).Items;

  let rank = [];
  for (let participantIndex = 0; participantIndex < participants.length; participantIndex++) {
    const session_id = participants[participantIndex].session_id;
    const nickname = participants[participantIndex].nickname;

    let total = 0;
    let score = 0;
    let response_time = 0;
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const { batch_id, questions } = batches[batchIndex];
      response_time += findResponseTime(results, session_id, batch_id);
      for (let questionIndex = 0; questionIndex < questions.length; questionIndex++) {
        const { id, correct } = questions[questionIndex];
        const answer = findAnswer(results, session_id, batch_id, id);
        if (answer) {
          total++;
          if (answer.answer === correct) {
            score++;
          }
        }
      }

    }
    rank.push({ session_id, nickname, total, score, response_time });
  }

  let sorted = rank.sort((first, second) => {
    if(second.score === first.score) {
      return first.response_time - second.response_time;
    } else {
      return second.score - first.score;
    }
  });

  return { rank: sorted };
}

function findAnswer(results, session_id, batch_id, question_id) {
  const result = results.find((it) => it.session_id === session_id && it.batch_id === batch_id);
  return (result && result.answers) ? result.answers.find((it) => it.id === question_id) : null;
}

function findResponseTime(results, session_id, batch_id) {
  const result = results.find((it) => it.session_id === session_id && it.batch_id === batch_id);
  return result ? result.response_time : 0;
}