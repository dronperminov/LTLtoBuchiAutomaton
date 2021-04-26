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

LTLtoBuchiCalculator.prototype.GetSimplifiedExpression = function(calculator) {
    let tree = calculator.MakeTree(calculator.rpn)
    let rpn = calculator.TreeToRpn(tree)
    return calculator.ToStringRPN(rpn)
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

    // let variables = Object.keys(calculator.variables)
    // let subtrees = calculator.GetAllSubTrees()
    // let atoms = calculator.GetAtoms(subtrees.positive)
    // let table = calculator.MakeTable(subtrees.positive, atoms)

    // calculator.MakeTable(subtrees.positive, atoms)
    // this.resultBox.innerHTML += "<p><b>Все подвыражения выражение (без отрицания):</b><br>" + subtrees.positive.join("<br>") + "</p>"
    // this.resultBox.innerHTML += "<p><b>Все подвыражения выражение (c отрицанием):</b><br>" + subtrees.negative.join("<br>") + "</p>"
    // this.resultBox.innerHTML += "<p><b>Атомы:</b> " + atoms.join(", ") + "</p>"

    // this.resultBox.innerHTML += "<p><b>Насыщение классическими связками</b></p>"
    // this.resultBox.appendChild(table.html)
}