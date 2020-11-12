const AWS = require('aws-sdk');
AWS.config.update({
  region: 'eu-central-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: "fakeMyKeyId",
  secretAccessKey: "fakeSecretAccessKey"
});
const ddb = new AWS.DynamoDB();
const save = require('../src/participant/save').save;
const fetch = require('../src/participant/fetch').fetch;
const expect = require('chai').expect;

const TABLE_NAME = 'Participant';

describe('post participant', function () {
  before(async () => {
    const result = await ddb.listTables({}).promise();
    if (!result.TableNames.includes('Participant')) {
      await ddb.createTable({
        TableName: TABLE_NAME,
        KeySchema: [{ AttributeName: 'session_id', KeyType: 'HASH', }],
        AttributeDefinitions: [{ AttributeName: 'session_id', AttributeType: 'S', }],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5, },
      }).promise();
    }
  })

  after(async () => {
    const scan = await ddb.scan({ TableName: TABLE_NAME }).promise();
    if (scan.Items) {
      scan.Items.forEach(async (it) => {
        await ddb.deleteItem({ TableName: TABLE_NAME, Key: { session_id: { S: it.session_id.S } } }).promise();
      })
    }
  })

  it('post and get should return result', async function () {
    await save(AWS, TABLE_NAME, 'sessionid-fix', 'nickname-fix');
    const result = await fetch(AWS, TABLE_NAME, 'sessionid-fix');

    expect(result.nickname).to.be.equal('nickname-fix');
    expect(result.session_id).to.be.equal('sessionid-fix');
  });

  it('fetch handle error', async function() {
    const result = await fetch(AWS, TABLE_NAME, 'non-existence');
    expect(result).undefined;
  })
});