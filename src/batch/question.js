exports.question = (id, question, correct, ...answer) => {
  return { id, question, correct, answers: [...answer] };
}

exports.answer = (key, value) => {
  return { key, value };
}