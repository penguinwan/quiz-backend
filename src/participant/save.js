exports.save = async (aws, tableName, session_id, nickname) => {
  const ddb = new aws.DynamoDB.DocumentClient();

  const params = {
    TableName: tableName,
    Item: { session_id, nickname }
  };

  await ddb.put(params).promise();
}