const AWS = require('aws-sdk');
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
  const batch_id = event.pathParameters.batch_id;
  const result = await fetch(AWS, TABLE_NAME, batch_id);

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
  const batch_id = body.batch_id;
  const questions = body.questions;
  try {
    await save(AWS, TABLE_NAME, batch_id, ...questions);
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