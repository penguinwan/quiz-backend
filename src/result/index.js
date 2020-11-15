const AWS = require('aws-sdk');
const { save } = require('./save');
const { leaderboard } = require('./leaderboard');

const { RESULT_TABLE_NAME, PARTICIPANT_TABLE_NAME, BATCH_TABLE_NAME } = process.env;

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    return get();
  } else if (event.httpMethod === 'POST') {
    return post(event);
  } else {
    return {
      'statusCode': 418,
      'headers': {
        'Access-Control-Allow-Origin': '*',
      }
    }
  }
}

async function get() {
  const result = await leaderboard(AWS, BATCH_TABLE_NAME, PARTICIPANT_TABLE_NAME, RESULT_TABLE_NAME);

  if (result) {
    return {
      'statusCode': 200,
      'body': JSON.stringify(result),
      'headers': {
        'Access-Control-Allow-Origin': '*',
      }
    }
  } else {
    return {
      'statusCode': 404,
      'headers': {
        'Access-Control-Allow-Origin': '*',
      }
    }
  }
}

async function post(event) {
  const body = JSON.parse(event.body);
  const { batch_id, session_id, response_time, answers } = body;
  try {
    await save(AWS, RESULT_TABLE_NAME, batch_id, session_id, response_time, ...answers);
    return {
      'statusCode': 200,
      'headers': {
        'Access-Control-Allow-Origin': '*',
      }
    }
  } catch (e) {
    console.error(`ERROR: ${e}`);
    return {
      'statusCode': 500,
      'headers': {
        'Access-Control-Allow-Origin': '*',
      }
    }
  }
}