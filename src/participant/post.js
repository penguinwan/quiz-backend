const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

exports.save = async (tableName, data) => {
  console.log('hello world');

  const params = {
    TableName: tableName,
    Item: {
      session_id: 'sessionid',
      nickname: 'nickname'
    }
  };

  try {
    await ddb.put(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ nickname, sessionid })
    }
  } catch (e) {
    console.error(`ERROR: ${e}`);
    return {
      statusCode: 500
    }
  }
}