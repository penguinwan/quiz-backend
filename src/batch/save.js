exports.save = async (aws, tableName, id, ...questions) => {
  const ddb = new aws.DynamoDB.DocumentClient();

  const lowercaseBatchId = id.toLowerCase();
  const params = {
    TableName: tableName,
    Item: {
      batch_id: lowercaseBatchId,
      questions: [...questions]
    }
  };

  await ddb.put(params).promise();
}

exports.saveQuestion = async (aws, tableName, batchId, question) => {
  const ddb = new aws.DynamoDB.DocumentClient();

  const lowercaseBatchId = batchId.toLowerCase();
  const existing = await ddb.get({ TableName: tableName, Key: { batch_id: lowercaseBatchId } }).promise();
  let batch = {};
  if (existing.Item) {
    batch = {
      batch_id: existing.Item.batch_id,
      questions: [...existing.Item.questions, question]
    };
  } else {
    batch = {
      batch_id: lowercaseBatchId,
      questions: [question]
    };
  }

  await ddb.put({ TableName: tableName, Item: batch }).promise();
}

exports.lockQuestion = async (aws, tableName, batchId) => {  
  const ddb = new aws.DynamoDB.DocumentClient();

  const lowercaseId = batchId.toLowerCase();
  const params = {
    TableName: tableName,
    Key: { batch_id : lowercaseId },
    UpdateExpression: 'set is_locked = :isLocked',
    ExpressionAttributeValues: {
      ':isLocked' : true
    }
  };
  
  await ddb.update(params).promise();
}