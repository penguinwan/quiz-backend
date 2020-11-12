exports.fetch = async (aws, tableName, sessionid) => {
  const ddb = new aws.DynamoDB.DocumentClient();
  const result = await ddb.get({ TableName: tableName, Key: { session_id: sessionid } }).promise();
  return result.Item;
}