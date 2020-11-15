exports.save = async (aws, tableName, batchid, sessionid, responsetime, ...answers) => {
  const ddb = new aws.DynamoDB.DocumentClient();

  const params = {
    TableName: tableName,
    Item: {
      batch_id: batchid,
      session_id: sessionid,
      response_time: responsetime,
      answers: [ ...answers ]
    }
  };

  await ddb.put(params).promise();
}

