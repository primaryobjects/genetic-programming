// https://github.com/subprotocol/genetic-js/blob/master/examples/string-solver.html
const Genetic = require('genetic-js');

const genetic = Genetic.create();
genetic.optimize = Genetic.Optimize.Maximize;
genetic.select1 = Genetic.Select1.Fittest;
genetic.select2 = Genetic.Select2.Tournament2;

const utilityManager = {
  operators: '+-*/',
  values: '0123456789',

  isOperator: function(val) {
    return this.operators.includes(val);
  },

  plus: function(a, b) { return a + b; },
  minus: function(a, b) { return a - b; },
  multiply: function(a, b) { return a * b; },
  divide: function(a, b) { return a / b; },

  compute: function(a, op, b) {
    return op ? op(a, b) : null;
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
          valStack.push(this.compute(valStack.pop(), this.symbolToOperator(opStack.pop()), parseInt(val)));
      }
      else if (this.isOperator(val)) {
        opStack.push(val);
        valCount = 0;
      }
      else {
        valStack.push(parseInt(val));
        valCount++;
      }

      i++;
    }

    if (Math.abs(index - i) % 2 === 0) {
      i--;
    }

    return { expression: expr.substring(index, i), start: index, end: i - 1 };
  },

  evaluatePrefix: function(expr) {
    const parts = expr.split('');
    const stack = [];

    for (let j=expr.length - 1; j >= 0; j--) {
      const val = expr[j];

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
  const getNode = () => {
    let isFunction = Math.floor(Math.random() * 2);
    return isFunction ? this.userData.manager.operators[Math.floor(Math.random() * this.userData.manager.operators.length)] : this.userData.manager.values[Math.floor(Math.random() * this.userData.manager.values.length)];
  };

  const tree = () => {
    let result = [];

    const node = getNode();
    result.push(node);

    if (this.userData.manager.isOperator(node)) {
      // This node is a function, so generate two child nodes.
      const left = tree();
      const right = tree();

      result = result.concat(left);
      result = result.concat(right);
    }

    return result;
  };

  return tree().join('');
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
  const child1 = this.userData.manager.replaceAtIndex(parent1, index1, subtree1, subtree2);
  // Copy subtree1 to parent2 at index2.
  const child2 = this.userData.manager.replaceAtIndex(parent2, index2, subtree2, subtree1);

  return [child1, child2];
}

genetic.fitness = function(entity) {
  const fitness = this.userData.manager.evaluatePrefix(entity);

  return this.userData.solution - Math.abs(this.userData.solution - fitness);
}

genetic.generation = function(pop, generation, stats) {
  return pop[0].fitness !== this.userData.solution;
}

genetic.notification = function(pop, generation, stats, isDone) {
  const value = pop[0].entity;

  console.log(`Generation ${generation}, Best Fitness ${stats.maximum}, Best genome: ${value}`);

  if (isDone) {
    console.log(`Result: ${this.userData.manager.evaluatePrefix(value)}`);
  }
}

genetic.evolve({
  iterations: 100000,
  size: 100,
  crossover: 0.3,
  mutation: 0.3,
  skip: 50 /* frequency for notifications */
}, {
  solution: 123456,
  manager: utilityManager
})