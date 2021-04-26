function LTLtoBuchiCalculator(inputBox, resultBox, canvas, width, height) {
    this.inputBox = inputBox
    this.resultBox = resultBox
    
    this.canvas = canvas
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')

    // let calculator = this
    // this.canvas.addEventListener('mousedown', function(e) { calculator.MouseDown(e) })
    // this.canvas.addEventListener('mouseup', function(e) { calculator.MouseUp(e) })
    // this.canvas.addEventListener('mousemove', function(e) { calculator.MouseMove(e) })
}

// бъединение выражений в строку
LTLtoBuchiCalculator.prototype.JoinExpressions = function(expressions, delimeter = "<br>") {
    let joined = []

    for (let expression of expressions.values())
        joined.push(expression.expression)

    return joined.join(delimeter)
}

// получение атомов выражения
LTLtoBuchiCalculator.prototype.GetAtoms = function(positive) {
    let atoms = []

    for (let expression of positive.values())
        if (expression.IsAtom())
            atoms.push(expression)

    return atoms
}

LTLtoBuchiCalculator.prototype.Solve = function() {
    console.clear()

    this.ctx.clearRect(0, 0, this.width, this.height)

    ltl = new LTLExpression(this.inputBox.value)
    
    this.resultBox.innerHTML = "<p><b>Введённое выражение:</b> " + this.inputBox.value + "</p>"
    this.resultBox.innerHTML += "<p><b>Распаршенное выражение:</b> " + ltl.parsedExpression + "</p>"

    if (ltl.expression != ltl.parsedExpression) {
        this.resultBox.innerHTML += "<p><b>Упрощённое выражение:</b> " + ltl.expression + "</p>"
    }

    let subtrees = ltl.GetAllSubTrees()
    let atoms = this.GetAtoms(subtrees.positive)
    // let table = calculator.MakeTable(subtrees.positive, atoms)

    this.resultBox.innerHTML += "<p><b>Все подвыражения выражения (без отрицания):</b><br>" + this.JoinExpressions(subtrees.positive) + "</p>"
    this.resultBox.innerHTML += "<p><b>Все подвыражения выражения (c отрицанием):</b><br>" + this.JoinExpressions(subtrees.negative) + "</p>"
    this.resultBox.innerHTML += "<p><b>Атомы:</b> " + this.JoinExpressions(atoms, ", ") + "</p>"

    // this.resultBox.innerHTML += "<p><b>Насыщение классическими связками</b></p>"
    // this.resultBox.appendChild(table.html)
}