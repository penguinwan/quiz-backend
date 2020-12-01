exports.save = async (aws, tableName, id, ...questions) => {
  const ddb = new aws.DynamoDB.DocumentClient();

  const params = {
    TableName: tableName,
    Item: {
      batch_id: id,
      questions: [...questions]
    }
  };

  await ddb.put(params).promise();
}

exports.saveQuestion = async (aws, tableName, batchId, question) => {
  const ddb = new aws.DynamoDB.DocumentClient();

  const existing = await ddb.get({ TableName: tableName, Key: { batch_id: batchId } }).promise();
  let batch = {};
  if (existing.Item) {
    batch = {
      batch_id: existing.Item.batch_id,
      questions: [...existing.Item.questions, question]
    };
  } else {
    batch = {
      batch_id: batchId,
      questions: [question]
    };
  }

  await ddb.put({ TableName: tableName, Item: batch }).promise();
}

exports.lockQuestion = async (aws, tableName, batchId) => {  
  const ddb = new aws.DynamoDB.DocumentClient();
  const params = {
    TableName: tableName,
    Key: { batch_id : batchId },
    UpdateExpression: 'set is_locked = :isLocked',
    ExpressionAttributeValues: {
      ':isLocked' : true
    }
  };
  
  await ddb.update(params).promise();
}