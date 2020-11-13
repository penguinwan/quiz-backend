const AWS = require('aws-sdk');
const uuid = require('uuid');
const { save } = require('./save');
const { fetch } = require('./fetch');

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    return get(event);
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

async function get(event) {
  const session_id = event.pathParameters.session_id;
  const result = await fetch(AWS, TABLE_NAME, session_id);

  if (result) {
    return {
      'statusCode': 200,
      'body': JSON.stringify({
        nickname: result.nickname,
        session_id: result.session_id
      }),
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
  const nickname = body.nickname;
  const session_id = uuid.v4();
  try {
    await save(AWS, TABLE_NAME, session_id, nickname);
    return {
      'statusCode': 200,
      'body': JSON.stringify({ nickname, session_id }),
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