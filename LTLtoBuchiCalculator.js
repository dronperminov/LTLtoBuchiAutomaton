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
LTLtoBuchiCalculator.prototype.JoinExpressions = function(expressions, phi, delimeter = ", ") {
    let joined = []

    for (let expression of expressions.values()) {
        if (expression.IsEqual(phi))
            joined.push("φ")
        else if (expression.IsInverse(phi))
            joined.push("¬φ")
        else
            joined.push(expression.expression)
    }

    return joined.join(delimeter)
}

// получение атомов выражения
LTLtoBuchiCalculator.prototype.GetAtoms = function(positive) {
    let atoms = []

    for (let expression of positive.values())
        if (expression.IsAtom())
            atoms.push(expression)

    return atoms.sort(function(a, b) { return a.GetSize() - b.GetSize() })
}

// функция сравнения для получения последовательности бит
LTLtoBuchiCalculator.prototype.CompareN = function(n, n1, n2) {
    let bits1 = []
    let bits2 = []
    let onesCount1 = 0
    let onesCount2 = 0

    for (let i = 0; i < n; i++) {
        bits1.push(n1 >> (n - 1 - i) & 1)
        bits2.push(n2 >> (n - 1 - i) & 1)

        if (bits1[i] == 1)
            onesCount1++

        if (bits2[i] == 1)
            onesCount2++
    }

    if (onesCount1 != onesCount2)
        return onesCount1 - onesCount2

    return n2 - n1
}

// получение последовательности бит
LTLtoBuchiCalculator.prototype.GetBits = function(n) {
    let total = 1 << n
    let values = []

    for (let i = 0; i < total; i++)
        values.push(i)

    let calculator = this
    values.sort(function(a, b) { return calculator.CompareN(n, a, b) })

    let bits = []

    for (let i = 0; i < total; i++) {
        bits.push([])

        for (let j = 0; j < n; j++)
            bits[i].push((values[i] >> (n - 1 - j)) & 1)
    }

    return bits
}

// формирование табилцы классических связок
LTLtoBuchiCalculator.prototype.MakeClassicTable = function(atoms, positive, bits) {
    let classic = []
    let rules = []

    for (let i = 0; i < atoms.length; i++)
        rules.push([atoms[i], 0])

    for (let i = 0; i < bits.length; i++) {
        for (let j = 0; j < atoms.length; j++)
            rules[j][1] = bits[i][j]

        let row = []

        for (let j = 0; j < positive.length; j++) {
            if (positive[j].HaveUntil())
                continue

            let expression = positive[j].GetSubstitutionTree(rules)

            if (positive[j].EvaluateTree(expression))
                row.push(positive[j])
        }

        classic.push(row)
    }

    return classic
}

// есть ли формула в состоянии
LTLtoBuchiCalculator.prototype.HaveInState = function(formula, state) {
    for (let i = 0; i < state.length; i++)
        if (formula.IsEqual(state[i]))
            return true

    return false
}

// формирование таблицы состояний
LTLtoBuchiCalculator.prototype.MakeTable = function(atoms, positive) {
    let n = atoms.length
    let bits = this.GetBits(n)
    let classic = this.MakeClassicTable(atoms, positive, bits)
    let temporal = []

    for (let i = 0; i < bits.length; i++) {
        let states = [Array.from(classic[i])]

        for (let j = 0; j < positive.length; j++) {
            if (positive[j].tree.value != UNTIL)
                continue

            let untilArgs = positive[j].SplitByUntil()

            for (let k = 0; k < states.length; k++) {
                if (this.HaveInState(untilArgs.psi, states[k])) {
                    states[k].push(positive[j])
                }
                else if (this.HaveInState(untilArgs.xi, states[k])) {
                    let copy = Array.from(states[k])
                    copy.push(positive[j])
                    states.splice(++k, 0, copy)
                }
            }
        }

        temporal.push(states)
    }

    return { atoms: atoms, bits: bits, classic: classic, temporal: temporal }
}

// проверка на начальное состояние
LTLtoBuchiCalculator.prototype.IsInitialState = function(state, phi, isPhi) {
    for (let expression of state.values()) {
        if (isPhi && expression.IsEqual(phi))
            return true

        if (!isPhi && expression.IsInverse(phi))
            return false
    }

    return !isPhi
}

LTLtoBuchiCalculator.prototype.IsFinalState = function(state) {
    let haveUntil = false

    for (let i = 0; i < state.length; i++) {
        if (state[i].tree.value == UNTIL) {
            haveUntil = true

            if (this.HaveInState(state[i].SplitByUntil().psi, state))
                return true
        }
    }

    return !haveUntil
}

// олучение состояний
LTLtoBuchiCalculator.prototype.GetStates = function(table, phi, isPhi) {
    let states = []
    let initialStates = []
    let finalstates = []

    for (let i = 0; i < table.length; i++) {
        for (let j = 0; j < table[i].length; j++) {
            states.push(table[i][j])

            if (this.IsInitialState(states[states.length - 1], phi, isPhi))
                initialStates.push(states.length)

            if (this.IsFinalState(states[states.length - 1]))
                finalstates.push(states.length)
        }
    }

    return { states: states, initialStates: initialStates, finalstates: finalstates }
}

// добавление в строку tr ячейки с текстом text
LTLtoBuchiCalculator.prototype.AddCell = function(tr, text, name = "td") {
    let cell = document.createElement(name)
    cell.innerHTML = text
    tr.appendChild(cell)
}

// добавление в строку tr ячейки с текстом text
LTLtoBuchiCalculator.prototype.AddSplittedCell = function(tr, states, stateNumber, phi) {
    let cell = document.createElement("td")
    let html = []

    for (let i = 0; i < states.length; i++) {
        html.push("s<sub>" + stateNumber[0] + "</sub> = {" + this.JoinExpressions(states[i], phi, ", ") + "}")
        stateNumber[0]++
    }

    cell.innerHTML = html.join("<hr>")
    tr.appendChild(cell)
}

LTLtoBuchiCalculator.prototype.TableToHTML = function(table, phi) {
    let htmlTable = document.createElement("table")

    let tr = document.createElement("tr")
    this.AddCell(tr, "№", "th")
    for (let i = 0; i < table.atoms.length; i++)
        this.AddCell(tr, table.atoms[i].expression, "th")
    this.AddCell(tr, "Насыщение<br>(классические связки)", "th")
    this.AddCell(tr, "Насыщение<br>(темпоральные операторы)", "th")
    htmlTable.appendChild(tr)

    let stateNumber = [1]

    for (let i = 0; i < table.classic.length; i++) {
        let tr = document.createElement("tr")
        this.AddCell(tr, i + 1)

        for (let j = 0; j < table.bits[i].length; j++)
            this.AddCell(tr, table.bits[i][j] ? "TRUE" : "FALSE")

        this.AddCell(tr, "{" + this.JoinExpressions(table.classic[i], phi, ", ") + "}")
        this.AddSplittedCell(tr, table.temporal[i], stateNumber, phi)
        htmlTable.appendChild(tr)
    }

    return htmlTable
}

LTLtoBuchiCalculator.prototype.Solve = function() {
    console.clear()

    this.ctx.clearRect(0, 0, this.width, this.height)

    ltl = new LTLExpression(this.inputBox.value)
    
    this.resultBox.innerHTML = "<p><b>Введённое выражение:</b> " + ltl.inputExpression + "</p>"
    this.resultBox.innerHTML += "<p><b>Распаршенное выражение:</b> " + ltl.parsedExpression + "</p>"

    if (ltl.expression != ltl.parsedExpression) {
        this.resultBox.innerHTML += "<p><b>Упрощённое выражение:</b> " + ltl.expression + "</p>"
    }

    let subtrees = ltl.GetAllSubTrees()
    this.resultBox.innerHTML += "<p><b>Все подвыражения (без отрицания):</b> " + this.JoinExpressions(subtrees.positive, ltl) + "</p>"
    this.resultBox.innerHTML += "<p><b>Все подвыражения (c отрицанием):</b> " + this.JoinExpressions(subtrees.negative, ltl) + "</p>"

    let atoms = this.GetAtoms(subtrees.positive)
    this.resultBox.innerHTML += "<p><b>Атомы:</b> " + this.JoinExpressions(atoms, ltl, ", ") + "</p>"

    let table = this.MakeTable(atoms, subtrees.positive)
    this.resultBox.appendChild(this.TableToHTML(table, ltl))

    let isPhi = ltl.IsEqual(subtrees.positive[subtrees.positive.length - 1])
    let states = this.GetStates(table.temporal, ltl, isPhi)
    this.resultBox.innerHTML += "<p><b>Начальные состояния (𝑆<sub>0</sub>):</b> s<sub>" + states.initialStates.join("</sub>, s<sub>") + "</sub></p>"
    this.resultBox.innerHTML += "<p><b>Допускающие состояния (𝓕):</b> s<sub>" + states.finalstates.join("</sub>, s<sub>") + "</sub></p>"

    // this.resultBox.innerHTML += "<p><b>Насыщение классическими связками</b></p>"
    // this.resultBox.appendChild(table.html)
}