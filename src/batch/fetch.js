exports.fetch = async (aws, tableName, id) => {
  const ddb = new aws.DynamoDB.DocumentClient();
  const result = await ddb.get({ TableName: tableName, Key: { batch_id: id } }).promise();
  return result.Item;
}