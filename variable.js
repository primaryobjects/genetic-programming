// https://github.com/subprotocol/genetic-js/blob/master/examples/string-solver.html
const Genetic = require('genetic-js');

const genetic = Genetic.create();
genetic.optimize = Genetic.Optimize.Maximize;
genetic.select1 = Genetic.Select1.Tournament2;
genetic.select2 = Genetic.Select2.Tournament2;

const utilityManager = {
  operators: '+-*/',
  values: '0123456789xy',

  isOperator: function(val) {
    return this.operators.includes(val);
  },

  plus: function(a, b, variables = {}) { return (variables[a] || a) + (variables[b] || b); },
  minus: function(a, b, variables = {}) { return (variables[a] || a) - (variables[b] || b); },
  multiply: function(a, b, variables = {}) { return (variables[a] || a) * (variables[b] || b); },
  divide: function(a, b, variables = {}) { return (variables[a] || a) / (variables[b] || b); },

  compute: function(a, op, b, variables = {}) {
    return op ? op(a, b, variables) : null;
  },

  symbolToOperator: function(symbol) {
    switch (symbol) {
      case '+': return this.plus;
      case '-': return this.minus;
      case '*': return this.multiply;
      case '/': return this.divide;
    }
  },

  subtreePrefix: function(expr, index) {
    const parts = expr.split('');
    let val = parts[index];
    const opStack = []; // Start with the node at the index.
    const valStack = [];
    let valCount = 0;
    let i = index + 1;

    if (this.isOperator(val)) {
      opStack.push(val);
    }
    else {
      valStack.push(val);
    }

    while (opStack.length && i < parts.length) {
      val = parts[i];

      if (!this.isOperator(val) && valCount) {
          val = parseInt(val); // Swap variables with the value 1 for subtree extraction, since the actual value doesn't matter.
          val = val || 1;

          valStack.push(this.compute(valStack.pop(), this.symbolToOperator(opStack.pop()), val));
      }
      else if (this.isOperator(val)) {
        opStack.push(val);
        valCount = 0;
      }
      else {
        val = parseInt(val); // Swap variables with the value 1 for subtree extraction, since the actual value doesn't matter.
        val = val || 1;

        valStack.push(val);
        valCount++;
      }

      i++;
    }

    if (Math.abs(index - i) % 2 === 0) {
      i--;
    }

    return { expression: expr.substring(index, i), start: index, end: i - 1 };
  },

  evaluatePrefix: function(expr, variables = {}) {
    const parts = expr.split('');
    const stack = [];

    for (let j=expr.length - 1; j >= 0; j--) {
      const val = variables[expr[j]] || expr[j];

      // Push operated to stack.
      if (!this.isOperator(val)) {
        stack.push(parseInt(val));
      }
      else {
        // Operator found. Pop two elements from the stack.
        const a = stack.pop();
        const b = stack.pop();
        stack.push(this.compute(a, this.symbolToOperator(val), b));
      }
    }

    return stack[0];
  },

  replaceAt: function(str, index, replacement) {
    return str.substr(0, index) + replacement + str.substr(index + replacement.length);
  },

  replaceAtIndex: function(input, index, search, replace) {
    return input.slice(0, index) + input.slice(index).replace(search, replace)
  }
}

genetic.seed = function() {
  const getNode = (isValue) => {
    let isFunction = isValue ? 0 : Math.floor(Math.random() * 2);
    return isFunction ? this.userData.manager.operators[Math.floor(Math.random() * this.userData.manager.operators.length)] : this.userData.manager.values[Math.floor(Math.random() * this.userData.manager.values.length)];
  };

  const tree = (maxDepth, depth = 0) => {
    let result = [];

    const node = getNode(depth > maxDepth);
    result.push(node);

    if (this.userData.manager.isOperator(node)) {
      // This node is a function, so generate two child nodes.
      const left = tree(maxDepth, depth + 1);
      const right = tree(maxDepth, depth + 1);

      result = result.concat(left).concat(right);
    }

    return result;
  };

  return tree(this.userData.maxTreeDepth).join('');
}

genetic.mutate = function(entity) {
  let result = entity;
  let index = Math.floor(Math.random() * entity.length);

  if (this.userData.manager.isOperator(entity[index])) {
    // Replace with an operator.
    let r = Math.floor(Math.random() * this.userData.manager.operators.length);
    result = this.userData.manager.replaceAt(entity, index, this.userData.manager.operators[r]);
  }
  else {
    // Replace with a value.
    let r = Math.floor(Math.random() * this.userData.manager.values.length);
    result = this.userData.manager.replaceAt(entity, index, this.userData.manager.values[r]);
  }

  return result;
}

genetic.crossover = function(parent1, parent2) {
  const index1 = Math.floor(Math.random() * parent1.length);
  const index2 = Math.floor(Math.random() * parent2.length);

  const subtree1 = this.userData.manager.subtreePrefix(parent1, index1).expression;
  const subtree2 = this.userData.manager.subtreePrefix(parent2, index2).expression;

  // Copy subtree2 to parent1 at index1.
  let child1 = this.userData.manager.replaceAtIndex(parent1, index1, subtree1, subtree2);
  // Copy subtree1 to parent2 at index2.
  let child2 = this.userData.manager.replaceAtIndex(parent2, index2, subtree2, subtree1);

  if (child1.length > this.userData.maxLength) {
    child1 = parent1;
  }

  if (child2.length > this.userData.maxLength) {
    child2 = parent2;
  }

  return [child1, child2];
}

genetic.fitness = function(entity) {
  let fitness = 0;
  let solution = this.userData.solution;

  if (this.userData.testCases) {
    fitness = this.userData.testCases.map(testCase => {
      return this.userData.manager.evaluatePrefix(entity, testCase);
    }).reduce((total, x) => { return total + x; });

    solution = this.userData.testCases.map(testCase => {
      return this.userData.manager.evaluatePrefix(this.userData.solution, testCase);
    }).reduce((total, x) => { return total + x; });
  }
  else {
    fitness = this.userData.manager.evaluatePrefix(entity);
  }

  return solution - Math.abs(solution - fitness);
}

genetic.generation = function(pop, generation, stats) {
  let solution = this.userData.solution;

  if (this.userData.testCases) {
    solution = this.userData.testCases.map(testCase => {
     return this.userData.manager.evaluatePrefix(this.userData.solution, testCase);
   }).reduce((total, x) => { return total + x; });
  }

  return pop[0].fitness !== solution;
}

genetic.notification = function(pop, generation, stats, isDone) {
  const value = pop[0].entity;

  console.log(`Generation ${generation}, Best Fitness ${stats.maximum}, Best genome: ${value}`);

  if (isDone) {
    if (this.userData.testCases) {
      this.userData.testCases.forEach(testCase => {
        const result = this.userData.manager.evaluatePrefix(value, testCase);
        console.log(testCase);
        console.log(`Result: ${result}`);
      });
    }
    else {
      console.log(`Result: ${this.userData.manager.evaluatePrefix(value)}`);
    }
  }
}

genetic.evolve({
  iterations: 100000,
  size: 100,
  crossover: 0.3,
  mutation: 0.3,
  skip: 50 /* frequency for notifications */
}, {
  solution: '+x*xy', // The function for the GA to learn.
  testCases: [ {x: 1, y: 1}, {x: 3, y: 5}, {x: 5, y: 2}, {x: 9, y: 10}, {x: 12, y: 2}, {x: 20, y: 6}, {x: 45, y: 5}, {x: 100, y: 400} ], // Test cases to learn from.
  maxTreeDepth: 25,
  maxLength: 200,
  manager: utilityManager
})