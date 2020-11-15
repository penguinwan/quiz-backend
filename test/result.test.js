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
      3000,
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
      response_time: 3000,
      answers: [
        { id: 'a1', answer: 'a' },
        { id: 'a2', answer: 'b' }
      ]
    });
  });

  it('should not save double result', async function () {
    await save(AWS,
      TABLE_NAME,
      'batch-456',
      'session-456',
      3000,
      { id: 'a1', answer: 'a' }
    );

    await save(AWS,
      TABLE_NAME,
      'batch-456',
      'session-456',
      3000,
      { id: 'a1', answer: 'double' }
    );

    const result = await doc.get({
      TableName: TABLE_NAME,
      Key: { batch_id: 'batch-456', session_id: 'session-456' }
    }).promise();

    expect(result.Item).to.eql({
      batch_id: 'batch-456',
      session_id: 'session-456',
      response_time: 3000,
      answers: [
        { id: 'a1', answer: 'a' }
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
      3000,
      { id: 'b1-q1', answer: 'b1-q1-a1-correct' },
      { id: 'b1-q2', answer: 'b1-q2-a1-correct' }
    );
    await save(AWS,
      TABLE_NAME,
      'batch2',
      'session1',
      3000,
      { id: 'b2-q1', answer: 'b2-q1-a2-correct' },
      { id: 'b2-q2', answer: 'b2-q2-a1' }
    );

    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session2',
      3000,
      { id: 'b1-q1', answer: 'b1-q1-a2' },
      { id: 'b1-q2', answer: 'b1-q2-a2' }
    );
    await save(AWS,
      TABLE_NAME,
      'batch2',
      'session2',
      3000,
      { id: 'b2-q1', answer: 'b2-q1-a1' },
      { id: 'b2-q2', answer: 'b2-q2-a2-correct' }
    );

    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session3',
      3000,
      { id: 'b1-q1', answer: 'b1-q1-a1-correct' },
      { id: 'b1-q2', answer: 'b1-q2-a1-correct' }
    );
    await save(AWS,
      TABLE_NAME,
      'batch2',
      'session3',
      3000,
      { id: 'b2-q1', answer: 'b2-q1-a2-correct' },
      { id: 'b2-q2', answer: 'b2-q2-a2-correct' }
    );

    const result = await leaderboard(AWS, 'Batch', 'Participant', 'Result');
    expect(result).is.eql({
      rank: [
        { session_id: 'session3', nickname: 'nickname3', total: 4, score: 4, response_time: 6000 },
        { session_id: 'session1', nickname: 'nickname1', total: 4, score: 3, response_time: 6000 },
        { session_id: 'session2', nickname: 'nickname2', total: 4, score: 1, response_time: 6000 }
      ]
    });
  })

  it('leaderboard - id is batch-dependent', async function () {
    const participantSave = require('../src/participant/save').save;
    const batchSave = require('../src/batch/save').save;
    const { question, answer } = require('../src/batch/question');
    const leaderboard = require('../src/result/leaderboard').leaderboard;

    await participantSave(AWS, 'Participant', 'session1', 'nickname1');

    await batchSave(AWS, 'Batch', 'batch1',
      question('1', 'b1-q1', 'b1-q1-a1-correct', answer('b1-q1-a1-correct', 'b1-q1-a1'), answer('b1-q1-a2', 'b1-q1-a2')),
      question('2', 'b1-q2', 'b1-q2-a1-correct', answer('b1-q2-a1-correct', 'b1-q2-a1'), answer('b1-q2-a2', 'b1-q2-a2'))
    )
    await batchSave(AWS, 'Batch', 'batch2',
      question('1', 'b2-q1', 'b2-q1-a2-correct', answer('b2-q1-a1', 'b2-q1-a1'), answer('b2-q1-a2-correct', 'b2-q1-a2')),
      question('2', 'b2-q2', 'b2-q2-a2-correct', answer('b2-q2-a1', 'b2-q2-a1'), answer('b2-q2-a2-correct', 'b2-q2-a2-correct'))
    )

    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session1',
      3000,
      { id: '1', answer: 'b1-q1-a1-correct' },
      { id: '2', answer: 'b1-q2-a1-correct' }
    );
    await save(AWS,
      TABLE_NAME,
      'batch2',
      'session1',
      3000,
      { id: '1', answer: 'b2-q1-a2-correct' },
      { id: '2', answer: 'b2-q2-a1' }
    );

    const result = await leaderboard(AWS, 'Batch', 'Participant', 'Result');
    expect(result).is.eql({
      rank: [
        { session_id: 'session1', nickname: 'nickname1', total: 4, score: 3, response_time: 6000 }
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
        { session_id: 'session2', nickname: 'nickname2', total: 0, score: 0, response_time: 0 },
        { session_id: 'session1', nickname: 'nickname1', total: 0, score: 0, response_time: 0 }
      ]
    });
  })

  it('leaderboard sort by response time', async function () {
    const participantSave = require('../src/participant/save').save;
    const batchSave = require('../src/batch/save').save;
    const { question, answer } = require('../src/batch/question');
    const leaderboard = require('../src/result/leaderboard').leaderboard;

    await participantSave(AWS, 'Participant', 'session1', 'nickname1');
    await participantSave(AWS, 'Participant', 'session2', 'nickname2');
    await participantSave(AWS, 'Participant', 'session3', 'nickname3');
    await participantSave(AWS, 'Participant', 'session4', 'nickname4');

    await batchSave(AWS, 'Batch', 'batch1',
      question('1', '1', 'correct', answer('correct', 'correct'), answer('wrong', 'wrong')),
      question('2', '2', 'correct', answer('correct', 'correct'), answer('wrong', 'wrong')),
      question('3', '3', 'correct', answer('correct', 'correct'), answer('wrong', 'wrong')),
      question('4', '4', 'correct', answer('correct', 'correct'), answer('wrong', 'wrong')),
      question('5', '5', 'correct', answer('correct', 'correct'), answer('wrong', 'wrong')),
      question('6', '6', 'correct', answer('correct', 'correct'), answer('wrong', 'wrong'))
    )

    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session1',
      5000,
      { id: '1', answer: 'correct' },
      { id: '2', answer: 'correct' },
      { id: '3', answer: 'correct' },
      { id: '4', answer: 'correct' },
      { id: '5', answer: 'correct' },
      { id: '6', answer: 'correct' }
    );
    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session4',
      1000,
      { id: '1', answer: 'correct' },
      { id: '2', answer: 'correct' },
      { id: '3', answer: 'correct' },
      { id: '4', answer: 'wrong' },
      { id: '5', answer: 'wrong' },
      { id: '6', answer: 'wrong' }
    );
    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session2',
      3000,
      { id: '1', answer: 'correct' },
      { id: '2', answer: 'correct' },
      { id: '3', answer: 'correct' },
      { id: '4', answer: 'correct' },
      { id: '5', answer: 'correct' },
      { id: '6', answer: 'correct' }
    );
    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session3',
      3000,
      { id: '1', answer: 'correct' },
      { id: '2', answer: 'correct' },
      { id: '3', answer: 'correct' },
      { id: '4', answer: 'wrong' },
      { id: '5', answer: 'wrong' },
      { id: '6', answer: 'wrong' }
    );

    const result = await leaderboard(AWS, 'Batch', 'Participant', 'Result');
    expect(result).is.eql({
      rank: [
        { session_id: 'session2', nickname: 'nickname2', total: 6, score: 6, response_time: 3000 },
        { session_id: 'session1', nickname: 'nickname1', total: 6, score: 6, response_time: 5000 },
        { session_id: 'session4', nickname: 'nickname4', total: 6, score: 3, response_time: 1000 },
        { session_id: 'session3', nickname: 'nickname3', total: 6, score: 3, response_time: 3000 }
      ]
    });
  })

  it('leaderboard shows partial result', async function () {
    const participantSave = require('../src/participant/save').save;
    const batchSave = require('../src/batch/save').save;
    const { question, answer } = require('../src/batch/question');
    const leaderboard = require('../src/result/leaderboard').leaderboard;

    await participantSave(AWS, 'Participant', 'session1', 'nickname1');
    await participantSave(AWS, 'Participant', 'session2', 'nickname2');
    await participantSave(AWS, 'Participant', 'session3', 'nickname3');

    await batchSave(AWS, 'Batch', 'batch1',
      question('1', '1', 'correct', answer('correct', 'correct'), answer('wrong', 'wrong')),
      question('2', '2', 'correct', answer('correct', 'correct'), answer('wrong', 'wrong')),
      question('3', '3', 'correct', answer('correct', 'correct'), answer('wrong', 'wrong')),
      question('4', '4', 'correct', answer('correct', 'correct'), answer('wrong', 'wrong')),
      question('5', '5', 'correct', answer('correct', 'correct'), answer('wrong', 'wrong')),
      question('6', '6', 'correct', answer('correct', 'correct'), answer('wrong', 'wrong'))
    )

    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session1',
      5000,
      { id: '1', answer: 'correct' },
      { id: '2', answer: 'correct' },
      { id: '5', answer: 'correct' },
      { id: '6', answer: 'correct' }
    );
    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session2',
      3000,
      { id: '1', answer: 'correct' },
      { id: '2', answer: 'correct' },
      { id: '3', answer: 'correct' },
      { id: '4', answer: 'correct' }
    );
    await save(AWS,
      TABLE_NAME,
      'batch1',
      'session3',
      3000,
      { id: '1', answer: 'correct' },
      { id: '5', answer: 'wrong' },
      { id: '6', answer: 'wrong' }
    );

    const result = await leaderboard(AWS, 'Batch', 'Participant', 'Result');
    expect(result).is.eql({
      rank: [
        { session_id: 'session2', nickname: 'nickname2', total: 4, score: 4, response_time: 3000 },
        { session_id: 'session1', nickname: 'nickname1', total: 4, score: 4, response_time: 5000 },
        { session_id: 'session3', nickname: 'nickname3', total: 3, score: 1, response_time: 3000 }
      ]
    });
  })
});