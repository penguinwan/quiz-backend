exports.save = async (aws, tableName, batchid, sessionid, ...answers) => {
  const ddb = new aws.DynamoDB.DocumentClient();

  const params = {
    TableName: tableName,
    Item: {
      batch_id: batchid,
      session_id: sessionid,
      answers: [ ...answers ]
    }
  };

  await ddb.put(params).promise();
}

