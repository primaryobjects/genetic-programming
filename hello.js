// https://github.com/subprotocol/genetic-js/blob/master/examples/string-solver.html
const Genetic = require('genetic-js');

const genetic = Genetic.create();
genetic.optimize = Genetic.Optimize.Maximize;
genetic.select1 = Genetic.Select1.Tournament2;
genetic.select2 = Genetic.Select2.Tournament2;

genetic.seed = function() {
  const randomString = len => {
    var text = "";
    var charset = "abcdefghijklmnopqrstuvwxyz0123456789";

    for (let i=0; i<len; i++) {
      text += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return text;
  };

  return randomString(this.userData.solution.length);
}

genetic.mutate = function(entity) {
  const replaceAt = (str, index, replacement) => {
    return str.substr(0, index) + replacement + str.substr(index + replacement.length);
  };

  let index = Math.floor(Math.random() * entity.length);

  const direction = Math.floor(Math.random() * 2);
  return replaceAt(entity, index, String.fromCharCode(entity.charCodeAt(index) + (direction ? 1 : -1)));
}

genetic.crossover = function(parent1, parent2) {
  let index = Math.floor(Math.random() * parent1.length);

  const parent1Left = parent1.substr(0, index);
  const parent1Right = parent1.substr(index);

  const parent2Left = parent2.substr(0, index);
  const parent2Right = parent2.substr(index);

  // Crossover the left or right side.
  let direction = Math.floor(Math.random() * 2);
  let child1 = '';
  let child2 = '';

  if (direction === 0) {
    child1 = parent1Left + parent2Right;
    child2 = parent2Left + parent1Right;
  }
  else {
    child1 = parent1Right + parent2Left;
    child2 = parent2Right + parent1Left;
  }

  return [child1, child2];
}

genetic.fitness = function(entity) {
  let score = 0;

  for (let i=0; i<this.userData.solution.length; i++) {
    score += 255 - Math.abs(entity.charCodeAt(i) - this.userData.solution.charCodeAt(i));
  }

  return score;
}

genetic.generation = function(pop, generation, stats) {
  return pop[0].fitness < this.userData.solution.length * 255;
}

genetic.notification = function(pop, generation, stats, isDone) {
  const value = pop[0].entity;

  console.log(`Generation ${generation}`);
  console.log(`Best fitness: ${value}`);
}

genetic.evolve({
  iterations: 100000,
  size: 100,
  crossover: 0.3,
  mutation: 0.3,
  skip: 10 /* frequency for notifications */
}, {
  solution: 'Hola, como estas? Yo espero tu sientas mas bien.'
})