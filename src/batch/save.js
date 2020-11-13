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

