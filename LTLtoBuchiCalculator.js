function LTLtoBuchiCalculator(inputBox, resultBox, canvas, width, height) {
    this.inputBox = inputBox
    this.resultBox = resultBox
}

// объединение выражений в строку
LTLtoBuchiCalculator.prototype.JoinExpressions = function(expressions, phi, delimeter = ", ") {
    let joined = []

    for (let expression of expressions.values()) {
        if (phi == null) {
            joined.push(expression.expression)
            continue
        }

        if (expression.IsEqual(phi))
            joined.push("φ")
        else if (expression.IsInverse(phi))
            joined.push("¬φ")
        else
            joined.push(expression.expression)
    }

    return joined.join(delimeter)
}

// объединение состояний в строку
LTLtoBuchiCalculator.prototype.JoinStates = function(states) {
    if (states.length == 0)
        return ""

    return "s<sub>" + states.join("</sub>, s<sub>") + "</sub>"
}

// получение атомов выражения
LTLtoBuchiCalculator.prototype.GetAtoms = function(positive) {
    let atoms = []

    for (let expression of positive.values())
        if (expression.IsAtom())
            atoms.push(expression)

    return atoms.sort(function(a, b) { return a.GetSize() - b.GetSize() })
}

// получение выражений с UNTIL
LTLtoBuchiCalculator.prototype.GetUntils = function(positive) {
    let untils = []

    for (let expression of positive.values())
        if (expression.tree.value == UNTIL)
            untils.push(expression)

    return untils
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
LTLtoBuchiCalculator.prototype.HaveInState = function(formula, state, invert = false) {
    for (let i = 0; i < state.length; i++) {
        if (!invert && formula.IsEqual(state[i]))
            return true

        if (invert && formula.IsInverse(state[i]))
            return true
    }

    return false
}

// можно ли добавить формулу в состояние
LTLtoBuchiCalculator.prototype.CanAddFormula = function(operation, state, arg1, arg2) {
    if (operation == AND)
        return this.HaveInState(arg1, state) && this.HaveInState(arg2, state)

    if (operation == OR)
        return this.HaveInState(arg1, state) || this.HaveInState(arg2, state)

    if (operation == XOR)
        return this.HaveInState(arg1, state) != this.HaveInState(arg2, state)

    if (operation == SHEFFER)
        return !this.HaveInState(arg1, state) || !this.HaveInState(arg2, state)

    if (operation == PIRS)
        return !this.HaveInState(arg1, state) && !this.HaveInState(arg2, state)

    if (operation == IMPL)
        return !this.HaveInState(arg1, state) || this.HaveInState(arg2, state)

    if (operation == EQUAL)
        return this.HaveInState(arg1, state) == this.HaveInState(arg2, state)

    return false
}

// добавление формулы в состояние по аргументам
LTLtoBuchiCalculator.prototype.AddFormulaByArguments = function(state, formula) {
    if (this.HaveInState(formula, state) || !formula.IsOperator())
        return

    let args = formula.SplitByOperation()

    if (this.CanAddFormula(formula.tree.value, state, args.arg1, args.arg2)) {
        state.push(formula)
    }
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

        for (let j = 0; j < positive.length; j++) {
            if (positive[j].HaveUntil())
                for (let k = 0; k < states.length; k++)
                    this.AddFormulaByArguments(states[k], positive[j])
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

LTLtoBuchiCalculator.prototype.IsFinalState = function(state, until) {
    return !this.HaveInState(until, state) || this.HaveInState(until.SplitByUntil().psi, state)
}

// олучение состояний
LTLtoBuchiCalculator.prototype.GetStates = function(table, phi, isPhi, positive) {
    let states = []
    let initialStates = []

    for (let i = 0; i < table.length; i++) {
        for (let j = 0; j < table[i].length; j++) {
            states.push(table[i][j])

            if (this.IsInitialState(states[states.length - 1], phi, isPhi))
                initialStates.push(states.length)
        }
    }

    let untils = []
    let finalstates = []

    for (let i = 0; i < positive.length; i++) {
        if (positive[i].tree.value == UNTIL) {
            untils.push(positive[i])
            finalstates.push([])
        }
    }

    for (let i = 0; i < untils.length; i++) {
        for (let j = 0; j < states.length; j++)
            if (this.IsFinalState(states[j], untils[i]))
                finalstates[i].push(j + 1)
    }

    if (finalstates.length == 0) {
        finalstates.push([])

        for (let i = 0; i < states.length; i++)
            finalstates[0].push(i + 1)
    }

    return { states: states, initialStates: initialStates, finalstates: finalstates }
}

LTLtoBuchiCalculator.prototype.GetStatesForNext = function(curr, positive, states) {
    let args = []

    for (let i = 0; i < positive.length; i++)
        if (positive[i].tree.value == NEXT)
            args.push(positive[i])

    if (args.length == 0)
        return new Set()

    let transitionStates = new Set()

    for (let i = 0; i < states.length; i++)
        transitionStates.add(i + 1)

    for (let j = 0; j < args.length; j++) {
        for (let i = 0; i < states.length; i++) {
            if (this.HaveInState(args[j], curr) == this.HaveInState(args[j].GetNextArgument(), states[i])) {
                si = states.indexOf(curr) + 1
                console.log("[" + args[j].expression + " in s" + si + "] == [" + args[j].GetNextArgument().expression + " in s" + (i + 1) + "]")
            }
            else {
                transitionStates.delete(i + 1)
            }
        }
    }

    return transitionStates
}

LTLtoBuchiCalculator.prototype.GetStatesForUntil = function(curr, positive, states) {
    let args = []

    for (let i = 0; i < positive.length; i++)
        if (positive[i].tree.value == UNTIL)
            args.push(positive[i])

    if (args.length == 0)
        return new Set()

    let transitionStates = new Set()

    for (let i = 0; i < states.length; i++)
        transitionStates.add(i + 1)

    for (let j = 0; j < args.length; j++) {
        for (let i = 0; i < states.length; i++) {
            let tmp = args[j].SplitByUntil()
            let xi = tmp.xi
            let psi = tmp.psi

            let left = this.HaveInState(args[j], curr)
            let right = this.HaveInState(psi, curr) || this.HaveInState(xi, curr) && this.HaveInState(args[j], states[i])

            if (left == right) {
                si = states.indexOf(curr) + 1
                console.log("[" + args[j].expression + " in s" + si + "] == [" + psi.expression + " in s" + si + " or " + xi.expression + " in s" + si + " and " + args[j].expression + " in s" + (i + 1) + "]")
            }
            else {
                transitionStates.delete(i + 1)
            }
        }
    }

    return transitionStates
}

LTLtoBuchiCalculator.prototype.GetStateVariables = function(state) {
    variables = []

    for (let i = 0; i < state.length; i++)
        if (state[i].IsVariable())
            variables.push(state[i])

    return variables
}

// получение переходов
LTLtoBuchiCalculator.prototype.GetTransitions = function(states, positive, phi) {
    let transitions = []

    for (let i = 0; i < states.length; i++) {
        console.log("\ns" + (i + 1))

        let transitionNext = this.GetStatesForNext(states[i], positive, states)
        let transitionUntil = this.GetStatesForUntil(states[i], positive, states)
        let variables = this.GetStateVariables(states[i])

        console.log("X states:", Array.from(transitionNext))
        console.log("U states:", Array.from(transitionUntil))
        console.log("Variables:", this.JoinExpressions(variables))

        if (transitionNext.size == 0 && transitionUntil.size == 0) {
            transitions.push({ states: Array.from({length: states.length}, (_, i) => i + 1), variables: variables })
        }
        else if (transitionNext.size == 0) {
            transitions.push({ states: Array.from(transitionUntil), variables: variables })
        }
        else if (transitionUntil.size == 0) {
            transitions.push({ states: Array.from(transitionNext), variables: variables })
        }
        else {
            let transition = new Set([...transitionNext].filter(x => transitionUntil.has(x)))
            transitions.push({ states: Array.from(transition), variables: variables })
        }
    }

    return transitions
}

LTLtoBuchiCalculator.prototype.GetOnlyPositive = function(row, positive, phi) {
    let result = []

    for (let i = 0; i < row.length; i++)
        if (this.HaveInState(row[i], positive) || row[i].IsEqual(phi))
            result.push(row[i])

    return result
}

// добавление блока с возможностью проскролливания
LTLtoBuchiCalculator.prototype.AddScollableBlock = function(html) {
    let div = document.createElement("div")
    div.className = "scrollable"

    if (typeof html == "string") {
        div.innerHTML = html
    }
    else {
        div.appendChild(html)
    }

    return div
}

// добавление в строку tr ячейки с текстом text
LTLtoBuchiCalculator.prototype.AddCell = function(tr, text, name = "td") {
    let cell = document.createElement(name)
    cell.innerHTML = text
    tr.appendChild(cell)
}

// добавление в строку tr ячейки с текстом text
LTLtoBuchiCalculator.prototype.AddSplittedCell = function(tr, states, stateNumber, phi, positive) {
    let cell = document.createElement("td")
    let html = []

    for (let i = 0; i < states.length; i++) {
        let pos = this.GetOnlyPositive(states[i], positive, phi)
        html.push("s<sub>" + stateNumber[0] + "</sub> = {" + this.JoinExpressions(pos, phi, ", ") + "}")
        stateNumber[0]++
    }

    cell.innerHTML = html.join("<hr>")
    tr.appendChild(cell)
}

LTLtoBuchiCalculator.prototype.TableToHTML = function(table, phi, positive) {
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

        let classic = this.GetOnlyPositive(table.classic[i], positive, phi)

        this.AddCell(tr, "{" + this.JoinExpressions(classic, null, ", ") + "}")
        this.AddSplittedCell(tr, table.temporal[i], stateNumber, phi, positive)
        htmlTable.appendChild(tr)
    }

    return htmlTable
}

LTLtoBuchiCalculator.prototype.Solve = function() {
    console.clear()

    try {
        ltl = new LTLExpression(this.inputBox.value)

        this.resultBox.innerHTML = "<p><b>Распаршенное выражение:</b> " + ltl.parsedExpression + "</p>"

        if (ltl.expression != ltl.parsedExpression) {
            this.resultBox.innerHTML += "<p><b>Упрощённое выражение:</b> " + ltl.expression + "</p>"
        }

        let subtrees = ltl.GetAllSubTrees()
        let closure = subtrees.positive.concat(subtrees.negative)
        this.resultBox.innerHTML += "<p><b>Все подвыражения (без отрицания):</b> " + this.JoinExpressions(subtrees.positive, ltl) + "</p>"
        this.resultBox.innerHTML += "<p><b>Все подвыражения (c отрицанием):</b> " + this.JoinExpressions(subtrees.negative, ltl) + "</p>"

        let atoms = this.GetAtoms(subtrees.positive)
        let untils = this.GetUntils(subtrees.positive)
        this.resultBox.innerHTML += "<p><b>Атомы:</b> " + this.JoinExpressions(atoms, ltl, ", ") + "</p>"

        if (untils.length > 0)
            this.resultBox.innerHTML += "<p><b>Until-выражения:</b> " + this.JoinExpressions(untils, ltl) + "</p>"

        let table = this.MakeTable(atoms, closure)
        this.resultBox.appendChild(this.AddScollableBlock(this.TableToHTML(table, ltl, subtrees.positive)))

        let isPhi = ltl.IsEqual(subtrees.positive[subtrees.positive.length - 1])
        let states = this.GetStates(table.temporal, ltl, isPhi, subtrees.positive)
        this.resultBox.innerHTML += "<p><b>Начальные состояния (𝑆<sub>0</sub>):</b> " + this.JoinStates(states.initialStates) + "</p>"

        if (states.finalstates.length == 1) {
            this.resultBox.innerHTML += "<p><b>Допускающие состояния (𝓕):</b> " + this.JoinStates(states.finalstates[0]) + "</p>"
        }
        else {
            this.resultBox.innerHTML += "<b>Допускающие состояния (𝓕):</b> "
            let finalstatesHTML = ""
            for (let i = 0; i < states.finalstates.length; i++)
                finalstatesHTML += "F<sub>" + (i + 1) + "</sub>: {" + this.JoinStates(states.finalstates[i]) + "}<br>"
            this.resultBox.appendChild(this.AddScollableBlock(finalstatesHTML))
        }

        let transitions = this.GetTransitions(states.states, closure, ltl)

        this.resultBox.innerHTML += "<b>Таблица переходов:</b><br>";
        let transitionsHTML = ""

        for (let i = 0; i < transitions.length; i++) {
            let x = this.JoinExpressions(transitions[i].variables, null)
            let delta = this.JoinStates(transitions[i].states)
            transitionsHTML += "𝛿(s<sub>" + (i + 1) + "</sub>, {" + x + "}) = {" + delta + "}<br>"
        }

        this.resultBox.appendChild(this.AddScollableBlock(transitionsHTML))

        return { states: states.states, initialStates: states.initialStates, finalstates: states.finalstates, transitions: transitions }
    }
    catch (error) {
        this.resultBox.innerHTML = "<p><b>Ошибка:</b> " + error + "</p>"
        throw error
    }
}