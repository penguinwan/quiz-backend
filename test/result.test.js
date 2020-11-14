const AWS = require('aws-sdk');
AWS.config.update({
  region: 'eu-central-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: "fakeMyKeyId",
  secretAccessKey: "fakeSecretAccessKey"
});
const ddb = new AWS.DynamoDB();
const doc = new AWS.DynamoDB.DocumentClient();
const save = require('../src/result/save').save;
const expect = require('chai').expect;

const TABLE_NAME = 'Result';

describe('result', function () {
  before(async () => {
    const result = await ddb.listTables({}).promise();
    if (!result.TableNames.includes('Result')) {
      await ddb.createTable({
        TableName: TABLE_NAME,
        KeySchema: [{ AttributeName: 'session_id', KeyType: 'HASH', }, { AttributeName: 'batch_id', KeyType: 'RANGE', }],
        AttributeDefinitions: [{ AttributeName: 'session_id', AttributeType: 'S', }, { AttributeName: 'batch_id', AttributeType: 'S', }],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5, },
      }).promise();
    }
  })

  afterEach(async () => {
    const batchScan = await ddb.scan({ TableName: 'Batch' }).promise();
    if (batchScan.Items) {
      batchScan.Items.forEach(async (it) => {
        await ddb.deleteItem({ TableName: 'Batch', Key: { batch_id: { S: it.batch_id.S } } }).promise();
      })
    }

    const participantScan = await ddb.scan({ TableName: 'Participant' }).promise();
    if (participantScan.Items) {
      participantScan.Items.forEach(async (it) => {
        await ddb.deleteItem({ TableName: 'Participant', Key: { session_id: { S: it.session_id.S } } }).promise();
      })
    }

    const scan = await ddb.scan({ TableName: TABLE_NAME }).promise();
    if (scan.Items) {
      scan.Items.forEach(async (it) => {
        await ddb.deleteItem({
          TableName: TABLE_NAME,
          Key: {
            batch_id: { S: it.batch_id.S },
            session_id: { S: it.session_id.S }
          }
        }).promise();
      })
    }
  })

  it('save result', async function () {
    await save(AWS,
      TABLE_NAME,
      'batch-123',
      'session-123',
      { id: 'a1', answer: 'a' },
      { id: 'a2', answer: 'b' }
    );

    const result = await doc.get({
      TableName: TABLE_NAME,
      Key: { batch_id: 'batch-123', session_id: 'session-123' }
    }).promise();

    expect(result.Item).to.eql({
      batch_id: 'batch-123',
      session_id: 'session-123',
      answers: [
        { id: 'a1', answer: 'a' },
        { id: 'a2', answer: 'b' }
      ]
    });
  });

  it('leaderboard', async function () {
    const participantSave = require('../src/participant/save').save;
    const batchSave = require('../src/batch/save').save;
    const { question, answer } = require('../src/batch/question');
    const leaderboard = require('../src/result/leaderboard').leaderboard;

    await participantSave(AWS, 'Participant', 'session1', 'nickname1');
    await participantSave(AWS, 'Participant', 'session2', 'nickname2');
    await participantSave(AWS, 'Participant', 'session3', 'nickname3');

    await batchSave(AWS, 'Batch', 'batch1',
      question('b1-q1', 'b1-q1', 'b1-q1-a1-correct', answer('b1-q1-a1-correct', 'b1-q1-a1'), answer('b1-q1-a2', 'b1-q1-a2')),
      question('b1-q2', 'b1-q2', 'b1-q2-a1-correct', answer('b1-q2-a1-correct', 'b1-q2-a1'), answer('b1-q2-a2', 'b1-q2-a2'))
    )
    await batchSave(AWS, 'Batch', 'batch2',
      question('b2-q1', 'b2-q1', 'b2-q1-a2-correct', answer('b2-q1-a1', 'b2-q1-a1'), answer('b2-q1-a2-correct', 'b2-q1-a2')),
      question('b2-q2', 'b2-q2', 'b2-q2-a2-correct', answer('b2-q2-a1', 'b2-q2-a1'), answer('b2-q2-a2-correct', 'b2-q2-a2-correct'))
    )

    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session1',
      { id: 'b1-q1', answer: 'b1-q1-a1-correct' },
      { id: 'b1-q2', answer: 'b1-q2-a1-correct' }
    );
    await save(AWS,
      TABLE_NAME,
      'batch2',
      'session1',
      { id: 'b2-q1', answer: 'b2-q1-a2-correct' },
      { id: 'b2-q2', answer: 'b2-q2-a1' }
    );

    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session2',
      { id: 'b1-q1', answer: 'b1-q1-a2' },
      { id: 'b1-q2', answer: 'b1-q2-a2' }
    );
    await save(AWS,
      TABLE_NAME,
      'batch2',
      'session2',
      { id: 'b2-q1', answer: 'b2-q1-a1' },
      { id: 'b2-q2', answer: 'b2-q2-a2-correct' }
    );

    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session3',
      { id: 'b1-q1', answer: 'b1-q1-a1-correct' },
      { id: 'b1-q2', answer: 'b1-q2-a1-correct' }
    );
    await save(AWS,
      TABLE_NAME,
      'batch2',
      'session3',
      { id: 'b2-q1', answer: 'b2-q1-a2-correct' },
      { id: 'b2-q2', answer: 'b2-q2-a2-correct' }
    );

    const result = await leaderboard(AWS, 'Batch', 'Participant', 'Result');
    expect(result).is.eql({
      rank: [
        { session_id: 'session3', nickname: 'nickname3', total: 4, score: 4 },
        { session_id: 'session1', nickname: 'nickname1', total: 4, score: 3 },
        { session_id: 'session2', nickname: 'nickname2', total: 4, score: 1 }
      ]
    });
  })

  it('leaderboard should return empty', async function () {
    const participantSave = require('../src/participant/save').save;
    const batchSave = require('../src/batch/save').save;
    const { question, answer } = require('../src/batch/question');
    const leaderboard = require('../src/result/leaderboard').leaderboard;

    await participantSave(AWS, 'Participant', 'session1', 'nickname1');
    await participantSave(AWS, 'Participant', 'session2', 'nickname2');

    await batchSave(AWS, 'Batch', 'batch1',
      question('b1-q1', 'b1-q1', 'b1-q1-a1-correct', answer('b1-q1-a1-correct', 'b1-q1-a1'), answer('b1-q1-a2', 'b1-q1-a2')),
      question('b1-q2', 'b1-q2', 'b1-q2-a1-correct', answer('b1-q2-a1-correct', 'b1-q2-a1'), answer('b1-q2-a2', 'b1-q2-a2'))
    )
    await batchSave(AWS, 'Batch', 'batch2',
      question('b2-q1', 'b2-q1', 'b2-q1-a2-correct', answer('b2-q1-a1', 'b2-q1-a1'), answer('b2-q1-a2-correct', 'b2-q1-a2')),
      question('b2-q2', 'b2-q2', 'b2-q2-a2-correct', answer('b2-q2-a1', 'b2-q2-a1'), answer('b2-q2-a2-correct', 'b2-q2-a2-correct'))
    )

    const result = await leaderboard(AWS, 'Batch', 'Participant', 'Result');
    expect(result).is.eql({
      rank: [
        { session_id: 'session2', nickname: 'nickname2', total: 0, score: 0 },
        { session_id: 'session1', nickname: 'nickname1', total: 0, score: 0 }
      ]
    });
  })
});