exports.fetch = async (aws, tableName, id) => {
  const ddb = new aws.DynamoDB.DocumentClient();
  const dbResult = await ddb.get({ TableName: tableName, Key: { batch_id: id } }).promise();
  if (dbResult.Item && !dbResult.Item.is_locked) {
    const result = {
      ...dbResult.Item,
      allowed_time: parseInt(process.env.ALLOWED_TIME),
    }
    return result;
  } else {
    return undefined;
  }
}