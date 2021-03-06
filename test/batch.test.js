const AWS = require('aws-sdk');
AWS.config.update({
  region: 'eu-central-1',
  endpoint: 'http://localhost:8000',
  accessKeyId: "fakeMyKeyId",
  secretAccessKey: "fakeSecretAccessKey"
});
const ddb = new AWS.DynamoDB();
const save = require('../src/batch/save').save;
const saveQuestion = require('../src/batch/save').saveQuestion;
const fetch = require('../src/batch/fetch').fetch;
const { question, answer } = require('../src/batch/question');
const lockQuestion = require('../src/batch/save').lockQuestion;
const expect = require('chai').expect;

const TABLE_NAME = 'Batch';
process.env.ALLOWED_TIME = 3000;

describe('batch', function () {
  before(async () => {
    const result = await ddb.listTables({}).promise();
    if (!result.TableNames.includes('Batch')) {
      await ddb.createTable({
        TableName: TABLE_NAME,
        KeySchema: [{ AttributeName: 'batch_id', KeyType: 'HASH', }],
        AttributeDefinitions: [{ AttributeName: 'batch_id', AttributeType: 'S', }],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5, },
      }).promise();
    }
  })

  afterEach(async () => {
    const scan = await ddb.scan({ TableName: TABLE_NAME }).promise();
    if (scan.Items) {
      scan.Items.forEach(async (it) => {
        await ddb.deleteItem({ TableName: TABLE_NAME, Key: { batch_id: { S: it.batch_id.S } } }).promise();
      })
    }
  })

  it('save and fetch should return result', async function () {
    await save(AWS,
      TABLE_NAME,
      'BATCH-abc-123',
      question('1', 'i am question 1', 'b1',
        answer('a1', '1 i am a'),
        answer('b1', '1 i am b'),
        answer('c1', '1 i am c'),
        answer('d1', '1 i am d')
      ),
      question('2', 'i am question 2', 'c2',
        answer('a2', '2 i am a'),
        answer('b2', '2 i am b'),
        answer('c2', '2 i am c'),
        answer('d2', '2 i am d')
      )
    );
    const result = await fetch(AWS, TABLE_NAME, 'batch-ABC-123');

    expect(result).to.eql({
      batch_id: 'batch-abc-123',
      allowed_time: 3000,
      questions: [
        {
          id: '1',
          question: 'i am question 1',
          correct: 'b1',
          answers: [
            { key: 'a1', value: '1 i am a' },
            { key: 'b1', value: '1 i am b' },
            { key: 'c1', value: '1 i am c' },
            { key: 'd1', value: '1 i am d' }
          ]
        },
        {
          id: '2',
          question: 'i am question 2',
          correct: 'c2',
          answers: [
            { key: 'a2', value: '2 i am a' },
            { key: 'b2', value: '2 i am b' },
            { key: 'c2', value: '2 i am c' },
            { key: 'd2', value: '2 i am d' }
          ]
        }
      ]
    });
  });

  it('fetch should return undefined', async function () {
    const result = await fetch(AWS, TABLE_NAME, 'non-existence');
    expect(result).undefined;
  })

  it('saveQuestion and fetch should be case-insensitive', async function () {
    await saveQuestion(AWS, TABLE_NAME, 'BATCH-cde', question('1', 'asdf', 'a', answer('a', 'a')));

    const result = await fetch(AWS, TABLE_NAME, 'batch-CDE');
    expect(result).to.eql({
      batch_id: 'batch-cde',
      allowed_time: 3000,
      questions: [
        {
          id: '1',
          question: 'asdf',
          correct: 'a',
          answers: [{ key: 'a', value: 'a' }]
        }
      ]
    });
  })

  it('saveQuestion should append question & case-insensitive', async function () {
    await saveQuestion(AWS, TABLE_NAME, 'batch-asdf', question('1', 'asdf', 'a', answer('a', 'a')));
    await saveQuestion(AWS, TABLE_NAME, 'BATCH-asdf', question('2', 'asdf asdf', 'a', answer('a', 'a')));

    const result = await fetch(AWS, TABLE_NAME, 'batch-asdf');
    expect(result).to.eql({
      batch_id: 'batch-asdf',
      allowed_time: 3000,
      questions: [
        {
          id: '1',
          question: 'asdf',
          correct: 'a',
          answers: [{ key: 'a', value: 'a' }]
        },
        {
          id: '2',
          question: 'asdf asdf',
          correct: 'a',
          answers: [{ key: 'a', value: 'a' }]
        }
      ]
    });
  })

  it('should lock non-existence batch', async function () {
    await lockQuestion(AWS, TABLE_NAME, 'batch-non')
  })

  it('should not fetch locked batch', async function () {
    await saveQuestion(AWS, TABLE_NAME, 'batch-asdf', question('1', 'asdf', 'a', answer('a', 'a')));
    await lockQuestion(AWS, TABLE_NAME, 'batch-asdf')
    const result = await fetch(AWS, TABLE_NAME, 'batch-asdf');
    expect(result).undefined;
  })

  it('lock batch - case-insensitive', async function () {
    await saveQuestion(AWS, TABLE_NAME, 'batch-ghi', question('1', 'asdf', 'a', answer('a', 'a')));
    await lockQuestion(AWS, TABLE_NAME, 'BATCH-GHI')
    const result = await fetch(AWS, TABLE_NAME, 'batch-ghi');
    expect(result).undefined;
  })
});