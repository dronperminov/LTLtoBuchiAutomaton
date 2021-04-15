function LTLtoBuchiCalculator(inputBox, resultBox, canvas, width, height) {
    this.inputBox = inputBox
    this.resultBox = resultBox
    
    this.canvas = canvas
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
    this.ctx = this.canvas.getContext('2d')

    let calculator = this
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
    //try {
        this.ctx.clearRect(0, 0, this.width, this.height)
        let expression = this.inputBox.value
        let calculator = new LTLCalculator(expression)

        let parsedExpression = calculator.ToString()

        this.resultBox.innerHTML = "<p><b>Введённое выражение:</b> " + calculator.expression + "</p>"
        this.resultBox.innerHTML += "<p><b>Распаршенное выражение:</b> " + parsedExpression + "</p>"

        let simplifiedExpression = this.GetSimplifiedExpression(calculator)

        if (simplifiedExpression != parsedExpression) {
            calculator = new LTLCalculator(simplifiedExpression)
            this.resultBox.innerHTML += "<p><b>Упрощённое выражение:</b> " + simplifiedExpression + "</p>"
        }

        let variables = Object.keys(calculator.variables)
        let subtrees = calculator.GetAllSubTrees()
        let atoms = calculator.GetAtoms(subtrees.positive)

        this.resultBox.innerHTML += "<p><b>Все подвыражения выражение (без отрицания):</b><br>" + subtrees.positive.join("<br>") + "</p>"
        this.resultBox.innerHTML += "<p><b>Все подвыражения выражение (c отрицанием):</b><br>" + subtrees.negative.join("<br>") + "</p>"
        this.resultBox.innerHTML += "<p><b>Атомы:</b><br>" + atoms.join("<br>") + "</p>"

    // }
    // catch (error) {
    //     this.resultBox.innerHTML = "<p><b>Ошибка:</b> " + error + "</p>"
    //     throw error
    // }
}